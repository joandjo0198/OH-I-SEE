import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {generatePlan} from '../src/cad/template-planner.mjs';
import {renderPlan} from '../../frontend/js/bim/template-renderer.mjs';
const cases=[{frontage:30,depth:40,facing:'North',parking:false},{frontage:40,depth:60,facing:'West',parking:false},{frontage:32,depth:55,facing:'East',parking:false,setbacks:{front:6.5,rear:3.5,left:3.5,right:3.5}}];
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
describe('Adaptive canonical plan',()=>{
 for(const input of cases)it(input.frontage+' × '+input.depth+' '+input.facing,()=>{
  const p=generatePlan(input),parts=p.rooms.flatMap(r=>r.parts);
  expect(p.area).toBe(p.envelope.w*p.envelope.h);
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)expect(overlap(parts[i],parts[j])).toBe(0);
  for(const r of parts){expect(Number.isInteger(r.x)).toBe(true);expect(r.w).toBeGreaterThan(0);expect(r.h).toBeGreaterThan(0);}
  for(const [from,to] of p.adjacencies)expect(p.doors.some(d=>d.from===from&&d.to===to)).toBe(true);
  for(const r of p.rooms.filter(r=>['bedroom','living','drawing','dining'].includes(r.type)))expect(p.windows.some(w=>w.roomId===r.id)||p.checks.some(c=>c.text.startsWith(r.name+':')&&c.status==='warning')).toBe(true);
  expect(p.tables.rooms.reduce((n,r)=>n+r.area,0)).toBeCloseTo(p.tables.total,3);
  expect(p.porch).toBeNull();expect(p.furniture.some(f=>f.type==='Car')).toBe(false);
  for(const d of p.doors){const w=p.walls.find(w=>w.id===d.wallId);expect(d.at-d.width/2-w.a).toBeGreaterThanOrEqual(12);expect(w.b-d.at-d.width/2).toBeGreaterThanOrEqual(12);}
  for(const w of p.windows)for(const d of p.doors.filter(d=>d.wallId===w.wallId))expect(Math.abs(d.at-w.at)).toBeGreaterThanOrEqual((d.width+w.width)/2);
  expect(renderPlan(p)).toContain(input.facing.toUpperCase()+' FACING ROAD');
  expect(renderPlan(p)).not.toMatch(/NaN|undefined/);
  expect(p.quantities.floorAreaSqFt).toBe(p.tables.total);
 });
 it('rejects infeasible dimensions with room shortfalls',()=>{try{generatePlan({frontage:20,depth:25,parking:false});throw new Error('accepted');}catch(e){expect(e.status).toBe(422);expect(e.details.length).toBeGreaterThan(0);}});
 it('never silently inserts an optional room',()=>expect(()=>generatePlan({...cases[0],optionalRooms:['office']})).toThrow(/No space/));
 it('rejects parking when no bay exists',()=>expect(()=>generatePlan({...cases[2],parking:true})).toThrow(/No space for a car/));
 it('keeps compass consistent with a bottom road',()=>{for(const [facing,north] of Object.entries({East:{x:1,y:0},West:{x:-1,y:0},North:{x:0,y:-1},South:{x:0,y:1}}))expect(generatePlan({...cases[1],facing}).compass.north).toEqual(north);});
});

it('frontend deployment copies match canonical sources',()=>{for(const name of ['template-planner.mjs','template-a-plan.mjs'])expect(readFileSync(new URL('../../frontend/js/bim/'+name,import.meta.url),'utf8').split('\n').slice(1).join('\n')).toBe(readFileSync(new URL('../src/cad/'+name,import.meta.url),'utf8'));});
