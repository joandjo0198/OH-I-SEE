import {clone,rebuildWalls,validatePlan,envelope} from './model.mjs';
import {editOpening} from './opening-editor.mjs';
import {validateFixtures} from './interior/fixture-model.mjs';
const snap=n=>Math.round(n*4)/4;
const intersect=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.02&&Math.min(a.y+a.depth,b.y+b.depth)-Math.max(a.y,b.y)>.02;
export function validateEdit(before,next){
 const existing=new Set(validatePlan(before).errors);
 const errors=validatePlan(next).errors.filter(e=>!existing.has(e));
 for(let i=0;i<next.openings.length;i++)for(let j=i+1;j<next.openings.length;j++){
  const a=next.openings[i],b=next.openings[j];
  if(a.wallId===b.wallId&&Math.max(a.offset,b.offset)<Math.min(a.offset+a.width,b.offset+b.width)-.01)errors.push('Doors or windows overlap.');
 }
 errors.push(...validateFixtures(next));
 if(errors.length)throw Error('Change not applied: '+errors.join(' '));
 return next;
}
function findRoom(p,name){const n=name.toLowerCase().trim(),matches=p.rooms.filter(r=>r.name.toLowerCase()===n||r.id.toLowerCase()===n);if(matches.length!==1)throw Error('Use the exact room name shown in the room list: '+name);return matches[0];}
function rebuildPreserving(before,next,roomId,transform){
 const saved=[];
 for(const o of before.openings){const w=before.walls.find(w=>w.id===o.wallId);if(!w)continue;const a=w.start+o.offset,b=a+o.width;let points=w.axis==='h'?[{x:a,y:w.at},{x:b,y:w.at}]:[{x:w.at,y:a},{x:w.at,y:b}];
  const owner=o.roomId||w.owners[0];
  if(owner===roomId)points=points.map(transform);
  saved.push({o,owner,points,oldAxis:w.axis});
 }
 next.openings=[];rebuildWalls(next);next.openings=[];
 for(const {o,owner,oldAxis,points:[a,b]} of saved){
  const axis=Math.abs(a.y-b.y)<.001?'h':'v',at=axis==='h'?a.y:a.x,start=axis==='h'?Math.min(a.x,b.x):Math.min(a.y,b.y),end=axis==='h'?Math.max(a.x,b.x):Math.max(a.y,b.y);
  const w=next.walls.find(w=>w.axis===axis&&Math.abs(w.at-at)<.01&&w.start<=start+.001&&w.end>=end-.001&&w.owners.includes(owner));
  if(!w)throw Error('This room change would remove an existing door or window. Move or remove that opening first.');
  const r=next.rooms.find(r=>r.id===owner),side=axis==='h'?(Math.abs(at-r.y)<.01?'top':'bottom'):(Math.abs(at-r.x)<.01?'left':'right');
  const reversed=axis==='h'?a.x>b.x:a.y>b.y;
  const hinge=reversed?(o.hinge==='end'?'start':'end'):(o.hinge||'start');
  const oldSign=o.swingSign||(oldAxis==='h'?-1:1);
  const swingSign=owner===roomId&&oldAxis!==axis?(oldAxis==='h'?-oldSign:oldSign):oldSign;
  next.openings.push({...o,wallId:w.id,offset:start-w.start,width:end-start,roomId:owner,side,roomOffset:start-(axis==='h'?r.x:r.y),custom:true,hinge,swingSign});
 }
 return next;
}
export function rotateRoom(p,id){
 const next=clone(p),r=next.rooms.find(r=>r.id===id);if(!r)throw Error('Select a room.');
 const cx=r.x+r.width/2,cy=r.y+r.depth/2,turn=point=>({x:cx-(point.y-cy),y:cy+(point.x-cx)});
 [r.width,r.depth]=[r.depth,r.width];r.x=cx-r.width/2;r.y=cy-r.depth/2;r.rotation=((r.rotation||0)+90)%360;
 for(const f of next.fixtures||[])if(f.roomId===id){Object.assign(f.position,turn(f.position));f.rotation=(f.rotation+90)%360;if(f.props.points)f.props.points=f.props.points.map(turn);}
 rebuildPreserving(p,next,id,turn);
 return validateEdit(p,next);
}
export function resizeRoomArea(p,id,area){
 if(!Number.isFinite(area)||area<1||area>90000)throw Error('Enter a positive room area in sq ft.');
 const next=clone(p),r=next.rooms.find(r=>r.id===id);if(!r)throw Error('Select a room.');
 const old={...r};r.depth=snap(area/r.width);
 if(r.depth<1)throw Error('Requested area is too small.');
 const transform=point=>({x:point.x,y:Math.abs(point.y-old.y-old.depth)<.01?r.y+r.depth:point.y});
 rebuildPreserving(p,next,id,transform);
 return validateEdit(p,next);
}
export function addRoom(p,name,width,depth){
 if(!name.trim()||name.length>100||p.rooms.some(r=>r.name.toLowerCase()===name.toLowerCase()))throw Error('Use a unique room name.');
 if(![width,depth].every(n=>Number.isFinite(n)&&n>=3&&n<=100))throw Error('Room dimensions must be 3–100 ft.');
 const next=clone(p),e=envelope(p);let slot;
 for(let y=e.y;y+depth<=e.y+e.depth+.001&&!slot;y+=.25)for(let x=e.x;x+width<=e.x+e.width+.001&&!slot;x+=.25){const r={x,y,width,depth};if(!p.rooms.some(b=>intersect(r,b)))slot=r;}
 if(!slot)throw Error('No space for '+name+' at '+width+' × '+depth+' ft. Resize or remove a room first.');
 const id='room-'+crypto.randomUUID();next.rooms.push({id,name,type:/office|study/i.test(name)?'office':/bath|toilet/i.test(name)?'bathroom':'bedroom',...slot});
 // Preserve old opening geometry; retain proposed openings only for the new room.
 const oldWalls=new Map(p.walls.map(w=>[w.id,w]));
 next.openings=[];rebuildWalls(next);
 const newOps=next.openings.filter(o=>next.walls.find(w=>w.id===o.wallId)?.owners.includes(id));
 next.openings=p.openings.map(o=>{const old=oldWalls.get(o.wallId),start=old.start+o.offset,w=next.walls.find(w=>w.axis===old.axis&&Math.abs(w.at-old.at)<.01&&w.start<=start&&w.end>=start+o.width);if(!w)throw Error('New room would invalidate an opening.');return {...o,wallId:w.id,offset:start-w.start};});
 next.openings.push(...newOps.filter(o=>!next.openings.some(v=>v.wallId===o.wallId)));
 return validateEdit(p,next);
}
export function moveOpening(p,id,wallId,center){
 const o=p.openings.find(o=>o.id===id),w=p.walls.find(w=>w.id===wallId);if(!o||!w)throw Error('Select a door/window and a wall.');
 const r=p.rooms.find(r=>r.id===(w.owners.includes(o.roomId)?o.roomId:w.owners[0]));
 const side=w.axis==='h'?(Math.abs(w.at-r.y)<.01?'top':'bottom'):(Math.abs(w.at-r.x)<.01?'left':'right');
 const start=snap(center-o.width/2);
 const next=editOpening(p,{...o,id,roomId:r.id,side,offset:start-(w.axis==='h'?r.x:r.y),swing:o.swing||'inside',kind:o.kind==='pocket'?'door':o.kind});
 return validateEdit(p,next);
}
export function promptEdit(p,text){
 const command=text.trim().replace(/[.!]$/,'');let m,next,summary;
 if(m=command.match(/^rotate (.+?)(?: by)? 90(?: degrees)?$/i)){const r=findRoom(p,m[1]);next=rotateRoom(p,r.id);summary='Rotate '+r.name+' 90° clockwise about its centre.';}
 else if(m=command.match(/^(increase|decrease) (.+?) by ([\d.]+)\s*(?:sq\.?\s*ft|sqft)$/i)){const r=findRoom(p,m[2]),area=r.width*r.depth+(m[1].toLowerCase()==='increase'?1:-1)*Number(m[3]);next=resizeRoomArea(p,r.id,area);summary='Resize '+r.name+' to approximately '+area+' sq ft, holding width fixed.';}
 else if(m=command.match(/^set (.+?) to ([\d.]+)\s*(?:sq\.?\s*ft|sqft)$/i)){const r=findRoom(p,m[1]);next=resizeRoomArea(p,r.id,Number(m[2]));summary='Set '+r.name+' area to approximately '+m[2]+' sq ft, holding width fixed.';}
 else if(m=command.match(/^add room (.+?) ([\d.]+)\s*[x×]\s*([\d.]+)(?: ft)?$/i)){next=addRoom(p,m[1],Number(m[2]),Number(m[3]));summary='Add '+m[1]+' in available space; review its proposed access.';}
 else if(m=command.match(/^add (door|window) to (.+?) (top|bottom|left|right) (?:wall )?offset ([\d.]+) width ([\d.]+)(?: ft)?$/i)){const r=findRoom(p,m[2]),kind=m[1].toLowerCase();next=editOpening(p,{roomId:r.id,kind,side:m[3].toLowerCase(),offset:Number(m[4]),width:Number(m[5]),sill:kind==='window'?3:0,height:kind==='window'?4:7});validateEdit(p,next);summary='Add '+kind+' to '+r.name+'; offset and width are in feet.';}
 else throw Error('Command not recognized. Use one of the examples and an exact room name. No changes were made.');
 next.reviewed=false;return {plan:next,summary};
}
