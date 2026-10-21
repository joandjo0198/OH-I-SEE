import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {referencePlan,validatePlan,generatePlan,wallPieces} from '../../frontend/js/floorplan/model.mjs';
import {buildModel} from '../../frontend/js/floorplan/viewer.mjs';
import {planSVG} from '../../frontend/js/floorplan/plan-svg.mjs';
const require=createRequire(import.meta.url),Ajv=require('ajv');
const schema=JSON.parse(fs.readFileSync(new URL('../src/schemas/floor-plan.schema.json',import.meta.url)));
const schemaCheck=new Ajv({strict:false}).compile(schema);
const input={width:32,depth:55,units:'ft',facing:'East',roadSide:'front',front:6.5,rear:3.5,left:3.5,right:3.5,bedrooms:2,attached:1,common:1,dressing:2,kitchen:true,dining:true,living:true,drawing:true,puja:true,porch:true};
test('reference preserves every supplied nominal room dimension and plot area',()=>{
 const p=referencePlan();assert.equal(p.plot.width*p.plot.depth,1760);assert.deepEqual(validatePlan(p).errors,[]);assert.ok(schemaCheck(p),JSON.stringify(schemaCheck.errors));
 const expected={master:[11.25,20],common:[6.5,4],dress1:[4.25,4],attached:[6.5,4],dress2:[4.5,4],kids:[11.5,11],puja:[5,7],passage:[6,7.5],dining:[12,8],living:[11.5,9.25],kitchen:[11.25,10],drawing:[11.5,10],porch:[31,6.5]};
 for(const [id,size] of Object.entries(expected)){const r=p.rooms.find(r=>r.id===id);assert.deepEqual([r.width,r.depth],size,id);}
 assert.ok(p.rooms.find(r=>r.id==='master').y<p.rooms.find(r=>r.id==='kitchen').y);assert.ok(p.rooms.find(r=>r.id==='master').x<p.rooms.find(r=>r.id==='kids').x);
 for(const kind of ['main','door','pocket','window','vent'])assert.ok(p.openings.some(o=>o.kind===kind),kind);
});
test('door and window volumes are subtracted, including overlapping cuts',()=>{
 const w={id:'w',start:0,end:12},settings={wallHeight:10};const openings=[{wallId:'w',offset:1,width:3,sill:0,height:7},{wallId:'w',offset:6,width:4,sill:3,height:4}];const parts=wallPieces(w,openings,settings);
 assert.equal(parts.reduce((area,p)=>area+(p.end-p.start)*(p.top-p.bottom),0),120-21-16);
 const overlap=wallPieces(w,[openings[0],{...openings[0],offset:2}],settings);assert.equal(overlap.reduce((area,p)=>area+(p.end-p.start)*(p.top-p.bottom),0),120-28);
});
test('generated layout preserves counts, setbacks, adjacency and attached access',()=>{
 const p=generatePlan(input);assert.deepEqual(validatePlan(p).errors,[]);assert.ok(schemaCheck(p));
 assert.equal(p.rooms.filter(r=>r.type==='bedroom').length,2);assert.equal(p.rooms.filter(r=>r.type==='bathroom').length,2);assert.equal(p.rooms.filter(r=>r.type==='dressing').length,2);
 const kitchen=p.rooms.find(r=>r.type==='kitchen'),dining=p.rooms.find(r=>r.type==='dining');assert.equal(kitchen.x,dining.x);assert.ok(Math.abs(kitchen.y-(dining.y+dining.depth)-p.settings.internalWall)<.001);
 const bath=p.rooms.find(r=>r.name==='Attached toilet'),bed=p.rooms.find(r=>r.name==='Master bedroom');assert.equal(bath.x,bed.x);assert.ok(p.openings.some(o=>p.walls.find(w=>w.id===o.wallId)?.at===bath.y&&o.kind==='door'));
});
test('metric input produces the same geometry as feet',()=>{const metric={...input,units:'m'};for(const k of ['width','depth','front','rear','left','right'])metric[k]*=.3048;const a=generatePlan(input),b=generatePlan(metric);for(let i=0;i<a.rooms.length;i++)for(const k of ['x','y','width','depth'])assert.ok(Math.abs(a.rooms[i][k]-b.rooms[i][k])<1e-9);});
test('infeasible programmes and preferred sizes fail without silently resizing',()=>{
 assert.throws(()=>generatePlan({...input,width:15}),/wider|space/);assert.throws(()=>generatePlan({...input,bedrooms:1,attached:2}),/attached toilet/);assert.throws(()=>generatePlan({...input,preferred:'{"bedroom":[30,30]}'}),/does not fit/);assert.throws(()=>generatePlan({...input,bedrooms:8,attached:8,common:4,dressing:8}),/do not fit/);
});
test('all cardinal Vastu variants remain valid and put master opposite puja',()=>{for(const facing of ['East','West','North','South']){const p=generatePlan({...input,facing,vastu:true});assert.deepEqual(validatePlan(p).errors,[]);const bed=p.rooms.find(r=>r.name==='Master bedroom'),puja=p.rooms.find(r=>r.type==='puja');assert.notEqual(bed.x,puja.x);assert.ok(Math.abs(bed.y-puja.y)>15);}});
test('geometry validator rejects overlaps, non-finite rooms and invalid openings',()=>{
 const p=referencePlan();p.rooms[1].x=p.rooms[0].x;p.rooms[1].y=p.rooms[0].y;assert.ok(validatePlan(p).errors.some(e=>e.includes('overlaps')));
 const q=referencePlan();q.openings[0].width=100;assert.ok(validatePlan(q).errors.length);q.rooms[0].width=NaN;assert.ok(validatePlan(q).errors.some(e=>e.includes('finite')));
});
test('model uses feet-to-metre conversion, east-facing orientation and real geometry',()=>{
 const p=referencePlan(),{model,roof}=buildModel(p);assert.equal(model.rotation.y,Math.PI/2);assert.equal(roof.visible,false);assert.equal(model.getObjectByName('Kitchen counter'),undefined);assert.equal(model.getObjectByName('WC bowl'),undefined);assert.ok(model.getObjectByName('Main gate'));assert.ok(model.getObjectByName('Stair tread 18'));
 const floor=model.getObjectByName('Master bedroom floor');assert.ok(Math.abs(floor.geometry.parameters.width-11.25*.3048)<1e-9);let count=0;model.traverse(o=>{if(o.isMesh){count++;for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});assert.ok(count>100);
});
test('SVG export escapes labels and contains title, dimensions and road',()=>{const p=referencePlan();p.rooms[0].name='<script>alert(1)</script>';const svg=planSVG(p);assert.ok(!svg.includes('<script>'));assert.ok(svg.toLowerCase().includes('&lt;script&gt;'));assert.ok(svg.includes('1760 sqft'));assert.ok(svg.includes('ROAD'));});

