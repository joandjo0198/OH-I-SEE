// Presentation adapters reuse the existing controls and their event handlers.
export function mountPolishedStudio(){
 const $=id=>document.getElementById(id);document.body.classList.add('polished-studio');
 const tabs=document.querySelector('.ref-right-tabs'),form=$('room-form');
 const propertyButton=tabs.querySelector('[data-panel=properties]');
 const side=document.createElement('section');side.className='design-shortcuts';side.innerHTML='<h2>▧ &nbsp; Rooms & elements</h2>';
 const destinations=[['▧','Rooms',()=>{propertyButton.click();form.scrollIntoView({block:'nearest'});}],['▯','Doors',()=>prompt('Add a door')],['⊞','Windows',()=>prompt('Add a window')],['▱','Stairs',()=>prompt('Add inside staircase 3 x 12 ft')],['▰','Furniture',()=>tabs.querySelector('[data-panel=products]').click()],['◫','Materials',()=>tabs.querySelector('[data-panel=materials]').click()]];
 function prompt(value){const input=document.querySelector('[data-prompt]');input.value=value;input.dispatchEvent(new Event('input'));input.focus();input.scrollIntoView({block:'center',behavior:'smooth'});}
 for(const [icon,label,action]of destinations){const b=document.createElement('button');b.textContent=icon+'  '+label;b.onclick=action;side.append(b);}
 document.querySelector('.ref-plan-settings').prepend(side);
 const promptPanel=document.querySelector('.plan-prompt-panel'),examples=promptPanel.querySelector('[data-examples]');
 examples.previousElementSibling.textContent='✦  Quick example prompts';
 const icons=['▱','▱','🛏','🚪','🪟','✕','✕','⤢','⤡','▣','🪑','🪴','🛏','🛏'];
 [...examples.children].forEach((b,i)=>{const icon=document.createElement('span');icon.className='example-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[i];b.prepend(icon);});
 const dimensions=document.createElement('details');dimensions.className='prompt-dimensions';dimensions.innerHTML='<summary>Room dimensions & openings</summary>';
 const row=promptPanel.querySelector('[data-rotate]').parentElement,list=promptPanel.querySelector('[data-openings]');row.before(dimensions);dimensions.append(row,list);
 const toolbar=document.createElement('div');toolbar.className='drawing-tools';
 for(const [label,action]of [['↖ Select',()=>propertyButton.click()],['▯ Door',()=>prompt('Add a door')],['⊞ Window',()=>prompt('Add a window')],['▱ Stairs',()=>prompt('Add outside staircase 3 x 12 ft on right')],['＋ Room',()=>$('add-room').click()],['↶ Undo',()=>$('undo-edit').click()],['⌫ Delete room',()=>$('remove-room').click()]]){const b=document.createElement('button');b.textContent=label;b.onclick=action;toolbar.append(b);}
 const label=document.createElement('label');label.textContent='Zoom ';const zoom=document.createElement('select');zoom.setAttribute('aria-label','2D drawing zoom');for(const n of [100,125,150,200]){const o=document.createElement('option');o.value=n;o.textContent=n+'%';zoom.append(o);}zoom.onchange=()=>{const host=$('plan-host');host.style.width=zoom.value+'%';host.style.height=zoom.value+'%';};label.append(zoom);toolbar.append(label);
 document.querySelector('.canvas-wrap').before(toolbar);
 const observer=new MutationObserver(()=>{toolbar.hidden=$('plan-host').hidden;});observer.observe($('plan-host'),{attributes:true,attributeFilter:['hidden']});
}
