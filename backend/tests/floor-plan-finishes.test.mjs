import test from 'node:test';
import assert from 'node:assert/strict';
import {FINISHES,searchFinishes,normalizeFinish} from '../../frontend/js/floorplan/finishes.mjs';
import {referencePlan,rebuildWalls} from '../../frontend/js/floorplan/model.mjs';
import {buildModel,createFinishManager} from '../../frontend/js/floorplan/viewer.mjs';
test('catalogue codes are unique and searchable by name, code, HEX and texture',()=>{
 assert.equal(new Set(FINISHES.map(f=>f.code)).size,FINISHES.length);
 assert.deepEqual(searchFinishes('wd-001').map(f=>f.name),['Oak timber']);
 assert.equal(searchFinishes('#9aae94')[0].name,'Sage');assert.equal(searchFinishes('sage','tile').length,1);assert.equal(searchFinishes('nothing-like-this').length,0);
 assert.throws(()=>normalizeFinish({color:'red',texture:'paint'}));assert.throws(()=>normalizeFinish({color:'#123456',texture:'unknown'}));
});
test('applying a floor finish does not recolour another surface sharing the original material',()=>{
 const p=referencePlan(),{model}=buildModel(p),manager=createFinishManager(model,p),a=manager.surfaces.find(s=>s.key==='floor:master').meshes[0],b=manager.surfaces.find(s=>s.key==='floor:kids').meshes[0],original=a.material,other=b.material;
 manager.apply('floor:master',FINISHES[7]);assert.notEqual(a.material,original);assert.equal(a.material.color.getHexString(),'9aae94');assert.equal(b.material,other);
 manager.apply('floor:master',null);assert.equal(a.material,original);manager.dispose();
});
test('all fragments of a selected wall receive a finish and saved finishes restore',()=>{
 const p=referencePlan();const wall=p.walls.find(w=>p.openings.some(o=>o.wallId===w.id));p.finishes={['wall:'+wall.id]:FINISHES[8]};const {model}=buildModel(p),manager=createFinishManager(model,p),surface=manager.surfaces.find(s=>s.key==='wall:'+wall.id);assert.ok(surface.meshes.length>1);assert.ok(surface.meshes.every(m=>m.material.color.getHexString()==='355b4b'));assert.ok(manager.surfaces.some(s=>s.key==='roof'));manager.dispose();
});
test('geometry edits never transfer a wall finish to a different wall',()=>{const p=referencePlan(),w=p.walls[0];p.finishes={['wall:'+w.id]:FINISHES[0],'floor:master':FINISHES[7]};rebuildWalls(p);assert.ok(p.finishes['wall:'+w.id]);p.rooms.find(r=>r.id===w.owners[0]).y+=1;rebuildWalls(p);assert.equal(p.finishes['wall:'+w.id],undefined);assert.equal(p.finishes['floor:master'].code,'PNT-008');});
