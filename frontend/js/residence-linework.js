import * as T from 'three';
/** All plan strokes and floor zones are world-space geometry, not a plan image. */
export function createArchitecturalDrawing(plan,resources){
 const group=new T.Group();group.name='Architectural_linework';
 const floors=new T.Group();floors.name='Floor_plan_geometry';
 const marks=new T.Group();marks.name='Dimensions_and_room_labels';group.add(marks);
 const ink=new T.LineBasicMaterial({color:0xc4dce5,transparent:true,opacity:.85});
 const quiet=new T.LineBasicMaterial({color:0x7092a4,transparent:true,opacity:.3});
 const wallPoints=[],detailPoints=[];
 const segment=(out,x,z,xx,zz,y=.27)=>out.push(x,y,z,xx,y,zz);
 const rect=(out,x,z,w,d,y=.27)=>{segment(out,x,z,x+w,z,y);segment(out,x+w,z,x+w,z+d,y);segment(out,x+w,z+d,x,z+d,y);segment(out,x,z+d,x,z,y);};
 for(const wall of plan.walls){
  const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;let prev=0;
  for(const [at,width,type] of [...wall.openings,[len,0]]){
   for(const offset of [-.1,.1])segment(wallPoints,wall.a[0]+ux*prev-uz*offset,wall.a[1]+uz*prev+ux*offset,wall.a[0]+ux*at-uz*offset,wall.a[1]+uz*at+ux*offset);
   const x=wall.a[0]+ux*at,z=wall.a[1]+uz*at;
   if(width){
    if(type==='door'){
     segment(detailPoints,x,z,x-uz*width,z+ux*width);
     for(let i=0;i<12;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24;segment(detailPoints,x+width*(ux*Math.cos(a)-uz*Math.sin(a)),z+width*(uz*Math.cos(a)+ux*Math.sin(a)),x+width*(ux*Math.cos(b)-uz*Math.sin(b)),z+width*(uz*Math.cos(b)+ux*Math.sin(b)));}
    }else segment(detailPoints,x,z,x+ux*width,z+uz*width);
   }prev=at+width;
  }
 }
 const b=plan.balcony;rect(detailPoints,b.x,b.z,b.width,b.depth);
 rect(detailPoints,12.4,9,6,6);
 for(let i=0;i<16;i++)segment(detailPoints,8.6,6.2+i*.17,11.4,6.2+i*.17);
 // Furniture outlines correspond to the live furniture and parking coordinates.
 rect(detailPoints,5.55,10.975,3.5,1.05);rect(detailPoints,6.25,9.61,1.9,.88);rect(detailPoints,8,2.6,2.4,2.8);rect(detailPoints,14.54,10.575,1.92,4.25);
 segment(detailPoints,2,1,12,1);segment(detailPoints,1,2,1,13);
 for(const x of [2,6,12])segment(detailPoints,x,.7,x,1.4);
 for(const z of [2,6,9,13])segment(detailPoints,.7,z,1.4,z);
 segment(detailPoints,18,4,18,2);segment(detailPoints,18,2,17.7,2.5);segment(detailPoints,18,2,18.3,2.5);
 function lines(points,mat,parent){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));resources.push(g);const l=new T.LineSegments(g,mat);parent.add(l);return l;}
 const walls=lines(wallPoints,ink,group);lines(detailPoints,ink,marks);
 const grid=[];for(let i=0;i<=21;i++){segment(grid,i,0,i,21,.24);segment(grid,0,i,21,i,.24);}lines(grid,quiet,marks);
 const labels=[];
 function label(text,x,z,size=.4){
  const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d');ctx.font='24px monospace';ctx.fillStyle='#c3d5da';ctx.textAlign='center';ctx.fillText(text,256,39);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;resources.push(map);
  const geo=new T.PlaneGeometry(size*8,size);resources.push(geo);
  const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:T.DoubleSide});
  const mesh=new T.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.29,z);marks.add(mesh);labels.push(material);
 }
 for(const [name,x,z,w,d] of plan.rooms){
  label(name,x+w/2,z+d/2,.36);
  const geo=new T.BoxGeometry(w-.16,.035,d-.16);resources.push(geo);
  const mat=new T.MeshStandardMaterial({color:name==='GARDEN'?0x537856:name==='COVERED PARKING'?0x71878d:0xa9a48c,roughness:.9,transparent:true,opacity:0});
  const mesh=new T.Mesh(geo,mat);mesh.name='Zone_'+name.replaceAll(' ','_');mesh.position.set(x+w/2,.235,z+d/2);mesh.receiveShadow=true;floors.add(mesh);
 }
 label('10 000',7,.6,.38);label('11 000',.8,7,.3);label('N',18,1.5,.4);label('BALCONY ABOVE',7,14.6,.3);
 return {group,floors,update(p,entry){
  const rise=T.MathUtils.smoothstep(p,.4,.6);
  group.visible=p<.78;ink.opacity=.85*(1-T.MathUtils.smoothstep(p,.55,.78));quiet.opacity=.25*(1-T.MathUtils.smoothstep(p,.22,.5));
  walls.geometry.setDrawRange(0,Math.floor(wallPoints.length/6*entry)*2);
  marks.visible=entry>.65;labels.forEach(m=>m.opacity=1-T.MathUtils.smoothstep(p,.38,.59));
  floors.visible=p>.15;floors.children.forEach(o=>{o.material.opacity=T.MathUtils.smoothstep(p,.15,.29);});
 }};
}
