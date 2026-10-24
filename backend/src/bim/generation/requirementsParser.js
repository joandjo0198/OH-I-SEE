'use strict';

/**
 * Converts OH I SEE project / intent data into structured building requirements.
 * Does NOT call AI — deterministic mapping from existing form fields.
 */
function parseFloorsLabel(label) {
  const text=String(label??'Ground Floor Only').trim();
  const match=text.match(/G\s*\+\s*(\d+)/i);
  const count=match?Number(match[1])+1:/ground/i.test(text)?1:Number(text);
  if(!Number.isInteger(count)||count<1||count>4)throw Object.assign(new Error('The entered floor count is not supported (1–4 floors). It was not changed.'),{status:422});
  return count;
}

function normalizeQualityLevel(value) {
  const s = String(value || '').toLowerCase();
  if (s.includes('economic') || s.includes('budget-conscious')) return 'Economic';
  if (s.includes('premium') || s.includes('higher-end')) return 'Premium';
  if (s.includes('custom')) return 'Custom';
  if (s.includes('standard') || s.includes('balanced')) return 'Standard';
  return 'Standard';
}

function normalizeVastu(value) {
  const s = String(value || '').toLowerCase();
  if (!s.trim()) return '';
  if (s.includes('no') && !s.includes('know')) return 'No';
  if (s.includes('partly') || s.includes('partial')) return 'Partly';
  if (s.includes('yes') || s.includes('follow')) return 'Yes';
  return 'Partly';
}

function normalizeRoadFacing(value) {
  const s = String(value || 'East').trim();
  const allowed = ['North', 'South', 'East', 'West', 'Corner'];
  const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (allowed.includes(cap)) return cap;
  if (s.toLowerCase().includes('corner')) return 'Corner';
  return 'East';
}

function parseBedrooms(label) {
  return require('../../cad/inputNormalizer').count(String(label??'').replace(/^(\d+)\+\s*Bedrooms?$/i,'$1'), 'Bedrooms');
}

function parseBathrooms(label) {
  return require('../../cad/inputNormalizer').count(label, 'Bathrooms');
}

function parseParking(label) {
  return require('../../cad/inputNormalizer').count(label, 'Parking');
}

function ftToM(ft) {
  return Math.round((Number(ft) || 0) * 0.3048 * 1000) / 1000;
}

function buildStoreys(floorCount) {
  const storeys = [];
  const names = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];
  for (let i = 0; i < floorCount; i++) {
    storeys.push({
      index: i,
      name: names[i] || `Floor ${i}`,
      elevationM: i * 3.0,
      clearHeightM: 3.0,
    });
  }
  return storeys;
}

function defaultRooms(bedrooms, bathrooms, flags) {
  const rooms = [
    { name: 'Living Room', type: 'living', storeyIndex: 0, lengthFt: 16, widthFt: 14 },
    { name: 'Kitchen', type: 'kitchen', storeyIndex: 0, lengthFt: 12, widthFt: 10 },
    { name: 'Dining', type: 'dining', storeyIndex: 0, lengthFt: 12, widthFt: 10 },
  ];
  for (let i = 1; i <= bedrooms; i++) {
    rooms.push({ name: `Bedroom ${i}`, type: 'bedroom', storeyIndex: i > 2 ? 1 : 0, lengthFt: 12, widthFt: 11 });
  }
  for (let i = 1; i <= bathrooms; i++) {
    rooms.push({ name: `Bathroom ${i}`, type: 'bathroom', storeyIndex: 0, lengthFt: 8, widthFt: 6 });
  }
  if (flags.hasPooja) rooms.push({ name: 'Pooja Room', type: 'pooja', storeyIndex: 0, lengthFt: 6, widthFt: 6 });
  if (flags.hasOffice) rooms.push({ name: 'Home Office', type: 'office', storeyIndex: 0, lengthFt: 10, widthFt: 9 });
  if (flags.hasTerrace) rooms.push({ name: 'Terrace', type: 'terrace', storeyIndex: 1, lengthFt: 14, widthFt: 12 });
  if (flags.parking > 0) rooms.push({ name: 'Car Parking', type: 'parking', storeyIndex: 0, lengthFt: 18, widthFt: 10 });
  return rooms;
}

function fromProject(project) {
  const ctx = project.construction_context || {};
  const answers = {...(ctx.homeRequirements||{}),...(ctx.intentAnswers||{}),...(ctx.projectRequirements||{})};
  const land=ctx.landSite||{};
  const hr = ctx.homeRequirements || {};

  const plotLengthFt = Math.max(10, Number(land.plot_length_ft || answers.plot_length || project.plot_length || hr.plot?.lengthFt || hr.plotLength || 40) || 40);
  const plotWidthFt = Math.max(10, Number(land.plot_width_ft || answers.plot_width || project.plot_width || hr.plot?.widthFt || hr.plotWidth || 30) || 30);
  const floors = parseFloorsLabel(answers.floors || project.floors || hr.building?.floors || 'Ground Floor Only');
  const bedrooms = parseBedrooms(answers.qty_bedrooms ?? answers.bedrooms ?? project.bedrooms ?? hr.building?.bedrooms ?? '3 Bedrooms');
  const bathrooms = parseBathrooms(answers.qty_bathrooms ?? answers.bathrooms ?? project.bathrooms ?? hr.building?.bathrooms ?? '2 Bathrooms');
  const parking = parseParking(answers.car_parking ?? answers.parking ?? project.parking_count ?? hr.building?.parking);

  const flags = {
    hasPooja: answers.has_pooja === 'Yes' || answers.has_pooja === true || project.has_pooja === true,
    hasOffice: answers.has_office === 'Yes' || answers.has_office === true || project.has_office === true,
    hasTerrace: answers.has_terrace === 'Yes' || answers.has_terrace === true || project.has_terrace === true,
    parking,
  };

  const location = answers.location || project.location || hr.plot?.location?.city || '';
  const budgetRaw = answers.budget || project.budget || hr.budget?.amount || 0;


  const count = (key, fallback) => require('../../cad/inputNormalizer').count(answers[key] ?? answers.room_quantities?.[key] ?? fallback, key);
  const rooms = [];
  function add(name, type, qty, sizeKey, lengthFt, widthFt) {
    for (let i = 0; i < qty; i++) {
      const area = Number(answers[sizeKey]);
      const supplied=sizeKey && answers[sizeKey]!==undefined && answers[sizeKey]!==null && answers[sizeKey]!=='';
      if(supplied&&(!Number.isFinite(area)||area<=0))throw Object.assign(new Error(`${name}: enter a positive room area. The entered value was not replaced.`),{status:422});
      const exact=answers.room_dimensions?.[sizeKey];
      if(exact && (!Array.isArray(exact)||exact.length!==2||exact.some(n=>!Number.isFinite(Number(n))||Number(n)<=0))) throw Object.assign(new Error(`${name}: invalid width/depth.`),{status:422});
      if(exact && Math.abs(Number(exact[0])*Number(exact[1])-area)<0.01) {lengthFt=Number(exact[0]);widthFt=Number(exact[1]);}
      const scale = supplied ? Math.sqrt(area / (lengthFt * widthFt)) : 1;
      rooms.push({ name: qty > 1 ? name+' '+(i+1) : name, type, storeyIndex: 0, lengthFt: lengthFt * scale, widthFt: widthFt * scale, sizeSource:supplied?'user-area':'assumed', requestedAreaSqFt:supplied?area:null, dimensionsProposed:true, autoSized:!!exact });
    }
  }
  add('Living Room','living',count('qty_living',answers.cad_model_version?0:1),'size_living',16,14);
  add('Kitchen','kitchen',count('qty_kitchen',answers.cad_model_version?0:1),'size_kitchen',12,10);
  add('Dining','dining',count('qty_dining',answers.cad_model_version?0:1),'size_dining',12,10);
  add('Master Bedroom','bedroom',Math.min(1,bedrooms),'size_master_bedroom',12,11);
  add('Bedroom','bedroom',Math.max(0,bedrooms-1),'size_bedroom_2',12,11);
  add('Bathroom','bathroom',bathrooms,'',answers.room_dimensions?6.5:8,answers.room_dimensions?4:6);
  add('Pooja Room','pooja',count('qty_pooja',flags.hasPooja?1:0),'size_pooja',6,6);
  add('Home Office','office',count('qty_study',flags.hasOffice?1:0),'size_study',10,9);
  add('Guest Room','guest',count('qty_guest',0),'',12,10);
  if(flags.hasTerrace) add('Terrace','terrace',1,'',14,12);
  add('Car Parking','parking',parking,'',18,10);
  add('Two Wheeler Parking','parking',count('two_wheeler_parking',0),'',7,3.5);
  for(const r of (Array.isArray(answers.custom_rooms)?answers.custom_rooms:[])) {
    const area=Number(r.size || r.area || r.area_sqft);
    const qty=require('../../cad/inputNormalizer').count(r.quantity ?? r.qty, 'Custom room quantity');
    if(!qty)continue;
    add(String(r.name || r.label || 'Additional Room').replace(/[<>]/g,''),'other',qty,'',area>0?Math.sqrt(area):10,area>0?Math.sqrt(area):10);
    for(const room of rooms.slice(-qty)){room.sizeSource=area>0?'user-area':'assumed';room.requestedAreaSqFt=area>0?area:null;}
  }
  rooms.filter(r=>r.type==='bedroom').forEach((r,i)=>r.storeyIndex=Math.min(floors-1,Math.floor(i/2)));
  rooms.filter(r=>r.type==='bathroom').forEach((r,i)=>r.storeyIndex=i%floors);
  rooms.filter(r=>['office','guest','terrace'].includes(r.type)).forEach(r=>r.storeyIndex=floors-1);

  if(land.frontage_ft && land.depth_ft && land.road_facing==='North' && floors>1) rooms.filter(r=>r.type==='bedroom').forEach(r=>r.storeyIndex=1);

  return {
    schemaVersion: 1,
    projectName: project.project_name || 'My Home',
    description: project.description || answers.extras || '',
    site: {
      location,
      city: project.city || hr.plot?.location?.city || '',
      state: project.state || hr.plot?.location?.state || '',
      plotLengthFt,
      plotWidthFt,
      ...(answers.room_dimensions ? {plotLengthM:Number(land.frontage_ft || plotWidthFt)*0.3048,plotWidthM:Number(land.depth_ft || plotLengthFt)*0.3048,dimensionConvention:'width-depth-v2'} : {}),
      ...(land.frontage_ft && land.depth_ft ? {frontageFt:Number(land.frontage_ft),depthFt:Number(land.depth_ft)} : {}),
      roadFacing: normalizeRoadFacing(land.road_facing || answers.road_facing || project.road_facing || 'East'),
      ...Object.fromEntries(['front','rear','left','right'].filter(side => (land['setback_'+side+'_ft'] ?? answers['setback_'+side+'_ft']) !== undefined).map(side => ['setback'+side[0].toUpperCase()+side.slice(1)+'Ft', Number(land['setback_'+side+'_ft'] ?? answers['setback_'+side+'_ft'])])),
    },
    building: {
      floors,
      cadEngine: answers.cad_model_version === 1,
      sitoutRequested: answers.sitout === 'Yes' || answers.sitout === true,
      stairsRequested: answers.staircase === 'Yes' || answers.staircase === true,
      ...(land.frontage_ft && land.depth_ft && land.road_facing==='North' ? {layoutStrategy:'frontage-corridor'} : {}),
      builtUpAreaSqFt:Number(answers.built_up_area ?? project.built_up_area)||0,
      selectedFeatures:[...(Array.isArray(answers.home_features)?answers.home_features:[]),...(Array.isArray(answers.parking_checks)?answers.parking_checks:[])],
      bedrooms,
      bathrooms,
      parking,
      architecturalStyle: answers.arch_style || project.architectural_style || 'Contemporary',
      qualityLevel: normalizeQualityLevel(answers.quality || project.quality_level || 'Standard'),
      budgetInr: Number(budgetRaw) || 0,
      hasPooja: flags.hasPooja,
      hasOffice: flags.hasOffice,
      hasTerrace: flags.hasTerrace,
      vastu: normalizeVastu(answers.follow_vastu ?? answers.vastu ?? project.vastu_preference ?? ''),
    },
    rooms,
    storeys: buildStoreys(floors),
  };
}

module.exports = { fromProject, buildStoreys, defaultRooms };
