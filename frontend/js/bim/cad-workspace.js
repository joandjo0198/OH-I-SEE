// The browser displays saved geometry; it does not regenerate room layouts.
export function mountCadWorkspace(container,project,plan) {
  let scale=1,svg='',disposed=false,request=0;
  container.replaceChildren();
  const heading=document.createElement('h2');heading.textContent='Project drawing set';container.append(heading);
  const note=document.createElement('p');note.textContent=plan.status;container.append(note);
  const toolbar=document.createElement('div');toolbar.className='fp-toolbar';toolbar.style.flexWrap='wrap';container.append(toolbar);
  function select(label,options) {const el=document.createElement('select');el.className='fp-select';el.setAttribute('aria-label',label);for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;el.append(option);}toolbar.append(el);return el;}
  const sheet=select('Drawing sheet',[['A-01','A-01 · Site'],['A-02','A-02 · Floor plan'],['A-03','A-03 · Furnished'],['A-04','A-04 · Schedules']]);sheet.value='A-02';
  const floor=select('Floor',plan.floors.map(f=>[String(f.index),f.index?`Floor ${f.index}`:'Ground floor']));
  const units=select('Dimensions',[['imperial','Feet / inches'],['mm','Millimetres']]);
  const status=document.createElement('p');status.setAttribute('role','status');
  const viewport=document.createElement('div');viewport.style.cssText='overflow:auto;width:100%;background:#dbe3eb;border:1px solid #71849a;min-height:240px;max-height:80vh;';
  const paper=document.createElement('div');paper.style.cssText='min-width:0;line-height:0;background:white;';viewport.append(paper);
  const layerbar=document.createElement('div');layerbar.className='fp-layers';
  const toggles=[];
  for(const name of ['site','walls','openings','labels','stairs','fixtures']){const label=document.createElement('label'),cb=document.createElement('input');cb.type='checkbox';cb.checked=true;cb.dataset.cadLayer=name;label.append(cb,document.createTextNode(` ${name}`));layerbar.append(label);toggles.push(cb);cb.addEventListener('change',()=>{paper.querySelectorAll(`[data-layer="${name}"]`).forEach(g=>g.style.display=cb.checked?'':'none');});}
  function button(label,callback){const b=document.createElement('button');b.type='button';b.className='pw-btn';b.textContent=label;b.onclick=()=>Promise.resolve(callback()).catch(e=>status.textContent=e.message);toolbar.append(b);return b;}
  function zoom(){paper.style.width=`${scale*100}%`;}
  button('Fit',()=>{scale=1;zoom();});button('+',()=>{scale=Math.min(5,scale*1.25);zoom();});button('−',()=>{scale=Math.max(.5,scale/1.25);zoom();});
  const base=typeof resolveOhiseeApiBase==='function'?resolveOhiseeApiBase():'/api';
  async function fetchDrawing(format) {
    const token=typeof TokenStore!=='undefined'?TokenStore.get():localStorage.getItem('ohisee_jwt')||localStorage.getItem('ohisee_token');
    const query=new URLSearchParams({format,sheet:sheet.value,floor:floor.value,units:units.value});
    const response=await fetch(`${base}/projects/${encodeURIComponent(project.project_id)}/bim/cad?${query}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error([error.error,...(error.details||[])].filter(Boolean).join('\n')||'Unable to load drawing.');}return response;
  }
  function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  for(const format of ['pdf','dxf'])button(format==='pdf'?'A3 PDF set':'DXF · selected floor',async()=>{save(await(await fetchDrawing(format)).blob(),`${project.project_id}-${floor.value}.${format}`);});
  button('PNG',async()=>{if(!svg)return;const blob=new Blob([new XMLSerializer().serializeToString(paper.querySelector('svg'))],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=3360;canvas.height=2376;canvas.getContext('2d').drawImage(img,0,0,3360,2376);const out=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(out)save(out,`${project.project_id}-${sheet.value}.png`);}finally{URL.revokeObjectURL(url);}});
  container.append(layerbar,status,viewport);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`Size adjustments (${plan.adjustments.length}) and review notes`;details.append(summary);
  const list=document.createElement('ul');for(const line of [...plan.adjustments.map(a=>`${a.name}: ${a.from.join(' × ')} → ${a.to.join(' × ')} mm. ${a.reason}.`),...plan.warnings]){const li=document.createElement('li');li.textContent=line;list.append(li);}details.append(list);container.append(details);
  async function load(){const id=++request;status.textContent='Loading drawing…';try{const source=await(await fetchDrawing('svg')).text();if(disposed||id!==request)return;svg=source;const doc=new DOMParser().parseFromString(svg,'image/svg+xml');if(doc.querySelector('parsererror'))throw new Error('Invalid drawing response.');const root=doc.documentElement;root.style.width='100%';root.style.height='auto';paper.replaceChildren(document.importNode(root,true));toggles.forEach(cb=>cb.dispatchEvent(new Event('change')));status.textContent='Dimensions shown as E–W × N–S. Scroll to inspect after zooming.';}catch(e){if(!disposed&&id===request)status.textContent=e.message;}}
  [sheet,floor,units].forEach(s=>s.addEventListener('change',load));load();return{dispose(){disposed=true;container.replaceChildren();}};
}
