const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fromProject}=require('../src/bim/generation/requirementsParser');
const {generate}=require('../src/bim/generation/requirementsToBim');
const {auditProgram}=require('../src/bim/validation/programAudit');
function brief(){return fromProject({construction_context:{
landSite:{plot_length_ft:140,plot_width_ft:70,setback_front_ft:20,setback_rear_ft:15,setback_left_ft:10,setback_right_ft:10},
projectRequirements:{floors:'G+1',qty_bedrooms:5,qty_bathrooms:5,size_living:734,size_kitchen:419,size_dining:419,size_master_bedroom:629,size_bedroom_2:524,car_parking:'2 Car'}
}});}
test('9800 sqft plot preserves requested rooms, parking and stacked stairs',()=>{
 const req=brief(), model=generate(req);
 assert.deepEqual(auditProgram(model,req),{matches:true,issues:[]});
 const stairs=model.elements.filter(e=>e.type==='Stair');
 assert.equal(stairs.length,2);
 assert.equal(stairs[0].position.x,stairs[1].position.x);
 assert.equal(stairs[0].position.y,stairs[1].position.y);
 const rooms=model.elements.filter(e=>e.type==='Room');
 for(const stair of stairs) for(const r of rooms.filter(r=>r.storeyId===stair.storeyId)){
  const a=stair.position,b=r.position;
  assert.ok(a.x+stair.dimensions.lengthM<=b.x+.01 || b.x+r.dimensions.lengthM<=a.x+.01 || a.y+stair.dimensions.widthM<=b.y+.01 || b.y+r.dimensions.widthM<=a.y+.01);
 }
});
test('impossible explicitly sized rooms fail without mutating the brief',()=>{
 const req=brief();req.rooms[0].lengthFt=200;
 const before=JSON.stringify(req);
 assert.throws(()=>generate(req),/does not fit/);
 assert.equal(JSON.stringify(req),before);
});
