import {mountDesignEdits} from './design-edit-panel.mjs';
import {mountOpeningEditor} from './opening-editor.mjs';
import {mountReferenceShell} from './reference-shell.mjs';
import {mountRoofPanel} from './roof-panel.mjs';
import {roofConfig,roofEstimate} from './roofs.mjs';
import {mountInterior} from './interior/index.mjs';
import {validateFixtures} from './interior/fixture-model.mjs';
import {mountFinishPanel} from './finish-panel.mjs';
import {referencePlan,generatePlan,rebuildWalls,validatePlan,clone} from './model.mjs';
import {planSVG,esc,feet} from './plan-svg.mjs';
const projectId=new URLSearchParams(location.search).get('projectId');
const $=id=>document.getElementById(id);
let key=projectId?'ohisee_studio_'+projectId+'_0':'ohisee_floorplan_studio_v1';
let openingEditor,designEdits;
let plan=referencePlan(),selected=plan.rooms[0].id,viewer=null,image=null,busy=false,undo=[];
const notice=(message,error=false)=>{$('notice').textContent=message;$('notice').hidden=!message;$('notice').classList.toggle('error',error);};
const download=(data,name,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
const finishPanel=mountFinishPanel($('finish-panel'),{getPlan:()=>plan,getViewer:()=>viewer,save:()=>{interior.refresh();persist();$('json-editor').value=JSON.stringify(plan,null,2);},notify:notice});
$('open-finishes').onclick=()=>finishPanel.open();
function persist(){try{localStorage.setItem(key,JSON.stringify(plan));$('save-state').textContent='Draft saved in this browser · '+new Date().toLocaleTimeString();}catch{$('save-state').textContent='Browser storage is full. Export JSON to keep this plan.';}}
function dispose(){viewer?.dispose();viewer=null;finishPanel.sync();}
function show2D(){ $('final-tools').hidden=true;$('view-final').setAttribute('aria-pressed','false');interior.hide(); $('plan-host').hidden=false;$('model-host').hidden=true;$('model-tools').hidden=true;$('view-2d').setAttribute('aria-pressed','true');$('view-3d').setAttribute('aria-pressed','false');$('canvas-help').textContent='Drag a room to move it · Drag a wall to resize · Click a room to edit';}
function draw(preview=plan){ $('plan-host').innerHTML=planSVG(preview,{selected,image,overlay:$('show-overlay').checked,editable:true});$('print-plan').innerHTML=planSVG(plan); }
function inspector(){designEdits?.sync();const r=plan.rooms.find(r=>r.id===selected);if(!r)return;for(const k of ['name','width','depth','x','y'])$('room-'+k).value=r[k];$('known-width').value=r.width;$('room-list').innerHTML=plan.rooms.map(r=>`<button class="${r.id===selected?'selected':''}" data-select="${esc(r.id)}"><span>${esc(r.name)}</span><span>${feet(r.width)} × ${feet(r.depth)}</span></button>`).join('');}
function render(save=false){
 plan.fixtures ||= []; interior.sync();roofPanel.sync();openingEditor?.sync();
 selected=plan.rooms.some(r=>r.id===selected)?selected:plan.rooms[0].id;draw();inspector();
 const {errors,warnings}=validatePlan(plan);$('errors').innerHTML=errors.map(x=>`<li>${esc(x)}</li>`).join('');$('warnings').innerHTML=warnings.map(x=>`<li>${esc(x)}</li>`).join('');
 $('source-note').textContent=plan.source==='reference'?'Reference example · nominal dimensions':plan.source==='upload'?'Detected draft · verify scale and every opening':'Generated concept · review before conversion';
 $('plan-title').textContent=`${plan.plot.facing}-facing · ${(plan.plot.width*plan.plot.depth).toFixed(0)} sq.ft`;$('plan-count').textContent=`${plan.rooms.length} spaces · ${plan.openings.length} openings`;
 $('json-editor').value=JSON.stringify(plan,null,2);$('reviewed').checked=!!plan.reviewed;$('scale-controls').hidden=plan.source!=='upload';
 $('wall-height').value=plan.settings.wallHeight;$('external-wall').value=plan.settings.externalWall*12;$('internal-wall').value=plan.settings.internalWall*12;
 if(save)persist();
}
function changed(){interior.reset();plan.reviewed=false;dispose();show2D();render(true);}
const editableErrors=errors=>errors.every(e=>/overlaps |crosses a setback|extends outside the plot/.test(e));
function accept(candidate){roofConfig(candidate);const fixtureErrors=validateFixtures(candidate);if(fixtureErrors.length)throw Error(fixtureErrors.join(" "));const {errors}=validatePlan(candidate);if(errors.length&&!editableErrors(errors))throw Error(errors.join(' '));undo.push(clone(plan));if(undo.length>30)undo.shift();plan=candidate;changed();}
async function convert(){ $('final-tools').hidden=true;$('view-final').setAttribute('aria-pressed','false');if(busy)return;try{const {errors}=validatePlan(plan);if(errors.length)throw Error(errors.join(' '));if(plan.source==='upload'&&!plan.detection?.scaleVerified)throw Error('Calibrate and confirm the uploaded drawing’s scale first.');if(!plan.reviewed)throw Error('Review the dimensions and notes, then tick the review checkbox before conversion.');interior.hide();busy=true;$('convert').disabled=true;notice('Building your model…');const {createViewer}=await import('./viewer.mjs');dispose();$('plan-host').hidden=true;$('model-host').hidden=false;$('model-tools').hidden=false;viewer=createViewer($('model-host'),plan,{onSurfaceSelect:s=>finishPanel.select(s)});finishPanel.sync();viewer.selectSurface('floor:'+selected);interior.converted();$('view-2d').setAttribute('aria-pressed','false');$('view-3d').setAttribute('aria-pressed','true');$('canvas-help').textContent='Drag to orbit · Scroll to zoom · Walkthrough: WASD or arrows, drag to look';notice('3D model built from the reviewed plan. Exports use metres.');$('model-host').scrollIntoView({behavior:'smooth',block:'center'});}catch(e){notice(e.message,true);show2D();}finally{busy=false;$('convert').disabled=false;}}
for(const type of ['form','upload'])$('source-'+type).onclick=()=>{for(const t of ['form','upload']){$(t+'-pane').hidden=t!==type;$('source-'+t).setAttribute('aria-pressed',String(t===type));}};
$('plan-form').onsubmit=e=>{e.preventDefault();try{const form=e.currentTarget,input=Object.fromEntries(new FormData(form));for(const cb of form.querySelectorAll('[type=checkbox]'))input[cb.name]=cb.checked;accept(generatePlan(input));notice('2D concept generated. Review room sizes and access, then convert to 3D.');}catch(e){notice(e.message,true);}};
$('units').onchange=()=>{const factor=$('units').value==='m'?.3048:1/.3048;for(const id of ['width','depth','front','rear','left','right'])$(id).value=Number(($(id).value*factor).toFixed(6));const preferred=$('plan-form').elements.preferred;if(preferred.value.trim()){try{const sizes=JSON.parse(preferred.value);for(const values of Object.values(sizes))for(let i=0;i<values.length;i++)values[i]=Number((values[i]*factor).toFixed(6));preferred.value=JSON.stringify(sizes);}catch{notice('Preferred sizes could not be converted. Check their units.',true);}}updateArea();};
function updateArea(){const k=$('units').value==='m'?1/.3048:1,area=Number($('width').value)*Number($('depth').value)*k*k;$('plot-area').textContent=`Plot area: ${area.toLocaleString(undefined,{maximumFractionDigits:1})} sq.ft / ${(area*.092903).toFixed(1)} m²`;}
for(const id of ['width','depth'])$(id).addEventListener('input',updateArea);
$('load-reference').onclick=()=>{plan=referencePlan();image=null;changed();notice('Reference loaded. All stated room sizes are retained; review the interpretation notes.');};
$('restore').onclick=()=>{try{const raw=localStorage.getItem(key);if(!raw)throw Error('No saved studio draft in this browser.');accept(JSON.parse(raw));notice('Browser draft restored.');}catch(e){notice(e.message,true);}};
$('room-list').onclick=e=>{const b=e.target.closest('[data-select]');if(b){selected=b.dataset.select;draw();inspector();viewer?.selectSurface('floor:'+selected);}};
$('room-form').onsubmit=e=>{e.preventDefault();try{const next=clone(plan),r=next.rooms.find(r=>r.id===selected);r.name=$('room-name').value.trim();let geometryChanged=false;for(const k of ['x','y','width','depth']){const value=Number($('room-'+k).value);geometryChanged ||= value!==r[k];r[k]=value;}if(geometryChanged){const original=plan.rooms.find(v=>v.id===selected);for(const f of next.fixtures||[])if(f.roomId===selected){const dx=r.x-original.x,dy=r.y-original.y;f.position.x+=dx;f.position.y+=dy;if(f.props.points)for(const p of f.props.points){p.x+=dx;p.y+=dy;}}rebuildWalls(next);}accept(next);notice(geometryChanged?'Room updated. Openings were regenerated; review them before conversion.':'Room renamed.');}catch(e){notice(e.message,true);}};
$('apply-settings').onclick=()=>{try{const next=clone(plan);next.settings.wallHeight=Number($('wall-height').value);next.settings.externalWall=Number($('external-wall').value)/12;next.settings.internalWall=Number($('internal-wall').value)/12;accept(next);}catch(e){notice(e.message,true);}};
$('apply-json').onclick=()=>{try{if($('json-editor').value.length>2e6)throw Error('Plan JSON must be smaller than 2 MB.');accept(JSON.parse($('json-editor').value));notice('Plan JSON applied.');}catch(e){notice(e.message,true);}};
$('undo-edit').onclick=()=>{if(!undo.length){notice('No edit to undo.');return;}plan=undo.pop();changed();notice('Previous plan restored.');};
$('add-room').onclick=()=>{try{const next=clone(plan),id='room-'+crypto.randomUUID();next.rooms.push({id,name:'New room',type:'bedroom',x:next.plot.setbacks.left,y:next.plot.setbacks.rear,width:6,depth:6});rebuildWalls(next);accept(next);selected=id;render();notice('Room added. Move and resize it to resolve any overlap.');}catch(e){notice(e.message,true);}};
$('remove-room').onclick=()=>{try{if(plan.rooms.length===1)throw Error('Keep at least one room.');const next=clone(plan);next.rooms=next.rooms.filter(r=>r.id!==selected);next.fixtures=(next.fixtures||[]).filter(f=>f.roomId!==selected);rebuildWalls(next);accept(next);}catch(e){notice(e.message,true);}};
$('calibrate').onclick=()=>{try{const width=Number($('known-width').value),r=plan.rooms.find(r=>r.id===selected);if(!Number.isFinite(width)||width<1||width>300)throw Error('Enter a verified room width between 1 and 300 ft.');const factor=width/r.width,next=clone(plan);for(const k of ['width','depth'])next.plot[k]*=factor;for(const k of Object.keys(next.plot.setbacks))next.plot.setbacks[k]*=factor;for(const r of next.rooms)for(const k of ['x','y','width','depth'])r[k]*=factor;for(const w of next.walls)for(const k of ['at','start','end'])w[k]*=factor;for(const o of next.openings)for(const k of ['offset','width'])o[k]*=factor;for(const f of next.fixtures||[]){f.position.x*=factor;f.position.y*=factor;if(f.props.points)for(const p of f.props.points){p.x*=factor;p.y*=factor;}}if(next.gate){next.gate.offset*=factor;next.gate.width*=factor;}next.detection={...next.detection,scaleVerified:true,pixelsPerFoot:next.detection.pixelsPerFoot/factor};accept(next);notice('Scale calibrated. Review OCR dimensions, overlaps and missing rooms.');}catch(e){notice(e.message,true);}};
$('import-json').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2e6)throw Error('Plan JSON must be smaller than 2 MB.');accept(JSON.parse(await f.text()));notice('Plan imported.');}catch(e){notice(e.message,true);}e.target.value='';};
$('reviewed').onchange=e=>{plan.reviewed=e.target.checked;persist();};$('convert').onclick=convert;$('view-3d').onclick=convert;$('view-2d').onclick=show2D;
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>viewer?.setMode(b.dataset.camera));$('roof').onclick=()=>viewer?.toggleRoof();$('sun').oninput=e=>viewer?.setSun(Number(e.target.value));
$('show-overlay').onchange=()=>draw();
$('export-json').onclick=()=>download(JSON.stringify(plan,null,2),'ohisee-floor-plan.json','application/json');
$('export-pdf').onclick=()=>{ $('print-plan').innerHTML=planSVG(plan);window.print();};
for(const kind of ['glb','obj','png'])$('export-'+kind).onclick=async()=>{try{if(!viewer)throw Error('Convert the reviewed plan to 3D first.');if(kind==='png'){const a=document.createElement('a');a.href=viewer.png();a.download='ohisee-house.png';a.click();}else download(await viewer[kind](),'ohisee-house.'+kind,kind==='glb'?'model/gltf-binary':'text/plain');notice(kind.toUpperCase()+' exported.');}catch(e){notice(e.message,true);}};
// SVG pointer coordinates are independent of browser zoom and canvas scaling.
let drag=null;
const position=e=>{const svg=$('plan-host').querySelector('[data-plan-geometry]')||$('plan-svg');return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());};
$('plan-host').onpointerdown=e=>{const target=e.target.closest('[data-room],[data-wall]');if(!target)return;const point=position(e);drag={point,before:clone(plan),moved:false,room:target.dataset.room,wall:target.dataset.wall};if(drag.room){selected=drag.room;inspector();} $('plan-host').setPointerCapture(e.pointerId);};
$('plan-host').onpointermove=e=>{if(!drag)return;const point=position(e),dx=Math.round((point.x-drag.point.x)*4)/4,dy=Math.round((point.y-drag.point.y)*4)/4;if(!dx&&!dy&&!drag.moved)return;drag.moved=true;plan=clone(drag.before);
 if(drag.room){const r=plan.rooms.find(r=>r.id===drag.room);r.x+=dx;r.y+=dy;for(const f of plan.fixtures||[])if(f.roomId===r.id){f.position.x+=dx;f.position.y+=dy;if(f.props.points)for(const p of f.props.points){p.x+=dx;p.y+=dy;}}}else{const w=plan.walls.find(w=>w.id===drag.wall);for(const id of w.owners||[]){const r=plan.rooms.find(r=>r.id===id);if(!r)continue;if(w.axis==='h'){if(Math.abs(r.y-w.at)<.01){r.y+=dy;r.depth-=dy;}else r.depth+=dy;}else{if(Math.abs(r.x-w.at)<.01){r.x+=dx;r.width-=dx;}else r.width+=dx;}}}
 rebuildWalls(plan);draw();};
const finish=()=>{if(!drag)return;if(!drag.moved){drag=null;draw();return;}const result=validatePlan(plan);if(result.errors.length&&!editableErrors(result.errors)){plan=drag.before;notice('Change reverted: '+result.errors.join(' '),true);}else{undo.push(drag.before);notice(result.errors.length?'Layout updated. Resolve the highlighted geometry errors before conversion.':'Layout updated. Review regenerated openings.',!!result.errors.length);}drag=null;changed();};$('plan-host').onpointerup=finish;$('plan-host').onpointercancel=()=>{if(drag){plan=drag.before;drag=null;draw();}};
$('detect').onclick=async()=>{const file=$('plan-file').files[0];if(!file){notice('Choose a PNG, JPG or PDF first.',true);return;}if(file.size>6*1024*1024){notice('Choose a file no larger than 6 MB.',true);return;}$('detect').disabled=true;$('detect-status').textContent='Preprocessing, detecting wall lines and reading labels…';try{const data=new FormData();data.append('plan',file);data.append('page',$('pdf-page').value);const response=await fetch('/api/floorplan/detect',{method:'POST',body:data,signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Detection failed.');
 image=result.preview;$('detect-preview').src=image;$('detect-preview').hidden=false;$('ocr-text').textContent=result.ocr.map(t=>`${Math.round(t.confidence*100)}%  ${t.text}`).join('\n');
 const next=result.plan;if(!next){$('detect-status').textContent=result.message||'No enclosed rooms detected. Try a sharper drawing.';notice($('detect-status').textContent,true);return;}
 // Retain invalid detected geometry for correction, but never convert it until validated.
 plan=next;plan.reviewed=false;selected=plan.rooms[0]?.id;dispose();show2D();render(true);$('show-overlay').checked=true;draw();$('detect-status').textContent=`Detected ${plan.rooms.length} spaces and ${result.ocr.length} text regions. ${result.scaleNote}`;notice('Detection complete. Correct room labels, dimensions and openings; confirm the scale in plan JSON.');
 }catch(e){$('detect-status').textContent=e.message;notice(e.message,true);}finally{$('detect').disabled=false;}};
const interior=mountInterior({getPlan:()=>plan,getViewer:()=>viewer,onChange:()=>{draw();viewer?.refreshFixtures();persist();$('json-editor').value=JSON.stringify(plan,null,2);},notify:notice,download});

async function finalHome(){await convert();if(!viewer)return;viewer.setMode('final');$('final-tools').hidden=false;$('view-final').setAttribute('aria-pressed','true');$('view-3d').setAttribute('aria-pressed','false');const e=roofEstimate(plan);$('final-summary').textContent=`${(plan.fixtures||[]).length} placed items · ${e.surface.toFixed(0)} sq.ft roof`+(e.quoted?` · ₹${e.total.toLocaleString('en-IN',{maximumFractionDigits:0})} materials`:' · roof rate not entered');notice('Final Home ready. Exterior, furnished cutaway and room interiors share your saved products.');}
const roofPanel=mountRoofPanel($('roof-panel'),{getPlan:()=>plan,save:()=>{draw();persist();$('json-editor').value=JSON.stringify(plan,null,2);},preview:finalHome,notify:notice});
$('view-final').onclick=finalHome;
document.querySelectorAll('[data-final-camera]').forEach(b=>b.onclick=()=>viewer?.setMode(b.dataset.finalCamera));
$('final-interior').onclick=()=>{$('final-tools').hidden=true;$('view-final').setAttribute('aria-pressed','false');$('final-room-preview').click();};
$('final-png').onclick=()=>{if(!viewer)return;const src=viewer.png(),a=document.createElement('a');a.href=src;a.download='ohisee-final-home.png';a.click();let section=$('home-export-preview');if(!section){section=document.createElement('details');section.id='home-export-preview';section.className='interior-export-preview';document.querySelector('.workspace').append(section);}section.replaceChildren();const title=document.createElement('summary');title.textContent='Latest Final Home export';const img=document.createElement('img');img.alt='Final Home rendered preview';img.src=src;section.append(title,img);section.open=true;};

window.addEventListener('pagehide',()=>{interior.hide();dispose();});render();

mountReferenceShell({getPlan:()=>plan,getViewer:()=>viewer,notify:notice});
designEdits=mountDesignEdits({getPlan:()=>plan,getSelected:()=>selected,apply:accept,draw,notify:notice});
openingEditor=mountOpeningEditor({getPlan:()=>plan,apply:accept,notify:notice});

// Project-linked studio: keep each floor's editable draft separate from the reference demo.
if(projectId){
 const bar=document.createElement('div');bar.className='panel';bar.style.cssText='margin:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
 const label=document.createElement('strong');label.textContent=projectId+' · Project studio';
 const floors=document.createElement('select');floors.setAttribute('aria-label','Project floor');
 const regenerate=document.createElement('button');regenerate.textContent='Generate from saved project requirements';
 const back=document.createElement('a');back.textContent='← Project floor plan';back.href='project-floor-plan.html?projectId='+encodeURIComponent(projectId);
 const info=document.createElement('span');info.textContent='Studio edits save per floor in this browser; export JSON to keep a copy.';
 bar.append(label,floors,regenerate,back,info);document.querySelector('main').before(bar);
 let house;
 async function loadProjectStudio(regenerateModel=false){
  regenerate.disabled=true;
  try{
   notice(regenerateModel?'Generating from saved project requirements…':'Loading saved project floors…');
   if(regenerateModel)await BimAPI.generate(projectId);
   const result=await BimAPI.getModel(projectId);house=result.data?.model?.metadata?.houseModel;
   if(!house?.floors?.length)throw Error('No saved model yet. Use Generate from saved project requirements.');
   floors.replaceChildren(...house.floors.map((f,i)=>{const o=document.createElement('option');o.value=i;o.textContent=f.name;return o;}));
   label.textContent=(house.projectName||projectId)+' · Project studio';
   await selectFloor(0,regenerateModel);
  }catch(e){notice(e.message,true);}finally{regenerate.disabled=false;}
 }
 async function selectFloor(index,fresh=false){
  const {houseFloorToPlan}=await import('./project-plan.mjs');
  key='ohisee_studio_'+projectId+'_'+index;
  let next=houseFloorToPlan(house,index);
  if(!fresh){try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&validatePlan(saved).errors.length===0)next=saved;}catch{}}
  accept(next);
  $('units').value='ft';$('width').value=plan.plot.width;$('depth').value=plan.plot.depth;$('facing').value=plan.plot.facing;$('roadSide').value=plan.plot.roadSide;
  for(const side of ['front','rear','left','right'])$(side).value=plan.plot.setbacks[side];
  const form=$('plan-form');
  for(const [field,type] of [['bedrooms','bedroom'],['common','bathroom'],['dressing','dressing']])form.elements[field].value=plan.rooms.filter(r=>r.type===type).length;
  form.elements.attached.value=0;
  for(const input of form.querySelectorAll('[type=checkbox]'))input.checked=plan.rooms.some(r=>r.type===input.name);
  updateArea();notice('Project floor loaded. Edit or generate a 2D draft here, review dimensions, then choose 3D Design. Openings in the studio are proposed and need review.');
 }
 floors.onchange=()=>selectFloor(Number(floors.value));
 regenerate.onclick=()=>loadProjectStudio(true);
 loadProjectStudio();
}
