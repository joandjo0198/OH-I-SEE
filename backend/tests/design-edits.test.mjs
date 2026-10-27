import {makeFixture} from '../../frontend/js/floorplan/interior/fixture-model.mjs';
import {describe,it,expect} from 'vitest';
import {rotateRoom,resizeRoomArea,addRoom,moveOpening,promptEdit} from '../../frontend/js/floorplan/design-edits.mjs';
import {referencePlan,rebuildWalls,validatePlan} from '../../frontend/js/floorplan/model.mjs';
function fixture(){const p={schemaVersion:1,title:'Test',units:'ft',source:'form',plot:{width:50,depth:50,facing:'East',roadSide:'front',setbacks:{left:2,right:2,front:2,rear:2}},settings:{externalWall:.75,internalWall:.375,wallHeight:10,doorHeight:7,windowSill:3,windowHeight:4},rooms:[{id:'living',name:'Living room',type:'living',x:10,y:10,width:12,depth:10}],walls:[],openings:[],fixtures:[],warnings:[]};rebuildWalls(p);return p;}
describe('transactional layout edits',()=>{
it('rotates around centre and preserves opening count, area and original',()=>{const p=fixture(),saved=JSON.stringify(p),r=rotateRoom(p,'living');expect(r.rooms[0]).toMatchObject({x:11,y:9,width:10,depth:12});expect(r.openings.length).toBe(p.openings.length);expect(validatePlan(r).errors).toEqual([]);expect(JSON.stringify(p)).toBe(saved);});
it('four turns restore room bounds',()=>{let p=fixture();for(let i=0;i<4;i++)p=rotateRoom(p,'living');expect(p.rooms[0]).toMatchObject({x:10,y:10,width:12,depth:10});});
it('resizes area while retaining width',()=>{const p=resizeRoomArea(fixture(),'living',144);expect(p.rooms[0].width*p.rooms[0].depth).toBe(144);expect(validatePlan(p).errors).toEqual([]);});
it('rejects a rotation that hits a neighbour',()=>{const p=fixture();p.rooms.push({id:'b',name:'Bedroom',type:'bedroom',x:11,y:2,width:10,depth:8});rebuildWalls(p);expect(()=>rotateRoom(p,'living')).toThrow(/overlaps/);});
it('adds a room in free space without overlap',()=>{const p=addRoom(fixture(),'Study',10,10);expect(p.rooms.length).toBe(2);expect(validatePlan(p).errors).toEqual([]);});
it('reports no space rather than stacking rooms',()=>expect(()=>addRoom(fixture(),'Study',48,48)).toThrow(/No space/));
it('moves opening to another wall and rejects off-wall drop',()=>{const p=fixture(),o=p.openings[0],w=p.walls.find(w=>w.id!==o.wallId);const n=moveOpening(p,o.id,w.id,(w.start+w.end)/2);expect(n.openings.find(o=>o.custom).wallId).toBe(w.id);expect(()=>moveOpening(p,o.id,w.id,w.end+10)).toThrow(/fit completely/);});
it('supports explicit prompt grammar without mutating original',()=>{const p=fixture();expect(promptEdit(p,'Increase Living room by 24 sqft').plan.rooms[0].depth).toBe(12);expect(promptEdit(p,'Decrease Living room by 24 sqft').plan.rooms[0].depth).toBe(8);expect(promptEdit(p,'Rotate Living room 90 degrees').plan.rooms[0].width).toBe(10);expect(promptEdit(p,'Add room Study 10 x 10 ft').plan.rooms.length).toBe(2);expect(p.rooms.length).toBe(1);});
it('rejects unknown and ambiguous commands',()=>{expect(()=>promptEdit(fixture(),'make it beautiful')).toThrow(/not recognized/);expect(()=>promptEdit(fixture(),'Set Lounge to 100 sqft')).toThrow(/exact room name/);});
it('adds door/window with explicit wall and offset',()=>{const p=fixture();const r=promptEdit(p,'Add window to Living room top offset 1 width 3');expect(r.plan.openings.length).toBe(p.openings.length+1);});
});

describe('rotation and rejection integrity',()=>{
it('rotates fixture positions and restores door geometry after four turns',()=>{const p=fixture();p.fixtures=[makeFixture(p,'sofa',13,13)];let n=p;for(let i=0;i<4;i++)n=rotateRoom(n,'living');expect(n.fixtures[0].position).toEqual(p.fixtures[0].position);for(const o of p.openings){const a=p.walls.find(w=>w.id===o.wallId),b=n.openings.find(v=>v.id===o.id),w=n.walls.find(w=>w.id===b.wallId);expect(w.axis).toBe(a.axis);expect(w.at).toBe(a.at);expect(w.start+b.offset).toBe(a.start+o.offset);expect(b.hinge).toBe(o.hinge||'start');}});
it('leaves the original unchanged when area crosses boundaries',()=>{const p=fixture(),saved=JSON.stringify(p);expect(()=>resizeRoomArea(p,'living',1200)).toThrow();expect(JSON.stringify(p)).toBe(saved);});
it('rejects placing a second opening on an occupied opening',()=>{const p=fixture(),o=p.openings[0],w=p.walls.find(w=>w.id===o.wallId),r=p.rooms[0],side=w.axis==='h'?(w.at===r.y?'top':'bottom'):(w.at===r.x?'left':'right'),offset=w.start+o.offset-(w.axis==='h'?r.x:r.y);expect(()=>promptEdit(p,`Add door to Living room ${side} offset ${offset} width ${o.width}`)).toThrow(/overlaps/);});
});

it('allows correcting the reference draft without worsening existing opening conflicts',()=>{const p=referencePlan();expect(()=>promptEdit(p,'Decrease Kitchen by 10 sqft')).not.toThrow();});

describe('selected room prompt operations',()=>{
it('adds all requested furniture with distinct bed sizes',()=>{for(const name of ['TV','table','pot','king size bed','queen size bed']){const p=fixture(),n=promptEdit(p,'Add a '+name,'living').plan;expect(n.fixtures).toHaveLength(1);expect(n.fixtures[0].roomId).toBe('living');expect(p.fixtures).toHaveLength(0);}});
it('supports selected room area and room addition',()=>{expect(promptEdit(fixture(),'Increase area by 24 sqft','living').plan.rooms[0].depth).toBe(12);expect(promptEdit(fixture(),'Add a bedroom','living').plan.rooms).toHaveLength(2);});
it('adds and deletes a window from selected room',()=>{const p=fixture();p.openings=[];const n=promptEdit(p,'Add a window to selected room','living').plan;expect(n.openings).toHaveLength(1);expect(promptEdit(n,'Delete a window','living').plan.openings).toHaveLength(0);});
it('requires a number when deletion is ambiguous',()=>{const p=fixture();p.openings=[];const a=promptEdit(p,'Add a door','living').plan,b=promptEdit(a,'Add a door','living').plan;expect(()=>promptEdit(b,'Delete a door','living')).toThrow(/Specify a number/);const n=promptEdit(b,'Delete door 2 from selected room','living').plan;expect(n.openings).toHaveLength(1);expect(n.openings[0].id).toBe(b.openings[0].id);});
it('multiple commands are atomic when a later command fails',()=>{const p=fixture(),saved=JSON.stringify(p);expect(()=>promptEdit(p,'Add a TV; destroy house','living')).toThrow();expect(JSON.stringify(p)).toBe(saved);});
it('rejects furniture when room is too small',()=>{const p=fixture();p.rooms[0].width=3;p.rooms[0].depth=3;rebuildWalls(p);expect(()=>promptEdit(p,'Add a king size bed','living')).toThrow(/No clear space/);});
it('places successive furniture without overlapping',()=>{const n=promptEdit(fixture(),'Add a queen size bed; Add a table; Add a pot','living').plan;expect(n.fixtures).toHaveLength(3);expect(new Set(n.fixtures.map(f=>f.position.x+','+f.position.y)).size).toBe(3);});
});

describe('inside and outside staircase prompts',()=>{
it('carves an inside stair from selected room without overlapping it',()=>{const p=fixture();p.openings=[];const n=promptEdit(p,'Add inside staircase 3 x 8 ft','living').plan;expect(n.rooms[0].width).toBe(9);expect(n.rooms[1]).toMatchObject({type:'stairs',placement:'inside',x:19,y:10,width:3,depth:8});expect(validatePlan(n).errors).toEqual([]);expect(p.rooms[0].width).toBe(12);});
it('places outside stairs beside building without changing rooms or openings',()=>{const p=fixture(),n=promptEdit(p,'Add outside staircase 3 x 8 ft on right','living').plan;expect(n.rooms[1]).toMatchObject({x:22,y:10,width:3,depth:8,placement:'outside'});expect(n.rooms[0]).toEqual(p.rooms[0]);expect(n.openings).toEqual(p.openings);expect(validatePlan(n).errors).toEqual([]);});
it('supports each exterior side',()=>{for(const side of ['left','right','top','bottom'])expect(promptEdit(fixture(),'Add outside staircase 3 x 8 ft on '+side,'living').plan.rooms).toHaveLength(2);});
it('rejects impossible interior and exterior stairs without changing draft',()=>{const p=fixture(),saved=JSON.stringify(p);expect(()=>promptEdit(p,'Add inside staircase 30 x 30 ft','living')).toThrow(/does not fit/);expect(()=>promptEdit(p,'Add outside staircase 60 x 12 ft on left','living')).toThrow(/No space/);expect(JSON.stringify(p)).toBe(saved);});
it('rejects carving stairs through placed furniture',()=>{const p=fixture();p.openings=[];p.fixtures=[makeFixture(p,'plant-small',21,15)];expect(()=>promptEdit(p,'Add inside staircase 3 x 8 ft','living')).toThrow(/Fixture must remain/);});
});
