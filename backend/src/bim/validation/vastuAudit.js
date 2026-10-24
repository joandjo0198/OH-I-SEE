'use strict';
const {zoneAt,preferred}=require('../../../../frontend/js/planning/vastuRules');
function auditVastu(house) {
 const facing=house.plot?.roadFacing;
 if(!['North','South','East','West'].includes(facing))return {compliant:false,issues:['Cardinal road facing is required for Vastu assessment.'],rooms:[]};
 const issues=[],rooms=[];
 for(const floor of house.floors||[]) {
  const b=floor.footprint;
  for(const room of floor.rooms||[]) {
   // Existing canonical geometry uses a front-at-top coordinate system.
   const x=room.x+room.widthM/2-b.x,y=b.depthM-(room.y+room.depthM/2-b.y);
   const zone=zoneAt(x,y,b.widthM,b.depthM,facing);
   const type=/master/i.test(room.name)?'master':/drawing/i.test(room.name)?'drawing':room.type;
   const allowed=preferred[type];
   const matches=!allowed || allowed.includes(zone);
   rooms.push({id:room.id,name:room.name,zone,preferredZones:allowed||[],matches});
   if(!matches)issues.push(`${room.name} is in ${zone}; preferred ${allowed.join('/')}.`);
  }
 }
 return {compliant:issues.length===0,issues,rooms};
}
module.exports={auditVastu};
