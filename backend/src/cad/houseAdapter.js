'use strict';
const {HouseModel}=require('../bim/core/houseModel');
const {siteCalc}=require('./siteCalc');
function toHouse(plan,requirements) {
  if(plan.floors.length>1) throw Object.assign(new Error("Multi-floor CAD generation is not yet available: stair slab openings require geometric validation. Please use a single-floor design study."),{status:422});
  const site=siteCalc(plan.input),h=new HouseModel({projectName:plan.projectName}),depth=plan.view.depth;
  const point=p=>{const v=site.toView(p.x,p.y);return{x:v.x/1000,y:v.y/1000};};
  const rect=r=>{const v=site.rect(r,site.toView);return{x:v.x/1000,y:v.y/1000,widthM:v.w/1000,depthM:v.h/1000};};
  const footprint=rect(plan.envelope),s=plan.setbacks;
  h.plot={widthM:plan.view.width/1000,depthM:depth/1000,unit:'m',roadFacing:plan.facing,setbacks:{front:s.front/1000,rear:s.rear/1000,left:s.left/1000,right:s.right/1000},buildable:{x:footprint.x,y:footprint.y,width:footprint.widthM,height:footprint.depthM}};
  h.building={...requirements.building};
  h.layoutWarnings=plan.adjustments.map(a=>`Auto-sized rooms adjusted: ${a.name}: ${a.from.join(' × ')} mm → ${a.to.join(' × ')} mm. ${a.reason}.`);
  for(const f of plan.floors) {
    const walls=plan.walls.filter(w=>w.floor===f.index).map(w=>({id:w.id,start:point(w.start),end:point(w.end),thicknessM:w.thickness/1000,heightM:w.height/1000,elevationM:f.elevation/1000,exterior:w.exterior,interior:!w.exterior}));
    const openings=plan.openings.filter(o=>o.floor===f.index).map(o=>{const w=walls.find(w=>w.id===o.wallId),p=point(o),length=Math.hypot(w.end.x-w.start.x,w.end.y-w.start.y);return{id:o.id,name:o.mark==='MD'?'Main Door':o.mark,wallId:o.wallId,positionOnWall:Math.hypot(p.x-w.start.x,p.y-w.start.y)/length,widthM:o.width/1000,heightM:o.height/1000,sillHeightM:o.sill/1000,elevationM:f.elevation/1000,kind:o.kind};});
    h.floors.push({id:`FLOOR-${f.index}`,level:f.index,name:f.index?`Floor ${f.index}`:'Ground Floor',elevationM:f.elevation/1000,clearHeightM:f.clearHeight/1000,footprint:{...footprint},
      rooms:plan.rooms.filter(r=>r.floor===f.index).map(r=>({id:r.id,name:r.name,type:r.type,...rect(r),storeyIndex:f.index,zone:r.zone,wallIds:[]})),walls,doors:openings.filter(o=>o.kind==='door'),windows:openings.filter(o=>o.kind==='window'),
      stairs:plan.stairs.filter(s=>s.floor===f.index).map(s=>({id:s.id,...rect(s),riseM:s.height/1000,flightCount:2,riserM:s.riser/1000,treadM:s.tread/1000,headroomM:s.headroom/1000})),balconies:[],
      slab:{id:`SLAB-${f.index}`,thicknessM:.15,elevationM:f.elevation/1000,boundary:[{x:footprint.x,y:footprint.y},{x:footprint.x+footprint.widthM,y:footprint.y},{x:footprint.x+footprint.widthM,y:footprint.y+footprint.depthM},{x:footprint.x,y:footprint.y+footprint.depthM}]}});
  }
  h.parking=plan.parking.map(p=>({id:p.id,...rect(p),storeyIndex:0}));
  h.floors[0].rooms.push(...plan.parking.map(p=>({id:p.id,name:p.name,type:'parking',zone:'parking',...rect(p),storeyIndex:0,wallIds:[]})));
  h.roof={type:'flat',elevationM:plan.floors.length*3,thicknessM:.15,footprint:{...footprint}};
  h.metadata.cadPlan=plan;return h;
}
module.exports={toHouse};
