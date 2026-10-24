'use strict';
const {siteCalc}=require('./siteCalc');
function dimensions(plan,floor=0) {
  const p=plan.plot,e=plan.envelope;
  const result=[{id:'PLOT-W',a:{x:0,y:0},b:{x:p.w,y:0},offset:-900,value:p.w},{id:'PLOT-D',a:{x:0,y:0},b:{x:0,y:p.h},offset:900,value:p.h},
    {id:'ENV-W',a:{x:e.x,y:e.y+e.h},b:{x:e.x+e.w,y:e.y+e.h},offset:550,value:e.w},{id:'ENV-D',a:{x:e.x+e.w,y:e.y},b:{x:e.x+e.w,y:e.y+e.h},offset:-550,value:e.h}];
  for(const r of plan.rooms.filter(r=>r.floor===floor&&r.type!=='circulation'))result.push({id:`${r.id}-W`,roomId:r.id,a:{x:r.x,y:r.y},b:{x:r.x+r.w,y:r.y},offset:250,value:r.w},{id:`${r.id}-D`,roomId:r.id,a:{x:r.x,y:r.y},b:{x:r.x,y:r.y+r.h},offset:-250,value:r.h});
  // Four clear-span chains include wall widths as their own intervals. Their
  // sum therefore equals the envelope, without replacing clear room sizes.
  const site=siteCalc(plan.input),view=site.rect(e,site.toView),rooms=plan.rooms.filter(r=>r.floor===floor).map(r=>({...site.rect(r,site.toView),type:r.type}));
  const cuts=(values,min,max)=>[...new Set([min,max,...values.filter(v=>v>=min&&v<=max)])].sort((a,b)=>a-b);
  const xCuts=cuts(rooms.flatMap(r=>[r.x,r.x+r.w]),view.x,view.x+view.w);
  const left=rooms.filter(r=>r.x===Math.min(...rooms.map(r=>r.x))),right=rooms.filter(r=>r.x+r.w===Math.max(...rooms.map(r=>r.x+r.w)));
  const sideCuts=bank=>cuts(bank.flatMap(r=>[r.y,r.y+r.h]),view.y,view.y+view.h);
  const add=(id,a,b)=>result.push({id,chain:true,a:site.toWorld(a.x,a.y),b:site.toWorld(b.x,b.y),offset:0,value:Math.round(Math.hypot(b.x-a.x,b.y-a.y))});
  for(const [side,values]of [['LEFT',sideCuts(left)],['RIGHT',sideCuts(right)]])for(let i=1;i<values.length;i++)add(`CHAIN-${side}-${i}`,{x:side==='LEFT'?view.x-350:view.x+view.w+350,y:values[i-1]},{x:side==='LEFT'?view.x-350:view.x+view.w+350,y:values[i]});
  for(const [side,y]of [['FRONT',view.y-350],['REAR',view.y+view.h+350]])for(let i=1;i<xCuts.length;i++)add(`CHAIN-${side}-${i}`,{x:xCuts[i-1],y},{x:xCuts[i],y});
  return result;
}
function length(mm,units='mm'){if(units==='mm')return `${Math.round(mm)} mm`;const inches=Math.round(mm/25.4);return `${Math.floor(inches/12)}' ${inches%12}"`;}
module.exports={dimensions,length};
