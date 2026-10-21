// Shared model: feet, x to the drawing's right, y from rear toward road.
export const VERSION = 1;
export const clone = value => structuredClone(value);
const finite = n => typeof n === 'number' && Number.isFinite(n);
export const room = (id, name, type, x, y, width, depth) => ({id,name,type,x,y,width,depth});
export function referencePlan() {
  const p = {schemaVersion:VERSION, title:'East Facing House Plan', units:'ft', source:'reference',
    plot:{width:32,depth:55,facing:'East',roadSide:'front',setbacks:{left:3.5,right:3.5,front:6.5,rear:3.5}},
    settings:{externalWall:.75,internalWall:.375,wallHeight:10,doorHeight:7,windowSill:3,windowHeight:4},
    rooms:[room('master','Master bedroom','bedroom',3.875,4,11.25,20),room('common','Common toilet','bathroom',3.875,24.375,6.5,4),
      room('dress1','Dressing','dressing',10.75,24.375,4.25,4),room('attached','Attached toilet','bathroom',16.125,4,6.5,4),
      room('dress2','Dressing','dressing',23,4,4.5,4),room('kids',"Kid’s bedroom",'bedroom',16.125,8.375,11.5,11),
      room('passage','Passage','corridor',16.125,19.75,6,7.5),room('puja','Puja','puja',22.5,19.75,5,7),
      room('dining','Dining','dining',3.875,29,12,8),room('living','Living room','living',16.25,28.125,11.5,9.25),
      room('kitchen','Kitchen','kitchen',3.875,37.75,11.25,10),room('drawing','Drawing room','drawing',16.25,37.75,11.5,10),
      room('porch','Sitout','porch',.5,48.5,31,6.5),room('stairs','Outside staircase','stairs',.25,4,2.75,14)],
    fixtures:[],walls:[],openings:[],warnings:[
      'Reference dimensions are nominal room spans. They are preserved, not reduced to force a fit; wall finishes reduce clear space.',
      'The 31 ft sitout and outside staircase occupy setback areas. Their placement requires review.',
      'The source does not dimension every wall or opening. Opening positions and unlabelled gaps are editable interpretations, not surveyed measurements.'
    ],reviewed:false};
  rebuildWalls(p);
  p.openings=p.openings.filter(o=>['window','vent'].includes(o.kind));
  const opening=(id,side,center,width=2.75,kind='door')=>{
    const r=p.rooms.find(r=>r.id===id),axis=['top','bottom'].includes(side)?'h':'v',at=side==='top'?r.y:side==='bottom'?r.y+r.depth:side==='left'?r.x:r.x+r.width;
    const w=p.walls.find(w=>w.axis===axis&&Math.abs(w.at-at)<.01&&w.start<=center-width/2&&w.end>=center+width/2);
    if(w)p.openings.push({id:'reference-'+id+'-'+side+'-'+p.openings.length,wallId:w.id,kind,offset:center-width/2-w.start,width,sill:0,height:7});
  };
  for(const [a,sa,b,sb,center,width] of [['master','bottom','common','top',7,2.25],['master','bottom','dress1','top',12.8,2],['kids','top','attached','bottom',20,2.25],['kids','top','dress2','bottom',25,2],['kids','bottom','passage','top',19,2.75],['master','right','passage','left',22.5,2.75],['passage','bottom','living','top',19,2.75],['kitchen','top','dining','bottom',12,3],['dining','right','living','left',33,3],['drawing','top','living','bottom',20,3]]){opening(a,sa,center,width);opening(b,sb,center,width);}
  opening('puja','left',23,2.5,'pocket');opening('passage','right',23,2.5,'pocket');opening('drawing','bottom',23,3.5,'main');opening('living','right',33,3,'main');
  return p;
}
export function envelope(p) {
 const s=p.plot.setbacks; return {x:s.left,y:s.rear,width:p.plot.width-s.left-s.right,depth:p.plot.depth-s.front-s.rear};
}
// Merge collinear room edges. A single wall may have several room owners.
export function rebuildWalls(p) {
 const customOpenings=(p.openings||[]).filter(o=>o.custom&&o.roomId).map(o=>({...o}));
 const wallSignature=w=>JSON.stringify([w.axis,w.at,w.start,w.end,[...(w.owners||[])].sort()]);
 const savedWallFinishes=new Map((p.walls||[]).filter(w=>p.finishes?.['wall:'+w.id]).map(w=>[wallSignature(w),p.finishes['wall:'+w.id]]));
 if(p.finishes)for(const key of Object.keys(p.finishes))if(key.startsWith('wall:'))delete p.finishes[key];
 const segments=[]; const e=envelope(p);
 const add=(axis,at,start,end,owner)=>segments.push({axis,at,start,end,owner});
 for(const r of p.rooms.filter(r=>!['porch','stairs'].includes(r.type))){
   add('h',r.y,r.x,r.x+r.width,r.id);add('h',r.y+r.depth,r.x,r.x+r.width,r.id);
   add('v',r.x,r.y,r.y+r.depth,r.id);add('v',r.x+r.width,r.y,r.y+r.depth,r.id);
 }
 const groups=new Map();for(const s of segments){const key=s.axis+':'+s.at.toFixed(4);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 p.walls=[];
 for(const g of groups.values()){
   const cuts=[...new Set(g.flatMap(s=>[s.start,s.end]))].sort((a,b)=>a-b);
   for(let i=0;i<cuts.length-1;i++){const start=cuts[i],end=cuts[i+1],owners=g.filter(s=>s.start<=start+.001&&s.end>=end-.001).map(s=>s.owner);if(!owners.length)continue;
    const {axis,at}=g[0];const external=axis==='h'?Math.min(Math.abs(at-e.y),Math.abs(at-e.y-e.depth))<1:Math.min(Math.abs(at-e.x),Math.abs(at-e.x-e.width))<1;
    p.walls.push({id:'wall-'+p.walls.length,axis,at,start,end,owners,external});
   }
 }
 if(p.finishes)for(const w of p.walls){const finish=savedWallFinishes.get(wallSignature(w));if(finish)p.finishes['wall:'+w.id]=finish;}
 p.openings=[];
 for(const r of p.rooms.filter(r=>!['porch','stairs'].includes(r.type))){
   const candidates=p.walls.filter(w=>w.owners.includes(r.id)&&w.end-w.start>2.1);
   const doorWall=candidates.find(w=>w.axis==='h'&&Math.abs(w.at-r.y-r.depth)<.01)||candidates[0];
   if(doorWall&&!p.openings.some(o=>o.wallId===doorWall.id&&['door','main','pocket'].includes(o.kind))){
    const kind=r.type==='puja'?'pocket':r.type==='drawing'?'main':'door';
    const width=Math.min(r.type==='bathroom'?2.25:3,doorWall.end-doorWall.start-.3);
    p.openings.push({id:'opening-'+p.openings.length,wallId:doorWall.id,kind,offset:(doorWall.end-doorWall.start-width)/2,width,sill:0,height:p.settings.doorHeight});
   }
   const win=candidates.find(w=>w.external&&w.id!==doorWall?.id);
   if(win){const vent=r.type==='bathroom',width=Math.min(vent?1.5:3,win.end-win.start-.4);p.openings.push({id:'opening-'+p.openings.length,wallId:win.id,kind:vent?'vent':'window',offset:(win.end-win.start-width)/2,width,sill:vent?7:p.settings.windowSill,height:vent?1.5:p.settings.windowHeight});}
 }
 for(const o of customOpenings){
 const r=p.rooms.find(r=>r.id===o.roomId);if(!r)continue;
 const h=['top','bottom'].includes(o.side),at=o.side==='top'?r.y:o.side==='bottom'?r.y+r.depth:o.side==='left'?r.x:r.x+r.width,start=(h?r.x:r.y)+o.roomOffset;
 const w=p.walls.find(w=>w.owners.includes(r.id)&&w.axis===(h?'h':'v')&&Math.abs(w.at-at)<.01&&w.start<=start+.001&&w.end>=start+o.width-.001);
 p.openings=p.openings.filter(v=>v.id!==o.id&&!(['door','main'].includes(o.kind)&&v.kind==='door'&&!v.custom&&p.walls.find(w=>w.id===v.wallId)?.owners.includes(r.id)));
 p.openings.push({...o,wallId:w?.id||'needs-door-review',offset:w?start-w.start:o.offset});
 }
 p.gate ||= {side:p.plot.roadSide,offset:p.plot.width*.55,width:5};
 return p;
}
export function validatePlan(p) {
 const errors=[],warnings=Array.isArray(p?.warnings)?p.warnings.filter(w=>typeof w==='string'):[];
 if(!p||p.schemaVersion!==1||p.units!=='ft')return {errors:['Expected a version 1 floor plan in feet.'],warnings:[]};
 if(typeof p.title!=='string'||p.title.length>200)errors.push('A plan title of at most 200 characters is required.');
 const bounded=(v,min,max)=>finite(v)&&v>=min&&v<=max;
 if(!p.plot||!bounded(p.plot.width,10,300)||!bounded(p.plot.depth,10,300))errors.push('Plot dimensions must be between 10 and 300 ft.');
 if(!p.plot?.setbacks||!['front','rear','left','right'].every(k=>bounded(p.plot.setbacks[k],0,100)))errors.push('Setbacks must be non-negative feet.');
 if(!['East','West','North','South'].includes(p.plot?.facing)||!['front','rear','left','right'].includes(p.plot?.roadSide))errors.push('Choose a valid facing and road side.');
 if(!p.settings||!['externalWall','internalWall','wallHeight','doorHeight','windowSill','windowHeight'].every(k=>bounded(p.settings[k],.01,30)))errors.push('Wall and opening settings must be positive finite dimensions.');
 if(!Array.isArray(p.rooms)||p.rooms.length<1||p.rooms.length>80||!Array.isArray(p.walls)||p.walls.length>600||!Array.isArray(p.openings)||p.openings.length>500)return {errors:[...errors,'Plan must contain 1–80 rooms, at most 600 walls and 500 openings.'],warnings};
 if(errors.length)return {errors,warnings};
 const ids=new Set(); const e=envelope(p);if(e.width<4||e.depth<4)errors.push('Setbacks leave no usable building footprint.');
 for(const r of p.rooms){
  if(typeof r.id!=='string'||ids.has(r.id)||typeof r.name!=='string'||r.name.length>100)errors.push('Room names and unique IDs are required.');ids.add(r.id);
  if(!['x','y','width','depth'].every(k=>finite(r[k]))||r.width<1||r.depth<1){errors.push('Each room needs finite dimensions of at least 1 ft.');continue;}
  if(r.x<0||r.y<0||r.x+r.width>p.plot.width+.01||r.y+r.depth>p.plot.depth+.01)errors.push(`${r.name} extends outside the plot.`);
  if(!['porch','stairs'].includes(r.type)&&(r.x<e.x-.01||r.y<e.y-.01||r.x+r.width>e.x+e.width+.01||r.y+r.depth>e.y+e.depth+.01))errors.push(`${r.name} crosses a setback.`);
 }
 for(let i=0;i<p.rooms.length;i++)for(let j=i+1;j<p.rooms.length;j++){const a=p.rooms[i],b=p.rooms[j];if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.02&&Math.min(a.y+a.depth,b.y+b.depth)-Math.max(a.y,b.y)>.02)errors.push(`${a.name} overlaps ${b.name}.`);}
 const wallIds=new Set();for(const w of p.walls){if(typeof w.id!=='string'||wallIds.has(w.id)||!['h','v'].includes(w.axis)||!['at','start','end'].every(k=>finite(w[k]))||w.end<=w.start||w.start<0||w.at<0||w.end>(w.axis==='h'?p.plot.width:p.plot.depth)||w.at>(w.axis==='h'?p.plot.depth:p.plot.width))errors.push('Invalid wall geometry or duplicate wall ID.');wallIds.add(w.id);}
 const openingIds=new Set();for(const o of p.openings){const w=p.walls.find(w=>w.id===o.wallId);if(openingIds.has(o.id)||!w||!['door','main','pocket','window','vent'].includes(o.kind)||!['offset','width','sill','height'].every(k=>finite(o[k]))||o.offset<0||o.width<=0||o.offset+o.width>(w?.end-w?.start)+.01||o.sill<0||o.height<=0||o.sill+o.height>p.settings.wallHeight+.01)errors.push('An opening is invalid or extends beyond its wall.');openingIds.add(o.id);}
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
export function generatePlan(input) {
 const k=input.units==='m'?1/.3048:1;
 const p={schemaVersion:1,title:'Generated Ground Floor Plan',units:'ft',source:'form',plot:{width:Number(input.width)*k,depth:Number(input.depth)*k,facing:input.facing,roadSide:input.roadSide,setbacks:Object.fromEntries(['front','rear','left','right'].map(s=>[s,Number(input[s])*k]))},settings:{externalWall:.75,internalWall:.375,wallHeight:10,doorHeight:7,windowSill:3,windowHeight:4},rooms:[],fixtures:[],walls:[],openings:[],warnings:['Concept layout: review circulation, structural design and local requirements before use.'],reviewed:false};
 const e=envelope(p), gap=p.settings.internalWall, margin=p.settings.externalWall/2;
 if(!Number.isFinite(e.width)||!Number.isFinite(e.depth)||e.width<12||e.depth<18)throw Error('The setbacks leave too little space. Increase the plot or reduce setbacks.');
 const counts=Object.fromEntries(['bedrooms','attached','common','dressing'].map(key=>[key,Number(input[key]||0)]));
 if(Object.values(counts).some(n=>!Number.isInteger(n)||n<0||n>8))throw Error('Room counts must be whole numbers between 0 and 8.');
 if(counts.attached>counts.bedrooms)throw Error('Each attached toilet needs a bedroom. Reduce attached toilets or add bedrooms.');
 const corridor=3.5,w=(e.width-2*margin-corridor-2*gap)/2;
 if(w<6)throw Error('The requested layout needs wider rooms and a 3.5 ft passage. Increase the plot width.');
 let preferred={};if(input.preferred?.trim()){try{preferred=JSON.parse(input.preferred);}catch{throw Error('Preferred sizes must be JSON, for example {"bedroom":[11,12]}.');}}
 if(!preferred||typeof preferred!=='object'||Array.isArray(preferred))throw Error('Preferred sizes must be an object keyed by room type.');
 const columns=[[],[]],suites=[];
 for(let i=0;i<counts.bedrooms;i++)suites.push({name:i?'Bedroom '+(i+1):'Master bedroom',type:'bedroom',attached:i<counts.attached,dressing:i<counts.dressing,min:8+((i<counts.attached||i<counts.dressing)?4+gap:0)});
 for(let i=0;i<suites.length;i++)columns[i%2].push(suites[i]);
 const weight=col=>col.reduce((n,b)=>n+b.min+gap,0),append=block=>columns[weight(columns[0])<=weight(columns[1])?0:1].push(block);
 for(let i=0;i<counts.common;i++)append({name:'Common toilet '+(i+1),type:'bathroom',min:4});
 for(let i=counts.bedrooms;i<counts.dressing;i++)append({name:'Dressing '+(i+1),type:'dressing',min:4});
 const kitchenCol=weight(columns[0])<=weight(columns[1])?0:1;
 for(const [type,name,min] of [['dining','Dining',5],['kitchen','Kitchen',6]])if(input[type])columns[kitchenCol].push({name,type,min});
 for(const [type,name,min] of [['living','Living',7],['drawing','Drawing',7],['puja','Puja',4],['stairs','Staircase',10]])if(input[type])append({name,type,min});
 if(columns.flat().length===0)throw Error('Choose at least one room.');
 if(input.vastu){
  const ne={East:[1,1],West:[0,0],North:[0,1],South:[1,0]}[p.plot.facing];
  const place=(target,column,end)=>{if(!target)return;for(const col of columns){const i=col.indexOf(target);if(i>=0)col.splice(i,1);}end?columns[column].push(target):columns[column].unshift(target);};
  const puja=columns.flat().find(b=>b.type==='puja');place(suites[0],1-ne[0],!ne[1]);place(puja,ne[0],ne[1]);
  p.warnings.push('Vastu preference places the master suite toward south-west and puja toward north-east. Check room use and site orientation with your designer.');
 }
 let index=0;const suitePairs=[];
 function add(name,type,x,y,width,depth){const size=preferred[type];if(size){if(!Array.isArray(size)||size.length!==2)throw Error('Preferred sizes need [width, depth].');const a=Number(size[0])*k,b=Number(size[1])*k;if(!finite(a)||!finite(b)||a<1||b<1||a>width+.001||b>depth+.001)throw Error(`The preferred ${type} size does not fit its allocated zone. No rooms were resized.`);width=a;depth=b;}
  const r=room('room-'+index++,name,type,x,y,width,depth);p.rooms.push(r);return r;
 }
 columns.forEach((col,side)=>{const available=e.depth-2*margin-gap*Math.max(0,col.length-1),minimum=col.reduce((n,b)=>n+b.min,0);if(minimum>available)throw Error('The requested rooms do not fit the available depth. Reduce rooms or enlarge the plot.');let y=e.y+margin;const x=e.x+margin+side*(w+corridor+2*gap);
  for(const b of col){const depth=b.min*available/minimum,services=b.attached||b.dressing;
   const main=add(b.name,b.type,x,y,w,depth-(services?4+gap:0));
   if(services){const both=b.attached&&b.dressing,sw=both?(w-gap)/2:w,sy=y+depth-4;
    if(b.attached){const bath=add('Attached toilet','bathroom',x,sy,sw,4);suitePairs.push([main,bath]);}
    if(b.dressing){const dress=add('Dressing','dressing',x+(both?sw+gap:0),sy,sw,4);suitePairs.push([main,dress]);}
   }y+=depth+gap;
  }
 });
 p.rooms.push(room('circulation','Passage','corridor',e.x+margin+w+gap,e.y+margin,corridor,e.depth-2*margin));
 if(input.porch){if(p.plot.setbacks.front<3)throw Error('A porch needs at least 3 ft of front space.');p.rooms.push(room('porch','Sitout','porch',e.x,e.y+e.depth,e.width,p.plot.setbacks.front));p.warnings.push('Front porch occupies the front setback; confirm it is permitted.');}
 rebuildWalls(p);p.openings=p.openings.filter(o=>['window','vent'].includes(o.kind));
 const addDoor=(r,axis,at,center,width=2.5,kind='door')=>{const wall=p.walls.find(w=>w.axis===axis&&Math.abs(w.at-at)<.01&&w.start<=center-width/2&&w.end>=center+width/2);if(wall&&!p.openings.some(o=>o.wallId===wall.id&&Math.abs(o.offset-(center-width/2-wall.start))<.01))p.openings.push({id:'door-'+p.openings.length,wallId:wall.id,kind,offset:center-width/2-wall.start,width,sill:0,height:7});};
 const serviceIds=new Set(suitePairs.map(pair=>pair[1].id));const passage=p.rooms.find(r=>r.id==='circulation');
 for(const r of p.rooms.filter(r=>!['porch','corridor'].includes(r.type)&&!serviceIds.has(r.id))){const left=r.x<passage.x,at=left?r.x+r.width:r.x,center=r.y+Math.min(r.depth/2,2);addDoor(r,'v',at,center,Math.min(2.75,r.depth-.4),r.type==='puja'?'pocket':'door');addDoor(passage,'v',left?passage.x:passage.x+passage.width,center,Math.min(2.75,r.depth-.4),r.type==='puja'?'pocket':'door');}
 for(const [bed,service] of suitePairs){const center=service.x+service.width/2;addDoor(bed,'h',bed.y+bed.depth,center,2.25);addDoor(service,'h',service.y,center,2.25);}
 addDoor(passage,'h',passage.y+passage.depth,passage.x+passage.width/2,3,'main');
 const result=validatePlan(p);if(result.errors.length)throw Error(result.errors.join(' '));return p;
}
export function wallPieces(w, openings, settings) {
 const length=w.end-w.start, height=settings.wallHeight;
 const ops=openings.filter(o=>o.wallId===w.id).sort((a,b)=>a.offset-b.offset);
 const cuts=[...new Set([0,length,...ops.flatMap(o=>[o.offset,o.offset+o.width])])].sort((a,b)=>a-b),pieces=[];
 for(let i=0;i<cuts.length-1;i++){const start=cuts[i],end=cuts[i+1],cover=ops.filter(o=>o.offset<end-.001&&o.offset+o.width>start+.001);let spans=[[0,height]];
  for(const o of cover)spans=spans.flatMap(([a,b])=>o.sill>=b||o.sill+o.height<=a?[[a,b]]:[[a,Math.max(a,o.sill)],[Math.min(b,o.sill+o.height),b]].filter(([a,b])=>b-a>.001));
  for(const [bottom,top] of spans)pieces.push({start,end,bottom,top});
 }return pieces;
}
