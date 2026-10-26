import {generateTemplateA,renderTemplateA,feet,escape} from './template-a-plan.mjs';
let plan;
function render(){
 plan=generateTemplateA({parking:document.getElementById('parking').value==='yes'});
 document.getElementById('drawing').innerHTML=renderTemplateA(plan);
 document.getElementById('rooms').innerHTML=`<table><thead><tr><th>Space</th><th>Bounds</th><th>Sq ft</th></tr></thead><tbody>${plan.tables.rooms.map(r=>`<tr><td>${escape(r.name)}</td><td>${feet(r.width)} × ${feet(r.depth)}</td><td>${r.area}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">Total allocation</td><td>${plan.tables.total}</td></tr></tfoot></table>`;
 document.getElementById('site').innerHTML=`<table><tbody>${plan.tables.site.map(([name,area])=>`<tr><td>${name}</td><td>${area} sq ft</td></tr>`).join('')}</tbody><tfoot><tr><td>Envelope + setbacks</td><td>${plan.tables.site[1][1]+plan.tables.site[2][1]} sq ft</td></tr></tfoot></table>`;
 const check=c=>`<div class="check ${c.status==='warning'?'warning':''}">${escape(c.text)}</div>`;
 const clearances=plan.checks.filter(c=>c.text.includes('door-swing clearance'));
 document.getElementById('checks').innerHTML=plan.checks.filter(c=>!c.text.includes('door-swing clearance')).map(check).join('')+`<details><summary>${clearances.length} furniture clearance constraints to review</summary>${clearances.map(check).join('')}</details>`;
}
document.getElementById('parking').addEventListener('change',render);
document.getElementById('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='template-a-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
render();
