'use strict';
const {randomUUID}=require('node:crypto');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const number=(v,name,min=0,max=1e9)=>{if(v===null||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)fail(`${name} must be between ${min} and ${max}.`);return Number(v);};
const text=(v,max=200)=>String(v??'').trim().slice(0,max);
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function assetUrl(value){if(!value)return '';const s=text(value,2000);if(s.startsWith('/')&&!s.startsWith('//')&&!s.includes('\\'))return s;try{const u=new URL(s);if(u.protocol==='https:')return u.href;}catch{}fail('Assets must use a local path or HTTPS URL.');}
function metadata(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Product specification must be an object.');
 const kind=input.kind||'fixture';if(!['fixture','light','fan','switch','socket','surface','bulk','pipe'].includes(kind))fail('Unsupported representation kind.');
 const dimensions={};for(const k of ['width','height','depth'])dimensions[k]=number(input.dimensions?.[k]??.1,k,.001,100);
 const material={};if(input.material?.color){if(!/^#[0-9a-f]{6}$/i.test(input.material.color))fail('Use a six-digit material color.');material.color=input.material.color;}
 for(const k of ['roughness','metalness'])material[k]=number(input.material?.[k]??(k==='roughness'?.6:0),k,0,1);
 for(const k of ['map','normalMap','roughnessMap'])material[k]=assetUrl(input.material?.[k]);
 const electrical={lumens:number(input.electrical?.lumens??800,'Lumens',0,200000),temperature:number(input.electrical?.temperature??3000,'Color temperature',2700,6500),watts:number(input.electrical?.watts??0,'Watts',0,100000),beamAngle:number(input.electrical?.beamAngle??60,'Beam angle',1,170)};
 if(input.priceValidUntil&&!Number.isFinite(Date.parse(input.priceValidUntil)))fail('Price validity must be a valid date.');
 return {kind,subcategory:text(input.subcategory),qualityTier:text(input.qualityTier),model:text(input.model),variant:text(input.variant),sku:text(input.sku),dimensions,material,electrical,assetUrl:assetUrl(input.assetUrl),imageUrl:assetUrl(input.imageUrl),productUrl:assetUrl(input.productUrl),warranty:text(input.warranty,1000),installation:text(input.installation,3000),mounting:['floor','wall','ceiling','surface','none'].includes(input.mounting)?input.mounting:'floor',priceValidUntil:input.priceValidUntil?new Date(input.priceValidUntil).toISOString():null};
}
function snapshot(product,spec){if(!product?.active||spec?.status!=='approved')fail('Choose an active, approved vendor product.');return {productId:product.id,vendorId:product.supplier_id,name:product.name,brand:product.brand,category:product.category,unit:product.unit,unitPrice:number(product.price,'Unit price',.01),catalogVersion:spec.version,catalogUpdatedAt:product.updated_at,spec:metadata(spec.metadata)};}
function position(input={}){return Object.fromEntries(['x','y','z'].map(k=>[k,number(input[k]??0,`Position ${k}`,-10000,10000)]));}
function selection(input,productSnapshot,existing){
 const placements=input.placements??[];if(!Array.isArray(placements)||placements.length>200)fail('At most 200 placements per selection.');
 const mode=input.quantityMode||'count';if(!['count','manual','area','length','volume'].includes(mode))fail('Choose a valid quantity mode.');
 const row={id:existing?.id||randomUUID(),product:structuredClone(productSnapshot),roomId:text(input.roomId),elementId:text(input.elementId),quantityMode:mode,quantity:number(input.quantity??1,'Quantity',.001,1e7),wastage:number(input.wastage??0,'Wastage',0,100),labor:number(input.labor??0,'Labor',0,1e8),installation:number(input.installation??0,'Installation',0,1e8),transport:number(input.transport??0,'Transport',0,1e8),taxPercent:number(input.taxPercent??0,'Tax',0,100),fallbackAcknowledged:input.fallbackAcknowledged===true,placements:placements.map(p=>({id:text(p.id)||randomUUID(),position:position(p.position),rotation:position(p.rotation),hostElementId:text(p.hostElementId),circuitId:text(p.circuitId),enabled:p.enabled!==false,brightness:number(p.brightness??1,'Brightness',0,1),temperature:number(p.temperature??productSnapshot.spec.electrical.temperature,'Temperature',2700,6500),beamAngle:number(p.beamAngle??productSnapshot.spec.electrical.beamAngle,'Beam angle',1,170)}))};
 if(mode==='count'&&!Number.isInteger(row.quantity))fail('Count quantities must be whole numbers.');return row;
}
const boundary=el=>(el?.geometry?.boundary||[]).map(p=>Array.isArray(p)?p:[p.x,p.y]);
function area(el){const pts=boundary(el);return Math.abs(pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;}
function inside(x,z,pts){let found=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];const cross=(x-a[0])*(b[1]-a[1])-(z-a[1])*(b[0]-a[0]);if(Math.abs(cross)<1e-6&&x>=Math.min(a[0],b[0])-1e-6&&x<=Math.max(a[0],b[0])+1e-6&&z>=Math.min(a[1],b[1])-1e-6&&z<=Math.max(a[1],b[1])+1e-6)return true;if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])found=!found;}return found;}
function derive(state,model,catalog=[],now=Date.now()){
 const elements=new Map((model?.elements||[]).map(e=>[e.id,e])),products=new Map(catalog.map(p=>[p.id,p]));const issues=[],lines=[],demand=new Map(),occupied=new Set();
 const issue=(s,code,message,severity='error')=>issues.push({selectionId:s.id,code,message,severity});
 for(const s of state.selections||[]){
  const p=s.product,spec=p.spec,room=elements.get(s.roomId),host=elements.get(s.elementId);let quantity=s.quantity;
  if(!room||room.type!=='Room')issue(s,'room','Select a room in the current BIM model.');
  if(s.elementId&&!host)issue(s,'element','Mapped BIM element no longer exists.');
  if(s.quantityMode==='area')quantity=area(host||room);
  if(s.quantityMode==='length'){const g=host?.geometry;quantity=g?.startPoint&&g?.endPoint?Math.hypot(g.endPoint.x-g.startPoint.x,g.endPoint.y-g.startPoint.y):0;}
  if(s.quantityMode==='volume')quantity=host?.geometry?.volumeM3??area(host)*(host?.dimensions?.thicknessM||0);
  if(!Number.isFinite(quantity)||quantity<=0)issue(s,'quantity','The selected BIM element has no measurable quantity.');
  if(!p.vendorId)issue(s,'vendor','A vendor is required.');
  if(!p.unitPrice||p.unitPrice<=0)issue(s,'price','A valid quoted unit price is required.');
  if(spec.priceValidUntil&&Date.parse(spec.priceValidUntil)<now)issue(s,'expired-price','Refresh this product price before finalizing.');
  if(!['bulk','surface'].includes(spec.kind)&&s.placements.length!==quantity)issue(s,'placement-count','Place one object for every selected unit.');
  if(spec.kind==='surface'&&!host)issue(s,'surface','Choose the BIM surface to receive this finish.');
  if(!['bulk','surface'].includes(spec.kind)&&!spec.assetUrl){issue(s,'asset','Product has no 3D asset; preview uses an explicitly marked dimensional fallback.','warning');if(!s.fallbackAcknowledged)issue(s,'fallback-approval','Acknowledge the missing product asset before finalizing.');}
  const current=products.get(p.productId);if(!current||!current.active||current.product_bim_specs?.status!=='approved')issue(s,'availability','Product is no longer approved or available.');
  const required=quantity*(1+s.wastage/100);demand.set(p.productId,(demand.get(p.productId)||0)+required);
  for(const placed of s.placements){
   const v=placed.position,pts=boundary(room),base=room?.position?.z||0,height=room?.dimensions?.heightM||3;
   if(pts.length<3||!inside(v.x,v.z,pts)||v.y<base-.02||v.y>base+height+.02)issue(s,'outside-room','Move the product inside its room and floor height.');
   if(spec.mounting==='ceiling'&&Math.abs(v.y-(base+height))>.25)issue(s,'ceiling','Ceiling products must be mounted at ceiling height.');
   if(spec.mounting==='wall'){
    const wall=elements.get(placed.hostElementId),g=wall?.geometry;
    if(wall?.type!=='Wall'||!g?.startPoint||!g?.endPoint)issue(s,'wall-host','Choose a valid host wall.');
    else {const a=g.startPoint,b=g.endPoint,dx=b.x-a.x,dz=b.y-a.y,len2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((v.x-a.x)*dx+(v.z-a.y)*dz)/(len2||1)));if(Math.hypot(v.x-a.x-t*dx,v.z-a.y-t*dz)>.3)issue(s,'wall-distance','Move the product onto the selected wall.');}
   }
   const key=`${s.roomId}:${v.x.toFixed(3)}:${v.y.toFixed(3)}:${v.z.toFixed(3)}`;if(occupied.has(key))issue(s,'duplicate-position','Two fixtures occupy the same position.');occupied.add(key);
  }
  const material=round(required*p.unitPrice),subtotal=round(material+s.labor+s.installation+s.transport),tax=round(subtotal*s.taxPercent/100);
  lines.push({selectionId:s.id,productId:p.productId,vendorId:p.vendorId,roomId:s.roomId,floorId:room?.storeyId||null,bimElementId:s.elementId,name:p.name,brand:p.brand,category:p.category,model:spec.model,sku:spec.sku,unit:p.unit,quantity:round(quantity),purchaseQuantity:round(required),unitPrice:p.unitPrice,material,labor:s.labor,installation:s.installation,transport:s.transport,tax,total:round(subtotal+tax),assetStatus:spec.kind==='bulk'?'not-applicable':spec.kind==='surface'?'material':spec.assetUrl?'catalog-asset':'fallback'});
 }
 for(const s of state.selections||[])if(demand.get(s.product.productId)>Number(products.get(s.product.productId)?.stock||0))issue(s,'stock','Combined project quantity exceeds current vendor stock.');
 const group=key=>lines.reduce((o,l)=>(o[l[key]||'Unassigned']=round((o[l[key]||'Unassigned']||0)+l.total),o),{});
 return {lines,issues,canFinalize:lines.length>0&&!issues.some(i=>i.severity==='error'),total:round(lines.reduce((n,l)=>n+l.total,0)),byRoom:group('roomId'),byVendor:group('vendorId'),byCategory:group('category'),byFloor:group('floorId')};
}
module.exports={fail,number,metadata,snapshot,selection,derive,area,inside};
