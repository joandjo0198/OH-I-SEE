'use strict';
const {HouseModel}=require('../core/houseModel');
const {ft,getSetbacks,buildableRect}=require('./spatialLayout');
const {exteriorWalls}=require('./layoutBuilding');
// Explicit North frontage: an area-preserving concept with a connected side passage.
// This strategy never scales a requested room to force a fit.
function buildFrontageHouse(req){
 const h=new HouseModel({projectName:req.projectName});
 const width=ft(req.site.frontageFt),depth=ft(req.site.depthFt);
 const setbacks=getSetbacks(req.site,width,depth), b=buildableRect(width,depth,setbacks);
 const ext=.23,part=.12,passage=ft(3.5),stairW=ft(6),stairD=ft(12);
 const roomW=b.width-ext-passage-part;
 const fail=message=>{throw Object.assign(new Error(message),{status:422});};
 if(roomW<ft(10)||b.height<stairD+ft(10))fail('The confirmed frontage cannot fit the requested rooms and circulation. Revise the brief; no rooms were reduced.');
 h.plot={widthM:width,depthM:depth,unit:'m',roadFacing:'North',setbacks,buildable:b};h.building={...req.building};
 h.layoutWarnings=['Concept arrangement: bedrooms are upstairs; the North entrance connects to a 3.5 ft passage. Room areas are preserved; room proportions are proposed.','Parking is proposed in the North front yard. Confirm permitted setback use, vehicle access and covered-parking rules before approval.'];
 const parking=req.rooms.filter(r=>r.type==='parking');let px=.1;
 for(const r of parking){const w=ft(r.lengthFt),d=ft(r.widthFt);if(px+w>width||d>setbacks.front+.001)fail('Requested parking does not fit the North front yard. A revised parking arrangement is required.');h.parking.push({id:'PARK-'+h.parking.length,name:r.name,x:px,y:0,widthM:w,depthM:d,storeyIndex:0});px+=w+part;}
 for(let si=0;si<req.building.floors;si++){
  const id='FLOOR-'+si,z=si*3,x=b.x+ext/2,y=b.y+ext/2, cx=x+roomW+part;
  const program=req.rooms.filter(r=>r.type!=='parking'&&(r.storeyIndex||0)===si);
  const baths=program.filter(r=>r.type==='bathroom');if(baths.length>1)fail('This frontage layout needs a reviewed arrangement for multiple bathrooms on one floor.');
  const rooms=[];const add=(r,rx,ry,w,d)=>{const room={id:`ROOM-${si}-${rooms.length}`,type:r.type,name:r.name,x:rx,y:ry,widthM:w,depthM:d,storeyIndex:si,wallIds:[]};rooms.push(room);return room;};
  let bath=null;
  if(baths[0]){const r=baths[0];const w=ft(r.lengthFt),d=ft(r.widthFt);if(w>roomW-stairW-part||d>stairD)fail('The bathroom and stair landing do not fit at the requested sizes.');bath=add(r,x+stairW+part,y,w,d);}
  let cursor=y+stairD+part;
  for(const r of program.filter(r=>r.type!=='bathroom')){
   const area=Number(r.lengthFt)*Number(r.widthFt)*.3048**2,d=area/roomW;
   if(!Number.isFinite(d)||d<1.5)fail(`Room "${r.name}" needs a different arrangement to preserve a usable shape.`);
   add(r,x,cursor,roomW,d);cursor+=d+part;
  }
  const floorDepth=cursor-part-b.y+ext/2;
  if(floorDepth>b.height+.001)fail(`The requested rooms on floor ${si+1} exceed the confirmed buildable depth. No room sizes were reduced.`);
  add({name:'Passage',type:'circulation'},cx,y,passage,floorDepth-ext);
  const floor={id,level:si,name:req.storeys[si]?.name||`Floor ${si+1}`,elevationM:z,clearHeightM:3,footprint:{x:b.x,y:b.y,widthM:b.width,depthM:floorDepth},rooms,walls:[],doors:[],windows:[],stairs:[{id:'STAIR-'+si,x,y,widthM:stairW,depthM:stairD,riseM:3,flightCount:2}],balconies:[]};
  floor.walls=exteriorWalls(b.x,b.y,b.width,floorDepth,si,z,3).map(w=>({...w,floorId:id,thicknessM:ext}));
  function wall(start,end){let existing=floor.walls.find(w=>Math.hypot(w.start.x-start.x,w.start.y-start.y)<.01&&Math.hypot(w.end.x-end.x,w.end.y-end.y)<.01);if(existing)return existing;const w={id:`INT-${si}-${floor.walls.length}`,floorId:id,start,end,thicknessM:part,heightM:3,elevationM:z,interior:true};floor.walls.push(w);return w;}
  function door(w,t,name){floor.doors.push({id:`DOOR-${si}-${floor.doors.length}`,wallId:w.id,positionOnWall:t,widthM:.85,heightM:2.1,elevationM:z,name});}
  for(const r of rooms.filter(r=>r.type!=='circulation')){
   const right=wall({x:r.x+r.widthM+part/2,y:r.y},{x:r.x+r.widthM+part/2,y:r.y+r.depthM});door(right,.5,r.name+' Door');
   if(r.y>y+.01)wall({x:r.x,y:r.y-part/2},{x:r.x+r.widthM,y:r.y-part/2});
   if(r.y+r.depthM<b.y+floorDepth-ext)wall({x:r.x,y:r.y+r.depthM+part/2},{x:r.x+r.widthM,y:r.y+r.depthM+part/2});
   if(r.x>x+.01)wall({x:r.x-part/2,y:r.y},{x:r.x-part/2,y:r.y+r.depthM});
   const host=r===bath?floor.walls[0]:floor.walls[3];const t=r===bath?(r.x+r.widthM/2-b.x)/b.width:1-(r.y+r.depthM/2-b.y)/floorDepth;
   floor.windows.push({id:`WIN-${si}-${floor.windows.length}`,wallId:host.id,positionOnWall:t,widthM:r===bath?.6:1.2,heightM:r===bath?.6:1.2,sillHeightM:r===bath?1.5:.9,elevationM:z});
  }
  door(wall({x:x+stairW+part/2,y},{x:x+stairW+part/2,y:y+stairD}),.8,'Stair Access');
  if(si===0)door(floor.walls[0],(cx+passage/2-b.x)/b.width,'North Main Entrance');
  floor.slab={id:'SLAB-'+si,elevationM:z,thicknessM:.15,boundary:[{x:b.x,y:b.y},{x:b.x+b.width,y:b.y},{x:b.x+b.width,y:b.y+floorDepth},{x:b.x,y:b.y+floorDepth}]};
  if(si===0)for(const p of h.parking)add({name:p.name,type:'parking'},p.x,p.y,p.widthM,p.depthM);
  h.floors.push(floor);
 }
 const top=h.floors.at(-1);h.roof={type:'flat',elevationM:req.building.floors*3,footprint:{...top.footprint},thicknessM:.2};
 const area=h.floors.reduce((sum,f)=>sum+f.footprint.widthM*f.footprint.depthM,0)/.3048**2;
 if(req.building.builtUpAreaSqFt&&Math.abs(area-req.building.builtUpAreaSqFt)>10)h.layoutWarnings.push(`The area-preserving concept totals ${Math.round(area)} sq.ft built-up, compared with the requested ${req.building.builtUpAreaSqFt} sq.ft. Resolve this difference before approval.`);
 h.layoutWarnings.push('Pool, lift, home theatre, basement/visitor parking, service systems and directional/Vastu preferences require a separate coordinated layout; they are not represented as completed in this concept.');
 return h;
}
module.exports={buildFrontageHouse};
