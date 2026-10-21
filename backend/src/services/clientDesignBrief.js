'use strict';

// Only design fields are sent to the AI; owner contact details and documents stay private.
function collect(project) {
  const c = project.construction_context || {};
  const a = { ...(c.intentAnswers || {}), ...(c.projectRequirements || {}) };
  const land = c.landSite || {};
  const fields = ['floors','built_up_area','qty_bedrooms','qty_bathrooms','qty_living','qty_dining','qty_kitchen','qty_pooja','qty_study','qty_guest','custom_rooms','size_master_bedroom','size_bedroom_2','size_living','size_kitchen','size_dining','size_pooja','size_study','car_parking','two_wheeler_parking','covered_parking','ev_charging','parking_checks','home_features','family_members','elderly_members','arch_style','interior_style','exterior_wall','roof_type','flooring_pref','wall_finish','door_style','window_style','kitchen_style','bathroom_style','follow_vastu','entrance_direction','pooja_direction','kitchen_direction','vastu_notes','special_requirements','things_to_avoid','material_preference','quality','has_terrace'];
  const inputs = Object.fromEntries(fields.filter(k => a[k] !== undefined).map(k => [k,a[k]]));
  inputs.plot_length = land.plot_length_ft ?? a.plot_length ?? project.plot_length;
  inputs.plot_width = land.plot_width_ft ?? a.plot_width ?? project.plot_width;
  if(land.frontage_ft && land.depth_ft){inputs.frontage_ft=land.frontage_ft;inputs.depth_ft=land.depth_ft;}
  inputs.road_facing = land.road_facing ?? a.road_facing ?? project.road_facing;
  for (const side of ['front','rear','left','right']) inputs[`setback_${side}_ft`] = land[`setback_${side}_ft`] ?? a[`setback_${side}_ft`];
  const warnings = [];
  for (const [k,v] of Object.entries(inputs)) {
    if (k.startsWith('size_') && Number(v) > 0 && Number(v) < 25) warnings.push(`${k.replaceAll('_',' ')} is ${v} sq.ft. This is too small for a usable room; generation is blocked until you correct or confirm a usable size; it will not substitute a larger room. Correct it in Requirements → Room details.`);
  }
  const area = Number(inputs.built_up_area ?? project.built_up_area);
  if (area > 0 && area < 150) warnings.push(`Built-up area is ${area} sq.ft. It cannot accommodate the requested home; generation is blocked; it will not substitute the plot envelope. Correct Built-up area in Requirements → Building configuration.`);
  const errors=[...warnings];
  const assumptions=[];
  for(const [size,count] of [['size_living','qty_living'],['size_dining','qty_dining'],['size_kitchen','qty_kitchen'],['size_master_bedroom','qty_bedrooms'],['size_bedroom_2','qty_bedrooms'],['size_pooja','qty_pooja'],['size_study','qty_study']]){
    if(Number(inputs[count])>0 && (inputs[size]===undefined||inputs[size]===null||inputs[size]==='')) assumptions.push(size.replaceAll('_',' ')+': ASSUMED; no area was supplied.');
  }
  if(Number(inputs.qty_bathrooms)>0)assumptions.push('Bathroom sizes: ASSUMED 8 × 6 ft; no individual dimensions were supplied.');
  const selectedFeatures=[...(Array.isArray(inputs.home_features)?inputs.home_features:[]),...(Array.isArray(inputs.parking_checks)?inputs.parking_checks:[])];
  return { inputs, warnings, errors, assumptions, selectedFeatures, source:'Saved client requirements and Land & Site; proposed room proportions are not user dimensions' };
}

function enforceSavedProgram(base, proposal) {
  // The initial generation may arrange rooms, but may not remove the client's room program.
  proposal.site = structuredClone(base.site);
  proposal.building = structuredClone(base.building);
  proposal.projectName = base.projectName;
  proposal.storeys = structuredClone(base.storeys);
  proposal.rooms = base.rooms.map((room, index) => {
    const suggested = (proposal.rooms||[]).find(r => r.name === room.name && r.type === room.type);
    return { ...room, storeyIndex: base.building.layoutStrategy!=='frontage-corridor' && suggested && Number.isInteger(suggested.storeyIndex) && suggested.storeyIndex >= 0 && suggested.storeyIndex < base.building.floors ? suggested.storeyIndex : room.storeyIndex };
  });
  return proposal;
}
function assertUsableBrief(brief){
 if(brief.errors?.length)throw Object.assign(new Error('Correct the flagged user inputs before generation. No entered sizes were changed.'),{status:422,details:brief.errors});
}
module.exports = { collect, enforceSavedProgram, assertUsableBrief };
