import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export function mountPlan3d(container,plan){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8eeec');
 const camera=new THREE.PerspectiveCamera(40,container.clientWidth/620,.1,1000),renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(container.clientWidth,620);container.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.autoRotate=false;
 scene.add(new THREE.HemisphereLight(0xffffff,0x68746b,2.5));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(10,25,-10);scene.add(light);
 const scale=.0254;
 function box(b,z,height,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(b.w*scale,height*scale,b.h*scale),new THREE.MeshStandardMaterial({color}));mesh.position.set((b.x+b.w/2)*scale,(z+height/2)*scale,(b.y+b.h/2)*scale);scene.add(mesh);}
 box(plan.plot,-5,4,'#b9cbaa');
 for(const r of plan.rooms)for(const b of r.parts)box(b,0,1,r.type==='toilet'?'#c1e2e5':r.type==='bedroom'?'#d4dfeb':'#e6d9c3');
 // Cutaway clips saved wall solids without recalculating the floor layout.
 for(const w of plan.walls)for(const b of w.solids3d)if(b.z<48)box(b,b.z,Math.min(b.height,48-b.z),'#f3efe4');
 for(const f of plan.furniture)box(f,1,f.type==='Bed'?18:24,f.type==='Car'?'#466072':'#b39c7e');
 const width=plan.plot.w*scale,depth=plan.plot.h*scale,span=Math.max(width,depth);
 controls.target.set(plan.envelope.w*scale/2,0,plan.envelope.h*scale/2);camera.position.copy(controls.target).add(new THREE.Vector3(span*.8,span*1.25,-span*.95));controls.update();
 const render=()=>renderer.render(scene,camera);controls.addEventListener('change',render);
 const observer=new ResizeObserver(()=>{camera.aspect=container.clientWidth/620;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,620);render();});observer.observe(container);render();
 return ()=>{observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.dispose();container.replaceChildren();};
}
