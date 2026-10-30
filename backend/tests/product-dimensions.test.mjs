import test from 'node:test';
import assert from 'node:assert/strict';
import {referencePlan} from '../../frontend/js/floorplan/model.mjs';
import {makeFixture,fixtureSVG,validateFixtures} from '../../frontend/js/floorplan/interior/fixture-model.mjs';
import {fixtureSize,resizeFixture} from '../../frontend/js/floorplan/interior/dimensions.mjs';
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
