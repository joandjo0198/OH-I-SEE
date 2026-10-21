import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referencePlan,rebuildWalls,validatePlan} from '../../frontend/js/floorplan/model.mjs';
import {editOpening} from '../../frontend/js/floorplan/opening-editor.mjs';
test('door relocation and swing preserve room requirements and survive rebuilding',()=>{
 const p=referencePlan(),r=p.rooms.find(r=>r.id==='master'),old=p.openings.find(o=>o.kind==='door'&&p.walls.find(w=>w.id===o.wallId)?.owners.includes(r.id));
 const before=JSON.stringify(p);
 const next=editOpening(p,{id:old?.id,roomId:r.id,side:'left',offset:2,width:2.5,swing:'outside',hinge:'end'});
 assert.equal(JSON.stringify(p),before);assert.deepEqual(next.rooms,p.rooms);assert.deepEqual(next.plot,p.plot);
 const d=next.openings.find(o=>o.custom);assert.equal(d.swingSign,-1);assert.equal(d.hinge,'end');
 rebuildWalls(next);assert.ok(next.openings.some(o=>o.custom&&o.hinge==='end'));assert.deepEqual(validatePlan(next).errors,[]);
});
test('door outside a wall is rejected without resizing the room',()=>{
 const p=referencePlan();assert.throws(()=>editOpening(p,{roomId:'master',side:'left',offset:100,width:3}),/fit completely/);
});
