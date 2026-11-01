import {byId} from './catalog.js';
export function fixtureSize(f){const size=f.props?.dimensions||byId[f.catalogId].size;return size.map(n=>n*(f.scale||1));}
export function resizeFixture(plan,f,dimensions){
 if(!Array.isArray(dimensions)||dimensions.length!==3||dimensions.some(n=>!Number.isFinite(n)||n<.05||n>50))throw Error('Enter dimensions between 0.05 and 50 feet.');
 const room=plan.rooms.find(r=>r.id===f.roomId),angle=f.rotation*Math.PI/180;
 const width=Math.abs(Math.cos(angle))*dimensions[0]+Math.abs(Math.sin(angle))*dimensions[2],depth=Math.abs(Math.sin(angle))*dimensions[0]+Math.abs(Math.cos(angle))*dimensions[2];
 if(f.mount==='floor'&&f.props?.installation!=='exterior'&&room&&(f.position.x-width/2<room.x-.001||f.position.x+width/2>room.x+room.width+.001||f.position.y-depth/2<room.y-.001||f.position.y+depth/2>room.y+room.depth+.001))throw Error('This size extends beyond the room. Move the product inward or choose a smaller size.');
 if(byId[f.catalogId].category==='Parking')parkingPosition(plan,{size:dimensions},f.position.x,f.position.y,f.rotation);
 return {...f,scale:1,props:{...f.props,dimensions:[...dimensions]}};
}

export function parkingPosition(plan,item,x,y,rotation=0){
 const angle=rotation*Math.PI/180,w=Math.abs(Math.cos(angle))*item.size[0]+Math.abs(Math.sin(angle))*item.size[2],d=Math.abs(Math.sin(angle))*item.size[0]+Math.abs(Math.cos(angle))*item.size[2];
 const left=x-w/2,right=x+w/2,top=y-d/2,bottom=y+d/2;
 if(left<0||right>plan.plot.width||top<0||bottom>plan.plot.depth)throw Error('Keep the full vehicle inside the plot.');
 if(plan.rooms.some(r=>!['sitout','parking','porch','garage'].includes(r.type)&&left<r.x+r.width&&right>r.x&&top<r.y+r.depth&&bottom>r.y))throw Error('Place the vehicle in clear outdoor parking space.');
 const room=plan.rooms.find(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.depth)||plan.rooms[0];
 return {roomId:room.id,position:{x,y,z:0},rotation};
}
export function resizeAtCursor(plan,f,point){
 const angle=f.rotation*Math.PI/180,dx=point.x-f.position.x,dy=point.y-f.position.y;
 const width=Math.max(.1,Math.abs(dx*Math.cos(angle)+dy*Math.sin(angle))*2),depth=Math.max(.1,Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle))*2);
 return resizeFixture(plan,f,[width,fixtureSize(f)[1],depth]);
}

// New drops may turn to fit a porch, but never shrink the real dimensions.
export function dropParking(plan,item,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>plan.plot.width||y>plan.plot.depth)throw Error('Drop the vehicle inside the plot or parking area.');
 const candidates=[];
 for(const rotation of [0,90]){
 const w=item.size[rotation===0?0:2],d=item.size[rotation===0?2:0];
 const areas=[{x:0,y:0,width:plan.plot.width,depth:plan.plot.depth},...plan.rooms.filter(r=>['sitout','parking','porch','garage'].includes(r.type)&&x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.depth)];
 for(const a of areas){if(w>a.width||d>a.depth)continue;const px=Math.max(a.x+w/2,Math.min(a.x+a.width-w/2,x)),py=Math.max(a.y+d/2,Math.min(a.y+a.depth-d/2,y));try{const result=parkingPosition(plan,item,px,py,rotation);candidates.push({result,distance:Math.hypot(px-x,py-y)});}catch{}}
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 if(!candidates.length)throw Error('This vehicle needs '+item.size[0]+' × '+item.size[2]+' ft of clear parking space. Drop it in a larger outdoor area.');
 return candidates[0].result;
}
