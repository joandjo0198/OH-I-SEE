import {test} from 'node:test';
import assert from 'node:assert/strict';
import {houseFloorToPlan} from '../../frontend/js/floorplan/project-plan.mjs';
import {validatePlan} from '../../frontend/js/floorplan/model.mjs';
test('project studio retains floor dimensions and converts front/rear coordinates',()=>{
 const house={projectName:'Darzlling',plot:{widthM:30.48,depthM:30.48,roadFacing:'North',setbacks:{front:3.048,rear:1.524,left:1.524,right:1.524}},floors:[{name:'Ground',rooms:[{id:'r',name:'Living',type:'living',x:3.048,y:3.048,widthM:6.096,depthM:6.096}],stairs:[]},{name:'First',rooms:[{id:'b',name:'Bedroom',type:'bedroom',x:3.048,y:6.096,widthM:3.048,depthM:3.048}],stairs:[]}]};
 const p=houseFloorToPlan(house,0);assert.equal(p.rooms[0].width,20);assert.equal(p.rooms[0].y,70);assert.equal(p.plot.setbacks.front,10);assert.equal(p.reviewed,false);assert.deepEqual(validatePlan(p).errors,[]);
 assert.equal(houseFloorToPlan(house,1).rooms[0].id,'b');assert.throws(()=>houseFloorToPlan(house,2));
});
