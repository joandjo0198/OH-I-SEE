'use strict';
const {auditProgram}=require('./programAudit');
const FT=.3048;
const RULES={entrance:{weight:20,best:['NE','N','E'],acceptable:['NW','SE']},kitchen:{weight:15,best:['SE'],acceptable:['NW']},master:{weight:15,best:['SW'],acceptable:['S','W']},pooja:{weight:10,best:['NE'],acceptable:['E','N']},toilets:{weight:15,best:['NW','W'],acceptable:['S']},stairs:{weight:10,best:['S','SW','W'],acceptable:['SE','NW']}};
function zoneAt(x,y,box,facing='North'){
 const dx=(x-box.x)/box.width*2-1,dy=(y-box.y)/box.height*2-1;
 const angle=({North:0,East:90,South:180,West:270}[facing]||0)*Math.PI/180;
 const rx=dx*Math.cos(angle)-dy*Math.sin(angle),ry=dx*Math.sin(angle)+dy*Math.cos(angle);
 const a=ry < -1/3?'N':ry>1/3?'S':'',b=rx < -1/3?'W':rx>1/3?'E':'';return a+b||'C';
}
function assessBlueprint(model,requirements,{mode='off',totalAreaSqFt}={}){
 const elements=model.elements||[],issues=[],assumptions=[],rooms=elements.filter(e=>e.type==='Room'),box=model.site?.buildable;
 if(!box || ![box.x,box.y,box.width,box.height].every(Number.isFinite) || box.width<=0 || box.height<=0) issues.push('The buildable envelope is missing or invalid.');
 if(!elements.some(e=>e.type==='Slab')) issues.push('Floor slab areas are missing; built-up area cannot be verified.');
 const area=elements.filter(e=>e.type==='Slab').reduce((sum,e)=>sum+(e.quantity?.areaM2||0),0)/FT**2;
 const limit=Number(totalAreaSqFt||requirements.building?.builtUpAreaSqFt)||null;
 if(limit&&area>limit+.1)issues.push(`Built-up area ${Math.round(area)} sq.ft exceeds the ${limit} sq.ft limit by ${Math.ceil(area-limit)} sq.ft.`);
 issues.push(...auditProgram(model,requirements).issues);
 const schedule=rooms.map(r=>{const p=r.position||{},d=r.dimensions||{};return{id:r.id,name:r.name,type:r.geometry?.roomType,zone:box?zoneAt(p.x+d.lengthM/2,p.y+d.widthM/2,box,model.site?.roadFacing):null,areaSqFt:(r.quantity?.areaM2||0)/FT**2};});
 for(const r of rooms){const p=r.position||{},d=r.dimensions||{};
  if(box&&(p.x<box.x-.01||p.y<box.y-.01||p.x+d.lengthM>box.x+box.width+.01||p.y+d.widthM>box.y+box.height+.01))issues.push(`${r.name} extends into a setback; it fails this brief's envelope requirement.`);
  if(!['living','bedroom','kitchen','dining','office','guest'].includes(r.geometry?.roomType))continue;
  const hosted=elements.filter(w=>w.type==='Window'&&elements.some(wall=>wall.id===w.geometry?.hostWallId&&wall.type==='Wall'&&wall.properties?.exterior===true)&&w.storeyId===r.storeyId&&w.position.x>=p.x-.15&&w.position.x<=p.x+d.lengthM+.15&&w.position.y>=p.y-.15&&w.position.y<=p.y+d.widthM+.15);
  const glazing=hosted.reduce((sum,w)=>sum+(w.dimensions?.widthM||0)*(w.dimensions?.heightM||0),0);
  if(glazing+.001<(r.quantity?.areaM2||0)*.1)issues.push(`${r.name}: glazing ${Math.round(glazing/FT**2)} sq.ft is below the required ${((r.quantity?.areaM2||0)*.1/FT**2).toFixed(1)} sq.ft.`);
  if(!hosted.length||hosted.some(w=>!Number.isFinite(w.properties?.openableFraction)||w.properties.openableFraction<0||w.properties.openableFraction>1))issues.push(`${r.name}: openable external window area is unverified.`);
  else {const openArea=hosted.reduce((sum,w)=>sum+(w.dimensions?.widthM||0)*(w.dimensions?.heightM||0)*w.properties.openableFraction,0); if(openArea+.001<(r.quantity?.areaM2||0)*.05)issues.push(`${r.name}: openable ventilation area is below 5% of the room area.`);}
 }
 const stairs=elements.filter(e=>e.type==='Stair');for(const s of stairs){const g=s.geometry||{};if(!(g.riserM>0&&g.riserM<=.1905&&g.treadM>=.254&&g.headroomM>=2.1336))issues.push(`${s.name}: riser, tread and headroom have not passed the stated limits.`);}
 const breakdown=[];
 const unverified=['Door connectivity without crossing private rooms','Kitchen-entry alignment and kitchen/toilet adjacency','Vertical toilet / kitchen / pooja separation','Exact room dimensions and drawing dimension-chain reconciliation','Half-foot wall grid and detailed stair/landing geometry'];
 issues.push(...unverified.map(check=>check+': not verified by the current generator.'));
 if(mode!=='off'&&box){
  const entrance=elements.find(e=>e.type==='Door'&&/main|entrance/i.test(e.name));
  const groups={entrance:entrance?[{name:entrance.name,zone:zoneAt(entrance.position.x,entrance.position.y,box,model.site?.roadFacing)}]:[],kitchen:schedule.filter(r=>r.type==='kitchen'),master:schedule.filter(r=>/master/i.test(r.name)),pooja:schedule.filter(r=>r.type==='pooja'),toilets:schedule.filter(r=>['bathroom','toilet','bath'].includes(r.type)),stairs:stairs.map(s=>({name:s.name,zone:zoneAt(s.position.x+s.dimensions.lengthM/2,s.position.y+s.dimensions.widthM/2,box,model.site?.roadFacing)}))};
  for(const [name,rule] of Object.entries(RULES)){const entries=groups[name];if(!entries.length&&name==='pooja'){breakdown.push({item:name,weight:rule.weight,applicable:false,earned:0});continue;}const earned=entries.length?Math.min(...entries.map(e=>rule.best.includes(e.zone)?rule.weight:rule.acceptable.includes(e.zone)?rule.weight*.6:0)):0;breakdown.push({item:name,weight:rule.weight,applicable:true,earned,placements:entries});for(const e of entries)if(!rule.best.includes(e.zone))issues.push(`${e.name}: ${e.zone} zone; preferred ${rule.best.join('/')}. Alternative: relocate within the preferred zone without changing the client's room size.`);}
  const blocked=schedule.filter(r=>['kitchen','bathroom','toilet','bath'].includes(r.type)&&r.zone==='C');const centerStairs=groups.stairs.some(s=>s.zone==='C');breakdown.push({item:'Brahmasthan',weight:10,applicable:true,earned:blocked.length||centerStairs?0:10,provisional:true});
  if(blocked.length||centerStairs)issues.push('A kitchen, toilet or stair occupies the center zone.');
  breakdown.push({item:'Openings / slopes / other',weight:5,applicable:true,earned:0,unverified:true});
  assumptions.push('Centroid zoning is a preliminary screen, not verification of exact entrance padas, room extents, structural loads, slopes or internal fixture orientations.');
  issues.push('Detailed entrance-pada, connectivity, fixture, slope and structural checks remain unverified.');
 }
 const possible=breakdown.filter(r=>r.applicable).reduce((sum,r)=>sum+r.weight,0),score=possible?Math.round(breakdown.reduce((sum,r)=>sum+r.earned,0)/possible*100):null;
 if(mode==='strict'&&(score===null||score<85))issues.push(`Preliminary Vastu score ${score}/100 is below the strict threshold of 85.`);
 return{passed:issues.length===0,assessment:'preliminary',unverified,mode,areaBudget:{actualSqFt:Math.round(area),limitSqFt:limit},vastu:mode==='off'?null:{score,provisional:true,breakdown,basis:'User-supplied traditional design rules; not a scientific or statutory certification'},schedule,issues:[...new Set(issues)],assumptions};
}
// Only explicitly configured blueprint policies activate the new acceptance gate.
// Older snapshots remain viewable; they are never silently regenerated.
function policyFor(project,requirements={}) {
 const p=project?.construction_context?.blueprintPolicy;
 if(!p?.enabled)return null;
 return {mode:['strict','flexible','off'].includes(p.vastu)?p.vastu:'strict',totalAreaSqFt:Number(p.totalAreaSqFt)||Number(requirements.building?.builtUpAreaSqFt)||undefined};
}
function enforceAcceptance(report) {
 if(report&&!report.passed)throw Object.assign(new Error('Blueprint acceptance failed. The saved version was retained; no replacement plan was published.'),{status:422,details:report.issues,acceptance:report});
}
module.exports={assessBlueprint,zoneAt,policyFor,enforceAcceptance};
