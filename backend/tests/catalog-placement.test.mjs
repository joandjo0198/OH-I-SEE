import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogProduct,productEstimate,parseProductDrop,suggestedShape,validateProduct} from '../../frontend/js/floorplan/interior/products.mjs';
import {referencePlan} from '../../frontend/js/floorplan/model.mjs';
import {makeFixture,validateFixtures,fixtureSVG} from '../../frontend/js/floorplan/interior/fixture-model.mjs';
import {buildModel} from '../../frontend/js/floorplan/viewer.mjs';
const product=()=>catalogProduct({id:123,brand:'Jaquar',product_name:'Wash basin',price:'1299.95'});
test('catalog drop retains brand and price through 2D, 3D and JSON reload',()=>{const p=referencePlan();const data=parseProductDrop(JSON.stringify({catalogId:'basin',product:product(),installation:'interior'}));const fixture=makeFixture(p,data.catalogId,7,26);fixture.props.product=data.product;p.fixtures=[fixture];assert.deepEqual(validateFixtures(p),[]);assert.match(fixtureSVG(p),/Jaquar/);assert.equal(buildModel(p).model.getObjectByName('Placed fixtures').children.length,1);const loaded=JSON.parse(JSON.stringify(p));assert.equal(loaded.fixtures[0].props.product.unitPrice,1299.95);assert.equal(productEstimate([loaded]).total,1299.95);});
test('project costs sum floor drafts, duplicates and base allowance without decimal drift',()=>{const a={fixtures:[{props:{product:product()}},{props:{product:product()}}],costEstimate:{baseCost:10000}},b={fixtures:[{props:{product:product()}}]};assert.equal(productEstimate([a,b]).total,13899.85);a.fixtures.pop();assert.equal(productEstimate([a,b]).total,12599.9);a.fixtures=[];b.fixtures=[];assert.equal(productEstimate([a,b]).total,10000);});
test('unknown prices remain unpriced; zero prices are valid; malformed prices rejected',()=>{assert.equal(catalogProduct({product_name:'Basin',price:null}).unitPrice,undefined);assert.equal(catalogProduct({product_name:'Basin',price:0}).unitPrice,0);assert.equal(validateProduct({...product(),unitPrice:-1}),false);assert.equal(validateProduct({...product(),unitPrice:'123'}),false);assert.equal(validateProduct({...product(),currency:'USD'}),false);assert.equal(productEstimate([{fixtures:[{props:{product:catalogProduct({product_name:'Unknown'})}}]}]).unpriced,1);});
test('drop validation rejects invalid shapes, metadata and installation',()=>{assert.throws(()=>parseProductDrop('{'));for(const data of [{catalogId:'invalid',product:product(),installation:'interior'},{catalogId:'basin',product:{...product(),unitPrice:-5},installation:'interior'},{catalogId:'basin',product:product(),installation:'bad'}])assert.throws(()=>parseProductDrop(JSON.stringify(data)));assert.equal(suggestedShape({product_name:'Ceramic Wash Basin'}),'basin');assert.equal(suggestedShape({product_name:'Unspecified hardware'}),'catalog-product');});

test('native product drops in 2D and 3D keep prices and clear metadata for plain fixtures',async()=>{
 const {PlacementController}=await import('../../frontend/js/floorplan/interior/PlacementController.js');
 const handlers={};const hosts=Object.fromEntries(['plan-host','model-host','interior-host'].map(id=>[id,{addEventListener(t,fn){handlers[id+':'+t]=fn;},querySelector(){return {getScreenCTM:()=>({inverse:()=>({})})};},querySelectorAll(){return [];}}]));
 const previous={document:globalThis.document,window:globalThis.window,DOMPoint:globalThis.DOMPoint};
 globalThis.document={getElementById:id=>hosts[id]};globalThis.window={addEventListener(){}};globalThis.DOMPoint=class {constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}};
 try{const plan=referencePlan();plan.fixtures=[];const errors=[];PlacementController({getPlan:()=>plan,getViewer:()=>({pick:()=>({x:7,y:26})}),getInterior:()=>null,commit:fixtures=>{plan.fixtures=fixtures;},select(){},notify(message,error){if(error)errors.push(message);}});
 const drop=(host,data)=>handlers[host+':drop']({clientX:7,clientY:26,preventDefault(){},stopPropagation(){},target:{closest:()=>null},dataTransfer:{getData:type=>data[type]||''}});
 const payload={'application/ohisee-product':JSON.stringify({catalogId:'basin',product:product(),installation:'interior'})};
 drop('plan-host',payload);drop('model-host',payload);assert.deepEqual(errors,[]);assert.equal(plan.fixtures.length,2);assert.equal(productEstimate([plan]).total,2599.9);
 drop('model-host',{'application/ohisee-fixture':'sofa'});assert.equal(plan.fixtures.at(-1).props.product,undefined);assert.equal(productEstimate([plan]).total,2599.9);
 }finally{Object.assign(globalThis,previous);}
});

test('hardware images have a default marker and preserve exact room drop coordinates',()=>{
 const p=referencePlan(),metadata=catalogProduct({id:9,brand:'Yale',product_name:'Cabinet D handle',price:730,image_url:'https://example.com/handle.png'});
 const id=suggestedShape({product_name:'Cabinet D handle'});assert.equal(id,'catalog-product');
 const f=makeFixture(p,id,7.13,26.17,true);f.props.product=metadata;p.fixtures=[f];
 assert.equal(f.position.x,7.13);assert.equal(f.position.y,26.17);assert.deepEqual(validateFixtures(p),[]);
 assert.match(fixtureSVG(p),/<image href="https:\/\/example.com\/handle.png"/);
 assert.equal(productEstimate([p]).total,730);
 assert.equal(validateProduct({...metadata,imageUrl:'javascript:alert(1)'}),false);
});
