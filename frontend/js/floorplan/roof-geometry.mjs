import * as T from 'three';
import {roofEstimate} from './roofs.mjs';
export function buildRoof(plan){const r=roofEstimate(plan),g=new T.Group();g.name='Roof';g.userData.estimate=r;const FT=.3048,h=plan.settings.wallHeight;
 const add=(name,w,t,d,x,y,z,angle=0)=>{const m=new T.Mesh(new T.BoxGeometry(w*FT,t*FT,d*FT),new T.MeshStandardMaterial({color:r.color,roughness:r.material==='metal'?.42:.85,metalness:r.material==='metal'?.3:0}));m.name=name;m.position.set(x*FT,y*FT,z*FT);m.rotation.z=angle;m.castShadow=m.receiveShadow=true;m.userData.finishKey='roof';g.add(m);return m;};
 const cx=r.x+r.width/2,cz=r.y+r.depth/2,a=r.pitch*Math.PI/180;
 if(r.style==='flat'){add('Roof slab',r.width,.5,r.depth,cx,h+.25,cz);for(const sign of [-1,1]){add('Terrace parapet',.25,2,r.depth,cx+sign*(r.width/2-.125),h+1.5,cz);add('Terrace parapet',r.width,2,.25,cx,h+1.5,cz+sign*(r.depth/2-.125));}}
 else {const half=r.style==='gable'?r.width/2:r.width,rise=Math.tan(a)*half;const sections=r.style==='gable'?[-1,1]:[-1];for(const side of sections){const x=r.style==='gable'?cx+side*r.width/4:cx;add('Roof covering',half/Math.cos(a),.18,r.depth,x,h+.3+rise/2,cz,-side*a);for(let i=0;i<=Math.min(90,Math.ceil(r.depth*1.5));i++){const z=r.y+i*r.depth/Math.min(90,Math.ceil(r.depth*1.5));const seam=add('Roof seam',half/Math.cos(a),.035,.04,x,h+.41+rise/2,z,-side*a);seam.castShadow=false;seam.receiveShadow=false;}}
 // Closed triangular gables connect the pitched roof to the walls.
 const shape=new T.Shape();shape.moveTo(-r.width/2,0);shape.lineTo(r.width/2,0);if(r.style==='gable')shape.lineTo(0,rise);else shape.lineTo(r.width/2,rise);shape.closePath();for(const z of [r.y,r.y+r.depth]){const mesh=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:'#e5dfd2',side:T.DoubleSide}));mesh.scale.setScalar(FT);mesh.position.set(cx*FT,(h+.25)*FT,z*FT);mesh.name='Roof gable';g.add(mesh);}}
 return g;}
