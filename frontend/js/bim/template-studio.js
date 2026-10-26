import {generatePlan,feet,escape} from './template-planner.mjs';
import {renderPlan} from './template-renderer.mjs';
import {mountPlan3d} from './template-3d.js';
const $=id=>document.getElementById(id),projectId=new URLSearchParams(location.search).get('projectId');
let plan=null,dispose=null,revision=0,ready=!projectId;
const status=s=>$('status').textContent=s;
const token=()=>localStorage.getItem('ohisee_jwt')||localStorage.getItem('ohisee_token');
const endpoint=()=> (typeof resolveOhiseeApiBase==='function'?resolveOhiseeApiBase():'/api')+'/projects/'+encodeURIComponent(projectId)+'/bim/template';
if(projectId)$('back').href+='?projectId='+encodeURIComponent(projectId);
function options(){return {frontage:+$('frontage').value,depth:+$('depth').value,facing:$('facing').value,parking:$('parking').checked,stairs:$('stairs').checked,optionalRooms:['office','study'].filter(k=>$(k).checked),setbacks:Object.fromEntries(['front','rear','left','right'].map(k=>[k,+$(k).value]))};}
function draw(){
 dispose?.();dispose=null;$('three').hidden=true;$('drawing').hidden=false;
 try{
  plan=generatePlan(options());$('drawing').innerHTML=renderPlan(plan);
  $('title').textContent='Template '+plan.template+' · '+plan.facing+' · '+plan.tables.total.toFixed(2)+' sq ft';
  $('rooms').innerHTML='<table><tr><th>Space</th><th>Bounds</th><th>Sq ft</th></tr>'+plan.tables.rooms.map(r=>'<tr><td>'+escape(r.name)+'</td><td>'+feet(r.width)+' × '+feet(r.depth)+'</td><td>'+r.area.toFixed(2)+'</td></tr>').join('')+'<tr><th>Total</th><td></td><th>'+plan.tables.total.toFixed(2)+'</th></tr></table>';
  $('site').innerHTML='<table>'+[...plan.tables.site,...Object.entries(plan.quantities)].map(([k,v])=>'<tr><td>'+escape(k)+'</td><td>'+Number(v).toFixed(2)+'</td></tr>').join('')+'</table>';
  $('checks').innerHTML=[...plan.checks,...plan.adjustments.map(text=>({status:'warning',text}))].map(c=>'<div class="check '+(c.status==='warning'?'warning':'')+'">'+escape(c.text)+'</div>').join('');
  status('Generated concept. Review warnings and dimensions before saving.');
 }catch(e){plan=null;$('drawing').replaceChildren();$('rooms').replaceChildren();$('site').replaceChildren();$('checks').textContent=(e.details||[]).map(d=>d.room+': '+d.shortfallSqFt+' sq ft short; '+(d.widthShortfallInches||0)+' in width short. '+d.suggestion).join('\n');status(e.message);$('title').textContent='No feasible plan';}
 for(const id of ['download','svg','three-button'])$(id).disabled=!plan;
 $('save').disabled=!plan||!projectId||!ready;
}
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('form').addEventListener('submit',e=>{e.preventDefault();draw();});
$('two').onclick=()=>{dispose?.();dispose=null;$('three').hidden=true;$('drawing').hidden=false;};
$('three-button').onclick=()=>{if(!plan)return;dispose?.();$('drawing').hidden=true;$('three').hidden=false;try{dispose=mountPlan3d($('three'),plan);}catch{status('WebGL is unavailable. Use the 2D drawing.');$('two').click();}};
$('download').onclick=()=>plan&&download(JSON.stringify(plan,null,2),'application/json','floor-plan.json');
$('svg').onclick=()=>plan&&download(renderPlan(plan),'image/svg+xml','floor-plan.svg');
$('save').onclick=async()=>{if(!plan||!projectId)return;$('save').disabled=true;try{const r=await fetch(endpoint(),{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({options:plan.input,expectedRevision:revision})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Save failed');revision=data.data.revision;status('Project concept saved. The existing approved BIM version is preserved.');}catch(e){status(e.message);}finally{$('save').disabled=false;}};
draw();
if(projectId){(async()=>{try{const r=await fetch(endpoint(),{headers:{Authorization:'Bearer '+token()}});const data=await r.json();if(!r.ok)throw new Error(data.error||'Sign in to load this project.');ready=true;revision=data.data?.revision||0;const input=data.data?.plan?.input;if(input){for(const k of ['frontage','depth','facing'])$(k).value=input[k];for(const k of ['parking','stairs'])$(k).checked=input[k];for(const k of ['office','study'])$(k).checked=input.optionalRooms.includes(k);for(const k of ['front','rear','left','right'])$(k).value=input.setbacks[k];draw();}else $('save').disabled=!plan;}catch(e){status(e.message+' Download JSON to preserve your work.');}})();}
