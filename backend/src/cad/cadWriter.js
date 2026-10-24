'use strict';
const {DxfWriter,Units,point3d,LWPolylineFlags}=require('@tarikjabiri/dxf');
const rules=require('./rules/tnbc'),{enforce}=require('./planValidator'),{wallSegments,doorGeometry}=require('./drawingRenderer'),{dimensions}=require('./dimensionEngine');
const cleanText=value=>String(value??'').replace(/[\x00-\x1f\x7f]/g,' ');
function dxf(plan,{floor=0}={}) {
  enforce(plan);
  const d=new DxfWriter();d.setUnits(Units.Millimeters);d.setVariable('$ACADVER',{1:'AC1032'});
  d.addLType('DASHED','Dashed',[300,-150]);d.addLType('CENTER','Center',[600,-100,100,-100]);
  for(const [name,[color,,type]] of Object.entries(rules.layers))d.addLayer(name,color,type||'CONTINUOUS');
  const style=d.addDimStyle('OHISEE-MM');style.DIMTXT=125;style.DIMASZ=125;style.DIMEXO=75;
  const opts=layer=>({layerName:layer,lineweight:rules.layers[layer]?.[1]||18});
  const poly=(target,r,layer)=>target.addLWPolyline([{point:{x:r.x,y:r.y}},{point:{x:r.x+r.w,y:r.y}},{point:{x:r.x+r.w,y:r.y+r.h}},{point:{x:r.x,y:r.y+r.h}}],{...opts(layer),flags:LWPolylineFlags.Closed});
  const door=d.addBlock('DOOR');door.addLine(point3d(0,0),point3d(0,1));door.addArc(point3d(0,0),1,0,90);
  const win=d.addBlock('WINDOW');for(const y of [-.03,0,.03])win.addLine(point3d(0,y),point3d(1,y));
  for(const kind of ['WC','BASIN','SHOWER','SINK','HOB','BED','SOFA','DINING']){const block=d.addBlock(kind);poly(block,{x:0,y:0,w:1,h:1},'0');block.addLine(point3d(0,.25),point3d(1,.25));}
  poly(d,plan.plot,'A-PLOT');poly(d,plan.envelope,'A-SETBACK');
  if(floor===0)for(const p of plan.parking){poly(d,p,'A-PLOT');d.addText(point3d(p.x+100,p.y+200),125,cleanText(p.name),opts('A-ANNO-TEXT'));}
  for(const wall of plan.walls.filter(w=>w.floor===floor))for(const segment of wallSegments(plan,wall))poly(d,segment,wall.exterior?'A-WALL-EXT':'A-WALL-INT');
  for(const o of plan.openings.filter(o=>o.floor===floor)) {
    const wall=plan.walls.find(w=>w.id===o.wallId),vertical=wall.start.x===wall.end.x;
    const at=point3d(o.x-(vertical?0:o.width/2),o.y-(vertical?o.width/2:0));
    const g=o.kind==='door'?doorGeometry(plan,o):null;
    d.addInsert(g?'DOOR':'WINDOW',g?point3d(g.hinge.x,g.hinge.y):at,{...opts(g?'A-DOOR':'A-WIND'),scaleFactor:{x:o.width,y:o.width*(g?.sign||1),z:1},rotationAngle:g?g.rotation:(vertical?90:0)});
    d.addText(point3d(o.x+100,o.y+100),100,o.mark,opts('A-ANNO-TEXT'));
  }
  for(const r of plan.rooms.filter(r=>r.floor===floor)) {
    const h=Math.min(175,(r.w-200)/Math.max(1,r.name.length*.7)),x=r.x+r.w/2-r.name.length*h*.28;
    d.addText(point3d(x,r.y+r.h/2),h,cleanText(r.name),opts('A-ANNO-TEXT'));
    d.addText(point3d(r.x+100,r.y+r.h/2-200),Math.min(125,(r.w-200)/15),`${r.w} x ${r.h} mm`,opts('A-ANNO-TEXT'));
  }
  for(const f of plan.fixtures.filter(f=>f.floor===floor))d.addInsert(f.kind,point3d(f.x,f.y),{...opts(['BED','SOFA','DINING'].includes(f.kind)?'A-FURN':'A-FIXT'),scaleFactor:{x:f.w,y:f.h,z:1}});
  for(const [i,dim] of dimensions(plan,floor).entries()) {
    const block=d.addBlock(`OHISEE_DIM_${i}`),dx=dim.b.x-dim.a.x,dy=dim.b.y-dim.a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    const a=point3d(dim.a.x+nx*dim.offset,dim.a.y+ny*dim.offset),b=point3d(dim.b.x+nx*dim.offset,dim.b.y+ny*dim.offset);
    block.addLine(a,b,opts('A-DIMS'));block.addLine(point3d(dim.a.x,dim.a.y),a,opts('A-DIMS'));block.addLine(point3d(dim.b.x,dim.b.y),b,opts('A-DIMS'));
    for(const p of [a,b])block.addLine(point3d(p.x-65,p.y-65),point3d(p.x+65,p.y+65),opts('A-DIMS'));
    block.addText(point3d((a.x+b.x)/2,(a.y+b.y)/2+100),100,String(dim.value),opts('A-DIMS'));
    d.addAlignedDim(point3d(dim.a.x,dim.a.y),point3d(dim.b.x,dim.b.y),{...opts('A-DIMS'),blockName:block.name,offset:dim.offset,styleName:'OHISEE-MM',ActualMeasurement:dim.value});
  }
  for(const opening of plan.slabOpenings||[])if(opening.floor===floor)poly(d,opening,'A-STAIR');
  for(const s of plan.stairs.filter(s=>s.floor===floor)){poly(d,s,'A-STAIR');d.addText(point3d(s.x+150,s.y+150),125,`${s.arrivalOnly?'DN / ARRIVAL':'UP'} ${s.risers}R @ ${Math.round(s.riser)} mm`,opts('A-STAIR'));}
  d.addLine(point3d(plan.road.from.x,plan.road.from.y),point3d(plan.road.to.x,plan.road.to.y),opts('A-ROAD'));
  d.addText(point3d(plan.gate.x,plan.gate.y),150,'MG',opts('A-DOOR'));
  d.addLine(point3d(plan.plot.w+1500,plan.plot.h-2000),point3d(plan.plot.w+1500,plan.plot.h-500),opts('A-ANNO-NPLT'));
  d.addText(point3d(plan.plot.w+1400,plan.plot.h-300),200,'N',opts('A-ANNO-NPLT'));
  d.addText(point3d(0,plan.plot.h+2000),220,cleanText(plan.projectName),opts('A-ANNO-TTLB'));
  d.addText(point3d(0,plan.plot.h+1500),150,cleanText(plan.status),opts('A-ANNO-TTLB'));
  // Model-space export is 1:1. The four A3 sheets are issued in the PDF set;
  // this library does not supply a complete CAD Layout/Viewport object API.
  // Layer lineweights are not exposed by the library's Layer class. Add the
  // standard group 370 to each existing layer record, without changing entities.
  const tags=d.stringify().split('\n');let entity='',layer='';
  for(let i=0;i+1<tags.length;i+=2){const code=tags[i].trim(),value=tags[i+1].trim();if(code==='0'){entity=value;layer='';}if(entity==='LAYER'&&code==='2')layer=value;if(entity==='LAYER'&&code==='370'&&rules.layers[layer])tags[i+1]=String(rules.layers[layer][1]);}
  return tags.join('\n');
}
module.exports={dxf};
