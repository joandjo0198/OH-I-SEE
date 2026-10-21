import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {productLabel} from './products.mjs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {byId} from './catalog.js';
const FT=.3048;
export function fixtureGroup(plan){
 const root=new T.Group();root.name='Placed fixtures';
 for(const f of plan.fixtures||[]){const d=byId[f.catalogId];if(!d)continue;const g=new T.Group();g.name=productLabel(f);g.userData.product=f.props?.product||null;g.userData.roomId=f.roomId;g.userData.fixtureId=f.id;g.visible=!plan.hiddenFixtureLayers?.includes(d.category);g.position.set(f.position.x*FT,f.position.z*FT,f.position.y*FT);g.rotation.y=-f.rotation*Math.PI/180;g.scale.setScalar(f.scale*FT);root.add(g);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.65,...extra});
 const add=(geo,color,x=0,y=0,z=0,extra={})=>{const m=new T.Mesh(geo,mat(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const box=(w,h,l,c,x=0,y=h/2,z=0)=>add(['sofa','armchair','bed'].includes(d.id)?new RoundedBoxGeometry(w,h,l,3,Math.min(w,h,l)*.18):new T.BoxGeometry(w,h,l),c,x,y,z),cyl=(a,b,h,c,x=0,y=h/2,z=0)=>add(new T.CylinderGeometry(a,b,h,24),c,x,y,z);
 const [w,h,l]=d.size,id=d.id,wood=f.props?.color||'#967251',fabric=f.props?.product?.color||f.props?.color||'#a1b4a3',ivory=f.props?.product?.color||f.props?.color||'#eee7db';
 if(f.mount==='line'){
  const points=f.props?.points||[{x:f.position.x,y:f.position.y},{x:f.position.x+1,y:f.position.y}];g.rotation.y=0;g.scale.setScalar(FT);for(let i=1;i<points.length;i++){const a=new T.Vector3(points[i-1].x-f.position.x,0,points[i-1].y-f.position.y),b=new T.Vector3(points[i].x-f.position.x,0,points[i].y-f.position.y);if(a.distanceTo(b)<.01)continue;const tube=add(new T.CylinderGeometry(.045,.045,a.distanceTo(b),8),id==='drain-pipe'?'#7d6854':'#459bc6');tube.position.copy(a.clone().add(b).multiplyScalar(.5));tube.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());}
 }else if(id.includes('mirror')){
  const round=id!=='rect-mirror'&&id!=='full-mirror';const m=add(round?new T.CircleGeometry(w/2,48):new T.PlaneGeometry(w,h),'#b1c9cb',0,0,.16,{metalness:.95,roughness:.08});m.material.side=T.DoubleSide;
  const ring=add(new T.TorusGeometry(w/2+.07,.045,8,48),'#ffe3ad',0,0,.18,{emissive:'#ffca79',emissiveIntensity:f.props.on===false?0:2});if(!round)ring.visible=false;
 }else if(id.includes('plant')||id==='planter'){
  cyl(w*.32,w*.25,h*.25,'#cbbba3');for(let i=0;i<16;i++){const angle=i*2.4,height=h*.3+(i%7)/7*h*.65;const leaf=add(new T.SphereGeometry(1,8,6),i%2?'#38644b':'#618c52',Math.cos(angle)*w*.25,height,Math.sin(angle)*w*.25,{roughness:.8});leaf.scale.set(w*.15,h*.22,w*.07);leaf.rotation.set(.4,angle,.5);}cyl(.035,.05,h*.75,'#6b6045',0,h*.45);
 }else if(id.includes('fan')){
  cyl(.08,.08,.5,'#737b75',0,-.2);const rotor=new T.Group();rotor.userData.fan=true;g.add(rotor);for(let i=0;i<3;i++){const blade=box(id==='ceiling-fan'?1.8:.7,.06,.26,wood,.8,-.4);g.remove(blade);const pivot=new T.Group();pivot.rotation.y=i*Math.PI*2/3;pivot.add(blade);rotor.add(pivot);}cyl(.23,.23,.15,ivory,0,-.4);if(id!=='ceiling-fan')rotor.rotation.x=Math.PI/2;
 }else if(id==='bed'){
  box(w,.65,l,wood);box(w,.7,l,ivory,0,1);box(w,.12,l*.55,fabric,0,1.41,l*.15);box(w,.95,.2,wood,0,1.2,-l/2);for(const x of [-w/4,w/4])box(w*.4,.25,1,'#fff9ef',x,1.5,-l*.34);
 }else if(id==='sofa'||id==='armchair'){
  box(w,1,l,fabric,0,.8);box(w,1.6,.35,fabric,0,1.8,-l/2+.2);for(const x of [-w/2+.2,w/2-.2])box(.4,1,l,fabric,x,1.6);for(const x of [-w*.25,w*.25]){box(w*.4,.2,l*.75,ivory,x,1.4,.1);const cushion=box(w*.16,.7,.22,'#6e7949',x,1.85,-l*.22);cushion.rotation.z=x<0?-.12:.12;}
 }else if(['dining-chair','bench','stool'].includes(id)){
  const seat=id==='dining-chair'?1.5:h-.15;box(w,.18,l,fabric,0,seat);
  for(const x of [-w*.38,w*.38])for(const z of [-l*.38,l*.38])box(.12,seat,.12,wood,x,seat/2,z);
  if(id==='dining-chair'){box(w,h-seat,.15,wood,0,(h+seat)/2,-l*.44);box(w*.88,(h-seat)*.75,.16,fabric,0,(h+seat)/2,-l*.44+.08);}
 }else if(id.includes('table')){
  box(w,.18,l,wood,0,h);for(const x of [-w*.4,w*.4])for(const z of [-l*.4,l*.4])box(.12,h,.12,'#42443c',x,h/2,z);if(id==='dining-table')for(const x of [-w*.65,w*.65])for(const z of [-1,1]){box(1.1,.18,1.1,fabric,x,1.5,z);box(.15,1.2,1.1,fabric,x+Math.sign(x)*.45,2,z);}
 }else if(id==='rug'){box(w,.04,l,f.props?.color||'#d2ba98');for(let i=0;i<20;i++)box(w,.005,.018,'#b8a789',0,.045,-l/2+i*l/20);}
 else if(id==='curtains'){for(let i=0;i<16;i++)cyl(w/40,w/40,h,i%2?'#d5c5ac':'#eee1cc',-w/2+i*w/16,-h/2,.2);}
 else if(['basin','sink','wc'].includes(id)){box(w,h*.75,l*.8,'#e8e6df');const bowl=add(new T.TorusGeometry(w*.32,.12,12,24),'#fafaf6',0,h*.85,.1);bowl.rotation.x=Math.PI/2;if(id!=='wc'){cyl(.05,.05,.6,'#bbc2c0',0,h,-l*.3);}else box(w,.8,.4,ivory,0,h-.3,-l/2);}
 else if(d.category==='Lighting'){
  const floor=id.includes('lamp');if(floor){cyl(.4,.45,.1,'#4c524b');cyl(.04,.04,h,'#a98f5d');}else if(id==='pendant'||id==='chandelier')cyl(.025,.025,1.5,'#51514b',0,-.75);
  if(id==='chandelier'){for(const x of [-1,1]){box(1,.045,.045,'#292c29',x*.5,-1.5);cyl(.18,.35,.22,'#30352e',x,-1.5);}}const y=floor?h:id==='pendant'||id==='chandelier'?-1.5:0;cyl(.3,.5,.3,ivory,0,y);add(new T.SphereGeometry(.17,16,12),'#fff3d2',0,y-.18,0,{emissive:'#ffd08c',emissiveIntensity:f.props.on===false?0:2});
 }else if(id==='wall-art'){box(2,1.5,.1,'#b5a38c',0,0);box(1.8,1.3,.03,'#e5e1d5',0,0,.08);for(let i=0;i<4;i++){const ring=add(new T.TorusGeometry(.35+i*.035,.008,4,40),'#727b77',Math.sin(i)*.06,0,.12);ring.scale.y=1.3;ring.rotation.z=i*.2;}}
 else if(id==='clock'){const m=cyl(.5,.5,.08,ivory,0,0);m.rotation.x=Math.PI/2;box(.03,.35,.03,'#343b35',0,.1,.06);}
 else if(id==='vase'){cyl(.2,.4,1.4,'#c8ab88');}
 else {box(w,h,l,d.category==='Electrical'?(f.props?.product?.color||'#ecebe6'):id==='split-ac'?'#eeeae0':wood,0,f.mount==='wall'?0:h/2);if(d.category==='Electrical')for(const x of [-.2,.2])box(.06,.12,.03,'#454d48',x,0,l/2+.02);}
 if((d.light||id==='mirror-backlight')&&f.props.on!==false){const warm=(f.props.temperature||2900)<4000?'#ffd59c':'#eef4ff';const light=new T.PointLight(warm,(f.props.intensity||35)*.025,6,2);light.position.set(0,f.mount==='ceiling'?-.5:id.includes('lamp')?h:0,.4);g.add(light);}
 if(d.modelUrl){new GLTFLoader().load(d.modelUrl,asset=>{if(root.userData.disposed){disposeGroup(asset.scene);return;}const bounds=new T.Box3().setFromObject(asset.scene),size=bounds.getSize(new T.Vector3());asset.scene.scale.set(w/size.x,h/size.y,l/size.z);for(const child of [...g.children]){if(!child.isLight){g.remove(child);disposeGroup(child);}}g.add(asset.scene);},undefined,()=>{});}
 g.traverse(o=>{o.userData.fixtureId=f.id;});
 }return root;
}
export function animateFixtures(group,dt,spin=true){group.traverse(o=>{if(o.userData.fan&&spin)o.rotation.y+=dt*5;});}
export function disposeGroup(group){group.userData.disposed=true;const mats=new Set();group.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])mats.add(m);});for(const m of mats){m.map?.dispose();m.dispose();}}
