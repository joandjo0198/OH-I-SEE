import {byId} from './interior/catalog.js';
import {clone,rebuildWalls,validatePlan,envelope} from './model.mjs';
import {editOpening} from './opening-editor.mjs';
import {makeFixture,validateFixtures} from './interior/fixture-model.mjs';
const snap=n=>Math.round(n*4)/4;
const intersect=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.02&&Math.min(a.y+a.depth,b.y+b.depth)-Math.max(a.y,b.y)>.02;
export function validateEdit(before,next){
 const existing=new Set(validatePlan(before).errors);
 const errors=validatePlan(next).errors.filter(e=>!existing.has(e));
 for(let i=0;i<next.openings.length;i++)for(let j=i+1;j<next.openings.length;j++){
  const a=next.openings[i],b=next.openings[j];
  const overlap=(a,b)=>a&&b&&a.wallId===b.wallId?Math.max(0,Math.min(a.offset+a.width,b.offset+b.width)-Math.max(a.offset,b.offset)):0;
  const prior=overlap(before.openings.find(o=>o.id===a.id),before.openings.find(o=>o.id===b.id));
  if(overlap(a,b)>prior+.01)errors.push('Doors or windows overlap.');
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
export function deleteOpening(p,roomId,kind,index){
 const ids=new Set(p.walls.filter(w=>w.owners.includes(roomId)).map(w=>w.id));
 const matches=p.openings.filter(o=>ids.has(o.wallId)&&(kind==='door'?['door','main','pocket'].includes(o.kind):o.kind==='window'));
 if(!matches.length)throw Error('No '+kind+' exists in this room.');
 if(index===undefined&&matches.length>1)throw Error('This room has '+matches.length+' '+kind+'s. Specify a number, for example: Delete '+kind+' 1 from selected room.');
 if(index!==undefined&&(!Number.isInteger(index)||index<1))throw Error('Opening numbers start at 1.');
 const target=matches[(index||1)-1];if(!target)throw Error('Choose an opening number from 1 to '+matches.length+'.');
 const next=clone(p);next.openings=next.openings.filter(o=>o.id!==target.id);return validateEdit(p,next);
}
export function addFurniture(p,roomId,catalogId){
 const r=p.rooms.find(r=>r.id===roomId),d=byId[catalogId];if(!r||!d)throw Error('Choose a room and supported furniture.');
 const [width,,depth]=d.size,next=clone(p),occupied=(p.fixtures||[]).filter(f=>f.mount==='floor').map(f=>{const size=byId[f.catalogId].size,a=f.rotation*Math.PI/180,w=(Math.abs(Math.cos(a))*size[0]+Math.abs(Math.sin(a))*size[2])*f.scale,h=(Math.abs(Math.sin(a))*size[0]+Math.abs(Math.cos(a))*size[2])*f.scale;return {x:f.position.x-w/2,y:f.position.y-h/2,width:w,depth:h};});
 for(const o of p.openings){if(!['door','main','pocket'].includes(o.kind))continue;const w=p.walls.find(w=>w.id===o.wallId);if(!w?.owners.includes(roomId))continue;const start=w.start+o.offset;occupied.push(w.axis==='h'?{x:start,y:w.at-o.width,width:o.width,depth:2*o.width}:{x:w.at-o.width,y:start,width:2*o.width,depth:o.width});}
 let slot;for(let y=r.y+.25;y+depth<=r.y+r.depth-.25&&!slot;y+=.5)for(let x=r.x+.25;x+width<=r.x+r.width-.25&&!slot;x+=.5){const b={x,y,width,depth};if(!occupied.some(o=>intersect(b,o)))slot=b;}
 if(!slot)throw Error('No clear space for '+d.name+' in '+r.name+'. Move furniture or enlarge the room first.');
 next.fixtures||=[];const f=makeFixture(next,catalogId,slot.x+width/2,slot.y+depth/2);f.position.x=slot.x+width/2;f.position.y=slot.y+depth/2;f.roomId=roomId;next.fixtures.push(f);return validateEdit(p,next);
}
export function addStaircase(p,placement,roomId,width=3,depth=12,side='right'){
 if(![width,depth].every(n=>Number.isFinite(n)&&n>=3&&n<=100))throw Error('Use staircase dimensions between 3 and 100 ft.');
 const next=clone(p);let slot;
 if(placement==='inside'){
  const room=next.rooms.find(r=>r.id===roomId);if(!room||['stairs','porch'].includes(room.type))throw Error('Select an enclosed room for the inside staircase.');
  if(room.width-width<3||room.depth<depth)throw Error('The inside staircase does not fit in '+room.name+'. Choose a larger room or smaller dimensions.');
  const old={...room};slot={x:room.x+room.width-width,y:room.y,width,depth};room.width-=width;
  rebuildPreserving(p,next,roomId,point=>({x:Math.abs(point.x-old.x-old.width)<.01?room.x+room.width:point.x,y:point.y}));
 }else{
  const enclosed=p.rooms.filter(r=>!['stairs','porch'].includes(r.type));if(!enclosed.length)throw Error('Add a room before placing an outside staircase.');
  const box={x:Math.min(...enclosed.map(r=>r.x)),y:Math.min(...enclosed.map(r=>r.y))};box.right=Math.max(...enclosed.map(r=>r.x+r.width));box.bottom=Math.max(...enclosed.map(r=>r.y+r.depth));
  const fits=b=>b.x>=0&&b.y>=0&&b.x+b.width<=p.plot.width&&b.y+b.depth<=p.plot.depth&&!p.rooms.some(r=>intersect(b,r));
  if(['left','right'].includes(side)){const x=side==='left'?box.x-width:box.right;for(let y=box.y;y+depth<=box.bottom+.001&&!slot;y+=.25){const b={x,y,width,depth};if(fits(b))slot=b;}}
  else{const y=side==='top'?box.y-depth:box.bottom;for(let x=box.x;x+width<=box.right+.001&&!slot;x+=.25){const b={x,y,width,depth};if(fits(b))slot=b;}}
  if(!slot)throw Error('No space for an outside staircase on the '+side+'. Try another side or smaller dimensions.');
 }
 const base=placement==='inside'?'Inside staircase':'Outside staircase';let name=base,i=2;while(next.rooms.some(r=>r.name===name))name=base+' '+i++;
 next.rooms.push({id:'stairs-'+crypto.randomUUID(),name,type:'stairs',placement,...slot});
 return validateEdit(p,next);
}
function singlePrompt(p,text,selectedId){
 let command=text.trim().replace(/[.!]$/,'').replace(/^please\s+/i,'').replace(/\b(?:the )?selected room\b/gi,()=>selectedId||'selected room');let m,next,summary;
 const furniture={'tv':'tv-unit','table':'coffee-table','dining table':'dining-table','pot':'plant-small','pots':'plant-small','plant':'plant-small','king size bed':'king-bed','king bed':'king-bed','queen size bed':'queen-bed','queen bed':'queen-bed'};
 if(m=command.match(/^add (?:an? )?(inside|outside|indoor|outdoor) staircase(?: ([\d.]+)\s*[x×]\s*([\d.]+)(?: ft)?)?(?: on (?:the )?(left|right|top|bottom))?$/i)){const placement=['inside','indoor'].includes(m[1].toLowerCase())?'inside':'outside',width=Number(m[2]||3),depth=Number(m[3]||12),side=m[4]?.toLowerCase()||'right';next=addStaircase(p,placement,selectedId,width,depth,side);summary='Add '+placement+' staircase, '+width+' × '+depth+' ft'+(placement==='outside'?' on the '+side:' within the selected room, reducing its width')+'.';}
 else if(m=command.match(/^(?:delete|remove) (?:a |the )?(door|window)(?: (\d+))?(?: (?:from|in) (.+))?$/i)){const r=findRoom(p,m[3]||selectedId||'selected room');next=deleteOpening(p,r.id,m[1].toLowerCase(),m[2]?Number(m[2]):undefined);summary='Remove '+m[1]+' from '+r.name+'. Shared-wall openings are also removed from the adjoining room.';}
 else if(m=command.match(/^add (?:a |an )?(tv|table|dining table|pot|pots|plant|king size bed|king bed|queen size bed|queen bed)(?: (?:to|in) (.+))?$/i)){const r=findRoom(p,m[2]||selectedId||'selected room'),id=furniture[m[1].toLowerCase()];next=addFurniture(p,r.id,id);summary='Place '+byId[id].name+' in '+r.name+' in clear space. Review access in 2D and regenerate 3D.';}
 else if(!/\boffset\b/i.test(command)&&(m=command.match(/^add (?:a )?(door|window)(?: (?:to|in) (.+))?$/i))){const r=findRoom(p,m[2]||selectedId||'selected room'),kind=m[1].toLowerCase(),width=kind==='door'?3:4;for(const side of ['top','bottom','left','right']){for(let offset=.5;offset+width<=(['top','bottom'].includes(side)?r.width:r.depth)-.5;offset+=.5){try{const candidate=editOpening(p,{roomId:r.id,kind,side,offset,width,sill:kind==='window'?3:0,height:kind==='window'?4:7});next=validateEdit(p,candidate);break;}catch{}}if(next)break;}if(!next)throw Error('No free wall segment for this '+kind+'. Use an explicit wall, offset and width.');summary='Add a '+width+' ft '+kind+' in '+r.name+'. Review its wall position and access before applying.';}
 else if(m=command.match(/^add (?:a )?bedroom(?: (\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?: ft)?)?$/i)){let name='Bedroom',i=2;while(p.rooms.some(r=>r.name.toLowerCase()===name.toLowerCase()))name='Bedroom '+i++;next=addRoom(p,name,Number(m[1]||10),Number(m[2]||12));summary='Add '+name+' at '+(m[1]||10)+' × '+(m[2]||12)+' ft in available space.';}
 else if(m=command.match(/^(increase|decrease) (?:the )?area(?: by)? ([\d.]+)\s*(?:sq\.?\s*ft|sqft)$/i)){return singlePrompt(p,m[1]+' '+selectedId+' by '+m[2]+' sqft',selectedId);}
 else if(m=command.match(/^rotate (.+?)(?: by)? 90(?: degrees)?$/i)){const r=findRoom(p,m[1]);next=rotateRoom(p,r.id);summary='Rotate '+r.name+' 90° clockwise about its centre.';}
 else if(m=command.match(/^(increase|decrease) (.+?) by ([\d.]+)\s*(?:sq\.?\s*ft|sqft)$/i)){const r=findRoom(p,m[2]),area=r.width*r.depth+(m[1].toLowerCase()==='increase'?1:-1)*Number(m[3]);next=resizeRoomArea(p,r.id,area);summary='Resize '+r.name+' to approximately '+area+' sq ft, holding width fixed.';}
 else if(m=command.match(/^set (.+?) to ([\d.]+)\s*(?:sq\.?\s*ft|sqft)$/i)){const r=findRoom(p,m[1]);next=resizeRoomArea(p,r.id,Number(m[2]));summary='Set '+r.name+' area to approximately '+m[2]+' sq ft, holding width fixed.';}
 else if(m=command.match(/^add room (.+?) ([\d.]+)\s*[x×]\s*([\d.]+)(?: ft)?$/i)){next=addRoom(p,m[1],Number(m[2]),Number(m[3]));summary='Add '+m[1]+' in available space; review its proposed access.';}
 else if(m=command.match(/^add (door|window) to (.+?) (top|bottom|left|right) (?:wall )?offset ([\d.]+) width ([\d.]+)(?: ft)?$/i)){const r=findRoom(p,m[2]),kind=m[1].toLowerCase();next=editOpening(p,{roomId:r.id,kind,side:m[3].toLowerCase(),offset:Number(m[4]),width:Number(m[5]),sill:kind==='window'?3:0,height:kind==='window'?4:7});validateEdit(p,next);summary='Add '+kind+' to '+r.name+'; offset and width are in feet.';}
 else throw Error('Command not recognized. Use one of the examples and an exact room name. No changes were made.');
 next.reviewed=false;return {plan:next,summary};
}

export function promptEdit(p,text,selectedId){
 const commands=text.split(/[;\n]+/).map(v=>v.trim()).filter(Boolean);if(!commands.length||commands.length>10)throw Error('Enter 1–10 commands, one per line.');
 let next=p;const summaries=[];for(const command of commands){const result=singlePrompt(next,command,selectedId);next=result.plan;summaries.push(result.summary);}return {plan:next,summary:summaries.join(' ')};
}
