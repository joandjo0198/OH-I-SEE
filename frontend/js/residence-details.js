import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original lightweight geometry; no house image, billboard or model substitution.
export function dressResidence({groups,resources,materials,box,scene,mobile}) {
 const {wood,stone,metal,glass,floor,glow}=materials;
 const keep=g=>(resources.push(g),g);
 const standard=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 function mesh(parent,geometry,material,x,y,z){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function rounded(parent,x,y,z,w,h,d,mat,r=.07){return mesh(parent,keep(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4))),mat,x,y,z);}
 // Continuous terrain removes the floating presentation plinth.
 box(groups.base,10,-.13,10,180,.16,180,standard(0x172a27));
 const paving=floor.clone();paving.color.set(0xc8c6bb);paving.roughness=.48;
 for(let row=0;row<30;row++)box(groups.garden,14.3,.018,15.2+row*.68,9.2,.035,.57,paving);
 for(const y of [3.17,6.51]) {
  // Recessed warm cove underneath each projecting slab.
  box(groups.lighting,7,y,13.92,9.65,.022,.035,glow);
  for(let i=0;i<36;i++)box(groups.finish,1.8+i*.3,y+.025,13.15,.018,.03,2.05,wood);
 }
 // Furniture is visible through the full-height glazing; soft corners catch highlights.
 const fabric=standard(0x9aabac,.94),cushion=standard(0xd8d1bb,.97);
 for(const y of [.42,3.76]) {
  rounded(groups.finish,7.3,y+.26,11.5,3.5,.55,1.05,fabric);
  rounded(groups.finish,7.3,y+.7,11.13,3.5,.55,.26,fabric);
  for(const x of [5.75,8.85])rounded(groups.finish,x,y+.58,11.5,.3,.45,1.1,fabric);
  for(const x of [6.2,7.3,8.4])rounded(groups.finish,x,y+.61,11.52,.93,.14,.72,cushion);
  rounded(groups.finish,7.2,y+.17,10.05,1.9,.12,.88,wood);
  for(const x of [6.5,7.9])box(groups.finish,x,y-.02,10.05,.055,.4,.055,metal);
  const rug=box(groups.finish,7.2,y-.15,10.7,4.6,.014,3,standard(0x827969,.95));
 }
 // Folded curtains add soft detail within the actual glazed facade.
 const curtainMat=standard(0xc4b6a0,.98);
 for(const level of [0,3.45])for(const x of [3.05,10.9]){
  const g=keep(new T.PlaneGeometry(.8,2.6,20,1));const p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*65)*.045);g.computeVertexNormals();
  mesh(groups.finish,g,curtainMat,x,level+1.62,12.85);
 }
 // Luminaires and physically attenuated light illuminate the same interiors.
 for(const [x,y,z,power] of [[5,2.7,11,35],[9,2.7,11,35],[5,6.05,11,40],[9,6.05,11,40],[15.5,2.7,12.5,45]]){
  const light=new T.PointLight(0xffbc76,power,9,2);light.position.set(x,y,z);groups.lighting.add(light);
  mesh(groups.lighting,keep(new T.CylinderGeometry(.075,.075,.018,12)),glow,x,y+.13,z);
 }
 // Pendants above dining and the upper lounge.
 for(const x of [6.7,7.3,7.9]){
  box(groups.finish,x,5.9,10,.012,1.05,.012,metal);
  mesh(groups.lighting,keep(new T.SphereGeometry(.095,12,8)),glow,x,5.32,10);
 }
 for(const x of [1,19.4])for(const z of [7,12,17,20]){
  box(groups.garden,x,.29,z,.12,.55,.12,metal);
  box(groups.lighting,x,.55,z,.14,.065,.14,glow);
  const lamp=new T.PointLight(0xffbf7d,7,3,2);lamp.position.set(x,.62,z);groups.lighting.add(lamp);
 }
 // Leaf and branch instances provide irregular, fine silhouettes without sphere shrubs.
 let seed=718;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
 const leafGeo=keep(new T.BufferGeometry());
 leafGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.075,.11,.014,-.085,.23,0,0,.38,-.015,.085,.23,0,.075,.11,.014,0,.18,.036],3));
 leafGeo.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6]);leafGeo.computeVertexNormals();
 const leafMat=new T.MeshStandardMaterial({color:0xc5d59a,roughness:.88,side:T.DoubleSide});
 const budget=mobile?14000:48000;
 const leaves=new T.InstancedMesh(leafGeo,leafMat,budget);leaves.castShadow=true;leaves.receiveShadow=true;
 const branchGeo=keep(new T.CylinderGeometry(1,1,1,7));
 const branches=new T.InstancedMesh(branchGeo,standard(0x55483b),300);branches.castShadow=true;
 const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);let leafCount=0,branchCount=0;
 function branch(a,b,r){const v=new T.Vector3().subVectors(b,a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,v.clone().normalize());dummy.scale.set(r,v.length(),r*.8);dummy.updateMatrix();branches.setMatrixAt(branchCount++,dummy.matrix);}
 function cluster(x,y,z,r,count){for(let i=0;i<count&&leafCount<budget;i++){
  const angle=rnd()*Math.PI*2,vert=rnd()*2-1,rad=Math.cbrt(rnd())*r;
  dummy.position.set(x+Math.cos(angle)*Math.sqrt(1-vert*vert)*rad,y+vert*rad*.7,z+Math.sin(angle)*Math.sqrt(1-vert*vert)*rad);
  dummy.rotation.set(rnd()*2.8,rnd()*6.28,rnd()*3);dummy.scale.setScalar(.48+rnd()*.9);dummy.updateMatrix();leaves.setMatrixAt(leafCount,dummy.matrix);
  leaves.setColorAt(leafCount++,new T.Color().setHSL(.22+rnd()*.08,.3+rnd()*.2,.23+rnd()*.2));
 }}
 box(groups.finish,3.1,3.55,14.65,1.5,.4,.6,stone);
 cluster(3.1,3.98,14.65,.5,mobile?100:200);
 const trees=[[.1,10,4.4],[20,7,5.8],[-3,1,6.5],[22,-2,7],[0,-6,8],[26,12,6.5],[5.5,16.3,2.7],[-7,19,7],[22,19,6]];
 for(const [x,z,h] of trees){const base=new T.Vector3(x,0,z),crown=new T.Vector3(x+.12,h*.8,z);branch(base,crown,.12);
  for(let j=0;j<9;j++){const a=j*2.4,reach=.7+rnd()*1.35,end=new T.Vector3(x+Math.cos(a)*reach,h*(.68+rnd()*.4),z+Math.sin(a)*reach);branch(new T.Vector3(x,h*.5,z),end,.025+rnd()*.02);cluster(end.x,end.y,end.z,.7+rnd()*.5,mobile?120:370);}
 }
 for(let i=0;i<28;i++){const x=i<14?.5+i*.42:19.25,z=i<14?16.4:1+(i-14)*1.35;cluster(x,.4,z,.46,mobile?90:260);}
 // Tropical broad-leaf planting has curved blades rather than solid green balls.
 const bladeGeo=keep(new T.PlaneGeometry(.28,1.3,2,7));const pos=bladeGeo.attributes.position;
 for(let i=0;i<pos.count;i++){const t=(pos.getY(i)+.65)/1.3;pos.setXYZ(i,pos.getX(i)*Math.sin(t*Math.PI),t*1.05,.85*t*t);}bladeGeo.computeVertexNormals();
 const blades=new T.InstancedMesh(bladeGeo,new T.MeshStandardMaterial({color:0x40633b,roughness:.75,side:T.DoubleSide}),240);
 let bladeCount=0;for(const [x,z] of [[.6,14],[1.5,15.5],[10.8,15.7],[12.7,16],[18.8,15.7],[3,18],[4,18.5],[19.1,18]])for(let j=0;j<30;j++){
  dummy.position.set(x,.05,z);dummy.rotation.set((rnd()-.5)*.4,j*2.4,0);dummy.scale.setScalar(.5+rnd()*.7);dummy.updateMatrix();blades.setMatrixAt(bladeCount++,dummy.matrix);
 }
 // Layered small shrubs fill the beds without hiding the entrance or driveway.
 for(let i=0;i<35;i++){
  const x=1.0+(i%7)*.64,z=17.0+Math.floor(i/7)*.55;
  cluster(x,.27+(i%3)*.12,z,.48,mobile?55:180);
 }
 for(let i=0;i<12;i++)cluster(18.95,.3,15.8+i*.55,.42,mobile?45:140);
 // A living tree on the balcony sits behind its glass railing.
 const trunk=new T.Vector3(11.75,3.5,14.35),crown=new T.Vector3(11.8,4.65,14.35);
 branch(trunk,crown,.045);
 for(let i=0;i<5;i++){const a=i*2.4,end=new T.Vector3(11.75+Math.cos(a)*.55,4.3+rnd()*.6,14.35+Math.sin(a)*.4);branch(new T.Vector3(11.75,4.1,14.35),end,.014);cluster(end.x,end.y,end.z,.47,mobile?80:180);}
 mesh(groups.finish,keep(new T.CylinderGeometry(.36,.27,.52,24)),stone,11.75,3.66,14.35);
 leaves.count=leafCount;branches.count=branchCount;groups.garden.add(leaves,branches,blades);
 // Vehicle body: rounded panels, tapered cabin, rubber tyres and machined rims.
 const car=new T.Group();car.position.set(16.4,0,13.1);groups.garden.add(car);
 const paint=new T.MeshPhysicalMaterial({color:0x172128,metalness:.7,roughness:.24,clearcoat:1,clearcoatRoughness:.15});
 const tyre=standard(0x101214,.9),chrome=standard(0xa2a7a8,.21,.95),window=new T.MeshPhysicalMaterial({color:0x26343c,metalness:.5,roughness:.12,clearcoat:1});
 rounded(car,0,.65,0,1.92,.64,4.25,paint,.2);
 rounded(car,0,.92,1.23,1.8,.16,1.5,paint,.08);
 // Side profile extrusion gives the windscreen and rear glass their proper rake.
 const profile=new T.Shape();profile.moveTo(-1.15,.84);profile.lineTo(-.75,1.48);profile.lineTo(.65,1.48);profile.lineTo(1.15,.84);profile.closePath();
 const cabin=keep(new T.ExtrudeGeometry(profile,{depth:1.6,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.025}));
 const cab=mesh(car,cabin,window,.8,0,0);cab.rotation.y=-Math.PI/2;
 rounded(car,0,1.5,-.05,1.63,.08,1.5,paint,.04);
 for(const x of [-.95,.95]){
  rounded(car,x,.46,0,.09,.12,2.7,chrome,.03);
  for(const z of [-1.35,1.35]){
   const wheel=mesh(car,keep(new T.CylinderGeometry(.36,.36,.25,32)),tyre,x,.38,z);wheel.rotation.z=Math.PI/2;
   const rim=mesh(car,keep(new T.CylinderGeometry(.25,.25,.26,24)),chrome,x,.38,z);rim.rotation.z=Math.PI/2;
   const hub=mesh(car,keep(new T.CylinderGeometry(.18,.18,.27,16)),metal,x,.38,z);hub.rotation.z=Math.PI/2;
   for(let i=0;i<5;i++){const spoke=box(car,x,.38,z,.28,.045,.44,chrome);spoke.rotation.x=i*Math.PI/5;}
  }
  rounded(car,x,.93,.35,.035,.045,.22,chrome,.01);
  rounded(car,x*1.12,1.05,.68,.25,.13,.3,paint,.04);
 }
 rounded(car,0,.55,2.13,1.25,.3,.025,metal,.02);
 for(let i=0;i<13;i++)box(car,-.57+i*.095,.55,2.155,.024,.24,.012,chrome);
 for(const x of [-.7,.7])rounded(car,x,.79,2.08,.42,.11,.07,glow,.035);
 rounded(car,0,.36,2.11,1.65,.065,.09,chrome,.02);
 return {leaves:leafCount};
}
