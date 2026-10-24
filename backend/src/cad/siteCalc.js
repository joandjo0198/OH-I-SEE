'use strict';
function siteCalc(input) {
  const {width: w, depth: d, setbacks: s, facing} = input;
  const envelope = {x: s.left, y: s.front, w: w - s.left - s.right, h: d - s.front - s.rear};
  if (envelope.w <= 0 || envelope.h <= 0) throw Object.assign(new Error('Setbacks leave no buildable envelope.'), {status: 422});
  // Road-view coordinates are only a projection. Canonical coordinates are E/N
  // millimetres with SW origin, including for East/West plots.
  const toWorld = (x,y) => facing === 'North' ? {x:w-x,y:d-y} : facing === 'East' ? {x:d-y,y:x} : facing === 'West' ? {x:y,y:w-x} : {x,y};
  const toView = (x,y) => facing === 'North' ? {x:w-x,y:d-y} : facing === 'East' ? {x:y,y:d-x} : facing === 'West' ? {x:w-y,y:x} : {x,y};
  const rect = (r, transform = toWorld) => {const a=transform(r.x,r.y), b=transform(r.x+r.w,r.y+r.h);return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};};
  return {envelope, toWorld, toView, rect, worldPlot: rect({x:0,y:0,w,h:d})};
}
function areas(plan) {
  const plot = plan.plot.w * plan.plot.h, footprint = plan.envelope.w * plan.envelope.h;
  const builtUp = footprint * plan.floors.length;
  const carpet = plan.rooms.filter(r=>r.type!=='stair').reduce((s,r)=>s+r.w*r.h,0);
  return {plotM2:plot/1e6,builtUpM2:builtUp/1e6,carpetM2:carpet/1e6,setbackM2:(plot-footprint)/1e6,coveragePercent:100*footprint/plot,fsi:builtUp/plot};
}
module.exports = {siteCalc, areas};
