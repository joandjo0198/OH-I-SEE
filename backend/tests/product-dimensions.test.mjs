import test from 'node:test';
import assert from 'node:assert/strict';
import {referencePlan} from '../../frontend/js/floorplan/model.mjs';
import {makeFixture,fixtureSVG,validateFixtures} from '../../frontend/js/floorplan/interior/fixture-model.mjs';
import {fixtureSize,resizeFixture,resizeAtCursor,parkingPosition} from '../../frontend/js/floorplan/interior/dimensions.mjs';
import {fixtureGroup} from '../../frontend/js/floorplan/interior/fixtures3d.mjs';
import {catalogProduct,productEstimate} from '../../frontend/js/floorplan/interior/products.mjs';
test('independent product dimensions survive reload and match 2D and 3D without repricing',()=>{
 const plan=referencePlan(),f=makeFixture(plan,'catalog-product',7,26,true);
 f.props.product=catalogProduct({id:'basin',product_name:'Basin',price:730,image_url:'/images/cat-hardware.png'});
 const resized=resizeFixture(plan,f,[2,3,1.2]);plan.fixtures=[resized];assert.deepEqual(validateFixtures(plan),[]);
 assert.deepEqual(fixtureSize(JSON.parse(JSON.stringify(resized))),[2,3,1.2]);assert.equal(resized.position,f.position);
 assert.match(fixtureSVG(plan),/2.00 × 1.20 ft/);assert.equal(productEstimate([plan]).total,730);
 const g=fixtureGroup(plan).children[0];assert.ok(Math.abs(g.scale.x-2/1.5*.3048)<1e-9);assert.ok(Math.abs(g.scale.y-3/.4*.3048)<1e-9);assert.ok(Math.abs(g.scale.z-1.2/1.5*.3048)<1e-9);
});
test('invalid dimensions and sizes crossing the room are rejected without changing the original',()=>{
 const plan=referencePlan(),f=makeFixture(plan,'catalog-product',7,26,true),before=JSON.stringify(f);
 for(const dims of [[0,2,2],[-1,2,2],[Infinity,2,2],[51,2,2],[50,2,50]])assert.throws(()=>resizeFixture(plan,f,dims));
 assert.equal(JSON.stringify(f),before);plan.fixtures=[{...f,props:{...f.props,dimensions:[-1,2,2]}}];assert.ok(validateFixtures(plan).includes('Invalid product dimensions.'));
});

test('cursor resizing respects rotation, keeps height and centre, and does not mutate the original',()=>{
 const plan=referencePlan(),f=makeFixture(plan,'queen-bed',7,26,true);f.rotation=90;const before=JSON.stringify(f);
 const resized=resizeAtCursor(plan,f,{x:f.position.x-2,y:f.position.y+1.5});
 assert.ok(fixtureSize(resized).every((v,i)=>Math.abs(v-[3,2,4][i])<1e-9));assert.deepEqual(resized.position,f.position);assert.equal(resized.rotation,90);assert.equal(JSON.stringify(f),before);
 assert.match(fixtureSVG({fixtures:[resized]},{handles:true}),/data-fixture-resize/);
 assert.doesNotMatch(fixtureSVG({fixtures:[resized]}),/data-fixture-resize/);
});
test('vehicles place in outdoor space, persist and reject plot edges or indoor overlap',()=>{
 const plan={plot:{width:40,depth:60},rooms:[{id:'house',x:10,y:10,width:20,depth:30,type:'living'}],settings:{wallHeight:10}};
 for(const id of ['car','motorbike','bicycle']){
 const f=makeFixture(plan,id,5,50,true);assert.equal(f.props.installation,'exterior');plan.fixtures=[f];assert.deepEqual(validateFixtures(plan),[]);
 assert.equal(fixtureGroup(plan).children.length,1);assert.match(fixtureSVG(plan),/rect/);
 assert.throws(()=>parkingPosition(plan,{size:fixtureSize(f)},20,20));assert.throws(()=>parkingPosition(plan,{size:fixtureSize(f)},0,0));
 assert.throws(()=>resizeFixture(plan,f,[20,4,20]));
 }
});
test('requested appliances have finite 2D and 3D geometry',()=>{
 const plan=referencePlan();for(const id of ['king-bed','queen-bed','tv-unit','plant-small','ceiling-fan','table-fan','pedestal-fan','refrigerator','washing-machine','dishwasher','oven','microwave','cooker']){
 plan.fixtures=[makeFixture(plan,id,7,26,true)];assert.deepEqual(validateFixtures(plan),[]);assert.doesNotMatch(fixtureSVG(plan),/NaN|undefined/);const group=fixtureGroup(plan);assert.equal(group.children.length,1);group.traverse(o=>{if(o.geometry)assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));});
 }
});
