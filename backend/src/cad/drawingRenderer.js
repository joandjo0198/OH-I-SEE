'use strict';
const {siteCalc}=require('./siteCalc'),{length,dimensions}=require('./dimensionEngine');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Shared wall segments are used by SVG and DXF, so openings are actually cut.
function wallSegments(plan,wall) {
  const vertical=wall.start.x===wall.end.x,axis=vertical?'y':'x',cross=vertical?'x':'y';
  const start=Math.min(wall.start[axis],wall.end[axis]),end=Math.max(wall.start[axis],wall.end[axis]);
  const cuts=plan.openings.filter(o=>o.wallId===wall.id).map(o=>[o[axis]-o.width/2,o[axis]+o.width/2]).sort((a,b)=>a[0]-b[0]);
  const result=[];let at=start;
  for(const [a,b] of [...cuts,[end,end]]){if(a>at)result.push({x:vertical?wall.start.x-wall.thickness/2:at,y:vertical?at:wall.start.y-wall.thickness/2,w:vertical?wall.thickness:a-at,h:vertical?a-at:wall.thickness});at=Math.max(at,b);}
  return result;
}

// A door's swing is derived from its actual destination room, not a screen
// direction. This survives all four road-facing projections and DXF export.
function doorGeometry(plan,opening) {
  const wall=plan.walls.find(w=>w.id===opening.wallId),vertical=wall.start.x===wall.end.x;
  const u=vertical?{x:0,y:1}:{x:1,y:0};
  const room=opening.roomIds.map(id=>plan.rooms.find(r=>r.id===id)).find(r=>r&&r.type!=='circulation') || opening.roomIds.map(id=>plan.rooms.find(r=>r.id===id)).find(Boolean);
  const direction=room?{x:room.x+room.w/2-opening.x,y:room.y+room.h/2-opening.y}:{x:0,y:1};
  const sign=(direction.x*-u.y+direction.y*u.x)>=0?1:-1;
  const n={x:-u.y*sign,y:u.x*sign},hinge={x:opening.x-u.x*opening.width/2,y:opening.y-u.y*opening.width/2};
  return {hinge,closed:{x:hinge.x+u.x*opening.width,y:hinge.y+u.y*opening.width},open:{x:hinge.x+n.x*opening.width,y:hinge.y+n.y*opening.width},radius:opening.width,rotation:vertical?90:0,sign};
}

// Shared two-flight geometry, in canonical coordinates, for both outputs.
function stairGeometry(plan,stair) {
  const site=siteCalc(plan.input),r=site.rect(stair,site.toView),width=stair.width,landing=stair.landing;
  const gap=Math.max(0,r.w-2*width),bottom=r.y+landing,top=bottom+(Math.max(...stair.flightRisers)-1)*stair.tread;
  const lines=[];
  const line=(x1,y1,x2,y2)=>lines.push([site.toWorld(x1,y1),site.toWorld(x2,y2)]);
  for(let side=0;side<2;side++) {
    const x=side?r.x+width+gap:r.x;
    for(let i=0;i<stair.flightRisers[side];i++)line(x,bottom+i*stair.tread,x+width,bottom+i*stair.tread);
    line(x,bottom,x,top);line(x+width,bottom,x+width,top);
  }
  // The zigzag denotes the drawing break; the U-shaped arrow follows ascent.
  const by=bottom+(top-bottom)*.52;
  line(r.x,by,r.x+width*.4,by+120);line(r.x+width*.4,by+120,r.x+width*.6,by-120);line(r.x+width*.6,by-120,r.x+width,by);
  const arrow=[site.toWorld(r.x+width/2,bottom-200),site.toWorld(r.x+width/2,top+landing/2),site.toWorld(r.x+r.w-width/2,top+landing/2),site.toWorld(r.x+r.w-width/2,bottom+300)];
  const end=arrow.at(-1),prev=arrow.at(-2),dx=end.x-prev.x,dy=end.y-prev.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
  lines.push([{x:end.x-ux*180-uy*90,y:end.y-uy*180+ux*90},end],[{x:end.x-ux*180+uy*90,y:end.y-uy*180-ux*90},end]);
  return {lines,arrow,label:site.toWorld(r.x+r.w/2,r.y+landing*.4)};
}

// Reusable fixture block outlines use a unit square. No fixture location is
// changed by the renderer: these are symbolic details inside saved footprints.
function fixturePaths(kind) {
  const paths=[];
  const box=(x,y,w,h)=>paths.push({points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],closed:true});
  const line=(...points)=>paths.push({points,closed:false});
  const ellipse=(x,y,rx,ry)=>paths.push({points:Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return[x+Math.cos(a)*rx,y+Math.sin(a)*ry];}),closed:true});
  if(kind==='WC'){box(.15,.76,.7,.2);ellipse(.5,.43,.35,.35);ellipse(.5,.43,.23,.24);}
  else if(kind==='BASIN'){box(.02,.02,.96,.96);ellipse(.5,.46,.36,.32);ellipse(.5,.46,.025,.025);line([.5,.82],[.5,.98]);}
  else if(kind==='SHOWER'){box(.02,.02,.96,.96);line([.04,.04],[.96,.96]);line([.04,.96],[.96,.04]);ellipse(.5,.5,.05,.05);}
  else if(kind==='SINK'){box(.02,.02,.96,.96);box(.08,.12,.5,.72);for(let i=0;i<6;i++)line([.67+i*.045,.12],[.67+i*.045,.84]);ellipse(.32,.48,.025,.035);line([.32,.86],[.32,.97]);}
  else if(kind==='HOB'){box(.02,.02,.96,.96);for(const x of [.28,.72])for(const y of [.28,.72])ellipse(x,y,.16,.16);}
  else if(kind==='BED'){box(.02,.02,.96,.96);box(.08,.74,.37,.18);box(.55,.74,.37,.18);line([.02,.67],[.98,.67]);line([.08,.06],[.08,.67]);}
  else if(kind==='SOFA'){box(.02,.02,.96,.96);box(.06,.72,.88,.22);box(.02,.06,.08,.66);box(.9,.06,.08,.66);line([.37,.07],[.37,.72]);line([.64,.07],[.64,.72]);}
  else if(kind==='DINING'){box(.16,.2,.68,.6);for(const x of [.28,.6]){box(x,.02,.18,.13);box(x,.85,.18,.13);}box(.01,.38,.11,.24);box(.88,.38,.11,.24);}
  else box(0,0,1,1);
  return paths;
}
function render(plan,{sheet='A-02',floor=0,units='imperial',projectId='',date=new Date().toISOString().slice(0,10),schedulePage=0}={}) {
  const site=siteCalc(plan.input),W=420,H=297,margin=18;
  const scale=Math.min(1/100,210/(plan.view.width+3000),232/(plan.view.depth+3000));
  const ox=margin+15,oy=250,parts=[];
  const p=q=>{const v=site.toView(q.x,q.y);return{x:ox+v.x*scale,y:oy-v.y*scale};};
  const rect=(r,stroke='#213d67',fill='none',extra='')=>{const v=site.rect(r,site.toView);return `<rect x="${ox+v.x*scale}" y="${oy-(v.y+v.h)*scale}" width="${v.w*scale}" height="${v.h*scale}" stroke="${stroke}" fill="${fill}" stroke-width=".25" ${extra}/>`;};
  const text=(x,y,s,size=2.5,anchor='start',color='#172f49')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${color}">${escape(s)}</text>`;
  const line=(a,b,color='#244f92',width=.25)=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${width}"/>`;
  const title={'A-01':'SITE PLAN','A-02':`${floor===0?'GROUND FLOOR':`FLOOR ${floor}`} PLAN`,'A-03':'FURNITURE & FIXTURES','A-04':'SCHEDULES & AREA STATEMENT'}[sheet];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" role="img" aria-label="${escape(title)}"><rect width="420" height="297" fill="white"/><g font-family="Arial, sans-serif"><rect x="8" y="8" width="404" height="281" fill="none" stroke="#243a55" stroke-width=".35"/>`,text(16,20,'OH I SEE   /   DESIGN & ENGINEERING',4),text(16,28,`${plan.facing.toUpperCase()} FACING · ${title}`,3.5),text(404,20,sheet,5,'end'));
  if(sheet!=='A-04') {
    parts.push(`<g data-layer="site">`,rect(plan.plot,'#253544'),rect(plan.envelope,'#bf4545','none','stroke-dasharray="2 1"'),text(ox+plan.view.width*scale/2,oy+9,plan.road.label,2.5,'middle'),text(ox+plan.view.width*scale/2,oy+15,`FRONTAGE ${length(plan.view.width,units)}`,2.5,'middle'));
    const gate=p(plan.gate),gw=plan.gate.width*scale;
    parts.push(line({x:gate.x-gw/2,y:gate.y},{x:gate.x+gw/2,y:gate.y},'white',.7),line({x:gate.x-gw/2,y:gate.y},{x:gate.x-gw/2,y:gate.y-gw},'#298243'),`<path d="M ${gate.x+gw/2} ${gate.y} A ${gw} ${gw} 0 0 0 ${gate.x-gw/2} ${gate.y-gw}" stroke="#298243" fill="none" stroke-width=".2"/>`,text(gate.x,gate.y+3,`MG ${plan.gate.width}`,2,'middle'));
    const v=site.rect(plan.envelope,site.toView);
    const setLabel=(x,y,s,rotate=false)=>parts.push(`<text transform="translate(${x},${y})${rotate?' rotate(-90)':''}" text-anchor="middle" font-size="1.8" fill="#aa4a4a">${escape(s)}</text>`);
    setLabel(ox+plan.view.width*scale/2,oy-(v.y+v.h+(plan.view.depth-v.y-v.h)/2)*scale,`REAR ${length(plan.setbacks.rear,units)}`);
    setLabel(ox+v.x*scale/2,oy-(v.y+v.h/2)*scale,`LEFT ${length(plan.setbacks.left,units)}`,true);
    setLabel(ox+(v.x+v.w+(plan.view.width-v.x-v.w)/2)*scale,oy-(v.y+v.h/2)*scale,`RIGHT ${length(plan.setbacks.right,units)}`,true);
    setLabel(ox+(v.x+v.w*.22)*scale,oy-v.y*scale*.45,`FRONT ${length(plan.setbacks.front,units)}`);
    parts.push('</g>');
    parts.push('<g data-layer="dimensions">');
    for(const dim of dimensions(plan,floor).filter(d=>!d.roomId)) {
      const dx=dim.b.x-dim.a.x,dy=dim.b.y-dim.a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
      const a=p({x:dim.a.x+nx*dim.offset,y:dim.a.y+ny*dim.offset}),b=p({x:dim.b.x+nx*dim.offset,y:dim.b.y+ny*dim.offset});
      parts.push(line(a,b,'#587284',.15),line(p(dim.a),a,'#587284',.15),line(p(dim.b),b,'#587284',.15));
      for(const q of [a,b])parts.push(line({x:q.x-.7,y:q.y-.7},{x:q.x+.7,y:q.y+.7},'#587284',.2));
      const x=(a.x+b.x)/2,y=(a.y+b.y)/2;
      if(dim.chain&&dim.value<350)continue;
      if(Math.abs(a.x-b.x)<.1)parts.push(`<text transform="translate(${x-1},${y}) rotate(-90)" text-anchor="middle" font-size="${dim.chain?1.7:2}" fill="#405d70">${escape(length(dim.value,units))}</text>`);
      else parts.push(text(x,y-1,length(dim.value,units),dim.chain?1.7:2,'middle'));
    }
    parts.push('</g>');
    if(plan.sitout){parts.push(rect(plan.sitout,'#576d70','#f2f6f6'));const q=p({x:plan.sitout.x+plan.sitout.w/2,y:plan.sitout.y+plan.sitout.h/2});parts.push(text(q.x,q.y,'SITOUT',2.5,'middle'));}
    for(const car of plan.parking){parts.push(rect(car,'#647482','#f1f3f5'));const q=p({x:car.x+car.w/2,y:car.y+car.h/2});parts.push(text(q.x,q.y,car.kind.toUpperCase(),2.5,'middle'));}
    if(sheet==='A-01')parts.push(rect(plan.envelope,'#1c477f','#edf3f9'));
    else {
      parts.push('<g data-layer="walls">');
      for(const wall of plan.walls.filter(w=>w.floor===floor))for(const r of wallSegments(plan,wall))parts.push(rect(r,'#20467f','#20467f'));
      parts.push('</g><g data-layer="openings">');
      for(const o of plan.openings.filter(o=>o.floor===floor)) {
        const wall=plan.walls.find(w=>w.id===o.wallId),a=p(wall.start),b=p(wall.end),q=p(o),vertical=Math.abs(a.x-b.x)<.01,half=o.width*scale/2;
        if(o.kind==='window') {for(const delta of [-.4,0,.4])parts.push(line({x:q.x+(vertical?delta:-half),y:q.y+(vertical?-half:delta)},{x:q.x+(vertical?delta:half),y:q.y+(vertical?half:delta)},'#008291',.2));}
        else {
          const geometry=doorGeometry(plan,o),hinge=p(geometry.hinge),closed=p(geometry.closed),open=p(geometry.open),radius=geometry.radius*scale;
          const sweep=(closed.x-hinge.x)*(open.y-hinge.y)-(closed.y-hinge.y)*(open.x-hinge.x)>0?1:0;
          parts.push(line(hinge,open,'#298243'),`<path d="M ${closed.x} ${closed.y} A ${radius} ${radius} 0 0 ${sweep} ${open.x} ${open.y}" stroke="#298243" fill="none" stroke-width=".2"/>`);
        }
        parts.push(text(q.x+.8,q.y-1,o.mark,1.8));
      }
      parts.push('</g><g data-layer="labels">');
      for(const r of plan.rooms.filter(r=>r.floor===floor&&r.type!=='stair')) {
        const q=p({x:r.x+r.w/2,y:r.y+r.h/2}),view=site.rect(r,site.toView),max=view.w*scale-2;
        const label=r.name.length>28?`${r.id} ${r.name.slice(0,24)}…`:r.name;
        const size=Math.min(3,max/Math.max(1,label.length*.65));
        parts.push(text(q.x,q.y-1,label.toUpperCase(),size,'middle'));
        // Schedule sizes always E–W × N–S, including a rotated road-view plan.
        parts.push(text(q.x,q.y+2,`${length(r.w,units)} × ${length(r.h,units)}`,Math.min(2,max/Math.max(1,(`${length(r.w,units)} × ${length(r.h,units)}`).length*.55)),'middle'));
        if(r.autoAdded)parts.push(text(q.x,q.y+4,'AUTO-ADDED',1.5,'middle','#586b7d'));
      }
      parts.push('</g><g data-layer="stairs">');
      for(const stair of plan.stairs.filter(s=>s.floor===floor)) {
        const geometry=stairGeometry(plan,stair);
        for(const [a,b]of geometry.lines)parts.push(line(p(a),p(b),'#a42b86',.18));
        for(let i=1;i<geometry.arrow.length;i++)parts.push(line(p(geometry.arrow[i-1]),p(geometry.arrow[i]),'#a42b86',.3));
        const label=p(geometry.label);parts.push(text(label.x,label.y,`UP · ${stair.risers}R @ ${Math.round(stair.riser)} mm`,1.7,'middle','#a42b86'));
      }
      parts.push('</g>');
      if(sheet==='A-03'){parts.push('<g data-layer="fixtures">');for(const f of plan.fixtures.filter(f=>f.floor===floor))for(const path of fixturePaths(f.kind)){const points=path.points.map(([x,y])=>p({x:f.x+x*f.w,y:f.y+y*f.h}));parts.push(`<path d="${points.map((q,i)=>`${i?'L':'M'} ${q.x} ${q.y}`).join(' ')}${path.closed?' Z':''}" stroke="#718596" stroke-width=".2" fill="none"/>`);}parts.push('</g>');}
    }
    // True North rotates with road-facing presentation.
    const angle=plan.compass.viewNorthAngle,radians=angle*Math.PI/180;parts.push(`<g transform="translate(218 48) rotate(${angle})"><path d="M 0 -7 L -1.6 0 L 0 -2 L 1.6 0 Z" fill="#173c65"/><line x1="0" y1="-2" x2="0" y2="7" stroke="#173c65" stroke-width=".4"/></g>`,text(218+Math.sin(radians)*11,49-Math.cos(radians)*11,'N',3,'middle'));
  }
  let tx=sheet==='A-04'?18:253,ty=43;
  function row(s,size=2.5){parts.push(text(tx,ty,s,size));ty+=5;}
  if(sheet==='A-04') {
    row('ROOM SCHEDULE  —  E–W × N–S CLEAR DIMENSIONS',3.5);ty+=3;
    for(const r of plan.rooms.slice(schedulePage*20,(schedulePage+1)*20)){row(`${r.id}  L${r.floor}  ${r.name.slice(0,40)}  |  ${length(r.w,units)} × ${length(r.h,units)}  |  ${(r.w*r.h/1e6).toFixed(2)} m²${r.autoAdded?'  [auto-added]':''}`,2.5);}
    tx=235;ty=43;row(`OPENING SCHEDULE — FLOOR ${floor}`,3.5);row('WIDTH × HEIGHT / COUNT',2.5);
    const groups={};for(const o of plan.openings.filter(o=>o.floor===floor)){const key=`${o.mark}  ${o.width} × ${o.height} mm`;groups[key]=(groups[key]||0)+1;}for(const [k,v] of Object.entries(groups))row(`${k}  /  ${v}`);
  } else {
    row('PROJECT CRITERIA',3.5);ty+=3;row(`External walls  ${rulesText('external')}`);row(`Internal walls  ${rulesText('internal')}`);row('Window sill 900 / lintel 2100 mm');row('Clear passage 1200 mm');row('Dimensions: clear plastered faces');ty+=6;
  }
  row('AREA STATEMENT',3.5);ty+=2;for(const [label,key] of [['Plot','plotM2'],['Built-up (all floors)','builtUpM2'],['Clear carpet','carpetM2'],['Setbacks','setbackM2']])row(`${label}: ${plan.area[key].toFixed(2)} m²`);
  row(`Coverage: ${plan.area.coveragePercent.toFixed(1)}%   FSI: ${plan.area.fsi.toFixed(2)}`);ty+=4;
  row('REVIEW NOTES',3.5);row('Design study only. Not an approval drawing.');row('Column/foundation sizing not designed.');row('Confirm boundaries, levels and local rules.');row('Confirm openings and stair headroom on site.');
  parts.push('<path d="M 8 268 H 412 M 285 268 V 289" fill="none" stroke="#243a55" stroke-width=".3"/>',text(15,275,`${plan.projectName}  |  ${projectId}`,3),text(15,282,`Rev 0 · ${date} · Drawn: OH I SEE · Checked: PENDING`,2.5),text(292,275,`A3 · ${sheet==='A-04'?'NTS':`1:${Math.round(1/scale)}`} · ${sheet}`,3),text(292,282,'PROFESSIONAL REVIEW REQUIRED',2.3),'</g></svg>');
  return parts.join('');
}
function rulesText(kind){return `${require('./rules/tnbc').wall[kind]} mm`;}
module.exports={render,wallSegments,escape,doorGeometry,stairGeometry,fixturePaths};
