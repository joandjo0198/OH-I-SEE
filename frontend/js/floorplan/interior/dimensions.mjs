import {byId} from './catalog.js';
export function fixtureSize(f){const size=f.props?.dimensions||byId[f.catalogId].size;return size.map(n=>n*(f.scale||1));}
export function resizeFixture(plan,f,dimensions){
 if(!Array.isArray(dimensions)||dimensions.length!==3||dimensions.some(n=>!Number.isFinite(n)||n<.05||n>50))throw Error('Enter dimensions between 0.05 and 50 feet.');
 const room=plan.rooms.find(r=>r.id===f.roomId),angle=f.rotation*Math.PI/180;
 const width=Math.abs(Math.cos(angle))*dimensions[0]+Math.abs(Math.sin(angle))*dimensions[2],depth=Math.abs(Math.sin(angle))*dimensions[0]+Math.abs(Math.cos(angle))*dimensions[2];
 if(f.mount==='floor'&&f.props?.installation!=='exterior'&&room&&(f.position.x-width/2<room.x-.001||f.position.x+width/2>room.x+room.width+.001||f.position.y-depth/2<room.y-.001||f.position.y+depth/2>room.y+room.depth+.001))throw Error('This size extends beyond the room. Move the product inward or choose a smaller size.');
 return {...f,scale:1,props:{...f.props,dimensions:[...dimensions]}};
}
