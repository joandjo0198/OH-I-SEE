import {byId} from './catalog.js';

const bounded=(value,max)=>typeof value==='string'&&value.length<=max;
export function validateProduct(product){
 if(!product||typeof product!=='object'||Array.isArray(product))return false;
 return bounded(product.brand,80)&&bounded(product.name,160)&&product.name.trim().length>0&&bounded(product.sku,80)&&bounded(product.productId,100)&&/^#[0-9a-f]{6}$/i.test(product.color)&&['catalog','custom'].includes(product.source);
}
export function productLabel(f){const p=f.props?.product;return p?[p.brand,p.name,p.sku].filter(Boolean).join(' · '):f.props?.label||byId[f.catalogId]?.name||'Fixture';}
export function addedProducts(plan,roomId,externalOnly=false){return (plan.fixtures||[]).filter(f=>(!roomId||f.roomId===roomId)&&(!externalOnly||f.props?.installation==='exterior'||f.props?.product?.source==='custom'));}
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}

// An outdoor fitting belongs to the selected room but is mounted on its outside face.
export function snapExterior(plan,item,roomId,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>plan.plot.width||y>plan.plot.depth)throw Error('Place outdoor fittings inside the plot.');
 if(!['floor','wall'].includes(item.mountType))throw Error('Choose a wall or floor fitting for outdoor installation.');
 const r=plan.rooms.find(r=>r.id===roomId);if(!r)throw Error('Select a room first.');
 const walls=plan.walls.filter(w=>w.external&&w.owners?.includes(roomId));if(!walls.length)throw Error('This room has no exterior wall. Select a room beside the outside of the house.');
 if(item.mountType==='floor'){
  if(plan.rooms.some(r=>x>r.x&&x<r.x+r.width&&y>r.y&&y<r.y+r.depth))throw Error('Place outdoor floor fittings outside the rooms.');
  return {roomId,position:{x:Math.round(x*2)/2,y:Math.round(y*2)/2,z:0},rotation:0};
 }
 const options=walls.map(w=>{const h=w.axis==='h',middle=h?r.y+r.depth/2:r.x+r.width/2,sign=w.at<middle?-1:1,along=Math.max(w.start+.3,Math.min(w.end-.3,h?x:y)),offset=plan.settings.externalWall/2+item.size[2]/2+.04;return {roomId,position:{x:h?along:w.at+sign*offset,y:h?w.at+sign*offset:along,z:item.elevation},rotation:h?(sign<0?180:0):(sign<0?90:-90)};});
 const best=options.sort((a,b)=>Math.hypot(a.position.x-x,a.position.y-y)-Math.hypot(b.position.x-x,b.position.y-y))[0];if(best.position.x<0||best.position.y<0||best.position.x>plan.plot.width||best.position.y>plan.plot.depth)throw Error('No clearance outside this wall within the plot.');return best;
}
export function roomScenePlan(plan,roomId){const r=plan.rooms.find(r=>r.id===roomId);if(!r)throw Error('Select an existing room.');const walls=plan.walls.filter(w=>w.owners?.includes(roomId)),wallIds=new Set(walls.map(w=>w.id));return {...plan,rooms:[r],walls,openings:plan.openings.filter(o=>wallIds.has(o.wallId)),fixtures:(plan.fixtures||[]).filter(f=>f.roomId===roomId),furnishedRooms:[roomId]};}
