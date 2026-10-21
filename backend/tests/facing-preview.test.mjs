import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referencePlan} from '../../frontend/js/floorplan/model.mjs';
import {planSVG} from '../../frontend/js/floorplan/plan-svg.mjs';
test('cardinal facing rotates the drawing and fits quarter turns without changing geometry',()=>{
 const p=referencePlan(),before=JSON.stringify(p.rooms),views=new Set();
 for(const [facing,angle] of Object.entries({North:180,South:0,East:-90,West:90})){
 p.plot.facing=facing;const svg=planSVG(p);
 assert.ok(svg.includes('data-plan-geometry="true" transform="rotate('+angle+' '));
 const box=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
 assert.equal(box[2],Math.abs(angle)===90?p.plot.depth+12:p.plot.width+8);
 views.add(svg);assert.equal(JSON.stringify(p.rooms),before);
 }
 assert.equal(views.size,4);
});

test('room name and size share one upright block with separate baselines',()=>{
 const p=referencePlan();p.plot.facing='East';
 const svg=planSVG(p),blocks=[...svg.matchAll(/<g data-room-label="[^"]+"[^>]*>(.*?)<\/g>/gs)];
 assert.equal(blocks.length,p.rooms.length);
 for(const [,block]of blocks){const y=[...block.matchAll(/<text x="0" y="([^"]+)"/g)].map(m=>Number(m[1]));assert.ok(y.length>=2);for(let i=1;i<y.length;i++)assert.ok(y[i]>y[i-1]);}
 assert.ok(svg.indexOf(p.title.toUpperCase())>svg.lastIndexOf('data-room-label'));
});
