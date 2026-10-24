'use strict';
const rules=require('./rules/tnbc');
const {normalize}=require('./inputNormalizer');
const {siteCalc,areas}=require('./siteCalc');
const {minimum,habitable}=require('./roomCatalog');
const {zoneAt,targets}=require('./vastuRules');
const {calculateStair}=require('./stairCalculator');
const fail = message => {throw Object.assign(new Error(message),{status:422,details:[message]});};

// A deterministic, two-bank circulation layout. Clear rooms end at wall faces;
// shared partitions consume 115 mm exactly. No area is silently compressed.
function layoutEngine(requirements) {
  const input=normalize(requirements), site=siteCalc(input), e=site.envelope;
  if(process.env.NODE_ENV==='development')console.info('CAD input model',JSON.stringify(input));
  const ext=rules.wall.external, part=rules.wall.internal, corridor=rules.corridor.preferred;
  const plan={schemaVersion:1,units:'mm',origin:'SW',facing:input.facing,projectName:input.projectName,input,
    plot:site.worldPlot,envelope:site.rect(e),setbacks:input.setbacks,view:{width:input.width,depth:input.depth},
    floors:[],rooms:[],walls:[],openings:[],stairs:[],parking:[],fixtures:[],columns:[],grid:[],adjustments:[],warnings:[],
    road:{from:site.toWorld(0,0),to:site.toWorld(input.width,0),width:null,label:'ROAD — width to be surveyed'},
    gate:{...site.toWorld(e.x+e.w/2,0),width:1070,mark:'MG'},
    compass:{north:{x:0,y:1},viewNorthAngle:{South:0,East:90,North:180,West:270}[input.facing]},
    status:'Design study — not for construction or statutory submission',rulesVersion:rules.version};
  const height=rules.floorHeight, stair=calculateStair(height);
  if (!Number.isInteger(input.floors)||input.floors<1||input.floors>4) fail('Select between one and four floors.');
  if(e.w<2*2400+corridor+2*part+2*ext) fail(`Buildable frontage ${e.w} mm cannot fit two habitable rooms, walls and a ${corridor} mm passage. A different layout strategy or revised setbacks is required.`);
  let stairAnchor=null;
  function wall(floor,a,b,thickness,exterior=false) {
    const w={id:`W${plan.walls.length+1}`,floor,start:site.toWorld(...a),end:site.toWorld(...b),thickness,height,exterior};plan.walls.push(w);return w;
  }
  function opening(host,point,width,roomIds,kind,mark,sill=0,openingHeight=2100,side=1) {
    const o={id:`O${plan.openings.length+1}`,floor:host.floor,wallId:host.id,...site.toWorld(...point),width,height:openingHeight,sill,kind,mark,roomIds,side};plan.openings.push(o);return o;
  }
  function addRoom(r,box,floor) {
    const result={...r,...site.rect(box),floor,doors:[],windows:[]};result.zone=zoneAt(result,plan.envelope);plan.rooms.push(result);return result;
  }
  for(let floor=0;floor<input.floors;floor++) {
    const requested=input.rooms.filter(r=>r.floor===floor).map(r=>({...r}));
    if(!requested.length) fail(`Floor ${floor+1} has no requested rooms. Assign rooms to each requested floor.`);
    if(!requested.some(r=>['bathroom','bath','wc'].includes(r.type)))requested.push({id:`BATH-AUTO-${floor}`,name:'Common toilet',type:'bathroom',floor,requestedWidth:1800,requestedDepth:1800,adjustable:true,source:'system:sanitation',autoAdded:true});
    if(input.stairsRequested)requested.push({id:`STAIR-${floor}`,name:'Stairwell',type:'stair',floor,requestedWidth:stair.w,requestedDepth:stair.h,adjustable:true,source:'system:vertical-circulation',autoAdded:true});
    if(requested.length>14) fail('This layout supports up to 14 spaces per floor. Split the room programme across floors.');
    // Search splits and frontage proportions; score orientation only after
    // geometric feasibility. Traditional preferences never override safety.
    let best=null;
    const inner=e.w-2*ext-2*part-corridor, usableDepth=e.h-2*ext;
    function arrange(bank,w) {
      if(!bank.length)return null;
      bank=bank.slice().sort((a,b)=>{
        const rank=r=>r.type==='stair'?100:/master/i.test(r.name)?90:r.type==='bedroom'?75:r.type==='bathroom'?65:r.type==='pooja'?5:r.type==='living'?0:30;
        return rank(a)-rank(b)||a.id.localeCompare(b.id);
      });
      const heights=bank.map(r=>{
        const m=minimum(r.type), lower=r.type==='stair'?stair.h:Math.max(r.type==='bathroom'?1800:0,m.width,Math.ceil(m.area/w),rules.opening.door+2*rules.opening.jamb);
        if(w<(r.type==='stair'?stair.w:m.width))return Infinity;
        if(!r.adjustable && !r.areaOnly && w!==r.requestedWidth)return Infinity;
        const exactDepth=r.areaOnly?Math.round(r.requestedWidth*r.requestedDepth/w):r.requestedDepth;
        if(!r.adjustable && (exactDepth<lower || w*exactDepth<m.area))return Infinity;
        return r.adjustable?Math.max(lower,Math.ceil(r.requestedWidth*r.requestedDepth/w)):exactDepth;
      });
      const available=usableDepth-(bank.length-1)*part;
      if(heights.some(h=>!Number.isFinite(h)))return null;
      // Shrink only proposed sizes, in the brief's declared adjustment order.
      let excess=heights.reduce((s,h)=>s+h,0)-available;
      const priority={drawing:0,living:0,dining:1,bedroom:2,guest:2,kitchen:3};
      const order=bank.map((r,i)=>i).sort((a,b)=>(priority[bank[a].type]??4)-(priority[bank[b].type]??4));
      for(const i of order)if(excess>0&&bank[i].adjustable&&bank[i].type!=='stair') {
        const m=minimum(bank[i].type),low=Math.max(bank[i].type==='bathroom'?1800:0,m.width,Math.ceil(m.area/w),rules.opening.door+2*rules.opening.jamb),delta=Math.min(excess,heights[i]-low);heights[i]-=delta;excess-=delta;
      }
      if(excess>0)return null;
      let spare=available-heights.reduce((s,h)=>s+h,0);
      const expandable=bank.map((r,i)=>i).filter(i=>bank[i].adjustable&&bank[i].type!=='stair');
      if(spare>0&&!expandable.length)return null;
      expandable.forEach((i,k)=>{const more=Math.floor(spare/(expandable.length-k));heights[i]+=more;spare-=more;});
      return bank.map((r,i)=>({r,h:heights[i]}));
    }
    for(const fraction of [.5,.45,.55,.4,.6]) {
      const leftWidth=Math.floor(inner*fraction),rightWidth=inner-leftWidth;
      for(let mask=1;mask<(1<<requested.length)-1;mask++) {
        const left=requested.filter((_,i)=>mask&(1<<i)),right=requested.filter((_,i)=>!(mask&(1<<i)));
        // Keep a continuous aligned stairwell on the left, back of every floor.
        if(right.some(r=>r.type==='stair'))continue;
        const banks=[arrange(left,leftWidth),arrange(right,rightWidth)];if(banks.some(b=>!b))continue;
        const boxes=[];let score=0;
        for(let side=0;side<2;side++) {let y=e.y+ext;const w=side?rightWidth:leftWidth,x=side?e.x+ext+leftWidth+2*part+corridor:e.x+ext;
          for(const item of banks[side]) {const box={x,y,w,h:item.h};const world=site.rect(box),zone=zoneAt(world,plan.envelope),prefs=targets(item.r);
            score+=prefs.length&&!prefs.includes(zone)?10:0;
            const ratio=w*item.h/(item.r.requestedWidth*item.r.requestedDepth),aspect=Math.max(w,item.h)/Math.min(w,item.h);
            score+=100*(ratio-1)**2+100*Math.max(0,aspect-2)**2;
            boxes.push({...item,box,side});y+=item.h+part;
          }
        }
        const stairBox=boxes.find(b=>b.r.type==='stair')?.box;
        if(stairAnchor && JSON.stringify(stairBox)!==JSON.stringify(stairAnchor))continue;
        if(!best||score<best.score)best={score,boxes,leftWidth,rightWidth,stairBox};
      }
    }
    if(!best)fail(`Floor ${floor+1}: requested rooms cannot fit the ${e.w} × ${e.h} mm envelope with clear-room minima, a ${corridor} mm passage and aligned stairs. Increase the envelope, reduce rooms, or enable automatic room sizing. Exact dimensions were not changed.`);
    if(best.stairBox)stairAnchor=best.stairBox;
    plan.floors.push({index:floor,elevation:floor*height,height,clearHeight:height-150});
    const left=e.x+ext/2,right=e.x+e.w-ext/2,bottom=e.y+ext/2,top=e.y+e.h-ext/2;
    const extWalls=[wall(floor,[left,bottom],[right,bottom],ext,true),wall(floor,[right,bottom],[right,top],ext,true),wall(floor,[left,top],[right,top],ext,true),wall(floor,[left,bottom],[left,top],ext,true)];
    const cx=e.x+ext+best.leftWidth+part;
    const passage=addRoom({id:`PASSAGE-${floor}`,name:'Passage',type:'circulation',autoAdded:true,source:'system:circulation'}, {x:cx,y:e.y+ext,w:corridor,h:e.h-2*ext},floor);
    const internal=[wall(floor,[cx-part/2,bottom],[cx-part/2,top],part),wall(floor,[cx+corridor+part/2,bottom],[cx+corridor+part/2,top],part)];
    if(floor===0){const md=opening(extWalls[0],[cx+corridor/2,bottom],rules.opening.main,[passage.id,'OUTSIDE'],'door','MD');passage.doors.push(md.id);}
    for(const {r,box,side} of best.boxes) {
      const room=addRoom(r,box,floor),host=internal[side];
      const door=opening(host,[side?cx+corridor+part/2:cx-part/2,box.y+rules.opening.jamb+(r.type==='bathroom'?750:900)/2],r.type==='bathroom'?750:900,[room.id,passage.id],'door',r.type==='bathroom'?'D1':'D',0,2100,side?1:-1);
      room.doors.push(door.id);passage.doors.push(door.id);
      if(box.y+box.h<e.y+e.h-ext)wall(floor,[side?cx+corridor+part/2:left,box.y+box.h+part/2],[side?right:cx-part/2,box.y+box.h+part/2],part);
      if(r.type==='stair')plan.stairs.push({...site.rect(box),...stair, ...site.rect(box),id:r.id,roomId:r.id,floor,source:r.source,flightAxis: input.facing==='East'||input.facing==='West'?'x':'y'});
      else {
        const toilet=['bathroom','bath','wc'].includes(r.type),winHeight=toilet?450:1200;
        const width=toilet?600:Math.max(900,Math.ceil(box.w*box.h*rules.opening.glazingRatio/winHeight));
        const win=opening(extWalls[side?1:3],[side?right:left,box.y+box.h/2],width,[room.id],'window',toilet?'V':'W',toilet?1650:900,winHeight);
        room.windows.push(win.id);
      }
      const nw=Math.round(box.w),nd=Math.round(box.h);
      if(nw!==r.requestedWidth||nd!==r.requestedDepth)plan.adjustments.push({roomId:r.id,name:r.name,source:r.source,from:[r.requestedWidth,r.requestedDepth],to:[nw,nd],reason:'Fit shared walls, clear minima and connected passage',automatic:r.adjustable});
      const preferred=targets(room);if(preferred.length&&!preferred.includes(room.zone))plan.warnings.push(`${room.name}: ${room.zone}; preferred ${preferred.join('/')}. Vastu placement requires review.`);
      const fixture=(kind,x,y,w,h)=>plan.fixtures.push({id:`F${plan.fixtures.length+1}`,roomId:room.id,floor,kind,...site.rect({x,y,w,h})});
      if(['bathroom','wc','bath'].includes(r.type)) {
        if(r.type!=='bath')fixture('WC',box.x+100,box.y+box.h-750,400,650);
        fixture('BASIN',box.x+box.w-500,box.y+box.h-450,400,350);
        if(r.type!=='wc')fixture('SHOWER',side?box.x+box.w-800:box.x+100,box.y+100,700,700);
      } else if(r.type==='kitchen') {fixture('SINK',box.x+100,box.y+box.h-650,800,550);fixture('HOB',box.x+box.w-800,box.y+box.h-650,600,550);}
      else if(['bedroom','guest'].includes(r.type))fixture('BED',box.x+(box.w-1500)/2,box.y+box.h-2100,1500,2000);
      else if(['living','drawing'].includes(r.type))fixture('SOFA',box.x+100,box.y+box.h-900,1800,800);
      else if(r.type==='dining')fixture('DINING',box.x+(box.w-1500)/2,box.y+(box.h-900)/2,1500,900);
    }
  }
  // Optional external spaces must fit entirely on the plot, clear of building.
  let px=0;
  for(const parking of input.parkingSpaces) {
    const {kind,w,h}=parking;
    if(w<(kind==='car'?rules.parking.carWidth:rules.parking.bikeWidth)||h<(kind==='car'?rules.parking.carDepth:rules.parking.bikeDepth))fail(`${parking.name}: requested parking bay is smaller than the project parking criteria.`);
    if(h>e.y || px+w>input.width)fail(`Requested ${kind} parking does not fit the front setback. Provide a ground-floor parking bay or revise the site layout.`);
    plan.parking.push({...parking,...site.rect({x:px,y:0,w,h})});px+=w+150;
  }
  if(input.sitout){const box={x:e.x,y:0,w:e.w,h:Math.min(e.y,1800)};if(box.h<1200||plan.parking.length)fail('Requested sitout needs at least 1200 mm clear depth and a separate parking layout.');plan.sitout={...site.rect(box),source:'input:sitout'};}
  plan.area=areas(plan);
  plan.warnings.push('Setbacks, FSI and coverage are measured quantities; local permissible limits must be confirmed.', 'Structural columns, foundation design, fire/accessibility compliance and services need qualified review.');
  return plan;
}
module.exports={layoutEngine};
