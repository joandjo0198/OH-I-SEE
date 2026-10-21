import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compoundSegments} from '../../frontend/js/floorplan/compound.mjs';
import {referencePlan,rebuildWalls,validatePlan} from '../../frontend/js/floorplan/model.mjs';
import {editOpening} from '../../frontend/js/floorplan/opening-editor.mjs';
test('compound leaves exact gate gap on every plot side',()=>{
 const p=referencePlan();p.compound={enabled:true};
 for(const side of ['front','rear','left','right']){p.gate={side,offset:5,width:10};const parts=compoundSegments(p);assert.equal(parts.reduce((n,s)=>n+s.end-s.start,0),2*(p.plot.width+p.plot.depth)-10);}
 p.compound.enabled=false;assert.deepEqual(compoundSegments(p),[]);
});
test('window and ventilation keep room dimensions and doors after rebuilding',()=>{
 for(const [kind,sill,height]of [['window',3,4],['vent',7,1.5]]){
 const p=referencePlan();const next=editOpening(p,{roomId:'master',side:'left',offset:2,width:1.5,kind,sill,height});
 const doors=next.openings.filter(o=>o.kind==='door').length;rebuildWalls(next);
 assert.ok(next.openings.some(o=>o.custom&&o.kind===kind&&o.sill===sill));
 assert.ok(next.openings.some(o=>o.kind==='door'));assert.deepEqual(next.rooms,p.rooms);assert.deepEqual(validatePlan(next).errors,[]);
 }
});
