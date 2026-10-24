import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {count}=require('../src/cad/inputNormalizer');
const {layoutEngine}=require('../src/cad/layoutEngine');
const {validate,enforce}=require('../src/cad/planValidator');
const {siteCalc}=require('../src/cad/siteCalc');
const {generate}=require('../src/bim/generation/requirementsToBim');
const {auditProgram}=require('../src/bim/validation/programAudit');
const {dxf}=require('../src/cad/cadWriter');
const {dimensions}=require('../src/cad/dimensionEngine');
const {sheets,pdf}=require('../src/cad/sheetComposer');
const {fromProject}=require('../src/bim/generation/requirementsParser');
function brief(width=32,depth=55,facing='East') {
 return {schemaVersion:1,projectName:'Reference plot — adjusted design study',site:{plotWidthFt:width,plotLengthFt:depth,roadFacing:facing},building:{floors:1,cadEngine:true},
 rooms:['living','kitchen','bedroom','bedroom','bathroom','pooja','dining'].map((type,i)=>({name:`${type} ${i}`,type,lengthFt:10,widthFt:10,sizeSource:'assumed',storeyIndex:0}))};
}
describe('CAD project workflow',()=>{
 it.each(['',0,'0','No','no','none',false,undefined,null,'unchecked'])('does not invent parking for %s',value=>{expect(count(value)).toBe(0);const r=fromProject({construction_context:{projectRequirements:{car_parking:value}}});expect(r.building.parking).toBe(0);expect(r.rooms.some(r=>r.type==='parking')).toBe(false);});
 it.each(['-1','1.5','yes','unknown',11])('rejects invalid quantities %s',value=>expect(()=>count(value)).toThrow());
 it('generates a connected reference-plot study, with no unrequested parking',()=>{
  const p=layoutEngine(brief());expect(validate(p).issues).toEqual([]);expect(p.parking).toHaveLength(0);
  expect(p.openings.some(o=>o.mark==='MD')).toBe(true);expect(p.rooms.some(r=>r.autoAdded&&r.type==='circulation')).toBe(true);
  expect(p.adjustments.length).toBeGreaterThan(0);expect(p.compass.north).toEqual({x:0,y:1});
 });
 it.each(['East','West','North','South'])('round trips cardinal coordinates for %s',facing=>{
  const p=layoutEngine(brief(40,60,facing)),s=siteCalc(p.input);
  for(const [x,y] of [[0,0],[1234,5678],[p.view.width,p.view.depth]]){const w=s.toWorld(x,y);expect(s.toView(w.x,w.y)).toEqual({x,y});}
  expect(validate(p).valid).toBe(true);
 });
 it('rejects the exact reference toilet conflict instead of certifying it',()=>{
  const r=brief();r.rooms.push({name:'Reference combined toilet',type:'bathroom',lengthFt:6.5,widthFt:4,storeyIndex:0});
  expect(()=>layoutEngine(r)).toThrow(/2.8 m²/);
 });
 it('refuses an infeasible narrow plot explicitly',()=>expect(()=>layoutEngine(brief(20,50))).toThrow(/frontage/));
 it('fits a 30 × 40 North single-bedroom programme',()=>{const r=brief(30,40,'North');r.rooms=r.rooms.filter((room,i)=>i<3||room.type==='bathroom');expect(validate(layoutEngine(r)).valid).toBe(true);});
 it('aligns calculated stairs across two floors',()=>{const r=brief(40,60,'West');r.building.floors=2;r.rooms=r.rooms.filter((room,i)=>i<3||room.type==='bathroom');r.rooms.push(...r.rooms.map(room=>({...room,name:room.name+' upper',storeyIndex:1})));const p=layoutEngine(r);expect(validate(p).valid).toBe(true);expect(p.stairs).toHaveLength(2);expect(p.stairs[0].riser).toBeLessThanOrEqual(190);expect(p.stairs[0].x).toBe(p.stairs[1].x);expect(p.stairs[0].y).toBe(p.stairs[1].y);});
 it('places two explicitly requested cars only where they fit',()=>{
  const r=brief(40,70,'West');r.site.setbackFrontFt=18;
  r.rooms.push(...[1,2].map(i=>({name:`Car Parking ${i}`,type:'parking',storeyIndex:0,lengthFt:18,widthFt:10})));
  const p=layoutEngine(r);expect(p.parking).toHaveLength(2);expect(validate(p).issues).toEqual([]);
  r.site.setbackFrontFt=6.5;expect(()=>layoutEngine(r)).toThrow(/parking does not fit/);
 });
 it('detects corruption before drawing or exporting',()=>{
  const p=layoutEngine(brief());p.rooms[1].x=p.rooms[2].x;p.rooms[1].y=p.rooms[2].y;
  expect(validate(p).valid).toBe(false);expect(()=>sheets(p)).toThrow();expect(()=>dxf(p)).toThrow();
 });
 it('detects missing entrance connectivity',()=>{const p=layoutEngine(brief());p.openings=p.openings.filter(o=>o.mark!=='MD');expect(validate(p).issues.some(s=>s.includes('route'))).toBe(true);});
 it('preserves the same geometry in BIM and passes the saved programme audit',()=>{
  const r=brief(),m=generate(r);expect(m.metadata.cadPlan.validation.valid).toBe(true);expect(auditProgram(m,r)).toEqual({matches:true,issues:[]});
  expect(m.metadata.houseModel.floors[0].rooms.length).toBe(m.metadata.cadPlan.rooms.length);
 });
 it('writes R2018 millimetre DXF with real dimensions and fixture blocks',()=>{
  const p=layoutEngine(brief()),out=dxf(p);
  expect(out).toContain('AC1032');expect(out).toContain('DIMENSION');expect(out).toContain('INSERT');
  for(const layer of Object.keys(require('../src/cad/rules/tnbc').layers))expect(out).toContain(layer);
  for(const dim of dimensions(p))expect(Math.round(Math.hypot(dim.a.x-dim.b.x,dim.a.y-dim.b.y))).toBe(dim.value);
 });
 it('generates four vector sheets and PDF, escaping project and room labels',async()=>{
  const r=brief();r.projectName='<script>alert(1)</script>';const p=layoutEngine(r),pages=sheets(p);
  expect(pages).toHaveLength(4);expect(pages[0].svg).not.toContain('<script>');expect(pages[0].svg).toContain('&lt;script&gt;');
  const bytes=await pdf(p);expect(bytes.subarray(0,4).toString()).toBe('%PDF');
 });
});

describe('multi-floor stairwell geometry',()=>{
 function multi(floors,facing='East',roofAccess=false){const r=brief(40,60,facing);r.building.floors=floors;r.building.stairsRequested=roofAccess;r.rooms=r.rooms.filter((room,i)=>i<3||room.type==='bathroom');const base=r.rooms;r.rooms=Array.from({length:floors},(_,floor)=>base.map(room=>({...room,name:room.name+' '+floor,storeyIndex:floor}))).flat();return r;}
 it.each(['East','West','North','South'])('saves three floors, aligned voids and net slab quantities facing %s',facing=>{
   const model=generate(multi(3,facing)),p=model.metadata.cadPlan,h=model.metadata.houseModel;
   expect(p.validation.valid).toBe(true);expect(p.slabOpenings).toHaveLength(2);
   expect(h.floors[0].slab.holes).toHaveLength(0);expect(h.floors[1].slab.holes).toHaveLength(1);expect(h.floors[2].slab.holes).toEqual(h.floors[1].slab.holes);
   expect(h.floors[2].stairs).toHaveLength(0);expect(h.roof.holes).toHaveLength(0);
   expect(auditProgram(model,multi(3,facing)).matches).toBe(true);
   const floor=h.floors[1],hole=floor.slab.holes[0],area=(hole[1].x-hole[0].x)*(hole[2].y-hole[1].y);
   const slab=model.elements.find(e=>e.type==='Slab'&&e.properties.storeyIndex===1);
   expect(slab.quantity.areaM2).toBeCloseTo(floor.footprint.widthM*floor.footprint.depthM-area,2);
   expect(slab.quantity.volumeM3).toBeCloseTo((floor.footprint.widthM*floor.footprint.depthM-area)*.15,3);
   expect(slab.geometry.holes).toEqual(floor.slab.holes);
   const space=model.elements.find(e=>e.type==='Room'&&e.properties.storeyIndex===1&&e.properties.roomType==='stair');expect(space.geometry.holes).toEqual(slab.geometry.holes);
 });
 it('creates a roof opening only when roof access is selected',()=>{const m=generate(multi(2,'North',true));expect(m.metadata.houseModel.roof.holes).toHaveLength(1);expect(m.elements.find(e=>e.type==='Roof').geometry.holes).toHaveLength(1);expect(m.metadata.houseModel.floors[1].stairs).toHaveLength(1);});
 it('rejects missing, shifted, duplicate and orphan stair openings before export',()=>{
   for(const corrupt of [p=>p.slabOpenings=[],p=>p.slabOpenings[0].x+=50,p=>p.slabOpenings.push({...p.slabOpenings[0]}),p=>p.slabOpenings[0].floor=0]){
     const p=layoutEngine(multi(2));corrupt(p);expect(validate(p).valid).toBe(false);expect(()=>dxf(p)).toThrow();
   }
 });
 it('preserves holes through a saved JSON round trip',()=>{const m=generate(multi(2));const p=JSON.parse(JSON.stringify(m.toJSON())).metadata.cadPlan;expect(validate(p).valid).toBe(true);expect(sheets(p,{floor:1})).toHaveLength(4);});
});
