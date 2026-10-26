import {generateTemplateA,ADJACENCIES,feet,escape} from './template-a-plan.mjs';
export {feet,escape};
const snap=n=>Math.round(n/3)*3,ceil=n=>Math.ceil(n/3)*3;
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const contains=(r,x,y)=>r.parts.some(p=>x>p.x&&x<p.x+p.w&&y>p.y&&y<p.y+p.h);
const habitable=new Set(['living','dining','bedroom','drawing','office','study']);
const fail=(message,details=[])=>{throw Object.assign(new Error(message),{status:422,details});};
const area=r=>r.parts.reduce((s,p)=>s+p.w*p.h,0);
const minArea=type=>habitable.has(type)?9.5/0.0254**2:type==='kitchen'?4.5/0.0254**2:type==='toilet'?1.8/0.0254**2:0;
function room(id,name,type,x,y,w,h,parts){return{id,name,type,x,y,w,h,parts:parts||[{x,y,w,h}]};}
function compile(plan,adjacencies){
 for(const r of plan.rooms)r.area=area(r);
 const parts=plan.rooms.flatMap(r=>r.parts.map(p=>({...p,room:r.id})));
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)if(overlap(parts[i],parts[j])>0)throw new Error(`Room overlap: ${parts[i].room} / ${parts[j].room}`);
 plan.area=plan.rooms.reduce((s,r)=>s+r.area,0);
 if(plan.area!==plan.envelope.w*plan.envelope.h)throw new Error('Room cells must tile the envelope exactly.');
 // Split every room boundary at the same grid intersections, then merge shared runs.
 const xs=[...new Set(parts.flatMap(p=>[p.x,p.x+p.w]))].sort((a,b)=>a-b),ys=[...new Set(parts.flatMap(p=>[p.y,p.y+p.h]))].sort((a,b)=>a-b);
 const owner=(x,y)=>plan.rooms.find(r=>contains(r,x,y))?.id||null;
 function edge(axis,c,a,b,owners){if(owners[0]===owners[1])return;const prev=plan.walls.at(-1);const key=JSON.stringify(owners);if(prev&&prev.axis===axis&&prev.c===c&&prev.b===a&&JSON.stringify(prev.rooms)===key){prev.b=b;return;}plan.walls.push({id:`wall-${plan.walls.length}`,axis,c,a,b,rooms:owners,exterior:owners.includes(null),thickness:owners.includes(null)?9:4.5});}
 for(const x of xs)for(let i=0;i<ys.length-1;i++){const y=(ys[i]+ys[i+1])/2;edge('v',x,ys[i],ys[i+1],[owner(x-.1,y),owner(x+.1,y)]);}
 for(const y of ys)for(let i=0;i<xs.length-1;i++){const x=(xs[i]+xs[i+1])/2;edge('h',y,xs[i],xs[i+1],[owner(x,y-.1),owner(x,y+.1)]);}
 plan.walls=plan.walls.filter(w=>!(w.exterior&&w.rooms.includes('front')));
 for(const [from,to,kind] of adjacencies){
  const target=plan.rooms.find(r=>r.id===to);const width=target.type==='toilet'?30:36;
  const wall=plan.walls.filter(w=>w.b-w.a>=width+24 && (from==='road'?w.axis==='h'&&w.c===0&&w.rooms.includes(to):w.rooms.includes(from)&&w.rooms.includes(to))).sort((a,b)=>(b.b-b.a)-(a.b-a.a))[0];
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
  for(const w of candidates){const at=(w.a+w.b)/2;if(plan.doors.some(d=>d.wallId===w.id&&Math.abs(d.at-at)<(d.width+width)/2+6))continue;plan.windows.push({id:`window-${plan.windows.length+1}`,roomId:r.id,wallId:w.id,axis:w.axis,c:w.c,at:(w.a+w.b)/2,width,kind:r.type==='toilet'?'ventilator':'window',sill:r.type==='kitchen'?42:r.type==='toilet'?72:36});}
  if(!plan.windows.some(w=>w.roomId===r.id))plan.checks.push({status:'warning',text:`${r.name}: ${r.type==='toilet'?'needs air shaft':'needs a courtyard or revised layout for an external window'} — no external wall.`});
 }
 // Actual wall solids, with openings removed, are persisted once for every consumer.
 for(const w of plan.walls){const cuts=[...plan.doors,...plan.windows].filter(o=>o.wallId===w.id).map(o=>[o.at-o.width/2,o.at+o.width/2]).sort((a,b)=>a[0]-b[0]);w.solids=[];let start=w.a;for(const [a,b] of [...cuts,[w.b,w.b]]){if(a>start)w.solids.push(w.axis==='h'?{x:start,y:w.c-w.thickness/2,w:a-start,h:w.thickness}:{x:w.c-w.thickness/2,y:start,w:w.thickness,h:a-start});start=Math.max(start,b);}}

 plan.adjacencies=adjacencies;
 return plan;
}
export function generatePlan(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))fail('Invalid planning options.');
 const input={frontage:40,depth:60,facing:'West',parking:true,stairs:true,bedrooms:null,optionalRooms:[],setbacks:{front:5,rear:3,left:3,right:3},...options};
 if(!Array.isArray(input.optionalRooms)||input.optionalRooms.length>2)fail('Select at most office and study.');
 if(!['East','West','North','South'].includes(input.facing))fail('Select a valid road direction.');
 if(typeof input.parking!=='boolean'||typeof input.stairs!=='boolean')fail('Parking and stairs must be boolean values.');
 const inInches=value=>{const n=Number(value)*12;if(!Number.isFinite(n)||Math.abs(n-Math.round(n))>1e-7)fail('Dimensions must resolve to whole inches.');return Math.round(n);};
 const P=inInches(input.frontage),D=inInches(input.depth),s=Object.fromEntries(['front','rear','left','right'].map(k=>[k,inInches(input.setbacks[k])]));
 if(P<=0||D<=0||Math.max(P,D)>2400||Object.values(s).some(v=>v<0))fail('Enter a plot up to 200 ft with non-negative setbacks.');
 const W=P-s.left-s.right,L=D-s.front-s.rear;
 if(W<=0||L<=0)fail('Setbacks consume the plot. Increase the plot or reduce setbacks.');
 const template=W>=360?'A':'B',bedrooms=template==='A'?3:2;
 if(input.bedrooms!==null&&Number(input.bedrooms)!==bedrooms)fail(`Template ${template} provides ${bedrooms} bedrooms. Requested ${input.bedrooms}; choose a suitable plot or revise the bedroom count.`);
 const plan={schemaVersion:2,template,units:'inches',facing:input.facing,input,plot:{x:-s.left,y:-s.front,w:P,h:D},envelope:{x:0,y:0,w:W,h:L},setbacks:s,rooms:[],walls:[],doors:[],windows:[],furniture:[],stairs:[],porch:null,checks:[],adjustments:[],compass:{north:{East:{x:1,y:0},West:{x:-1,y:0},North:{x:0,y:-1},South:{x:0,y:1}}[input.facing]},road:{x:-s.left,y:-s.front-84,w:P,h:84,label:`${input.facing.toUpperCase()} FACING ROAD`},areaBasis:'Gross planning cells; clear wall-face dimensions require design review.'};
 let adj;
 if(template==='A'){
  const seed=generateTemplateA({parking:input.parking});
  const x=v=>v===408?W:snap(v*W/408);
  let front=snap(.38*L),middle=snap(.29*L),rear=L-front-middle-36;
  // Keep all rooms above the requested minima before distributing surplus.
  const minRear=ceil(Math.max(...seed.rooms.filter(r=>r.type==='bedroom').map(r=>(minArea('bedroom')+30*144)/(x(r.x+r.w)-x(r.x)))));
  let need=Math.max(0,minRear-rear),available=Math.max(0,front-192);const take=Math.min(need,available);front-=take;need-=take;rear+=take;
  if(need>0){const delta=Math.min(need,Math.max(0,middle-144));middle-=delta;rear+=delta;}
  const y=v=>v<=192?snap(v*front/192):v<=336?front+snap((v-192)*middle/144):v<=372?front+middle+(v-336):front+middle+36+snap((v-372)*(L-front-middle-36)/132);
  const transform=r=>({x:x(r.x),y:y(r.y),w:x(r.x+r.w)-x(r.x),h:(r.y+r.h===504?L:y(r.y+r.h))-y(r.y)});
  plan.rooms=seed.rooms.map(r=>({...r,...transform(r),parts:r.parts.map(transform)}));
  adj=ADJACENCIES.map(a=>a.slice());
  if(!input.stairs){const stair=plan.rooms.find(r=>r.id==='stair');stair.name='Hall';stair.type='hall';}
  plan.adjustments.push(`Band targets: front 38%, middle 29%, passage 3 ft. Actual depths ${feet(front)}, ${feet(middle)}, 3′, ${feet(L-front-middle-36)}; surplus prioritizes living/dining while preserving bedroom minima.`);
 }else{
  const c=snap(W/2),right=W-c;
  // Compact plots combine drawing/living; larger plots retain separate rooms.
  let front=snap(.38*L),middle=snap(.29*L),rear=L-front-middle-36;
  const minRear=ceil(Math.max((minArea('bedroom')+60*48)/c,(minArea('bedroom')+60*48)/right));
  const minFront=ceil(Math.max(minArea('living')/right,minArea('kitchen')/c,96));
  const minMiddle=ceil(Math.max(minArea('dining')/c,96));
  if(rear<minRear){let delta=minRear-rear;const a=Math.min(delta,Math.max(0,front-minFront));front-=a;delta-=a;const b=Math.min(delta,Math.max(0,middle-minMiddle));middle-=b;rear=L-front-middle-36;}
  const back=front+middle+36;
  plan.rooms=[room('kitchen','Kitchen','kitchen',0,0,c,front),room('dining','Dining / Hall','dining',0,front,c,middle),room('hub','Passage / lobby','passage',c,front,right,middle),room('passage','Bedroom passage','passage',0,front+middle,W,36)];
  const drawDepth=snap(front/2);
  if(right*drawDepth>=minArea('drawing')&&right*(front-drawDepth)>=minArea('living')&&drawDepth>=96){plan.rooms.push(room('drawing','Drawing Room','drawing',c,0,right,drawDepth),room('living','Living','living',c,drawDepth,right,front-drawDepth));}
  else{plan.rooms.push(room('living','Drawing / Living','living',c,0,right,front));plan.adjustments.push('Compact plot: drawing and living share one room; no requested bedroom was dropped.');}
  const poojaW=Math.max(36,snap(right-72));
  plan.rooms=plan.rooms.filter(r=>r.id!=='hub'); const dining=plan.rooms.find(r=>r.id==='dining'); dining.w=W; dining.parts=[{x:0,y:front,w:c,h:middle},{x:c,y:front,w:right,h:middle-60},{x:c,y:front+middle-60,w:right-poojaW,h:60}];
  plan.rooms.push(room('pooja','Pooja','pooja',W-poojaW,front+middle-60,poojaW,60));
  const bathW=60,bathH=48;
  plan.rooms.push(room('master','Master Bedroom','bedroom',0,back,c,L-back,[{x:0,y:back,w:c,h:L-back-bathH},{x:0,y:L-bathH,w:c-bathW,h:bathH}]),room('bed2',"Kid’s Bedroom",'bedroom',c,back,right,L-back,[{x:c,y:back,w:right,h:L-back-bathH},{x:c+bathW,y:L-bathH,w:right-bathW,h:bathH}]),room('bath1','Master WC','toilet',c-bathW,L-bathH,bathW,bathH),room('bath2','Attached WC','toilet',c,L-bathH,bathW,bathH));
  const entry=plan.rooms.some(r=>r.id==='drawing')?'drawing':'living';
  adj=[['road',entry,'main'],...(entry==='drawing'?[['drawing','living','open']]:[]),['living','dining','open'],['dining','kitchen','door'],['dining','pooja','door'],['dining','passage','open'],['passage','master','door'],['passage','bed2','door'],['master','bath1','door'],['bed2','bath2','door']];
  plan.referenceTargets={master:[135,240],kitchen:[135,120],dining:[144,96],bed2:[138,132],living:[138,111],drawing:[138,120],bath1:[78,48],bath2:[78,48],pooja:[60,84]};
  plan.adjustments.push('Template B is normalized to a connected, non-overlapping envelope. Reference clear sizes do not tile the supplied envelope with wall thickness; actual dimensions and every deviation are disclosed.');
  for(const r of plan.rooms){const target=plan.referenceTargets[r.id];if(target&&(r.w!==target[0]||r.h!==target[1]))plan.adjustments.push(`${r.name}: reference ${feet(target[0])} × ${feet(target[1])}; actual cell ${feet(r.w)} × ${feet(r.h)}.`);}
  plan.checks.push({status:'warning',text:'Reference dressing spaces require extra area; wardrobes are included, but separate dressing rooms are not silently inserted.'});
 }
 for(const r of plan.rooms)r.area=area(r);
 const shortfalls=[];
 for(const r of plan.rooms){const required=minArea(r.type),short=Math.max(0,required-r.area)/144,widthShort=habitable.has(r.type)?Math.max(0,2.4/.0254-Math.min(r.w,r.h)):0;
  if(r.parts.some(p=>p.w<=0||p.h<=0)||short>.001||widthShort>.001)shortfalls.push({room:r.name,shortfallSqFt:+short.toFixed(2),widthShortfallInches:+widthShort.toFixed(2),suggestion:`Increase the envelope or remove an optional room to enlarge ${r.name}; do not shrink this room below its minimum.`});
 }
 if(shortfalls.length)fail('No feasible plan: minimum room sizes are violated.',shortfalls);
 for(const name of input.optionalRooms||[]){if(!['office','study'].includes(name))fail('Supported optional rooms: office, study.');const slot=plan.rooms.find(r=>['garden','hall'].includes(r.type)&&r.area>=minArea(name)&&Math.min(r.w,r.h)>=2.4/.0254);if(!slot)fail(`No space for ${name}. Remove it or enlarge the plot.`,[{room:name,shortfallSqFt:+(minArea(name)/144).toFixed(2),suggestion:'No eligible unused slot; enlarge the envelope.'}]);slot.name=name==='office'?'Home Office':'Study';slot.type=name;if(slot.id==='front')adj.push(['living',slot.id,'door']);}
 compile(plan,adj);
 // Save opening-aware 3D wall pieces once, not separately in each view.
 for(const w of plan.walls){w.solids3d=w.solids.map(r=>({...r,z:0,height:108}));for(const o of [...plan.doors,...plan.windows].filter(o=>o.wallId===w.id)){const r=w.axis==='h'?{x:o.at-o.width/2,y:w.c-w.thickness/2,w:o.width,h:w.thickness}:{x:w.c-w.thickness/2,y:o.at-o.width/2,w:w.thickness,h:o.width};const sill=o.sill||0,top=o.kind==='window'?sill+48:o.kind==='ventilator'?sill+24:84;if(sill)w.solids3d.push({...r,z:0,height:sill});if(top<108)w.solids3d.push({...r,z:top,height:108-top});}}
 furnish(plan);
 plan.road.label=`${plan.facing.toUpperCase()} FACING ROAD`;
 const main=plan.doors.find(d=>d.kind==='main');plan.entry={x:main.at,fromY:plan.road.y+12,toY:-5};plan.gate={x:main.at,y:-s.front,width:48};plan.walkway={x:main.at-18,y:-s.front,w:36,h:s.front};plan.driveway=null;
 const parkingRoom=plan.rooms.find(r=>r.type==='parking');if(parkingRoom){plan.porch={...parkingRoom,open:true};plan.driveway={x:parkingRoom.x+12,y:-s.front,w:Math.min(120,parkingRoom.w-24),h:s.front};}
 if(template==='B'&&input.parking){const needW=96,needH=192;if(s.front<needH)fail(`No space for a car: Template B needs a parking bay outside its two-column rooms. Front setback is ${feet(s.front)}, needs 16 ft depth.`,[{room:'Parking',shortfallSqFt:needW*Math.max(0,needH-s.front)/144,suggestion:'Turn parking off or provide a larger front setback and plot.'}]);plan.porch={x:0,y:-s.front,w:needW,h:needH,open:true};plan.furniture.push({id:'car',roomId:null,type:'Car',x:12,y:-s.front+12,w:72,h:168});}
 plan.trees=[{x:-s.left/2,y:L/3},{x:W+s.right/2,y:L*2/3}].filter(t=>t.x!==0&&t.x!==W);
 plan.tables={rooms:plan.rooms.map(r=>({id:r.id,name:r.name,width:r.w,depth:r.h,area:+(r.area/144).toFixed(4)})),site:[['Plot',P*D/144],['Envelope',W*L/144],['Setbacks (union)',(P*D-W*L)/144]],total:plan.area/144};
 plan.quantities={floorAreaSqFt:plan.area/144,wallVolumeCuFt:plan.walls.reduce((n,w)=>n+w.solids3d.reduce((v,b)=>v+b.w*b.h*b.height,0),0)/1728,doors:plan.doors.filter(d=>d.kind!=='open').length,windows:plan.windows.length};
 plan.structure={status:'Architectural coordination only — no structural sizing',wallIds:plan.walls.map(w=>w.id)};plan.mep={status:'Fixture coordination only — routes and capacities not engineered',wetRoomIds:plan.rooms.filter(r=>['toilet','kitchen','utility'].includes(r.type)).map(r=>r.id),fixtures:plan.furniture.filter(f=>['WC','Basin','Sink','Hob'].includes(f.type)).map(f=>f.id)};
 plan.checks.unshift({status:'pass',text:`${plan.rooms.length} non-overlapping spaces tile ${(plan.area/144).toFixed(2)} sq ft.`},{status:'pass',text:'Room minima checked before rendering; all circulation edges have openings.'});
 plan.checks.push({status:'warning',text:'Minimum checks use gross cell areas. Wall-face clearance, structural safety, ventilation and local approvals require professional review.'});
 return plan;
}
function furnish(plan){
 for(const r of plan.rooms){const specs={bedroom:[['Bed',60,78],['Wardrobe',36,24]],toilet:[['WC',24,26],['Basin',18,18]],living:[['Sofa',72,30],['Coffee table',30,18]],drawing:[['Sofa',72,30]],dining:[['Dining table',48,30],['Chair',18,18],['Chair',18,18]],kitchen:[['Counter',24,72],['Sink',24,24],['Hob',24,24],['Fridge',24,24]],pooja:[['Pooja unit',30,18]],office:[['Desk',48,24]],study:[['Desk',48,24]],parking:[['Car',72,168]]}[r.type]||[];
  for(const [type,w,h] of specs){let found;for(const [a,b] of [[w,h],[h,w]]){for(let y=r.y+6;y+b<=r.y+r.h-6&&!found;y+=3)for(let x=r.x+6;x+a<=r.x+r.w-6&&!found;x+=3){const box={x,y,w:a,h:b};if(r.parts.reduce((n,p)=>n+overlap(p,box),0)!==a*b||plan.furniture.some(f=>overlap(f,box)>0))continue;
   const blocked=plan.doors.some(d=>{if(d.to!==r.id&&d.from!==r.id)return false;const buffer=d.axis==='h'?{x:d.at-d.width/2-6,y:d.c-36,w:d.width+12,h:72}:{x:d.c-36,y:d.at-d.width/2-6,w:72,h:d.width+12};return overlap(buffer,box)>0;});if(!blocked)found=box;
  }}if(found)plan.furniture.push({...found,id:`f-${plan.furniture.length}`,roomId:r.id,type});else plan.checks.push({status:'warning',text:`${r.name}: ${type} omitted because it would block circulation.`});}
  if(r.type==='stair')plan.stairs.push({roomId:r.id,tread:12,steps:Array.from({length:Math.max(0,Math.floor((r.h-24)/12))},(_,i)=>({x:r.x+6,y:r.y+12+i*12,w:r.w-12,h:0})),arrow:{x1:r.x+r.w/2,y1:r.y+12,x2:r.x+r.w/2,y2:r.y+r.h-12},label:'UP'});
 }
 if(plan.template==='B'&&plan.input.stairs){const s=plan.setbacks;if(s.left>=72&&s.rear>=144)plan.stairs.push({roomId:null,tread:12,steps:Array.from({length:10},(_,i)=>({x:-66,y:plan.envelope.h+i*12,w:60,h:0})),arrow:{x1:-36,y1:plan.envelope.h,x2:-36,y2:plan.envelope.h+120},label:'UP'});else plan.checks.push({status:'warning',text:'No space for the reference rear-left exterior stair: needs a 6 × 12 ft reserved footprint. Stair not drawn over setbacks or bedrooms.'});}
}
