import {referencePlan,rebuildWalls} from './model.mjs';
const feet=n=>Number((Number(n)/.3048).toFixed(6));
export function houseFloorToPlan(house,index=0){
 const floor=house?.floors?.[index];
 if(!floor||!house.plot)throw Error('The selected project floor is unavailable.');
 const p=referencePlan(),depth=feet(house.plot.depthM);
 p.title=(house.projectName||'Project')+' — '+floor.name;p.source='form';p.reviewed=false;
 p.plot={width:feet(house.plot.widthM),depth,facing:house.plot.roadFacing||'North',roadSide:'front',
 setbacks:Object.fromEntries(['front','rear','left','right'].map(k=>[k,feet(house.plot.setbacks?.[k]||0)]))};
 const map=r=>({id:r.id,name:r.name,type:({pooja:'puja',circulation:'corridor',parking:'porch'}[r.type]||r.type),
 x:feet(r.x),y:depth-feet(r.y+r.depthM),width:feet(r.widthM),depth:feet(r.depthM)});
 p.rooms=floor.rooms.map(map);
 for(const s of floor.stairs||[])p.rooms.push(map({...s,name:'Stair / landing',type:'stairs'}));
 p.fixtures=[];p.walls=[];p.openings=[];
 p.warnings=['Imported from the saved project model. Room geometry is retained; studio wall and opening positions are editable proposals.','This is the selected floor only. Studio edits are browser drafts and do not replace the saved project BIM.'];
 rebuildWalls(p);return p;
}
