import * as T from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/** Built details in the same local metre coordinates as the architectural plan. */
export function addReferenceFacade({groups,resources,materials,box,plan}) {
 const {wood,stone,metal,glass,glow}=materials;
 RectAreaLightUniformsLib.init();
 const front=13.05,corner=11.85;
 const timberJoint=new T.MeshStandardMaterial({color:0x392719,roughness:.96});
 // Recessed stone joints are geometry, so they remain correctly lit at every camera angle.
 for(const x of [2.15,corner])for(let course=0;course<11;course++){
  const tile=box(groups.finish,x,.3+course*.6,front+.436,.514,.588,.035,stone);
  tile.name=`Front_limestone_course_${x}_${course}`;
 }
 for(const z of [2.1,6.9,12.75])for(let course=0;course<11;course++)
  box(groups.finish,12.285,.3+course*.6,z,.035,.588,.64,stone);
 // The projecting roof covers the glass balcony; deep timber battens describe its underside.
 const roofFront=plan.roof.z+plan.roof.depth;
 for(let i=0;i<48;i++){
  const x=plan.roof.x+.1+i*(plan.roof.width-.2)/48;
  box(groups.finish,x,6.49,(13+roofFront)/2,.018,.022,roofFront-13,timberJoint);
 }
 for(const z of [13.5,14.9])for(const x of [3.2,6.9,10.6]){
  const trim=box(groups.finish,x,6.466,z,.145,.025,.145,metal);
  const bulb=box(groups.lighting,x,6.449,z,.075,.008,.075,glow);bulb.name='Recessed_soffit_downlight';
 }
 // Return glazing and slim handrails complete the corner balcony.
 for(const x of [1.95,12.05]){
  box(groups.balcony,x,3.98,14.04,.025,1.05,1.98,glass);
  box(groups.balcony,x,4.53,14.04,.055,.055,2.02,metal);
 }
 // Timber-lined entrance and framed living-room ceiling.
 for(const y of [3.45,.12]){
  box(groups.finish,10.9,y+1.56,13.17,.58,3.04,.19,wood);
  box(groups.finish,7,y+2.96,11.25,8.5,.11,3.25,wood);
  box(groups.lighting,7,y+2.884,11.5,7.8,.018,.023,glow);
  box(groups.lighting,3.15,y+2.884,11.35,.025,.018,2.85,glow);
  box(groups.lighting,10.85,y+2.884,11.35,.025,.018,2.85,glow);
 }
 // Broad warm emitters supply interior bounce, avoiding isolated point-light hotspots.
 for(const y of [1.75,5.05]){
  const light=new T.RectAreaLight(0xffbb79,2.2,7.6,2.35);
  light.position.set(7,y,10);light.lookAt(7,y,15);groups.lighting.add(light);
 }
 const canopyLight=new T.RectAreaLight(0xffbc78,1.8,5.7,5.8);
 canopyLight.position.set(15.35,2.85,12.2);canopyLight.lookAt(15.35,0,12.2);groups.lighting.add(canopyLight);
 // Horizontal timber carport ceiling with small recessed luminaires.
 for(let i=0;i<42;i++)box(groups.finish,12.18+i*.154,2.902,12.2,.014,.025,6.4,timberJoint);
 for(const x of [13.2,15.35,17.5])for(const z of [10.1,13,14.8])
  box(groups.lighting,x,2.878,z,.07,.012,.07,glow);
 // Raised garden wall beside the entrance, with genuine coping and reveals.
 box(groups.garden,3.4,.43,15.55,4.2,.85,1.02,stone);
 box(groups.garden,3.4,.878,15.55,4.28,.065,1.1,stone);
}
