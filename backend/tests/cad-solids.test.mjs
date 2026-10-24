import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const THREE=require('../../frontend/node_modules/three');
const {surfaceShape,stairMeshes}=await import('../../frontend/js/bim/cad-solid-geometry.js');
test('slab triangulation subtracts the saved opening rather than painting over it',()=>{
 const shape=surfaceShape([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],[[{x:2,y:2},{x:4,y:2},{x:4,y:6},{x:2,y:6}]]);
 const geo=new THREE.ShapeGeometry(shape),pos=geo.attributes.position,idx=geo.index;let area=0;
 for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);area+=Math.abs((pos.getX(b)-pos.getX(a))*(pos.getY(c)-pos.getY(a))-(pos.getY(b)-pos.getY(a))*(pos.getX(c)-pos.getX(a)))/2;}
 assert.ok(Math.abs(area-92)<.001);geo.dispose();
});
test('dogleg stair meshes reach the next level and remain inside the saved stairwell',()=>{
 const el={position:{x:1,y:2,z:3},dimensions:{lengthM:2.255,widthM:3.89},geometry:{flightWidthM:1.07,landingM:1.07,treadM:.25,riserM:.1875,flightRisers:[8,8],riseM:3}};
 const group=stairMeshes(el,new THREE.MeshBasicMaterial());group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group);
 assert.ok(Math.abs(bounds.max.y-6)<.00001);assert.ok(bounds.min.x>=1-.00001&&bounds.max.x<=3.255+.00001);assert.ok(bounds.min.z>=2-.00001&&bounds.max.z<=5.89+.00001);
});
