'use strict';
const rules = require('./rules/tnbc');
function count(value, label = 'Quantity') {
  if (value === undefined || value === null || value === false || /^(\s*|0|no|none|false|unchecked)$/i.test(String(value).trim())) return 0;
  const match = String(value).trim().match(/^(\d+)(?:\s+.*)?$/);
  if (!match || +match[1] > 10) throw Object.assign(new Error(`${label}: enter a whole number from 0 to 10.`), { status: 422 });
  return +match[1];
}
const mm = ft => Math.round(Number(ft) * 304.8);
function normalize(requirements) {
  const s = requirements.site || {}, b = requirements.building || {};
  const facing = s.roadFacing;
  if (!['North', 'South', 'East', 'West'].includes(facing)) throw Object.assign(new Error('Select one road-facing direction. Corner plots require a site-specific review.'), { status: 422 });
  const width = mm(s.frontageFt ?? s.plotWidthFt), depth = mm(s.depthFt ?? s.plotLengthFt);
  const setbacks = Object.fromEntries(Object.entries(rules.setbackDefaultsFt).map(([side, fallback]) => [side, mm(s[`setback${side[0].toUpperCase()}${side.slice(1)}Ft`] ?? fallback)]));
  if (![width, depth, ...Object.values(setbacks)].every(Number.isSafeInteger) || width <= 0 || depth <= 0 || Object.values(setbacks).some(n => n < 0)) throw Object.assign(new Error('Plot dimensions and setbacks must be finite positive dimensions; setbacks may be zero.'), { status: 422 });
  const rooms = (requirements.rooms || []).map((r,i)=>({...r,inputIndex:i})).filter(r => r.type !== 'parking').map((r, i) => ({
    id: `R${i + 1}`, name: r.name, type: r.type, floor: r.storeyIndex || 0,
    requestedWidth: mm(r.lengthFt), requestedDepth: mm(r.widthFt),
    adjustable: r.autoSized === true || r.sizeSource === 'assumed', areaOnly: r.sizeSource==='user-area' && r.dimensionsProposed===true && r.autoSized!==true,
    source: `rooms[${r.inputIndex}]`, autoAdded: false,
  }));
  if (!rooms.length) throw Object.assign(new Error('Select the rooms you need before generating a plan.'), { status: 422 });
  if(rooms.some(r=>!Number.isInteger(r.floor)||r.floor<0||r.floor>=b.floors))throw Object.assign(new Error('Every requested room must be assigned to an existing floor.'),{status:422});
  if (rooms.some(r => !Number.isSafeInteger(r.requestedWidth) || !Number.isSafeInteger(r.requestedDepth) || r.requestedWidth <= 0 || r.requestedDepth <= 0)) throw Object.assign(new Error('Every requested room needs positive dimensions.'), { status: 422 });
  for(const r of rooms.filter(r=>!r.adjustable)) {
    const m=require('./roomCatalog').minimum(r.type);
    if(r.requestedWidth*r.requestedDepth<m.area||(!r.areaOnly&&Math.min(r.requestedWidth,r.requestedDepth)<m.width))throw Object.assign(new Error(`${r.name}: requested ${(r.requestedWidth*r.requestedDepth/1e6).toFixed(2)} m² / ${Math.min(r.requestedWidth,r.requestedDepth)} mm is below the project minimum of ${m.area/1e6} m² / ${m.width} mm. Exact input was not changed.`),{status:422});
  }
  const parkingRooms = (requirements.rooms || []).filter(r => r.type === 'parking');
  return { version: 1, units: 'mm', facing, width, depth, setbacks, floors: b.floors, rooms,
    parking: { cars: parkingRooms.filter(r => !/two wheeler/i.test(r.name)).length, bikes: parkingRooms.filter(r => /two wheeler/i.test(r.name)).length },
    parkingSpaces:parkingRooms.map((r,i)=>({id:`P${i+1}`,name:r.name,kind:/two wheeler/i.test(r.name)?'bike':'car',w:mm(r.widthFt),h:mm(r.lengthFt),source:`rooms:${r.name}`})),
    sitout: b.sitoutRequested === true, stairsRequested: b.stairsRequested === true || b.floors > 1 || b.hasTerrace === true,
    vastu: b.vastu, projectName: requirements.projectName || 'Residential project',
  };
}
module.exports = { count, mm, normalize };
