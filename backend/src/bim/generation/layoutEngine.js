'use strict';
const FT=0.3048;
const ft=n=>Math.round(Number(n||0)*FT*1000)/1000;
const roomAreaM2=r=>ft(r.lengthFt||10)*ft(r.widthFt||10);
// Maximal free rectangles: try both orientations, retaining exact room dimensions.
function packExactAttempt(rooms, rect, gap, strategy) {
  if (![rect.x,rect.y,rect.width,rect.height,gap].every(Number.isFinite) || rect.width<=0 || rect.height<=0 || gap<0) return {ok:false,rooms:[],error:'The envelope remaining after walls is not positive. Increase the plot or reduce setbacks.'};
  for (const room of rooms) if (![room.lengthFt,room.widthFt].every(v=>Number.isFinite(Number(v))&&Number(v)>0)) return {ok:false,rooms:[],error:`${room.name}: width and depth must be positive numbers.`};
  let free = [{...rect}];
  const placed = [];
  const sorters=[(a,b)=>roomAreaM2(b)-roomAreaM2(a),(a,b)=>Math.max(b.lengthFt,b.widthFt)-Math.max(a.lengthFt,a.widthFt),(a,b)=>b.lengthFt-a.lengthFt,(a,b)=>b.widthFt-a.widthFt];
  for (const room of [...rooms].sort(sorters[strategy%4])) {
    const w=ft(room.lengthFt), h=ft(room.widthFt);
    let best=null;
    for (const f of free) for (const [width,height,rotation] of [[w,h,0],[h,w,90]]) {
      if(width<=f.width+1e-7 && height<=f.height+1e-7) {
        const score=strategy<4?Math.min(f.width-width,f.height-height):strategy<8?f.width*f.height-width*height:f.y*100+f.x;
        if(!best || score<best.score) best={x:f.x,y:f.y,width,height,rotation,score};
      }
    }
    if(!best) return {ok:false,error:`Room "${room.name}" does not fit at its requested dimensions. Requested ${room.lengthFt.toFixed(2)} × ${room.widthFt.toFixed(2)} ft; envelope ${(rect.width/FT).toFixed(2)} × ${(rect.height/FT).toFixed(2)} ft. Reduce this room or the room count. No explicit dimensions were changed.`,rooms:[]};
    const r={...room,x:best.x,y:best.y,lengthM:best.width,widthM:best.height,rotation:best.rotation};
    placed.push(r);
    const bx=r.x+r.lengthM+gap, by=r.y+r.widthM+gap;
    free=free.flatMap(f=>{
      const fx=f.x+f.width,fy=f.y+f.height;
      if(r.x>=fx || bx<=f.x || r.y>=fy || by<=f.y) return [f];
      const out=[];
      if(r.x>f.x) out.push({...f,width:r.x-f.x-gap});
      if(bx<fx) out.push({...f,x:bx,width:fx-bx});
      if(r.y>f.y) out.push({...f,height:r.y-f.y-gap});
      if(by<fy) out.push({...f,y:by,height:fy-by});
      return out.filter(q=>q.width>0&&q.height>0);
    });
    free=free.filter((f,i)=>!free.some((g,j)=>i!==j&&g.x<=f.x&&g.y<=f.y&&g.x+g.width>=f.x+f.width&&g.y+g.height>=f.y+f.height&&(j<i||g.width*g.height>f.width*f.height)));
  }
  return {ok:true,rooms:placed,originX:rect.x,originY:rect.y,
    buildL:Math.max(0,...placed.map(r=>r.x+r.lengthM-rect.x)),
    buildW:Math.max(0,...placed.map(r=>r.y+r.widthM-rect.y))};
}

function packExactRooms(rooms,rect,gap) {
  let result;
  for(let strategy=0;strategy<12;strategy++) {
    result=packExactAttempt(rooms,rect,gap,strategy);
    if(result.ok)return result;
  }
  return result;
}

module.exports={packExactRooms};
