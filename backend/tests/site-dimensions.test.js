const {test}=require('node:test');
const assert=require('node:assert/strict');
const Site=require('../../frontend/js/planning/siteCalc');
const Land=require('../../frontend/js/land-site-model');
const Req=require('../../frontend/js/requirements-step-model');
const {fromProject}=require('../src/bim/generation/requirementsParser');
const land={plot_width_ft:32,plot_length_ft:55,road_facing:'East',setback_front_ft:6.5,setback_rear_ft:3.5,setback_left_ft:3.5,setback_right_ft:3.5};
test('reference site has one exact envelope across both wizard steps',()=>{
 const s=Site.fromLand(land);assert.equal(s.envelopeWidth,25);assert.equal(s.envelopeDepth,45);assert.equal(s.buildableArea,1125);
 assert.equal(Land.calcBuildable(land).buildable_area,1125);
 const req=Req.defaults({floors:'Ground Floor Only'},land);
 assert.equal(Req.areaValidation(req).footprint,1125);assert.equal(Req.areaValidation(req).capacity,1125);
 assert.equal(Site.formatFeet(11.25),'11′ 3″');
});
test('missing and impossible setbacks are rejected',()=>{
 assert.throws(()=>Site.computeSite({width:32,length:55},{front:6.5,rear:3.5,left:3.5}),/required/);
 assert.throws(()=>Site.fromLand({...land,setback_left_ft:30}),/no positive/);
 assert.throws(()=>Site.fromLand({...land,setback_left_ft:-1}),/non-negative/);
});
test('site cases retain all four setbacks without float tails',()=>{
 for(const [w,d,f] of [[30,40,'North'],[40,60,'West'],[20,50,'South']]) {
  const s=Site.fromLand({...land,plot_width_ft:w,plot_length_ft:d,road_facing:f});
  assert.equal(s.buildableArea,(w-7)*(d-10));
  assert.doesNotMatch(JSON.stringify(s),/999999|0000001/);
 }
});
test('auto dimensions reach the backend without being replaced by generic proportions',()=>{
 const req={...Req.defaults({floors:'Ground Floor Only'},land),qty_bedrooms:2,qty_bathrooms:2,qty_pooja:1,car_parking:0,two_wheeler_parking:0};
 const proposal=Req.autoRoomSizes(req);
 assert.deepEqual(proposal.dimensions.size_dining,[12,8]);
 const parsed=fromProject({construction_context:{landSite:land,projectRequirements:{...req,...proposal.sizes,room_dimensions:proposal.dimensions}}});
 const dining=parsed.rooms.find(r=>r.type==='dining');assert.equal(dining.lengthFt,12);assert.equal(dining.widthFt,8);
 assert.equal(parsed.rooms.filter(r=>r.type==='parking').length,0);
 const model=require('../src/bim/generation/requirementsToBim').generate(parsed);
 const rooms=model.elements.filter(e=>e.type==='Room');
 const actualDining=rooms.find(r=>r.name==='Dining');
 assert.ok(Math.abs(actualDining.dimensions.lengthM*actualDining.dimensions.widthM/0.3048**2-96)<0.05);
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++) {
  const a=rooms[i],b=rooms[j],ad=a.dimensions,bd=b.dimensions;
  assert.ok(a.position.x+ad.lengthM<=b.position.x+0.001 || b.position.x+bd.lengthM<=a.position.x+0.001 || a.position.y+ad.widthM<=b.position.y+0.001 || b.position.y+bd.widthM<=a.position.y+0.001,`${a.name} overlaps ${b.name}`);
 }
});
