import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {Vector2} from 'three';
import {sketchShader} from './sketchPass.js';
export function renderPipeline(renderer,scene,camera){const composer=new EffectComposer(renderer);composer.renderTarget1.samples=4;composer.renderTarget2.samples=4;composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,512,512);ao.kernelRadius=3;ao.minDistance=.001;ao.maxDistance=.08;// Screen-space AO is disabled: it produced grid artefacts in small room previews.
ao.dispose();const bloom=new UnrealBloomPass(new Vector2(512,512),.16,.35,1);composer.addPass(bloom);composer.addPass(new OutputPass());const pencil=new ShaderPass(sketchShader);pencil.uniforms.resolution.value=new Vector2(512,512);composer.addPass(pencil);return {composer,pencil,resize(w,h){composer.setSize(w,h);pencil.uniforms.resolution.value.set(w*renderer.getPixelRatio(),h*renderer.getPixelRatio());},dispose(){for(const p of composer.passes)p.dispose?.();composer.dispose();}};}
