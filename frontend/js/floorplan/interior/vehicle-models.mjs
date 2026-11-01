import {Group,Mesh,MeshStandardMaterial,Vector3,CylinderGeometry,TorusGeometry,BoxGeometry,SphereGeometry,BufferGeometry,Float32BufferAttribute} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export function vehicleModel(id,w,h,l){
 const root=new Group();root.name=id+' detailed model';
 const materials={paint:new MeshStandardMaterial({color:'#245067',metalness:.65,roughness:.25}),rubber:new MeshStandardMaterial({color:'#171b20',roughness:.95}),chrome:new MeshStandardMaterial({color:'#bdc7cf',metalness:.85,roughness:.2}),glass:new MeshStandardMaterial({color:'#345363',metalness:.25,roughness:.15}),light:new MeshStandardMaterial({color:'#fff4d6'}),red:new MeshStandardMaterial({color:'#bf2828'})};
 const mesh=(geometry,material,name,x=0,y=0,z=0)=>{const m=new Mesh(geometry,materials[material]);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 const box=(a,b,c,mat,name,x,y,z)=>mesh(new RoundedBoxGeometry(a,b,c,2,Math.min(a,b,c)*.18),mat,name,x,y,z);
 const tube=(a,b,r,mat,name)=>{a=new Vector3(...a);b=new Vector3(...b);const m=mesh(new CylinderGeometry(r,r,a.distanceTo(b),12),mat,name);m.position.copy(a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new Vector3(0,1,0),b.sub(a).normalize());return m;};
 const wheel=(x,y,z,r,thickness,spokes)=>{
 const tire=mesh(new TorusGeometry(r-thickness/2,thickness/2,12,40),'rubber','Tire',x,y,z);tire.rotation.y=Math.PI/2;
 const rim=mesh(new TorusGeometry(r-thickness,spokes?.025:.08,8,40),'chrome','Wheel rim',x,y,z);rim.rotation.y=Math.PI/2;
 tube([x-thickness/2,y,z],[x+thickness/2,y,z],spokes?.07:.18,'chrome','Axle');
 for(let i=0;i<(spokes?24:8);i++){const a=i*Math.PI*2/(spokes?24:8);tube([x,y,z],[x,y+Math.cos(a)*(r-thickness),z+Math.sin(a)*(r-thickness)],spokes?.012:.055,'chrome','Wheel spoke');}
 };
 if(id==='car'){
 const r=h*.19;
 box(w*.9,h*.28,l*.94,'paint','Lower body',0,h*.36,0);
 box(w*.88,h*.13,l*.26,'paint','Hood',0,h*.52,-l*.32);
 box(w*.88,h*.12,l*.19,'paint','Rear deck',0,h*.52,l*.36);
 // Tapered passenger cabin with sloped windscreen and rear glass.
 const bottomY=h*.48,topY=h*.9,front=-l*.22,rear=l*.27,roofFront=-l*.1,roofRear=l*.15;
 const v=[[-w*.43,bottomY,front],[w*.43,bottomY,front],[w*.43,bottomY,rear],[-w*.43,bottomY,rear],[-w*.34,topY,roofFront],[w*.34,topY,roofFront],[w*.34,topY,roofRear],[-w*.34,topY,roofRear]];
 const triangles=[];for(const q of [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]])for(const i of [q[0],q[1],q[2],q[0],q[2],q[3]])triangles.push(...v[i]);
 const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(triangles,3));geo.computeVertexNormals();mesh(geo,'glass','Windows and windscreen');
 box(w*.7,.1,l*.26,'paint','Roof',0,topY+.02,l*.025);
 for(const side of [-1,1]){for(const i of [0,1,2]){const bottom=[side*w*.44,bottomY,[-l*.22,0,l*.27][i]],top=[side*w*.35,topY,[-l*.1,0,l*.15][i]];tube(bottom,top,.055,'paint','Window pillar');}
 box(.07,.09,l*.75,'chrome','Belt trim',side*w*.455,h*.49,0);
 for(const z of [-l*.04,l*.17])box(.07,.07,.42,'chrome','Door handle',side*w*.46,h*.45,z);
 box(.35,.22,.5,'paint','Side mirror',side*w*.47,h*.62,-l*.15);
 for(const z of [-l*.31,l*.31])wheel(side*w*.43,r,z,r,.38,false);
 for(const z of [-l*.475,l*.475])box(w*.22,.23,.12,z<0?'light':'red','Lamp',side*w*.3,h*.4,z);
 }
 box(w*.55,.32,.1,'rubber','Front grille',0,h*.29,-l*.48);
 for(const z of [-l*.48,l*.48])box(w*.83,.12,.15,'chrome','Bumper',0,h*.2,z);
 }else{
 const r=l*.18,rear=l*.32,front=-l*.32,bottom=[0,r*.7,l*.03],seat=[0,h*.75,l*.14],head=[0,h*.74,-l*.23];
 for(const z of [rear,front])wheel(0,r,z,r,id==='bicycle'?.11:.28,id==='bicycle');
 for(const [a,b] of [[[0,r,rear],seat],[seat,bottom],[bottom,[0,r,rear]],[seat,head],[head,bottom],[head,[0,r,front]]])tube(a,b,id==='bicycle'?.055:.1,'paint','Frame tube');
 box(w*.3,.12,l*.13,'rubber','Saddle',0,h*.8,l*.14);
 tube(head,[0,h*.94,-l*.23],.055,'chrome','Steering stem');tube([-w*.47,h*.94,-l*.23],[w*.47,h*.94,-l*.23],.055,'chrome','Handlebar');
 for(const side of [-1,1]){tube([side*w*.32,h*.94,-l*.23],[side*w*.48,h*.94,-l*.23],.08,'rubber','Handle grip');tube(bottom,[side*w*.25,r*.7,l*.03+side*.16],.035,'chrome','Crank');box(w*.2,.08,.25,'rubber','Pedal',side*w*.3,r*.7,l*.03+side*.16);}
 tube([0,r,rear],bottom,.025,'chrome','Chain');
 if(id==='motorbike'){box(w*.55,h*.25,l*.25,'paint','Fuel tank',0,h*.56,-l*.05);box(w*.45,h*.22,l*.23,'chrome','Engine',0,h*.32,0);}
 }
 return root;
}
