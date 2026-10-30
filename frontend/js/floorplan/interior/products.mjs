import {byId} from './catalog.js';

const bounded=(value,max)=>typeof value==='string'&&value.length<=max;
export function validateProduct(product){
 if(!product||typeof product!=='object'||Array.isArray(product))return false;
 return (product.imageUrl===undefined||(typeof product.imageUrl==='string'&&product.imageUrl.length<=2000&&/^https?:\/\//i.test(product.imageUrl)))&&(product.unitPrice===undefined||(Number.isFinite(product.unitPrice)&&product.unitPrice>=0&&product.unitPrice<=1e9))&&(product.currency===undefined||product.currency==='INR')&&bounded(product.brand,80)&&bounded(product.name,160)&&product.name.trim().length>0&&bounded(product.sku,80)&&bounded(product.productId,100)&&/^#[0-9a-f]{6}$/i.test(product.color)&&['catalog','custom'].includes(product.source);
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

// Prices are snapshots in INR; one placed instance is one purchased unit.
export function productEstimate(plans){
 let subtotalPaise=0,basePaise=0,unpriced=0,count=0;
 for(const plan of plans){
  const base=plan.costEstimate?.baseCost;
  if(Number.isFinite(base)&&base>=0&&base<=1e12)basePaise+=Math.round(base*100);
  for(const f of plan.fixtures||[]){const p=f.props?.product;if(!p)continue;count++;
   if(!validateProduct(p)||p.unitPrice===undefined){unpriced++;continue;}
   subtotalPaise+=Math.round(p.unitPrice*100);
  }
 }
 return {count,unpriced,products:subtotalPaise/100,base:basePaise/100,total:(basePaise+subtotalPaise)/100};
}
export function catalogProduct(p){
 const value={brand:String(p.brand||'').slice(0,80),name:String(p.product_name||p.name||'').slice(0,160),sku:String(p.sku||'').slice(0,80),productId:String(p.id||'').slice(0,100),color:'#eeeeea',source:'catalog',currency:'INR'};
 if(p.price!==null&&p.price!==undefined&&p.price!==''&&Number.isFinite(Number(p.price))&&Number(p.price)>=0)value.unitPrice=Number(p.price);
 if(typeof p.image_url==='string'&&/^https?:\/\//i.test(p.image_url)&&p.image_url.length<=2000)value.imageUrl=p.image_url;
 if(!validateProduct(value))throw Error('This product has invalid catalog details.');
 return value;
}
export function suggestedShape(product){
 const name=String(product.product_name||product.name||'').toLowerCase();
 const rules=[[/basin/,'basin'],[/kitchen.*sink|sink/,'sink'],[/toilet|water closet|\bwc\b/,'wc'],[/shower/,'shower'],[/heater|geyser/,'water-heater'],[/socket/,'socket-5a'],[/switch/,'switch-2'],[/mcb|distribution/,'db-panel'],[/ceiling fan/,'ceiling-fan'],[/wall.*light/,'wall-light'],[/light|lamp/,'ceiling-light'],[/sofa/,'sofa'],[/queen/,'queen-bed'],[/king/,'king-bed'],[/bed/,'bed'],[/table/,'study-table'],[/mirror/,'rect-mirror']];
 return rules.find(([pattern])=>pattern.test(name))?.[1]||'catalog-product';
}
export function parseProductDrop(raw){
 const data=JSON.parse(raw);
 if(!byId[data.catalogId]||!validateProduct(data.product)||!['interior','exterior'].includes(data.installation))throw Error('Invalid product placement.');
 return {catalogId:data.catalogId,product:data.product,installation:data.installation};
}
