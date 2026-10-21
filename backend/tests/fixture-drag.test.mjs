import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlacementController} from '../../frontend/js/floorplan/interior/PlacementController.js';
import {makeFixture} from '../../frontend/js/floorplan/interior/fixture-model.mjs';
import {referencePlan} from '../../frontend/js/floorplan/model.mjs';
test('3D drag previews without saving until release, keeps rotation and cancels safely',()=>{
 const handlers={};const host=id=>({addEventListener(t,f){handlers[id+':'+t]=f;},setPointerCapture(){},querySelectorAll(){return [];}});
 const hosts=Object.fromEntries(['plan-host','model-host','interior-host'].map(id=>[id,host(id)]));
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 globalThis.document={getElementById:id=>hosts[id]};globalThis.window={addEventListener(t,f){handlers[t]=f;}};
 try{
 const p=referencePlan(),f=makeFixture(p,'dining-chair',8,10);f.rotation=90;p.fixtures=[f];let saved=0,preview;
 const viewer={pick:()=>({x:8,y:10,fixtureId:f.id}),dragPoint:(x,y)=>({x,y}),previewFixture:(id,pos)=>{preview=pos;},setDragging(){}};
 PlacementController({getPlan:()=>p,getViewer:()=>viewer,getInterior:()=>null,commit:next=>{p.fixtures=next;saved++;},select(){},notify(){}});
 const e=(x,y)=>({clientX:x,clientY:y,pointerId:1,stopImmediatePropagation(){}});
 handlers['model-host:pointerdown'](e(8,10));handlers['model-host:pointermove'](e(10,12));
 assert.equal(saved,0);assert.equal(preview.x,10);
 handlers['model-host:pointerup'](e(10,12));assert.equal(saved,1);assert.equal(p.fixtures[0].position.x,10);assert.equal(p.fixtures[0].rotation,90);
 handlers['model-host:pointerdown'](e(10,12));handlers['model-host:pointermove'](e(11,13));handlers['keydown']({key:'Escape'});assert.equal(saved,1);assert.equal(preview.x,10);
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
