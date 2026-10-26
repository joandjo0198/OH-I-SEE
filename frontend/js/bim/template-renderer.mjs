import {feet,escape} from './template-planner.mjs';
export function renderPlan(plan){
 const H=plan.envelope.h,W=plan.envelope.w,S=plan.setbacks,Y=y=>H-y;
 const box=(r,attr='')=>`<rect x="${r.x}" y="${Y(r.y+r.h)}" width="${r.w}" height="${r.h}" ${attr}/>`;
 const line=(x1,y1,x2,y2,attr='')=>`<line x1="${x1}" y1="${Y(y1)}" x2="${x2}" y2="${Y(y2)}" ${attr}/>`;
 const text=(x,y,s,attr='')=>`<text x="${x}" y="${Y(y)}" ${attr}>${escape(s)}</text>`;
 const colors={parking:'#e9e5db',garden:'#d1e5c2',bedroom:'#edf2fa',toilet:'#d8efef',living:'#f6e7cb',dining:'#f9edd9',kitchen:'#e3edda',utility:'#e6eee1',stair:'#e8e7e4',passage:'#f7f7f2',pooja:'#f4e0e0',foyer:'#f6e7cb'};
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-S.left-85} ${-S.rear-65} ${plan.plot.w+170} ${plan.plot.h+230}" role="img" aria-label="Template ${plan.template} ${plan.facing} facing floor plan" font-family="Arial,sans-serif" style="background:white"><defs><marker id="entry-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#c52b32"/></marker></defs>`;
 svg+=box(plan.plot,'fill="#dfedd6" stroke="#697d60" stroke-width="1"');svg+=box(plan.road,'fill="#e1e5e9"');
 for(const t of plan.trees)svg+=`<circle cx="${t.x}" cy="${Y(t.y)}" r="10" fill="#a4c987" stroke="#789663"/>`;
 if(plan.driveway)svg+=box(plan.driveway,'fill="#d3cabc"');svg+=box(plan.walkway,'fill="#e9dac5"');
 for(const r of plan.rooms)for(const p of r.parts)svg+=box(p,`fill="${(colors[r.type]||'#eee9df')}"`);
 for(const w of plan.walls)for(const s of w.solids)svg+=box(s,'fill="#171a1b"');
 for(const w of plan.windows){const a=w.at-w.width/2,b=w.at+w.width/2;for(const delta of [-2,2])svg+=w.axis==='h'?line(a,w.c+delta,b,w.c+delta,'stroke="#167f96" stroke-width="1.6"'):line(w.c+delta,a,w.c+delta,b,'stroke="#167f96" stroke-width="1.6"');}
 for(const d of plan.doors){if(d.kind==='open')continue;svg+=line(d.hinge.x,d.hinge.y,d.leaf.x,d.leaf.y,'stroke="#79613d" stroke-width="1.5"');const sweep=d.axis==='h'?(d.direction>0?0:1):(d.direction>0?1:0);svg+=`<path d="M${d.closed.x} ${Y(d.closed.y)} A${d.width} ${d.width} 0 0 ${sweep} ${d.leaf.x} ${Y(d.leaf.y)}" fill="none" stroke="#9c8058" stroke-width=".9"/>`;if(d.kind==='main')svg+=text(d.at+25,-10,'MD','font-size="10" font-weight="bold" fill="#b5232c"');}
 for(const f of plan.furniture){svg+=box(f,`rx="2" fill="${f.type==='Car'?'#d1d8df':'#fffdf6'}" stroke="#8e938b" stroke-width=".8"`);if(f.type==='Bed'){svg+=box({...f,w:f.w-8,h:15,x:f.x+4,y:f.y+f.h-19},'fill="#e4ded0" stroke="#9c9c90" stroke-width=".5"');}if(['WC','Basin','Sink','Hob'].includes(f.type))svg+=`<ellipse cx="${f.x+f.w/2}" cy="${Y(f.y+f.h/2)}" rx="${f.w*.3}" ry="${f.h*.3}" fill="none" stroke="#8e938b"/>`;if(!['Side table','Chair','Counter'].includes(f.type))svg+=text(f.x+f.w/2,f.y+f.h*.45,f.type,'font-size="5" text-anchor="middle" fill="#657064"');}
 for(const s of plan.stairs){for(const step of s.steps)svg+=line(step.x,step.y,step.x+step.w,step.y,'stroke="#777" stroke-width="1"');svg+=line(s.arrow.x1,s.arrow.y1,s.arrow.x2,s.arrow.y2,'stroke="#c52b32" stroke-width="1.5" marker-end="url(#entry-arrow)"');svg+=text(s.arrow.x2+10,s.arrow.y2,'UP','font-size="8" fill="#c52b32"');}
 for(const r of plan.rooms){const p=r.parts[0],x=p.x+p.w/2,y=p.y+p.h/2;svg+=box({x:x-Math.max(r.name.length*2.3,24),y:y-12,w:Math.max(r.name.length*4.6,48),h:25},'rx="2" fill="white" fill-opacity=".85"');svg+=text(x,y+4,r.name,'font-size="8" font-weight="bold" text-anchor="middle" fill="#182627"');svg+=text(x,y-8,`${feet(r.w)} × ${feet(r.h)}`,'font-size="7" text-anchor="middle" fill="#344747"');}
 const dim=(x1,y1,x2,y2,label,vertical=false)=>line(x1,y1,x2,y2,'stroke="#697278" stroke-width=".6"')+(vertical?line(x1-4,y1,x1+4,y1,'stroke="#697278"')+line(x2-4,y2,x2+4,y2,'stroke="#697278"'):line(x1,y1-4,x1,y1+4,'stroke="#697278"')+line(x2,y2-4,x2,y2+4,'stroke="#697278"'))+text((x1+x2)/2+(vertical?-5:0),(y1+y2)/2+5,label,`font-size="8" text-anchor="${vertical?'end':'middle'}" fill="#47555a"`);

 svg+=dim(-S.left,H+S.rear+40,W+S.right,H+S.rear+40,'PLOT '+feet(plan.plot.w))+dim(0,H+S.rear+20,W,H+S.rear+20,'ENVELOPE '+feet(W))+dim(-S.left-45,-S.front,-S.left-45,H+S.rear,feet(plan.plot.h),true)+dim(W+S.right+25,0,W+S.right+25,H,feet(H),true);
 svg+=dim(0,-S.front,0,0,'FRONT '+feet(S.front),true)+dim(0,H,0,H+S.rear,'REAR '+feet(S.rear),true)+dim(-S.left,H/2,0,H/2,feet(S.left))+dim(W,H/2,W+S.right,H/2,feet(S.right));
 svg+=line(plan.gate.x-plan.gate.width/2,plan.gate.y,plan.gate.x+plan.gate.width/2,plan.gate.y,'stroke="#ac783e" stroke-width="4"')+text(plan.gate.x,plan.gate.y-14,'MAIN GATE','font-size="8" text-anchor="middle"');
 svg+=line(plan.entry.x,plan.entry.fromY,plan.entry.x,plan.entry.toY,'stroke="#c52b32" stroke-width="2" marker-end="url(#entry-arrow)"')+text(plan.entry.x+22,-25,'ENTRY','font-size="8" fill="#c52b32"');
 svg+=text(W/2,plan.road.y+20,plan.road.label,'font-size="12" font-weight="bold" text-anchor="middle"');
 const n=plan.compass.north,cx=W+S.right+48,cy=H-35;
 svg+=line(cx,cy,cx+n.x*24,cy+n.y*24,'stroke="#c52b32" stroke-width="2" marker-end="url(#entry-arrow)"')+text(cx+n.x*35,cy+n.y*35,'N','font-size="12" text-anchor="middle" fill="#c52b32"');
 svg+=text(W/2,plan.road.y-25,'TEMPLATE '+plan.template+' · '+plan.facing.toUpperCase()+' · GROUND FLOOR','font-size="10" font-weight="bold" text-anchor="middle"');
 return svg+'</svg>';
}
