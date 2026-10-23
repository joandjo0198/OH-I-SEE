'use strict';
function auditProgram(model,requirements){
 const issues=[],elements=model.elements||[],rooms=elements.filter(e=>e.type==='Room');const used=new Set();
 for(const expected of requirements.rooms||[]){
  const found=rooms.find(r=>!used.has(r.id)&&r.name===expected.name&&r.geometry?.roomType===expected.type);
  if(!found){issues.push(`Missing requested space: ${expected.name}.`);continue;}used.add(found.id);
  const wanted=Number(expected.lengthFt)*Number(expected.widthFt),actual=Number(found.quantity?.areaM2)/.3048**2;
  const minimum={living:[10,8],dining:[8,7],bedroom:/master/i.test(expected.name)?[10,10]:[9,10],kitchen:[8,7]}[expected.type];
  const dims=[Number(found.dimensions?.lengthM)/.3048,Number(found.dimensions?.widthM)/.3048].sort((a,b)=>a-b);
  const mins=minimum?.slice().sort((a,b)=>a-b);
  const disclosed=model.metadata?.layoutWarnings?.some(w=>w.includes('Auto-sized rooms adjusted')&&w.includes(expected.name+':'));
  const allowedAdjustment=expected.autoSized && disclosed && mins && dims.every((n,i)=>n>=mins[i]-.01) && dims[1]/dims[0]<=2.01;
  if(!allowedAdjustment&&wanted>0&&Math.abs(actual-wanted)>Math.max(1,wanted*.02))issues.push(`${expected.name}: requested ${Math.round(wanted)} sq.ft; generated ${Math.round(actual)} sq.ft.`);
 }
 const count=elements.filter(e=>e.type==='BuildingStorey').length;
 if(count!==requirements.building?.floors)issues.push('Generated floor count does not match the requested floor count.');
 if(count>1){const floors=elements.filter(e=>e.type==='BuildingStorey');for(const floor of floors)if(!elements.some(e=>e.type==='Stair'&&e.storeyId===floor.id))issues.push(`No stair / landing on ${floor.name}.`);}
 return {matches:issues.length===0,issues};
}
module.exports={auditProgram};
