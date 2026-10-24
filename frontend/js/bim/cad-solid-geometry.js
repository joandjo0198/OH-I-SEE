import * as THREE from 'three';
// Plan XY maps to Three XZ, with Y as height. Saved voids stay in world coordinates.
export function surfaceShape(boundary, holes=[]) {
  const xy=p=>Array.isArray(p)?{x:p[0],y:p[1]}:p;
  const points=boundary.map(xy);
  const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p.x,-p.y)));
  for(const loop of holes)shape.holes.push(new THREE.Path(loop.map(xy).map(p=>new THREE.Vector2(p.x,-p.y))));
  return shape;
}
export function stairMeshes(el,material) {
  const g=el.geometry,group=new THREE.Group(),w=g.flightWidthM,L=g.landingM,t=g.treadM,r=g.riserM;
  const [first,second]=g.flightRisers,depth=el.dimensions.widthM,width=el.dimensions.lengthM;
  const box=(x,y,z,dx,dy,dz)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(dx,dy,dz),material);m.position.set(x+dx/2,y+dy/2,z+dz/2);m.castShadow=true;m.receiveShadow=true;group.add(m);};
  // Riser count includes each landing; treads are one fewer per flight.
  for(let i=0;i<first-1;i++)box(0,i*r,L+i*t,w,r,t);
  box(0,first*r-.15,depth-L,width,.15,L);
  for(let i=0;i<second-1;i++)box(width-w,(first+i)*r,depth-L-(i+1)*t,w,r,t);
  box(width-w,g.riseM-.15,0,w,.15,L);
  group.position.set(el.position.x,el.position.z,el.position.y);
  return group;
}
