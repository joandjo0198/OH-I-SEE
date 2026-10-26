import {describe,it,expect} from 'vitest';
import {generateTemplateA,ADJACENCIES,renderTemplateA} from '../../frontend/js/bim/template-a-plan.mjs';
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
describe('Phase 1 exact Template A',()=>{
 it('tiles 1428 sq ft with disjoint integer-inch cells and attached toilets counted once',()=>{
  const p=generateTemplateA(),parts=p.rooms.flatMap(r=>r.parts);
  expect(p.area).toBe(408*504);expect(p.tables.total).toBe(1428);
  expect(p.tables.rooms.reduce((sum,r)=>sum+r.area,0)).toBe(1428);
  expect(p.rooms.find(r=>r.id==='master').area/144).toBe(102);
  expect(p.rooms.find(r=>r.id==='bed2').area/144).toBe(91);
  for(const a of parts){for(const n of [a.x,a.y,a.w,a.h])expect(Number.isInteger(n)).toBe(true);expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x+a.w).toBeLessThanOrEqual(408);expect(a.y+a.h).toBeLessThanOrEqual(504);}
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)expect(overlap(parts[i],parts[j])).toBe(0);
 });
 it('places every requested opening on a shared wall with one foot corner clearance',()=>{
  const p=generateTemplateA();expect(p.doors.length).toBe(ADJACENCIES.length);
  for(const [from,to,kind] of ADJACENCIES){const d=p.doors.find(d=>d.from===from&&d.to===to);expect(d.kind).toBe(kind);const w=p.walls.find(w=>w.id===d.wallId);expect(w.rooms).toContain(to);if(from!=='road')expect(w.rooms).toContain(from);expect(d.at-d.width/2-w.a).toBeGreaterThanOrEqual(12);expect(w.b-d.at-d.width/2).toBeGreaterThanOrEqual(12);expect(w.solids.some(s=>d.axis==='h'?s.x<d.at&&s.x+s.w>d.at:s.y<d.at&&s.y+s.h>d.at)).toBe(false);}
 });
 it('keeps windows external and reports the impossible central dining window and common WC vent',()=>{
  const p=generateTemplateA();for(const w of p.windows)expect(p.walls.find(s=>s.id===w.wallId).exterior).toBe(true);
  for(const id of ['living','master','bed2','bed3','kitchen'])expect(p.windows.some(w=>w.roomId===id)).toBe(true);
  expect(p.checks.some(c=>c.status==='warning'&&c.text.startsWith('Dining / Hall:'))).toBe(true);
  expect(p.checks.some(c=>c.text.includes('Common Toilet: needs air shaft'))).toBe(true);
 });
 it('removes porch and car without changing the allocation when parking is off',()=>{
  const p=generateTemplateA({parking:false});expect(p.porch).toBeNull();expect(p.driveway).toBeNull();expect(p.rooms.some(r=>r.type==='parking')).toBe(false);expect(p.furniture.some(f=>f.type==='Car')).toBe(false);expect(p.rooms[0].name).toBe('Sit-out Garden');expect(p.tables.total).toBe(1428);expect(renderTemplateA(p)).not.toContain('Car Porch');
 });
 it('confines furniture to its room, avoids unintended fixture overlap, and flags short clearance',()=>{
  const p=generateTemplateA();for(const f of p.furniture){const room=p.rooms.find(r=>r.id===f.roomId);expect(room.parts.reduce((sum,r)=>sum+overlap(r,f),0),`${f.roomId} ${f.type}`).toBe(f.w*f.h);}
  for(let i=0;i<p.furniture.length;i++)for(let j=i+1;j<p.furniture.length;j++){const a=p.furniture[i],b=p.furniture[j];if((a.integrated&&b.type==='Counter')||(b.integrated&&a.type==='Counter'))continue;expect(overlap(a,b),`${a.type}/${b.type}`).toBe(0);}
  expect(p.checks.some(c=>c.text.includes('door-swing clearance'))).toBe(true);
 });
 it('renders the stored geometry without mutating the shared PlanObject',()=>{
  const p=generateTemplateA(),before=JSON.stringify(p),svg=renderTemplateA(p);expect(JSON.stringify(p)).toBe(before);for(const label of ['EAST FACING ROAD','ENTRY','MD','UP','ENVELOPE 34'])expect(svg).toContain(label);expect(p.compass.north).toEqual({x:1,y:0});
 });
 it('does not silently stretch or accept unsupported Phase 2/3 sites',()=>{
  expect(()=>generateTemplateA({frontage:30})).toThrow('Phase 1');expect(()=>generateTemplateA({facing:'North'})).toThrow('Phase 1');expect(()=>generateTemplateA({parking:'No'})).toThrow('Parking');
 });
});
