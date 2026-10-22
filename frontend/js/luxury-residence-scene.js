import * as T from "three";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { addReferenceFacade } from './residence-facade.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEveningSky } from './residence-sky.js';
import { createArchitecturalDrawing } from './residence-linework.js';
import { dressResidence } from './residence-details.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  luxuryResidence as plan,

} from "./luxury-residence-plan.js";
const smooth = (p, a, b) => T.MathUtils.smoothstep(p, a, b);
/** Procedural model adapter. A future validated GLB can replace this factory
 * while retaining render(progress), resize and dispose as the controller contract. */
export async function createLuxuryResidence(host, { fixedConstruction = false } = {}) {
  const renderer = new T.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x09121d, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = T.SRGBColorSpace;
  // Mount the canvas directly into the architectural viewport panel.
  // This panel is absolutely positioned and never affects document layout.
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";

  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(39, 1, 0.1, 140);
  const resources = [];
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples=innerWidth<650?0:4;
  composer.renderTarget2.samples=innerWidth<650?0:4;
  const renderPass = new RenderPass(scene,camera);
  const contact = new SSAOPass(scene,camera,512,512,8);
  contact.kernelRadius=.4;contact.minDistance=.0005;contact.maxDistance=.018;
  const outputPass = new OutputPass();
  composer.addPass(renderPass);composer.addPass(contact);composer.addPass(outputPass);
  const mobile = innerWidth < 650;
  scene.fog = new T.FogExp2(0x1d303b, 0.018);
  scene.add(createEveningSky(resources));
  const environment = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  let environmentMap;
  try {
    const sky=await new RGBELoader().loadAsync('/images/home-design/materials/sky.hdr');
    environmentMap=pmrem.fromEquirectangular(sky);sky.dispose();
  } catch {environmentMap=pmrem.fromScene(environment,.04);}
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.45;
  environment.dispose();
  pmrem.dispose();
  resources.push(environmentMap);
  const residence=new T.Group();residence.name="OH_I_SEE_Residence";residence.scale.y=plan.structureScaleY;residence.userData.architecture=plan;scene.add(residence);
  const groups = {};
  for (const key of [
    "base",
    "ground",
    "upper",
    "slab",
    "balcony",
    "stairs",
    "roof",
    "glass",
    "finish",
    "garden",
    "furniture",
    "columns",
    "lighting",
  ]) {
    groups[key] = new T.Group();
    groups[key].name=key;
    residence.add(groups[key]);
  }
  const ambient = new T.HemisphereLight(0xb7cfec, 0x696957, 1.2);
  scene.add(ambient);
  const sun = new T.DirectionalLight(0xffdab0, 3);
  sun.position.set(-12, 22, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(innerWidth < 650 ? 1024 : 2048, innerWidth < 650 ? 1024 : 2048);
  Object.assign(sun.shadow.camera, {
    left: -24,
    right: 24,
    top: 24,
    bottom: -24,
    far: 80,
  });
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00015;
  sun.shadow.radius = 4;
  scene.add(sun);
  const material = (color, roughness = 0.7, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  function texture(type) {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle =
      type === "wood" ? "#94704c" : type === "stone" ? "#9e9d91" : "#bbbcb1";
    ctx.fillRect(0, 0, 512, 512);
    let seed = 127;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = `rgba(${i % 2 ? "255,245,220" : "15,20,21"},${rnd() * 0.15})`;
      ctx.fillRect(
        rnd() * 512,
        rnd() * 512,
        type === "wood" ? 1 : 3,
        type === "wood" ? 40 : 3,
      );
    }
    ctx.strokeStyle = type === "wood" ? "#4c3b29" : "#74766b";
    ctx.lineWidth = type === "wood" ? 2 : 1;
    for (let y = 0; y < 512; y += type === "wood" ? 32 : 85) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      if (type === "stone")
        for (let x = ((y / 85) % 2) * 70; x < 512; x += 140) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 85);
          ctx.stroke();
        }
    }
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    resources.push(t);
    return t;
  }
  const white = material(0xe9e3d4),
    stone = material(0xb7b6a9),
    wood = material(0xb08756),
    metal = material(0x202b30, 0.36, 0.65),
    floor = material(0xc5bfb0),
    grass = material(0x4e6240),
    glass = new T.MeshPhysicalMaterial({
      color: 0xc3d4d0,
      metalness: 0.12,
      roughness: 0.12,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
  // Pale honed limestone, with fine pores rather than the former dark marble map.
  const limestoneCanvas=document.createElement('canvas');limestoneCanvas.width=limestoneCanvas.height=512;
  const lc=limestoneCanvas.getContext('2d'),pixels=lc.createImageData(512,512);let materialSeed=813;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    materialSeed=(materialSeed*16807)%2147483647;
    const grain=materialSeed/2147483647,vein=Math.sin(x*.037+Math.sin(y*.013)*3)*Math.sin(y*.022);
    const value=199+vein*7+(grain-.5)*17-(grain>.985?22:0),i=(y*512+x)*4;
    pixels.data[i]=value+9;pixels.data[i+1]=value+5;pixels.data[i+2]=value-3;pixels.data[i+3]=255;
  }
  lc.putImageData(pixels,0,0);stone.map=new T.CanvasTexture(limestoneCanvas);stone.map.colorSpace=T.SRGBColorSpace;stone.map.wrapS=stone.map.wrapT=T.RepeatWrapping;resources.push(stone.map);
  stone.bumpMap = stone.map;
  stone.bumpScale = 0.035;
  wood.map = texture("wood");
  wood.bumpMap = wood.map;
  wood.bumpScale = 0.035;
  white.bumpMap = texture("plaster");
  white.bumpScale = 0.015;
  // Shared 512px maps: under 520 KB for all nine maps, loaded only with this scene.
  const loader=new T.TextureLoader();
  await Promise.all([[wood,'wood'],[floor,'concrete']].map(async([mat,name])=>{
    try {
      const maps=await Promise.all(['color','normal','roughness'].map(kind=>loader.loadAsync('/images/home-design/materials/'+name+'-'+kind+'.jpg')));
      maps.forEach(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());resources.push(t);});
      maps[0].colorSpace=T.SRGBColorSpace;mat.map=maps[0];mat.normalMap=maps[1];mat.roughnessMap=maps[2];mat.bumpMap=null;mat.normalScale=new T.Vector2(.45,.45);
    } catch { /* Local procedural material remains usable if an asset is missing. */ }
  }));
  const materialization={value:0};
  for(const mat of [wood,stone,floor])mat.onBeforeCompile=shader=>{
    shader.uniforms.materialization=materialization;
    shader.fragmentShader='uniform float materialization;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(.65),diffuseColor.rgb,materialization);');
  };
  const glow = new T.MeshStandardMaterial({
    color: 0xffdc9a,
    emissive: 0xffc277,
    emissiveIntensity: 1.8,
  });
  function box(parent, x, y, z, w, h, d, mat = white) {
    const geo = new T.BoxGeometry(w, h, d);
    // World-sized UVs keep the photographed stone and wood grain in proportion.
    const uv=geo.attributes.uv,norm=geo.attributes.normal;
    for(let i=0;i<uv.count;i++){
      const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));
      uv.setXY(i,uv.getX(i)*(nx>.5?d:w)/2,uv.getY(i)*(ny>.5?d:h)/2);
    }
    resources.push(geo);
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name=parent.name+"_"+parent.children.length;
    parent.add(mesh);
    return mesh;
  }
  function wall(parent, a, b, h, opens, level = 0) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz),
      ux = dx / len,
      uz = dz / len;
    const piece = (
      start,
      end,
      y,
      hh,
      mat = white,
      target = parent,
      th = 0.2,
    ) => {
      if (end <= start || hh <= 0) return;
      const m = box(
        target,
        a[0] + (ux * (start + end)) / 2,
        y + hh / 2,
        a[1] + (uz * (start + end)) / 2,
        end - start,
        hh,
        th,
        mat,
      );
      m.rotation.y = -Math.atan2(uz, ux);
    };
    let prev = 0;
    for (const [at, w, type] of [...opens, [len, 0]]) {
      piece(prev, at, 0, h);
      if (w) {
        const sill = type === "window" ? 0.65 : 0.12,
          top = h - 0.25;
        piece(at, at + w, 0, sill);
        piece(at, at + w, top, h - top);
        piece(at, at + w, level + sill, top - sill, type === "door" ? wood : glass, groups.glass, type === "door" ? .07 : .035);
        for (let x = at; x <= at + w; x += Math.min(1.2, w))
          piece(
            x,
            x + 0.04,
            level + sill,
            top - sill,
            metal,
            groups.glass,
            0.09,
          );
        piece(at, at + w, level + top, 0.055, metal, groups.glass, 0.12);
      }
      prev = at + w;
    }
  }
  for (const w of plan.walls) wall(groups.ground, w.a, w.b, 3.2, w.openings);
  for(const w of plan.upperWalls)wall(groups.upper,w.a,w.b,3.15,w.openings,3.45);
  groups.upper.position.y = 3.45;
  box(groups.base, 10, -.055, 10.5, 21, .08, 21, floor);
  box(groups.base, 7, 0.12, 7.5, 10.5, 0.24, 11.5, floor);
  // Slab pieces leave a real opening over the shared stair footprint.
  box(groups.slab,4.9,3.34,8,6.9,.26,12.5,white);
  box(groups.slab,10.2,3.34,3.95,3.7,.26,4.4,white);
  box(groups.slab,10.2,3.34,11.65,3.7,.26,5.1,white);
  box(groups.balcony,plan.balcony.x+plan.balcony.width/2,3.35,plan.balcony.z+plan.balcony.depth/2,plan.balcony.width,.28,plan.balcony.depth,white);
  box(groups.roof,plan.roof.x+plan.roof.width/2,plan.roof.height,plan.roof.z+plan.roof.depth/2,plan.roof.width,.32,plan.roof.depth,white);
  box(groups.roof, 7, 6.56, 9.1, 11.2, 0.12, 12.8, wood);
  box(groups.roof, 7, 6.99, 1.6, 11.5, 0.2, 0.14, metal);
  // Tall stone piers and deep wood reveals create the reference facade silhouette.
  for (const x of [2.15, 11.85])
    box(groups.columns, x, 3.3, 13.05, 0.52, 6.6, 0.85, stone);
  for(const z of [2.1,6.9,12.75])box(groups.columns,12.02,3.3,z,.5,6.6,.65,stone);
  for (let i = 0; i < 12; i++)
    box(groups.finish, 2.6 + i * 0.12, 4.99, 13.13, 0.055, 3.12, 0.12, wood);
  box(groups.balcony, 7, 3.98, 15.05, 10.1, 1.05, 0.025, glass);
  box(groups.balcony, 7, 4.53, 15.05, 10.25, 0.055, 0.055, metal);
  for (const x of [2, 4.5, 7, 9.5, 12])
    box(groups.balcony, x, 3.98, 15.05, 0.035, 1.1, 0.035, metal);
  // Attached right-hand covered parking remains exactly at the drafted bay.
  box(groups.roof, 15.35, 3.08, 12.2, 6.6, 0.24, 6.8, metal);
  box(groups.finish, 15.35, 2.94, 12.2, 6.4, 0.055, 6.5, wood);
  for (const x of [12.35, 18.4])
    for (const z of [9, 15.4])
      box(groups.columns, x, 1.4, z, 0.25, 2.8, 0.25, stone);
  for (let i = 0; i < 5; i++) {
    box(
      groups.base,
      7,
      0.05 + i * 0.09,
      15.45 - i * 0.35,
      6.8,
      0.1 + i * 0.18,
      0.36,
      stone,
    );
    box(
      groups.finish,
      7,
      0.12 + i * 0.18,
      15.6 - i * 0.35,
      6.7,
      0.018,
      0.028,
      glow,
    );
  }
  box(groups.garden,3.3,.015,17.5,5.8,.035,4,grass);
  box(groups.garden,19.3,.015,13,1.7,.035,13,grass);
  for(const x of [.1,20.3])box(groups.garden,x,.45,10,.2,.9,20,stone);
  dressResidence({groups,resources,materials:{wood,stone,metal,glass,floor,glow},box,scene,mobile});
  addReferenceFacade({groups,resources,materials:{wood,stone,metal,glass,floor,glow},box,plan});
  // Furniture and circulation occupy the same coordinates as the drafted layout.
  const linen = material(0xc9c1ae), ceramic = material(0xf1eee3);
  box(groups.furniture, 9.2, 0.35, 4, 2.4, 0.6, 2.8, linen);
  box(groups.furniture, 9.2, 0.75, 2.7, 2.5, 0.95, 0.12, wood);
  for (const x of [8.6, 9.8]) box(groups.furniture, x, 0.7, 3, 0.8, 0.15, 0.55, ceramic);
  box(groups.furniture, 2.6, 0.55, 4.1, 0.8, 1.05, 3.6, wood);
  box(groups.furniture, 4, 0.55, 2.6, 3.6, 1.05, 0.8, wood);
  box(groups.furniture, 4, 1.11, 2.6, 3.7, 0.08, 0.9, ceramic);
  box(groups.furniture, 4, 0.8, 7.5, 1.6, 0.12, 1.1, wood);
  for (const x of [3, 5]) for (const z of [7.1, 7.9]) {
    box(groups.furniture, x, 0.45, z, 0.48, 0.08, 0.48, linen);
    box(groups.furniture, x, 0.25, z, 0.08, 0.5, 0.08, metal);
  }
  for(let i=0;i<16;i++){const rise=(i+1)*3.3/16;box(groups.stairs,10,rise/2,6.2+i*.17,2.8,rise,.18,floor);}

  const drawing=createArchitecturalDrawing(plan,resources);
  scene.add(drawing.group,drawing.floors);
  const outlineMaterial=new T.LineBasicMaterial({color:0xa8c5d0,transparent:true,opacity:.5});
  for(const key of ['ground','upper','slab','balcony','stairs','roof','columns'])groups[key].traverse(o=>{
    if(!o.isMesh)return;const edges=new T.EdgesGeometry(o.geometry,28);resources.push(edges);const lines=new T.LineSegments(edges,outlineMaterial);lines.name='Structural_edges';o.add(lines);
  });
  if (fixedConstruction) {
    groups.services=new T.Group(); residence.add(groups.services);
    for (const [x,color] of [[11.55,0x62c6ee],[11.70,0xffc76a]]) {
      const path=new T.CurvePath();
      const points=[new T.Vector3(x,.2,12.6),new T.Vector3(x,3.1,12.6),new T.Vector3(3,3.1,12.6)];
      for(let i=1;i<points.length;i++)path.add(new T.LineCurve3(points[i-1],points[i]));
      const geometry=new T.TubeGeometry(path,24,.028,6,false);resources.push(geometry);
      groups.services.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25})));
    }
  }
  const constructionParts = [];
  const phases = {base:[.04,.15],columns:[.15,.30],ground:[.25,.42],slab:[.42,.50],upper:[.50,.65],stairs:[.60,.70],balcony:[.65,.75],roof:[.75,.83],glass:[.83,.90],furniture:[.86,.94],finish:[.90,.98],lighting:[.95,1],services:[.80,.88]};
  if (fixedConstruction) {
    drawing.group.visible = drawing.floors.visible = false;
    for (const [name, group] of Object.entries(groups)) {
      if (!phases[name] && name !== 'garden') continue;
      for (const part of group.children) {
        if (name === 'garden' && new T.Box3().setFromObject(part).min.y < 2) continue;
        // Terrain and the site slab are the stationary construction ground.
        if (name === 'base' && part.position.y < 0) continue;
        const materials = [];
        part.traverse(o => { if (!o.material) return;
          const clone = m => {const c=m.clone(); c.userData.restOpacity=c.opacity; c.transparent=true; materials.push(c); return c;};
          o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
        });
        constructionParts.push({part, y:part.position.y, materials, phase:phases[name] || [.90,.98]});
      }
    }
  }
  function renderConstruction(p) {
    progress = T.MathUtils.clamp(p,0,1);
    for (const {part,y,materials,phase} of constructionParts) {
      const t=smooth(progress,...phase);
      part.visible=t>0;
      part.position.y=y-(1-t)*.65;
      for (const m of materials) {m.opacity=m.userData.restOpacity*t; m.depthWrite=t>.99;}
    }
    materialization.value=1;
    outlineMaterial.opacity=0;
    groups.lighting.traverse(o=>{if(o.isLight){o.userData.power??=o.intensity;o.intensity=o.userData.power*smooth(p,.95,1);}});
    glow.emissiveIntensity=2.5*smooth(p,.95,1);
    renderer.toneMappingExposure=1.12;
    contact.enabled=false;
    renderer.render(scene,camera);
  }
  const introStart=performance.now();
  const animateEntry=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  let introFrame=0;
  let disposed = false,
    progress = 0;
  function revealAtHeight(group,amount){
    group.children.forEach(o=>{if(!o.isMesh)return;
      o.userData.restY??=o.position.y;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const h=o.geometry.boundingBox.max.y-o.geometry.boundingBox.min.y;
      o.scale.y=Math.max(.001,amount);o.position.y=o.userData.restY-h*(1-amount)/2;
    });
  }
  function render(p) {
    if (disposed) return;
    if (fixedConstruction) { renderConstruction(p); return; }
    progress = p;
    const walls = smooth(p, 0.4, 0.57),
      upper = smooth(p, 0.56, 0.7),
      turn = smooth(p, 0.36, 0.81),
      finish = smooth(p, 0.79, 0.99);
    groups.ground.visible = p > 0.4;
    groups.ground.scale.y = Math.max(0.001, walls);
    groups.upper.visible = p > 0.54;
    groups.upper.scale.y = Math.max(0.001, upper);
    groups.upper.position.y = 3.45 * walls;
    groups.slab.visible = p > 0.54;
    revealAtHeight(groups.slab,smooth(p,.53,.62));
    groups.stairs.visible=p>.48;groups.stairs.scale.y=Math.max(.001,smooth(p,.48,.62));
    groups.balcony.visible=p>.62;revealAtHeight(groups.balcony,smooth(p,.62,.72));
    groups.roof.visible = p > 0.67;
    revealAtHeight(groups.roof,smooth(p,.68,.77));
    groups.glass.visible = p > 0.65;
    groups.glass.scale.y = Math.max(0.001, smooth(p, 0.65, 0.76));
    groups.finish.visible = p > 0.7;
    revealAtHeight(groups.finish,smooth(p,.7,.81));
    groups.columns.visible=p>.52;groups.columns.scale.y=Math.max(.001,smooth(p,.52,.7));
    groups.lighting.visible=p>.86;
    groups.lighting.traverse(o=>{if(o.isLight){o.userData.power??=o.intensity;o.intensity=o.userData.power*smooth(p,.85,.98);}});
    glow.emissiveIntensity=2.5*smooth(p,.84,.97);
    materialization.value=finish;
    groups.furniture.visible = p > 0.3;
    groups.furniture.scale.y = Math.max(0.001, smooth(p, 0.3, 0.5));
    groups.garden.visible = p > 0.81;
    groups.garden.scale.y = Math.max(0.001, smooth(p,.81,.96));
    groups.base.visible = p > 0.38;
    const entry=animateEntry ? Math.min(1,(performance.now()-introStart)/1100) : 1;
    drawing.update(p,entry);
    outlineMaterial.opacity=.5*(1-smooth(p,.72,.88));
    white.color.set(0xe4e5e1).lerp(new T.Color(0xe9e0cc), finish);
    stone.color.set(0xd0d3cf).lerp(new T.Color(0xfffdf3), finish);
    wood.color.set(0xe4e1d9).lerp(new T.Color(0xd4aa74), finish);
    const tilt = smooth(p, 0.2, 0.45);
    const orbit = smooth(p, 0.32, 0.88);
    const compact=innerWidth<650;
    camera.position.set(
      10.5 + orbit*(compact ? 5 : 8.3),
      33 - orbit*(compact ? 24 : 29.3),
      10.501 + orbit*(compact ? 25 : 19.5)
    );
    camera.lookAt(9.8,.2+orbit*(compact?3.1:3.65),10.5);
    camera.zoom=1+(compact?0:.12)*orbit;
    camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad((43-orbit*(compact?0:3))/2))/Math.min(1,camera.aspect)));
    camera.updateProjectionMatrix();
    renderer.toneMappingExposure = 1.12;
    ambient.intensity = 1.2 - finish * 0.6;
    sun.intensity = 2.6 - finish * 1.2;
    scene.environmentIntensity = .45 - finish * .1;
    contact.enabled=!mobile && p>.44;
    // Projection uniforms follow the same scroll-controlled lens.
    contact.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
    contact.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
    if(p>.44)composer.render();else renderer.render(scene,camera);
  }
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    composer.setSize(r.width,r.height);
    contact.setSize(Math.round(r.width),Math.round(r.height));
    if (fixedConstruction) {
      camera.aspect=r.width/r.height;
      camera.clearViewOffset();
      camera.position.set(23,8.5,31);
      camera.lookAt(10,3.2,9);
      camera.zoom=1;
      camera.fov=46;
      camera.setViewOffset(r.width,r.height,-r.width*.16,0,r.width,r.height);
      camera.updateProjectionMatrix();
    } else {
    camera.aspect = innerWidth>=650 ? 1880/763 : r.width/r.height;
    camera.clearViewOffset();
    if(innerWidth>=650)camera.setViewOffset(r.width,r.height,-r.width*.18,0,r.width,r.height);
    camera.fov = T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(43 / 2)) / Math.min(1, camera.aspect)));
    camera.updateProjectionMatrix();
    }
    render(progress);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  host.classList.add("model-ready");
  resize();
  function enter(){if(disposed)return;render(progress);if(performance.now()-introStart<1100 && progress<0.05)introFrame=requestAnimationFrame(enter);}
  if(animateEntry && !fixedConstruction)introFrame=requestAnimationFrame(enter);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    host.dispatchEvent(new CustomEvent("preview-unavailable"));
  });
  return {
    render,
    model: residence,
    inspect(){return {camera:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray(),parts:constructionParts.map(({part,y})=>({y:part.position.y,restY:y,scale:part.scale.toArray(),visible:part.visible})),progress,groundScale:groups.ground.scale.y,upperScale:groups.upper.scale.y,slabVisible:groups.slab.visible,roofVisible:groups.roof.visible,materialization:materialization.value,planWallCount:plan.walls.length,lineVertexCount:drawing.group.children.find(o=>o.isLineSegments)?.geometry.attributes.position.count,groups:Object.fromEntries(Object.entries(groups).map(([key,value])=>[key,{visible:value.visible,scaleY:value.scale.y,objects:value.children.length}])),meshCount:(()=>{let count=0;residence.traverse(o=>{if(o.isMesh)count++;});return count;})()};},
    dispose() {
      disposed = true;
      cancelAnimationFrame(introFrame);
      observer.disconnect();
      resources.forEach((r) => r.dispose());
      scene.traverse((o) => {for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();});
      contact.dispose();outputPass.dispose();composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      host.classList.remove("model-ready");
    },
  };
}
