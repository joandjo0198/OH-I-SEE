// ============================================================
// OH I SEE — Design prompt bar (2D / 3D / BIM)
// ============================================================

const PROMPT_EXAMPLES = [
  'Add bedroom',
  'G+1 floor',
  'Add terrace',
  'Add pooja room',
  'Add a home office',
  'Premium finish',
  'Two bedrooms and two bathrooms',
];

export function mountBimPromptBar(container, projectId, onApplied, { project } = {}) {
  if (!container || !projectId) return;

  container.innerHTML = `
    <div class="bim-prompt-bar">
      <div class="bim-prompt-header">
        <span class="bim-prompt-title">Design changes (optional)</span>
        <span class="bim-prompt-hint">AI-assisted concept · one model for 2D, 3D &amp; BIM</span>
      </div>
      <div class="bim-prompt-row">
        <input
          type="text"
          class="bim-prompt-input"
          id="bim-design-prompt" maxlength="4000"
          placeholder="Leave blank to use saved client requirements, or describe a change"
          autocomplete="off"
        />
        <button type="button" class="pw-btn pw-btn-primary" id="bim-prompt-apply">Generate design</button>
      </div>
      <div class="bim-prompt-chips" id="bim-prompt-chips"></div>
      <div class="bim-prompt-status" id="bim-prompt-status" aria-live="polite"></div>
    </div>`;

  const input = container.querySelector('#bim-design-prompt');
  const applyBtn = container.querySelector('#bim-prompt-apply');
  const statusEl = container.querySelector('#bim-prompt-status');
  const chipsEl = container.querySelector('#bim-prompt-chips');

  const metadata = window.BimAPI?.getCachedBim(projectId)?.model?.metadata || {};
  const warnings = [...(metadata.designWarnings || []), ...(metadata.layoutWarnings || []), ...(metadata.programAudit?.issues || []), ...(metadata.blueprintAcceptance?.issues || [])].map(w=>/setbacks.*ignored/i.test(w)?'Saved Land & Site setbacks are enforced by the geometry engine.':w);
  const notice = document.createElement('p');
  notice.className = 'bim-prompt-hint';
  notice.textContent = 'Concept design: professional review is required before construction.';
  container.appendChild(notice);
  const report = document.createElement('details');
  report.className='bim-client-brief';
  const summary=document.createElement('summary');
  summary.textContent='Client requirements and design review'+(warnings.length?' — '+warnings.length+' notes':'');
  if(warnings.length){const alert=document.createElement('p');alert.className='bim-review-warning';alert.textContent='Review required: the concept includes proposed room sizes and unresolved preferences. Open the requirements report below before approving.';container.appendChild(alert);}
  report.appendChild(summary);
  const acceptance=metadata.blueprintAcceptance;
  if(acceptance){
    const quick=document.createElement('p');quick.className='bim-review-warning';quick.dataset.blueprintAcceptance='summary';
    quick.textContent='Blueprint not accepted: '+acceptance.areaBudget.actualSqFt+' / '+(acceptance.areaBudget.limitSqFt||'unspecified')+' sq.ft. '+(acceptance.vastu?'Preliminary Vastu '+acceptance.vastu.score+'/100. ':'')+acceptance.issues.length+' failed or unverified checks. Open the review below for details.';
    if(!acceptance.passed)container.appendChild(quick);
    const heading=document.createElement('h3');heading.textContent='Blueprint acceptance — '+(acceptance.passed?'passed':'NOT PASSED');report.appendChild(heading);
    const budget=document.createElement('p');budget.textContent='Built-up area: '+acceptance.areaBudget.actualSqFt+' sq.ft / '+(acceptance.areaBudget.limitSqFt||'unspecified')+' sq.ft limit.';report.appendChild(budget);
    if(acceptance.vastu){
      const text=document.createElement('p');text.textContent='Preliminary Vastu screen: '+(acceptance.vastu.score??'unverified')+'/100. '+(acceptance.mode==='strict'?'Strict threshold: 85. ':'')+'This is not a compliance certificate.';report.appendChild(text);
      const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;text-align:left';
      const head=document.createElement('tr');for(const label of ['Check','Points','Placement']){const th=document.createElement('th');th.textContent=label;head.appendChild(th);}table.appendChild(head);
      for(const row of acceptance.vastu.breakdown){const tr=document.createElement('tr');for(const value of [row.item,row.applicable?row.earned+' / '+row.weight:'Not applicable',(row.placements||[]).map(p=>p.name+': '+p.zone).join('; ')||(row.unverified?'Unverified':row.provisional?'Preliminary':'—')]){const td=document.createElement('td');td.style.padding='8px 4px';td.textContent=value;tr.appendChild(td);}table.appendChild(tr);}report.appendChild(table);
      const basis=document.createElement('p');basis.textContent=acceptance.vastu.basis;report.appendChild(basis);
    }
    for(const assumption of acceptance.assumptions||[]){const p=document.createElement('p');p.textContent=assumption;report.appendChild(p);}
  }
  const context=project?.construction_context||{};
  const inputs=metadata.clientBrief?.inputs || context.projectRequirements || context.intentAnswers || {};
  for(const warning of warnings){const item=document.createElement('p');item.className='bim-review-warning';item.textContent=warning;report.appendChild(item);}
  const help=document.createElement('a');help.href='intent-engine.html?intent=NEW_HOME&step=3&projectId='+encodeURIComponent(projectId);help.textContent='Edit client requirements';report.appendChild(help);
  const table=document.createElement('dl');
  for(const [key,value] of Object.entries(inputs)){
    if(value===null||value===undefined||value==='')continue;
    const term=document.createElement('dt');term.textContent=key.replaceAll('_',' ');
    const desc=document.createElement('dd');desc.textContent=typeof value==='object'?JSON.stringify(value):String(value);
    table.append(term,desc);
  }
  report.appendChild(table);
  const model=window.BimAPI?.getCachedBim(projectId)?.model;
  if(model){const heading=document.createElement('h3');heading.textContent='Rooms in this generated version';report.appendChild(heading);
    const list=document.createElement('ul');
    for(const room of model.elements.filter(e=>e.type==='Room')){const item=document.createElement('li');const area=room.quantity?.areaM2;item.textContent=room.name+(area?' — '+Math.round(area*10.7639)+' sq.ft':'');list.appendChild(item);}report.appendChild(list);
  }
  container.appendChild(report);

  chipsEl.innerHTML = PROMPT_EXAMPLES.map((text) => `
    <button type="button" class="bim-prompt-chip" data-prompt="${text}">${text}</button>
  `).join('');

  function setStatus(msg, type = '') {
    statusEl.textContent = msg || '';
    statusEl.className = `bim-prompt-status${type ? ` is-${type}` : ''}`;
  }

  async function applyPrompt(promptText) {
    const prompt = (promptText || input.value || '').trim();


    if(applyBtn.disabled)return;
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying…';
    setStatus('Regenerating floor plan and 3D model…', 'pending');

    try {
      const payload = prompt ? await window.BimAPI.modify(projectId, prompt, { project }) : await window.BimAPI.generate(projectId);
      const summary = payload.summary || payload.data?.modification?.summary || 'Design updated.';
      setStatus([summary,...(payload.data?.modification?.warnings||[]),payload.data?.warning].filter(Boolean).join(' '), 'success');
      input.value = '';
      if (typeof onApplied === 'function') {
        await onApplied(payload);
      }
    } catch (e) {
      setStatus([e.message || 'Could not apply design change.',...(e.details||[]).map(d=>d.message||String(d))].join(' '), 'error');
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = 'Generate design';
    }
  }

  applyBtn.addEventListener('click', () => applyPrompt());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyPrompt();
  });
  chipsEl.querySelectorAll('.bim-prompt-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.prompt || '';
      input.focus();
    });
  });
}
