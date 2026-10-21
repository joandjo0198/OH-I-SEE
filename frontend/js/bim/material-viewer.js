import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BimViewer } from './bim-viewer.js';
export function kelvinColor(k){const t=k/100;return new THREE.Color().setRGB(Math.max(0,Math.min(255,t<=66?255:329.698727446*(t-60)**-.1332047592))/255,Math.max(0,Math.min(255,t<=66?99.4708025861*Math.log(t)-161.1195681661:288.1221695283*(t-60)**-.0755148492))/255,Math.max(0,Math.min(255,t>=66?255:t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307))/255);}
export class MaterialViewer extends BimViewer{
 constructor(host,options={}){super(host,{mode:'home'});this.productGroup=new THREE.Group();this.scene.add(this.productGroup);this.assetGeneration=0;this.resources=[];this.onAssetStatus=options.onAssetStatus||(()=>{});this.renderer.shadowMap.enabled=true;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;}
 releaseProducts(){for(const r of this.resources)r.dispose?.();this.resources=[];this.productGroup.clear();}
 async applySelections(selections){const generation=++this.assetGeneration;this.releaseProducts();if(this.model)this.loadModel(this.model);const loader=new GLTFLoader(),textures=new THREE.TextureLoader();
 const materialFor=async(spec)=>{const p=spec.material||{},m=new THREE.MeshStandardMaterial({color:p.color||'#dddddd',roughness:p.roughness??.6,metalness:p.metalness??0});this.resources.push(m);for(const key of ['map','normalMap','roughnessMap'])if(p[key]){const t=await textures.loadAsync(p[key]);if(generation!==this.assetGeneration){t.dispose();return m;}t.wrapS=t.wrapT=THREE.RepeatWrapping;if(key==='map')t.colorSpace=THREE.SRGBColorSpace;m[key]=t;this.resources.push(t);}m.needsUpdate=true;return m;};
 for(const selection of selections){if(generation!==this.assetGeneration)return;const spec=selection.product.spec;try{
  if(spec.kind==='bulk'){this.onAssetStatus(selection.id,'Not applicable');continue;}
  if(spec.kind==='surface'){const mesh=this.meshes.get(selection.elementId);if(!mesh){this.onAssetStatus(selection.id,'Missing BIM surface');continue;}const mat=await materialFor(spec);if(generation!==this.assetGeneration)return;mesh.traverse(o=>{if(o.isMesh)o.material=mat;});mesh.userData.productId=selection.product.productId;mesh.userData.selectionId=selection.id;this.onAssetStatus(selection.id,'Applied material');continue;}
  let source=null;if(spec.assetUrl){const gltf=await loader.loadAsync(spec.assetUrl);source=gltf.scene;if(generation!==this.assetGeneration){source.traverse(o=>{o.geometry?.dispose();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>m.dispose());}});return;}source.traverse(o=>{if(o.geometry)this.resources.push(o.geometry);if(o.material)this.resources.push(...(Array.isArray(o.material)?o.material:[o.material]));});}
  for(const placed of selection.placements){const root=new THREE.Group();root.userData={selectionId:selection.id,productId:selection.product.productId,vendorId:selection.product.vendorId,kind:spec.kind,roomId:selection.roomId,fallback:!source};root.name=selection.product.name;
   let mesh;if(source){mesh=source.clone(true);const b=new THREE.Box3().setFromObject(mesh),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());mesh.position.sub(center);const scaled=new THREE.Group();scaled.add(mesh);scaled.scale.set(spec.dimensions.width/(size.x||1),spec.dimensions.height/(size.y||1),spec.dimensions.depth/(size.z||1));root.add(scaled);}else{const geo=new THREE.BoxGeometry(spec.dimensions.width,spec.dimensions.height,spec.dimensions.depth),mat=new THREE.MeshStandardMaterial({color:'#d946ef',wireframe:true});this.resources.push(geo,mat);mesh=new THREE.Mesh(geo,mat);root.add(mesh);}
   root.position.set(placed.position.x,placed.position.y,placed.position.z);root.rotation.set(placed.rotation.x,placed.rotation.y,placed.rotation.z);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   if(spec.kind==='light'){const angle=THREE.MathUtils.degToRad(placed.beamAngle/2),intensity=placed.enabled?spec.electrical.lumens*placed.brightness/(2*Math.PI*(1-Math.cos(angle))):0;const light=new THREE.SpotLight(kelvinColor(placed.temperature),intensity,30,angle,.25,2);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.bias=-.0002;const target=new THREE.Object3D();target.position.set(0,-1,0);root.add(light,target);light.target=target;}
   this.productGroup.add(root);
  }
  this.onAssetStatus(selection.id,source?'Applied catalog model':'Missing asset — dimensional fallback');
 }catch(e){this.onAssetStatus(selection.id,'Asset failed to load — '+e.message);}}
 }
 setNight(on){this.scene.background=new THREE.Color(on?'#08121f':'#87b8d8');this.scene.fog=null;this.scene.children.forEach(o=>{if(o.isLight){o.userData.originalIntensity??=o.intensity;o.intensity=on?o.userData.originalIntensity*.08:o.userData.originalIntensity;}});}
 setProductMode(mode){this.productGroup.children.forEach(o=>{o.visible=mode==='all'||(mode==='electrical'&&['light','fan','switch','socket'].includes(o.userData.kind))||(mode==='plumbing'&&['pipe','fixture'].includes(o.userData.kind));});}
 dispose(){this.assetGeneration++;this.releaseProducts();super.dispose();}
}
