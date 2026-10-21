const test=require('node:test');
const assert=require('node:assert/strict');
const {assessBlueprint,zoneAt,policyFor,enforceAcceptance}=require('../src/bim/validation/blueprintAcceptance');
const FT=.3048;
function fixture(){return {site:{roadFacing:'North',buildable:{x:0,y:0,width:10,height:10}},elements:[
{id:'floor',type:'BuildingStorey',name:'Ground'},
{id:'slab',type:'Slab',quantity:{areaM2:100}},
{id:'room',type:'Room',name:'Living',storeyId:'floor',position:{x:0,y:0},dimensions:{lengthM:4,widthM:4},geometry:{roomType:'living'},quantity:{areaM2:16}},
{id:'wall',type:'Wall',properties:{exterior:true}},
{id:'window',type:'Window',storeyId:'floor',position:{x:0,y:2},geometry:{hostWallId:'wall'},dimensions:{widthM:2,heightM:1},properties:{openableFraction:.5}}
]};}
const req={building:{floors:1},rooms:[{name:'Living',type:'living',lengthFt:4/FT,widthFt:4/FT}]};
test('north zoning preserves frontage and depth axes',()=>{const b={x:0,y:0,width:10,height:20};assert.equal(zoneAt(9,1,b),'NE');assert.equal(zoneAt(1,19,b),'SW');assert.equal(zoneAt(5,10,b),'C');});
test('area cap is enforced even with Vastu off',()=>{const a=assessBlueprint(fixture(),req,{mode:'off',totalAreaSqFt:1000});assert.equal(a.passed,false);assert.ok(a.issues.some(i=>i.includes('exceeds the 1000')));assert.equal(a.vastu,null);});
test('external glazing and actual openable fraction checked independently',()=>{const m=fixture();let a=assessBlueprint(m,req);assert.ok(!a.issues.some(i=>i.includes('glazing')||i.includes('ventilation')));m.elements.at(-1).properties.openableFraction=.1;a=assessBlueprint(m,req);assert.ok(a.issues.some(i=>i.includes('below 5%')));delete m.elements.at(-1).properties.openableFraction;assert.ok(assessBlueprint(m,req).issues.some(i=>i.includes('unverified')));});
test('an internal window cannot satisfy external glazing',()=>{const m=fixture();m.elements.find(e=>e.id==='wall').properties.exterior=false;assert.ok(assessBlueprint(m,req).issues.some(i=>i.includes('glazing')));});
test('parking inside setbacks cannot silently pass',()=>{const m=fixture();m.elements.push({id:'park',type:'Room',name:'Car Parking',geometry:{roomType:'parking'},position:{x:0,y:-3},dimensions:{lengthM:5,widthM:3},quantity:{areaM2:15}});assert.ok(assessBlueprint(m,req).issues.some(i=>i.includes('Car Parking extends')));});
test('missing envelope and stairs remain failures',()=>{const m=fixture();delete m.site.buildable;m.elements.push({type:'Stair',name:'Stair',geometry:{riseM:3}});const a=assessBlueprint(m,req,{mode:'strict'});assert.equal(a.passed,false);assert.ok(a.issues.some(i=>i.includes('envelope')));assert.ok(a.issues.some(i=>i.includes('riser')));});
test('unverified checks never become a compliance claim',()=>{const a=assessBlueprint(fixture(),req,{mode:'strict'});assert.equal(a.assessment,'preliminary');assert.equal(a.vastu.provisional,true);assert.ok(a.unverified.length);assert.throws(()=>enforceAcceptance(a),e=>e.status===422&&e.message.includes('saved version was retained'));});
test('only explicit project policies activate the gate, model cannot weaken it',()=>{assert.equal(policyFor({},req),null);assert.deepEqual(policyFor({construction_context:{blueprintPolicy:{enabled:true,vastu:'strict',totalAreaSqFt:2000}}},{building:{builtUpAreaSqFt:3000}}),{mode:'strict',totalAreaSqFt:2000});});
