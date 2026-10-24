'use strict';
const rules=require('./rules/tnbc'),{minimum,habitable}=require('./roomCatalog');
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
function validate(plan) {
  const issues=[],rooms=plan.rooms,e=plan.envelope;
  for(const r of rooms) {
    if(![r.x,r.y,r.w,r.h].every(Number.isSafeInteger)||r.w<=0||r.h<=0)issues.push(`${r.name}: non-integer or invalid geometry.`);
    if(!inside(r,e))issues.push(`${r.name}: outside the buildable envelope.`);
    const m=minimum(r.type);
    if(r.type!=='stair'&&(r.w*r.h<m.area||Math.min(r.w,r.h)<m.width))issues.push(`${r.name}: below clear-room minimum (${m.area/1e6} m² / ${m.width} mm).`);
    for(const other of rooms)if(r.id<other.id&&r.floor===other.floor&&overlap(r,other))issues.push(`${r.name} overlaps ${other.name}.`);
    const wins=plan.openings.filter(o=>o.kind==='window'&&o.roomIds.includes(r.id));
    if(habitable.has(r.type)||r.type==='kitchen') {
      if(wins.reduce((s,o)=>s+o.width*o.height,0)<r.w*r.h*rules.opening.glazingRatio)issues.push(`${r.name}: insufficient external glazing.`);
      if(wins.some(o=>!plan.walls.find(w=>w.id===o.wallId)?.exterior))issues.push(`${r.name}: window is not on an external wall.`);
    }
  }
  for(const o of plan.openings) {
    const w=plan.walls.find(w=>w.id===o.wallId);
    if(!w){issues.push(`${o.id}: missing host wall.`);continue;}
    const vertical=w.start.x===w.end.x,axis=vertical?'y':'x',cross=vertical?'x':'y';
    const start=Math.min(w.start[axis],w.end[axis]),end=Math.max(w.start[axis],w.end[axis]);
    if(o[cross]!==w.start[cross]||o[axis]-o.width/2<start||o[axis]+o.width/2>end)issues.push(`${o.id}: opening outside its wall.`);
    for(const id of o.roomIds.filter(id=>id!=='OUTSIDE')) {
      const r=rooms.find(r=>r.id===id);if(!r||r.floor!==o.floor){issues.push(`${o.id}: invalid room link.`);continue;}
      const rs=r[axis],re=rs+(axis==='x'?r.w:r.h);
      if(o[axis]-o.width/2<rs||o[axis]+o.width/2>re)issues.push(`${r.name}: ${o.mark} opening exceeds clear room width.`);
    }
    for(const other of plan.openings)if(o.id<other.id&&o.wallId===other.wallId&&Math.abs(o[axis]-other[axis])<(o.width+other.width)/2+100)issues.push(`${o.id}/${other.id}: colliding openings.`);
  }
  // Flood through doors and aligned stairs; toilets may be destinations but
  // must never be the only route into another room.
  const reachable=new Set(['OUTSIDE']);let changed=true;
  while(changed){changed=false;for(const o of plan.openings.filter(o=>o.kind==='door'))if(o.roomIds.some(id=>reachable.has(id)&&!['bathroom','wc','bath'].includes(rooms.find(r=>r.id===id)?.type)))for(const id of o.roomIds)if(!reachable.has(id)){reachable.add(id);changed=true;}
    if(plan.stairs.some(s=>reachable.has(s.roomId)))for(const s of plan.stairs)if(!reachable.has(s.roomId)){reachable.add(s.roomId);changed=true;}
  }
  for(const r of rooms)if(!reachable.has(r.id))issues.push(`${r.name}: no usable route from the main entrance.`);
  for(const s of plan.stairs) {
    if(s.riser>rules.stair.maxRiser||s.tread<rules.stair.minTread||s.width<1000||s.landing<s.width||s.headroom<2200)issues.push(`${s.id}: stair dimensions fail the project criteria.`);
    if(plan.stairs.some(t=>t.x!==s.x||t.y!==s.y||t.w!==s.w||t.h!==s.h))issues.push('Stairs are not vertically aligned.');
  }
  for(const f of plan.floors)if(f.clearHeight<rules.clearHeight)issues.push(`Floor ${f.index+1}: insufficient clear height.`);
  for(const p of plan.parking)if(!inside(p,plan.plot)||overlap(p,e))issues.push(`${p.id}: parking overlaps the building or plot boundary.`);
  for(const f of plan.fixtures){const r=rooms.find(r=>r.id===f.roomId);if(!r||!inside(f,r))issues.push(`${f.kind}: fixture outside ${r?.name||'room'}.`);for(const b of plan.fixtures)if(f.id<b.id&&f.roomId===b.roomId&&overlap(f,b))issues.push(`${r?.name}: fixtures ${f.kind}/${b.kind} overlap.`);}
  return {valid:issues.length===0,issues:[...new Set(issues)],checked:['integer dimensions','envelope','room overlap','clear minima','opening hosts and extents','glazing','door connectivity','stair alignment','fixture bounds'],unverified:['structural adequacy','statutory approval','door swing clearance against furniture','accessible routes','detailed Vastu','stair headroom section']};
}
function enforce(plan){const report=validate(plan);if(!report.valid)throw Object.assign(new Error('Drawing validation failed. No replacement plan was saved.'),{status:422,details:report.issues});return report;}
module.exports={validate,enforce,overlap,inside};
