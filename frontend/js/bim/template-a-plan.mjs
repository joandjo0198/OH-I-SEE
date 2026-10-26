// Deployment copy of backend/src/cad/template-a-plan.mjs; parity enforced by tests.
// Canonical Phase 1 template. All positions/footprints are integer inches.
// Areas describe gross planning cells (wall centre-lines), not clear carpet area.
export const ADJACENCIES = [
 ['road','foyer','main'],['foyer','living','open'],['living','pooja','door'],
 ['living','dining','open'],['living','stair','open'],['dining','kitchen','door'],
 ['dining','common','door'],['dining','utility','door'],['dining','passage','open'],
 ['stair','passage','open'],['passage','master','door'],['passage','bed2','door'],
 ['passage','bed3','door'],['master','bath1','door'],['bed2','bath2','door'],['bed3','bath3','door']
];
const rect=(x,y,w,h)=>({x:x*12,y:y*12,w:w*12,h:h*12});
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const contains=(r,x,y)=>r.parts.some(p=>x>p.x&&x<p.x+p.w&&y>p.y&&y<p.y+p.h);
const habitable=new Set(['living','dining','bedroom']);
export function generateTemplateA({parking=true,facing='East',frontage=40,depth=50,setbacks={front:5,rear:3,left:3,right:3}}={}) {
 if(typeof parking!=='boolean')throw new Error('Parking must be true or false.');
 if(facing!=='East'||frontage!==40||depth!==50||setbacks.front!==5||setbacks.rear!==3||setbacks.left!==3||setbacks.right!==3)throw new Error('Phase 1 supports only 40 × 50 ft East, setbacks 5/3/3/3. Other sites await Phase 3.');
 const plan={schemaVersion:1,template:'A',units:'inches',facing,plot:rect(-3,-5,40,50),envelope:rect(0,0,34,42),setbacks:Object.fromEntries(Object.entries(setbacks).map(([k,v])=>[k,v*12])),rooms:[],walls:[],doors:[],windows:[],furniture:[],stairs:[],porch:null,road:{...rect(-3,-12,40,7),label:'EAST FACING ROAD'},compass:{north:{x:1,y:0}},checks:[],areaBasis:'Gross planning cells including wall allocation; not clear carpet area'};
 function room(id,name,type,x,y,w,h,parts){const box=rect(x,y,w,h);const r={id,name,type,...box,parts:parts||[box]};r.area=r.parts.reduce((s,p)=>s+p.w*p.h,0);plan.rooms.push(r);return r;}
 const outside=room('front',parking?'Car Porch':'Sit-out Garden',parking?'parking':'garden',0,0,16,16);if(parking)plan.porch={roomId:outside.id,...rect(0,0,16,16),open:true};
 room('foyer','Foyer','foyer',16,0,12,6);room('pooja','Pooja','pooja',28,0,6,6);room('living','Living','living',16,6,18,10);
 room('kitchen','Kitchen','kitchen',0,16,10,12);room('dining','Dining / Hall','dining',10,16,12,12);room('common','Common Toilet','toilet',22,16,6,6);room('utility','Utility','utility',22,22,6,6);room('stair','Stair','stair',28,16,6,12);room('passage','Passage','passage',0,28,34,3);
 room('master','Master Bedroom','bedroom',0,31,12,11,[rect(0,31,12,5),rect(0,36,7,6)]);
 room('bed2','Bedroom 2','bedroom',12,31,11,11,[rect(12,31,11,5),rect(17,36,6,6)]);
 room('bed3','Bedroom 3','bedroom',23,31,11,11,[rect(23,31,11,5),rect(23,36,6,6)]);
 room('bath1','Attached WC 1','toilet',7,36,5,6);room('bath2','Attached WC 2','toilet',12,36,5,6);room('bath3','Attached WC 3','toilet',29,36,5,6);
 const parts=plan.rooms.flatMap(r=>r.parts.map(p=>({...p,room:r.id})));
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)if(overlap(parts[i],parts[j])>0)throw new Error(`Room overlap: ${parts[i].room} / ${parts[j].room}`);
 plan.area=plan.rooms.reduce((s,r)=>s+r.area,0);
 if(plan.area!==plan.envelope.w*plan.envelope.h||plan.area/144!==1428)throw new Error('Template area must tile 1428 sq ft exactly.');
 // Split every room boundary at the same grid intersections, then merge shared runs.
 const xs=[...new Set(parts.flatMap(p=>[p.x,p.x+p.w]))].sort((a,b)=>a-b),ys=[...new Set(parts.flatMap(p=>[p.y,p.y+p.h]))].sort((a,b)=>a-b);
 const owner=(x,y)=>plan.rooms.find(r=>contains(r,x,y))?.id||null;
 function edge(axis,c,a,b,owners){if(owners[0]===owners[1])return;const prev=plan.walls.at(-1);const key=JSON.stringify(owners);if(prev&&prev.axis===axis&&prev.c===c&&prev.b===a&&JSON.stringify(prev.rooms)===key){prev.b=b;return;}plan.walls.push({id:`wall-${plan.walls.length}`,axis,c,a,b,rooms:owners,exterior:owners.includes(null),thickness:owners.includes(null)?9:4.5});}
 for(const x of xs)for(let i=0;i<ys.length-1;i++){const y=(ys[i]+ys[i+1])/2;edge('v',x,ys[i],ys[i+1],[owner(x-.1,y),owner(x+.1,y)]);}
 for(const y of ys)for(let i=0;i<xs.length-1;i++){const x=(xs[i]+xs[i+1])/2;edge('h',y,xs[i],xs[i+1],[owner(x,y-.1),owner(x,y+.1)]);}
 plan.walls=plan.walls.filter(w=>!(w.exterior&&w.rooms.includes('front')));
 for(const [from,to,kind] of ADJACENCIES){
  const target=plan.rooms.find(r=>r.id===to);const width=target.type==='toilet'?30:36;
  const wall=plan.walls.find(w=>from==='road'?w.axis==='h'&&w.c===0&&w.rooms.includes(to):w.rooms.includes(from)&&w.rooms.includes(to));
  if(!wall||wall.b-wall.a<width+24)throw new Error(`No shared wall with door clearance: ${from} → ${to}`);
  const at=(wall.a+wall.b)/2;const direction=wall.rooms[1]===to?1:-1;
  const hinge=wall.axis==='h'?{x:at-width/2,y:wall.c}:{x:wall.c,y:at-width/2};
  const closed=wall.axis==='h'?{x:hinge.x+width,y:hinge.y}:{x:hinge.x,y:hinge.y+width};
  const leaf=wall.axis==='h'?{x:hinge.x,y:hinge.y+direction*width}:{x:hinge.x+direction*width,y:hinge.y};
  plan.doors.push({id:`door-${plan.doors.length+1}`,from,to,kind,wallId:wall.id,axis:wall.axis,c:wall.c,at,width,hinge,closed,leaf,direction,label:kind==='main'?'MD':kind==='open'?'OPEN':'D'});
 }
 for(const r of plan.rooms){if(!habitable.has(r.type)&&!['kitchen','toilet','pooja'].includes(r.type))continue;
  const width=r.type==='toilet'?24:48;
  const candidates=plan.walls.filter(w=>w.exterior&&w.rooms.includes(r.id)&&w.b-w.a>=width+12);
  for(const w of candidates)plan.windows.push({id:`window-${plan.windows.length+1}`,roomId:r.id,wallId:w.id,axis:w.axis,c:w.c,at:(w.a+w.b)/2,width,kind:r.type==='toilet'?'ventilator':'window',sill:r.type==='kitchen'?42:r.type==='toilet'?72:36});
  if(!candidates.length)plan.checks.push({status:'warning',text:`${r.name}: ${r.type==='toilet'?'needs air shaft':'needs a courtyard or revised layout for an external window'} — no external wall.`});
 }
 // Actual wall solids, with openings removed, are persisted once for every consumer.
 for(const w of plan.walls){const cuts=[...plan.doors,...plan.windows].filter(o=>o.wallId===w.id).map(o=>[o.at-o.width/2,o.at+o.width/2]).sort((a,b)=>a[0]-b[0]);w.solids=[];let start=w.a;for(const [a,b] of [...cuts,[w.b,w.b]]){if(a>start)w.solids.push(w.axis==='h'?{x:start,y:w.c-w.thickness/2,w:a-start,h:w.thickness}:{x:w.c-w.thickness/2,y:start,w:w.thickness,h:a-start});start=Math.max(start,b);}}
 // Fixture placement is confined to owned floor cells and cannot cross partitions.
 function place(r,type,w,h){let best=null;
  const doors=plan.doors.filter(d=>d.to===r.id&&d.kind!=='open');
  for(const [fw,fh] of [[w,h],[h,w]])for(let y=r.y+6;y+fh<=r.y+r.h-6;y+=6)for(let x=r.x+6;x+fw<=r.x+r.w-6;x+=6){
   const box={x,y,w:fw,h:fh};if(r.parts.reduce((s,p)=>s+overlap(p,box),0)!==fw*fh)continue;
   if(plan.furniture.some(f=>overlap(f,box)>0))continue;
   let clearance=Infinity;for(const d of doors){const swing={x:Math.min(d.hinge.x,d.leaf.x,d.closed.x),y:Math.min(d.hinge.y,d.leaf.y,d.closed.y),w:Math.max(d.hinge.x,d.leaf.x,d.closed.x)-Math.min(d.hinge.x,d.leaf.x,d.closed.x),h:Math.max(d.hinge.y,d.leaf.y,d.closed.y)-Math.min(d.hinge.y,d.leaf.y,d.closed.y)};
    const dx=Math.max(swing.x-box.x-box.w,box.x-swing.x-swing.w,0),dy=Math.max(swing.y-box.y-box.h,box.y-swing.y-swing.h,0);clearance=Math.min(clearance,Math.hypot(dx,dy));if(overlap(swing,box)>0){clearance=-1;break;}}
   if(clearance<0)continue;const score=Math.min(clearance,30)*100-y*.01-x*.001;
   if(!best||score>best.score)best={...box,score,clearance};
  }
  if(!best){plan.checks.push({status:'warning',text:`${r.name}: ${type} cannot fit without collision; omitted.`});return;}
  const {score,...box}=best;plan.furniture.push({...box,id:`fixture-${plan.furniture.length+1}`,roomId:r.id,type});
  if(best.clearance<30)plan.checks.push({status:'warning',text:`${r.name}: ${type} has ${Math.round(best.clearance)} in door-swing clearance; 30 in requested.`});
 }
 for(const r of plan.rooms){const specs={bedroom:[['Bed',60,78],['Side table',18,18],['Side table',18,18],['Wardrobe',48,24]],toilet:[['WC',24,28],['Basin',18,18]],pooja:[['Pooja unit',36,18]],parking:[['Car',72,168]]}[r.type]||[];for(const [type,w,h] of specs)place(r,type,w,h);}
 for(const [roomId,type,x,y,w,h] of [
 ['living','Sofa',198,90,30,72],['living','Coffee table',276,120,36,20],['living','TV',390,108,12,60],
 ['dining','Dining table',162,240,60,36],['dining','Chair',170,218,18,18],['dining','Chair',194,218,18,18],['dining','Chair',170,280,18,18],['dining','Chair',194,280,18,18]])plan.furniture.push({id:`fixture-${plan.furniture.length+1}`,roomId,type,x,y,w,h});
 // Counter footprints stay against the external kitchen walls; sink below its window.
 for(const [type,x,y,w,h] of [['Counter',6,198,24,132],['Counter',30,306,84,24],['Sink',6,246,24,30],['Hob',66,306,30,24],['Fridge',78,198,30,30]])plan.furniture.push({id:`fixture-${plan.furniture.length+1}`,roomId:'kitchen',type,x,y,w,h,integrated:['Sink','Hob'].includes(type)});
 plan.stairs=[{roomId:'stair',tread:12,steps:Array.from({length:10},(_,i)=>({x:342,y:204+i*12,w:60,h:0})),arrow:{x1:372,y1:210,x2:372,y2:318},label:'UP'}];
 plan.gate={x:parking?96:264,y:-60,width:parking?120:48};
 plan.entry={x:264,fromY:-96,toY:-5};plan.walkway={x:246,y:-60,w:36,h:60};plan.driveway=parking?{x:36,y:-60,w:120,h:60}:null;
 plan.trees=[{x:-18,y:80},{x:-18,y:260},{x:426,y:90},{x:426,y:400},{x:60,y:522},{x:220,y:522},{x:370,y:522}];
 plan.tables={rooms:plan.rooms.map(r=>({id:r.id,name:r.name,width:r.w,depth:r.h,area:r.area/144,note:r.parts.length>1?'Net of attached WC':''})),site:[['Plot',2000],['Envelope',1428],['Setbacks (union)',572]],total:plan.area/144};
 plan.checks.unshift({status:'pass',text:'16 spaces tile 1,428 sq ft exactly; no overlapping floor cells.'},{status:'pass',text:'All 16 circulation links have doors or openings; bedrooms are terminal destinations.'},{status:'pass',text:'Living and all three bedrooms have external windows; central dining requires review.'});
 plan.checks.push({status:'warning',text:'Exact template: only attached WC 1 and WC 2 share a wet wall; other toilets are separated.'},{status:'warning',text:'Dimensions are gross zoning cells. Wall thickness reduces usable clear sizes; this is not a construction drawing.'},{status:'warning',text:'Phase 1 stair shows 12 in treads. Floor height, risers and headroom await design.'});
 return plan;
}
export const feet=inches=>`${Math.floor(inches/12)}′${inches%12?` ${inches%12}″`:''}`;
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderTemplateA(plan){
 const H=plan.envelope.h,Y=y=>H-y;
 const box=(r,attr='')=>`<rect x="${r.x}" y="${Y(r.y+r.h)}" width="${r.w}" height="${r.h}" ${attr}/>`;
 const line=(x1,y1,x2,y2,attr='')=>`<line x1="${x1}" y1="${Y(y1)}" x2="${x2}" y2="${Y(y2)}" ${attr}/>`;
 const text=(x,y,s,attr='')=>`<text x="${x}" y="${Y(y)}" ${attr}>${escape(s)}</text>`;
 const colors={parking:'#e9e5db',garden:'#d1e5c2',bedroom:'#edf2fa',toilet:'#d8efef',living:'#f6e7cb',dining:'#f9edd9',kitchen:'#e3edda',utility:'#e6eee1',stair:'#e8e7e4',passage:'#f7f7f2',pooja:'#f4e0e0',foyer:'#f6e7cb'};
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-112 -82 668 790" role="img" aria-label="Template A East facing floor plan" font-family="Arial,sans-serif" style="background:white"><defs><marker id="entry-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#c52b32"/></marker></defs>`;
 svg+=box(plan.plot,'fill="#dfedd6" stroke="#697d60" stroke-width="1"');svg+=box(plan.road,'fill="#e1e5e9"');
 for(const t of plan.trees)svg+=`<circle cx="${t.x}" cy="${Y(t.y)}" r="10" fill="#a4c987" stroke="#789663"/>`;
 if(plan.driveway)svg+=box(plan.driveway,'fill="#d3cabc"');svg+=box(plan.walkway,'fill="#e9dac5"');
 for(const r of plan.rooms)for(const p of r.parts)svg+=box(p,`fill="${colors[r.type]}"`);
 for(const w of plan.walls)for(const s of w.solids)svg+=box(s,'fill="#171a1b"');
 for(const w of plan.windows){const a=w.at-w.width/2,b=w.at+w.width/2;for(const delta of [-2,2])svg+=w.axis==='h'?line(a,w.c+delta,b,w.c+delta,'stroke="#167f96" stroke-width="1.6"'):line(w.c+delta,a,w.c+delta,b,'stroke="#167f96" stroke-width="1.6"');}
 for(const d of plan.doors){if(d.kind==='open')continue;svg+=line(d.hinge.x,d.hinge.y,d.leaf.x,d.leaf.y,'stroke="#79613d" stroke-width="1.5"');const sweep=d.axis==='h'?(d.direction>0?0:1):(d.direction>0?1:0);svg+=`<path d="M${d.closed.x} ${Y(d.closed.y)} A${d.width} ${d.width} 0 0 ${sweep} ${d.leaf.x} ${Y(d.leaf.y)}" fill="none" stroke="#9c8058" stroke-width=".9"/>`;if(d.kind==='main')svg+=text(d.at+25,-10,'MD','font-size="10" font-weight="bold" fill="#b5232c"');}
 for(const f of plan.furniture){svg+=box(f,`rx="2" fill="${f.type==='Car'?'#d1d8df':'#fffdf6'}" stroke="#8e938b" stroke-width=".8"`);if(f.type==='Bed'){svg+=box({...f,w:f.w-8,h:15,x:f.x+4,y:f.y+f.h-19},'fill="#e4ded0" stroke="#9c9c90" stroke-width=".5"');}if(['WC','Basin','Sink','Hob'].includes(f.type))svg+=`<ellipse cx="${f.x+f.w/2}" cy="${Y(f.y+f.h/2)}" rx="${f.w*.3}" ry="${f.h*.3}" fill="none" stroke="#8e938b"/>`;if(!['Side table','Chair','Counter'].includes(f.type))svg+=text(f.x+f.w/2,f.y+f.h*.45,f.type,'font-size="5" text-anchor="middle" fill="#657064"');}
 for(const s of plan.stairs){for(const step of s.steps)svg+=line(step.x,step.y,step.x+step.w,step.y,'stroke="#777" stroke-width="1"');svg+=line(s.arrow.x1,s.arrow.y1,s.arrow.x2,s.arrow.y2,'stroke="#c52b32" stroke-width="1.5" marker-end="url(#entry-arrow)"');svg+=text(387,260,'UP','font-size="8" fill="#c52b32"');}
 for(const r of plan.rooms){const p=r.parts[0],x=p.x+p.w/2,y=p.y+p.h/2;svg+=box({x:x-Math.max(r.name.length*2.3,24),y:y-12,w:Math.max(r.name.length*4.6,48),h:25},'rx="2" fill="white" fill-opacity=".85"');svg+=text(x,y+4,r.name,'font-size="8" font-weight="bold" text-anchor="middle" fill="#182627"');svg+=text(x,y-8,`${feet(r.w)} × ${feet(r.h)}`,'font-size="7" text-anchor="middle" fill="#344747"');}
 const dim=(x1,y1,x2,y2,label,vertical=false)=>line(x1,y1,x2,y2,'stroke="#697278" stroke-width=".6"')+(vertical?line(x1-4,y1,x1+4,y1,'stroke="#697278"')+line(x2-4,y2,x2+4,y2,'stroke="#697278"'):line(x1,y1-4,x1,y1+4,'stroke="#697278"')+line(x2,y2-4,x2,y2+4,'stroke="#697278"'))+text((x1+x2)/2+(vertical?-5:0),(y1+y2)/2+5,label,`font-size="8" text-anchor="${vertical?'end':'middle'}" fill="#47555a"`);
 svg+=dim(-36,558,444,558,'PLOT FRONTAGE 40′')+dim(0,540,408,540,'ENVELOPE 34′')+dim(-65,-60,-65,540,'50′',true)+dim(-48,0,-48,504,'42′',true);
 svg+=dim(0,-33,0,0,'FRONT 5′',true)+dim(0,504,0,540,'REAR 3′',true)+dim(-36,160,0,160,'3′')+dim(408,160,444,160,'3′');
 svg+=line(plan.gate.x-plan.gate.width/2,-60,plan.gate.x+plan.gate.width/2,-60,'stroke="#ac783e" stroke-width="4"');svg+=text(plan.gate.x,-74,'MAIN GATE','font-size="8" text-anchor="middle"');
 svg+=line(plan.entry.x,plan.entry.fromY,plan.entry.x,plan.entry.toY,'stroke="#c52b32" stroke-width="2" marker-end="url(#entry-arrow)"')+text(280,-40,'ENTRY','font-size="8" fill="#c52b32"');svg+=text(180,-120,plan.road.label,'font-size="12" font-weight="bold" text-anchor="middle"');
 svg+=line(472,470,510,470,'stroke="#c52b32" stroke-width="2" marker-end="url(#entry-arrow)"')+text(520,467,'N','font-size="12" font-weight="bold" fill="#c52b32"')+text(490,451,'E ↓','font-size="8" text-anchor="middle"');
 svg+=`<path d="M506 ${Y(474)} L514 ${Y(470)} L506 ${Y(466)}Z" fill="#c52b32"/><path d="M260 ${Y(-12)} L264 ${Y(-4)} L268 ${Y(-12)}Z" fill="#c52b32"/>`;svg+=text(204,-166,'TEMPLATE A · 40 × 50 FT · EAST · PHASE 1','font-size="10" font-weight="bold" text-anchor="middle"');
 return svg+'</svg>';
}
