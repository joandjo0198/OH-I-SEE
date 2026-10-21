import { newRecord, nextLayerStart, depthError } from './form-model.mjs';
const modal = document.querySelector('#soil-dialog');
const $ = selector => selector === '#soil-dialog' ? modal : modal.querySelector(selector) || document.querySelector(selector);
let modalSession = 0, opener, unlockScroll = () => {};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const paths = { investigations: 'investigation', boreholes: 'boreholes', layers: 'layers', samples: 'samples' };
const names = { investigations: 'Investigations', boreholes: 'Boreholes', layers: 'Borehole layers', samples: 'Soil samples' };
const singular = { investigations: 'investigation', boreholes: 'borehole', layers: 'layer', samples: 'sample' };
let projectId, overview, tab = 'investigations', page = 1, search = '', busy = false, requestNumber = 0, debounce;
let rows = [];
async function api(path = '', options = {}) {
  const response = await fetch(`${resolveOhiseeApiBase()}/projects/${encodeURIComponent(projectId)}/soil${path}`, { ...options, headers: { Authorization: `Bearer ${TokenStore.get()}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, signal: AbortSignal.timeout(20000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}). Please retry.`);
  return result;
}
function message(text, error = false, target = '#soil-message') {
  const node = $(target);
  if (!node) return;
  node.textContent = text;
  node.className = `soil-alert${error ? ' error' : ''}`;
  node.hidden = !text;
}
function setBusy(value) {
  busy = value;
  [...document.querySelectorAll('[data-write], #soil-refresh'), ...modal.querySelectorAll('button')].forEach(button => { button.disabled = value; });
  if ($('#soil-submit')) { const button = $('#soil-submit'); button.dataset.label ||= button.textContent; button.textContent = value ? 'Saving…' : button.dataset.label; }
}
function shell() {
  const p = overview.project, s = overview.summary;
  $('#pw-header-id').textContent = p.projectId;
  $('#pw-header-name').textContent = p.name;
  const groundwater = s.groundwater ? `${s.groundwater.min}${s.groundwater.max !== s.groundwater.min ? '–' + s.groundwater.max : ''} m` : 'Not recorded';
  const cards = [['Investigation status', overview.status], ['Boreholes', s.boreholes], ['Soil samples', s.samples], ['SPT tests', 'Not recorded'], ['Laboratory tests', 'Not recorded'], ['Groundwater depth', groundwater], ['Geotechnical report', s.reportStatus]];
  $('#pw-content').innerHTML = `<dl class="soil-meta">${[['Project ID', p.projectId], ['Site location', p.location || 'Not recorded'], ['Building type', p.buildingType || 'Not recorded'], ['Floors', p.floors ?? 'Not recorded'], ['Plot area', p.plotArea || 'Not recorded']].map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
    <div class="soil-note">${escape(overview.disclaimer)}<br>This workspace captures field records. Soil descriptions and raw SPT entries are recorded observations, not calculated classifications or validated test results.</div>
    <div id="soil-message" role="status" hidden></div>
    <div class="soil-summary">${cards.map(([label, value]) => `<section class="pw-stat-card"><div class="pw-stat-label">${label}</div><div class="pw-stat-value">${escape(value)}</div></section>`).join('')}</div>
    <div class="soil-progress" aria-label="Soil data collection progress"><span>${s.investigations ? '✓' : '○'} Investigation recorded</span><span>${s.boreholes ? '✓' : '○'} Boreholes recorded</span><span>${s.layers ? '✓' : '○'} Layers recorded</span><span>${s.samples ? '✓' : '○'} Samples recorded</span><span>Engineer review: not performed</span></div>
    <div class="soil-tabs" aria-label="Soil record sections">${Object.entries(names).map(([key, name]) => `<button class="pw-btn" data-tab="${key}" aria-pressed="${tab === key}">${name}</button>`).join('')}</div>
    <section class="pw-stat-card"><div class="soil-toolbar"><h2 id="soil-section-title">${names[tab]}</h2><button class="pw-btn pw-btn-primary" id="soil-add" data-write>Add ${singular[tab]}</button></div><div class="soil-toolbar"><input id="soil-search" type="search" aria-label="Search records" placeholder="Search IDs, locations or descriptions" value="${escape(search)}"><span class="soil-muted">Revision ${overview.revision} · Recorded data, not engineering approval</span></div><div id="soil-records" aria-live="polite"><p class="soil-empty">Loading records…</p></div></section>
    <p class="soil-muted">SPT tests, laboratory results, document uploads and engineering calculations are not available in this workspace yet. Groundwater shown here is the observation recorded on each borehole, measured below local ground level.</p>`;
  document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => { tab = button.dataset.tab; page = 1; search = ''; shell(); loadRows(); });
  $('#soil-add').onclick = () => openForm();
  $('#soil-search').oninput = event => { search = event.target.value; page = 1; clearTimeout(debounce); debounce = setTimeout(loadRows, 250); };
}
const columns = {
  investigations: [['id', 'ID'], ['type', 'Type'], ['agency', 'Agency'], ['investigationDate', 'Date'], ['method', 'Method']],
  boreholes: [['id', 'ID'], ['location', 'Location'], ['depth', 'Depth (m)'], ['groundwaterDepth', 'Groundwater (m)'], ['sampleCount', 'Samples'], ['layerCount', 'Layers'], ['status', 'Fieldwork']],
  layers: [['id', 'ID'], ['boreholeId', 'Borehole'], ['depthFrom', 'From (m)'], ['depthTo', 'To (m)'], ['description', 'Description'], ['sptN', 'Raw SPT N (blows)']],
  samples: [['id', 'ID'], ['boreholeId', 'Borehole'], ['depth', 'Depth (m)'], ['type', 'Type'], ['laboratory', 'Laboratory'], ['testStatus', 'Test status']]
};
async function loadRows() {
  const request = ++requestNumber, selectedTab = tab;
  try {
    const result = await api(`/${paths[tab]}?${new URLSearchParams({ page, pageSize: 15, search })}`);
    if (request !== requestNumber || selectedTab !== tab) return;
    // A changed server revision must be refreshed before edits; do not silently overwrite a stale form.
    rows = result.data;
    const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
    if (page > totalPages) { page = totalPages; return loadRows(); }
    $('#soil-records').innerHTML = rows.length ? `<div class="soil-table-wrap"><table><thead><tr>${columns[tab].map(([, label]) => `<th scope="col">${label}</th>`).join('')}<th scope="col">Actions</th></tr></thead><tbody>${rows.map(row => `<tr>${columns[tab].map(([key]) => `<td>${escape(row[key] ?? '—') || '—'}</td>`).join('')}<td><div class="soil-actions"><button class="pw-btn" data-view="${escape(row.id)}">View</button><button class="pw-btn" data-edit="${escape(row.id)}" data-write>Edit</button>${tab === 'boreholes' ? `<button class="pw-btn" data-log="${escape(row.id)}">View log</button>` : ''}<button class="pw-btn" data-delete="${escape(row.id)}" data-write>Delete</button></div></td></tr>`).join('')}</tbody></table></div>` : `<p class="soil-empty">${search ? 'No matching records.' : `No ${names[tab].toLowerCase()} yet. Add a ${singular[tab]} to start recording site data.`}</p>`;
    $('#soil-records').insertAdjacentHTML('beforeend', `<div class="soil-pagination"><span>${result.total} records · Page ${page} of ${totalPages}</span><button class="pw-btn" id="soil-prev" ${page === 1 ? 'disabled' : ''}>Previous</button><button class="pw-btn" id="soil-next" ${page === totalPages ? 'disabled' : ''}>Next</button></div>`);
    $('#soil-prev').onclick = () => { page--; loadRows(); };
    $('#soil-next').onclick = () => { page++; loadRows(); };
    document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openForm(rows.find(row => row.id === button.dataset.edit)));
    document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => openForm(rows.find(row => row.id === button.dataset.view), true));
    document.querySelectorAll('[data-log]').forEach(button => button.onclick = () => showLog(button.dataset.log));
    document.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => confirmDelete(button.dataset.delete));
    if (result.revision !== overview.revision) message('Soil data changed in another session. Refresh before editing.', true);
  } catch (error) {
    if (request !== requestNumber) return;
    $('#soil-records').innerHTML = '<p class="soil-empty">Records could not be loaded. Use Refresh data to retry.</p>';
    message(error.message, true);
  }
}
function dialog(title, content) {
  if (!modal.open) {
    opener = document.activeElement;
    let host = document;
    try { if (window.parent !== window && window.parent.location.origin === location.origin) host = window.parent.document; } catch {}
    if (host !== document) {
      if (!host.querySelector('[data-soil-dialog-styles]')) {
        const css = host.createElement('link');
        css.rel = 'stylesheet'; css.href = new URL('../../css/soil-geotechnical.css', import.meta.url).href;
        css.dataset.soilDialogStyles = ''; host.head.append(css);
      }
      host.body.append(modal);
    }
    const overflow = host.documentElement.style.overflow;
    host.documentElement.style.overflow = 'hidden';
    unlockScroll = () => { host.documentElement.style.overflow = overflow; };
  }
  modal.innerHTML = `<header class="soil-dialog-header"><div><span class="soil-eyebrow">Soil & geotechnical</span><h2 id="soil-dialog-title" tabindex="-1">${escape(title)}</h2></div><button type="button" class="soil-icon-button" id="soil-close" aria-label="Close dialog">×</button></header><div class="soil-dialog-body">${content}</div><footer class="soil-dialog-footer"><button type="button" class="pw-btn" id="soil-cancel">Close</button></footer>`;
  $('#soil-close').onclick = $('#soil-cancel').onclick = () => { if (!busy) modal.close(); };
  if (!modal.open) modal.showModal();
  $('#soil-dialog-title').focus();
}
modal.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
modal.addEventListener('close', () => {
  modalSession++;
  unlockScroll();
  document.body.append(modal);
  opener?.focus({ preventScroll: true });
});
window.addEventListener('pagehide', () => { modal.close(); unlockScroll(); modal.remove(); });
function inputField(field, record, readOnly, editing = false) {
  const value = record?.[field.key] ?? '';
  const disabled = readOnly || (editing && field.key === 'id');
  let options = field.options;
  if (field.type === 'investigation') options = overview.lookups.investigations.map(row => ({ value: row.id, label: row.id }));
  if (field.type === 'borehole') options = overview.lookups.boreholes.map(row => ({ value: row.id, label: `${row.id} · ${row.depth} m deep` }));
  if (field.key === 'sampleId') options = value ? [value] : [];
  const attrs = `id="soil-field-${field.key}" name="${field.key}" ${disabled ? 'disabled' : ''} ${field.required ? 'required' : ''}`;
  const control = options ? `<select ${attrs}><option value="">${field.required ? 'Choose ' + field.label.toLowerCase() : 'None / not recorded'}</option>${options.map(option => { const id = option.value ?? option; return `<option value="${escape(id)}" ${id === value ? 'selected' : ''}>${escape(option.label ?? option)}</option>`; }).join('')}</select>` : ['remarks', 'description'].includes(field.key) ? `<textarea ${attrs} rows="${field.key === 'description' ? 2 : 3}" maxlength="${field.key === 'remarks' ? 2000 : 250}">${escape(value)}</textarea>` : `<input ${attrs} type="${field.type}" value="${escape(value)}" ${field.type === 'number' ? `step="${['plannedBoreholes', 'sptN'].includes(field.key) ? '1' : 'any'}" min="${field.min}" max="${field.max}" placeholder="Enter measured value"` : 'maxlength="250"'}>`;
  return `<label class="${['remarks', 'description'].includes(field.key) ? 'wide' : ''}" for="soil-field-${field.key}"><span>${escape(field.label)}${field.required ? ' <span class="soil-required">*</span>' : ''}</span>${control}${field.key === 'id' && !editing && !readOnly ? '<small>Generated automatically. You can use your own unique reference.</small>' : ''}</label>`;
}
async function openForm(record, readOnly = false) {
  if (busy) return;
  const kind = tab, session = ++modalSession;
  const title = `${readOnly ? 'View' : record ? 'Edit' : 'Add'} ${singular[kind]}`;
  dialog(title, '<p class="soil-muted" role="status">Fetching saved project data…</p>');
  try {
    const fresh = await api();
    if (session !== modalSession || !modal.open) return;
    overview = fresh;
    if (record) {
      const result = await api('/' + paths[kind] + '/' + encodeURIComponent(record.id));
      if (session !== modalSession || !modal.open) return;
      if (result.revision !== fresh.revision) throw new Error('Project data changed while loading. Close and reopen this form to get the latest records.');
      record = result.data;
    }
  } catch (error) {
    if (session !== modalSession || !modal.open) return;
    dialog(title, '<div class="soil-alert error" role="alert">' + escape(error.message) + '</div><button class="pw-btn" id="soil-retry">Retry loading</button>');
    $('#soil-retry').onclick = () => openForm(record, readOnly);
    return;
  }
  const revision = overview.revision;
  if (!record && ((kind === 'boreholes' && !overview.lookups.investigations.length) || (['layers', 'samples'].includes(kind) && !overview.lookups.boreholes.length))) {
    const required = kind === 'boreholes' ? 'investigations' : 'boreholes';
    dialog(title, '<p class="soil-muted">First add a ' + singular[required] + ' so this record can be linked to your project.</p><button class="pw-btn pw-btn-primary" id="soil-prerequisite">Add ' + singular[required] + '</button>');
    $('#soil-prerequisite').onclick = () => { tab = required; shell(); loadRows(); openForm(); };
    return;
  }
  const defaults = record || newRecord(kind, overview);
  const fields = overview.schema[kind];
  const primary = fields.filter(field => field.required), optional = fields.filter(field => !field.required);
  dialog(title, `<div class="soil-form-context"><strong>${escape(overview.project.name || projectId)}</strong><span>${escape(projectId)} · ${escape(overview.project.location || 'Site location not recorded')}</span></div><p class="soil-muted">${readOnly ? 'Saved record' : record ? 'Update the saved record below.' : 'Available project details are filled in automatically.'} · Required fields are marked *</p><form id="soil-form" autocomplete="off"><div id="soil-form-error" role="alert" hidden></div><div class="soil-form-grid">${primary.map(field => inputField(field, defaults, readOnly, !!record)).join('')}</div><div id="soil-source-context" class="soil-source-context" role="status" hidden></div>${optional.length ? `<details class="soil-optional" ${readOnly || record ? 'open' : ''}><summary>Additional observations <span>${optional.length} optional fields</span></summary><div class="soil-form-grid">${optional.map(field => inputField(field, defaults, readOnly, !!record)).join('')}</div></details>` : ''}</form>`);
  modal.querySelector('.soil-dialog-footer').innerHTML = `<span class="soil-muted">${readOnly ? 'Record V' + record.version + ' · ' + escape(record.reviewStatus) : 'Review autofilled values before saving.'}</span><button type="button" class="pw-btn" id="soil-cancel">${readOnly ? 'Close' : 'Cancel'}</button>${readOnly ? '' : '<button type="submit" form="soil-form" class="pw-btn pw-btn-primary" id="soil-submit">Save ' + singular[kind] + '</button>'}`;
  $('#soil-cancel').onclick = () => { if (!busy) modal.close(); };
  if (readOnly) return;
  let detail = null, pending = false, relatedRequest = 0;
  const touched = new Set();
  $('#soil-form').addEventListener('input', event => { touched.add(event.target.name); message('', false, '#soil-form-error'); });
  const fill = (key, value) => { const field = $('#soil-field-' + key); if (field && !record && !touched.has(key)) field.value = value ?? ''; };
  const sampleOptions = () => {
    const select = $('#soil-field-sampleId');
    if (!select || !detail) return;
    const selected = select.value;
    select.innerHTML = '<option value="">None / not recorded</option>' + detail.samples.map(sample => '<option value="' + escape(sample.id) + '">' + escape(sample.id) + ' · ' + sample.depth + ' m · ' + escape(sample.type) + '</option>').join('');
    if (selected && !detail.samples.some(sample => sample.id === selected)) select.insertAdjacentHTML('beforeend', '<option value="' + escape(selected) + '">' + escape(selected) + ' · unavailable for this borehole</option>');
    select.value = selected;
  };
  async function fetchRelated() {
    const selector = $('#soil-field-boreholeId') || $('#soil-field-investigationId');
    if (!selector) return;
    const request = ++relatedRequest;
    detail = null;
    pending = !!selector.value;
    $('#soil-submit').disabled = pending;
    const context = $('#soil-source-context');
    context.hidden = false;
    context.textContent = pending ? 'Fetching saved details…' : 'Choose a saved record to load its details automatically.';
    if (!pending) return;
    try {
      const isBorehole = selector.name === 'boreholeId';
      const result = await api('/' + (isBorehole ? 'boreholes' : 'investigation') + '/' + encodeURIComponent(selector.value));
      if (session !== modalSession || request !== relatedRequest || !modal.open) return;
      if (result.revision !== revision) throw new Error('Soil data changed. Close and reopen this form before saving.');
      if (isBorehole) {
        detail = result;
        const hole = result.data;
        fill('depthFrom', nextLayerStart(result.layers, hole.depth));
        for (const key of ['depthFrom', 'depthTo', 'depth']) { const input = $('#soil-field-' + key); if (input) input.max = hole.depth; }
        sampleOptions();
        context.textContent = hole.id + ' · ' + (hole.location || 'Location not recorded') + ' · ' + hole.depth + ' m deep. ' + (result.layers.length ? 'Recorded intervals: ' + result.layers.map(layer => layer.depthFrom + '–' + layer.depthTo + ' m').join(', ') + '.' : 'No layers recorded yet.') + (hole.groundwaterDepth != null ? ' Observed groundwater: ' + hole.groundwaterDepth + ' m below ground.' : '') + ' Enter measured depths in metres.';
      } else {
        fill('location', result.data.location || overview.project.location);
        context.textContent = 'Site location loaded from ' + result.data.id + '. Refine it to identify the actual borehole position.';
      }
      pending = false;
      $('#soil-submit').disabled = false;
    } catch (error) {
      if (session !== modalSession || request !== relatedRequest || !modal.open) return;
      context.innerHTML = '<span>' + escape(error.message) + '</span> <button type="button" class="pw-btn" id="soil-related-retry">Retry</button>';
      $('#soil-related-retry').onclick = fetchRelated;
    }
  }
  const relation = $('#soil-field-boreholeId') || $('#soil-field-investigationId');
  if (relation) { relation.onchange = fetchRelated; fetchRelated(); }
  if ($('#soil-field-sampleId')) $('#soil-field-sampleId').onchange = event => {
    const sample = detail?.samples.find(item => item.id === event.target.value);
    fill('sampleType', sample?.type || '');
  };
  $('#soil-form').onsubmit = async event => {
    event.preventDefault();
    if (busy || pending) return;
    const data = new FormData(event.target), values = {};
    for (const field of overview.schema[kind]) {
      const value = record && field.key === 'id' ? record.id : data.get(field.key);
      values[field.key] = field.type === 'number' ? value === '' ? null : Number(value) : value;
    }
    const invalid = depthError(kind, values, detail, record?.id);
    if (invalid) { message(invalid, true, '#soil-form-error'); $('#soil-form-error').scrollIntoView({ block: 'nearest' }); return; }
    setBusy(true); message('', false, '#soil-form-error');
    try {
      await api('/' + paths[kind] + (record ? '/' + encodeURIComponent(record.id) : ''), { method: record ? 'PUT' : 'POST', body: JSON.stringify({ revision, record: values }) });
      modal.close();
      try { await refresh(); message(singular[kind] + ' saved to project ' + projectId + '.'); }
      catch { message('Record saved. The updated list could not be loaded; use Refresh data to retry.', true); }
    } catch (error) { message(error.message, true, '#soil-form-error'); $('#soil-form-error').scrollIntoView({ block: 'nearest' }); }
    finally { setBusy(false); }
  };
}

function confirmDelete(id) {
  if (busy) return;
  const kind = tab, revision = overview.revision;
  dialog(`Delete ${id}?`, '<p class="soil-muted">This removes the record from active data. Its audit history is retained. Linked records must be removed or reassigned first.</p><div id="soil-form-error" role="alert" hidden></div><button class="pw-btn" id="soil-confirm-delete" data-write>Delete record</button>');
  $('#soil-confirm-delete').onclick = async () => {
    if (busy) return;
    setBusy(true);
    try { await api(`/${paths[kind]}/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ revision }) }); $('#soil-dialog').close(); await refresh(); message('Record deleted. Audit history retained.'); }
    catch (error) { message(error.message, true, '#soil-form-error'); }
    finally { setBusy(false); }
  };
}
async function showLog(id) {
  try {
    const result = await api(`/boreholes/${encodeURIComponent(id)}`), borehole = result.data;
    const colors = ['#a28a63', '#977554', '#827667', '#6a665e', '#b29b76'];
    const y = depth => 35 + depth / borehole.depth * 500;
    const layerSvg = result.layers.map((layer, i) => `<rect x="82" y="${y(layer.depthFrom)}" width="110" height="${Math.max(1, y(layer.depthTo) - y(layer.depthFrom))}" fill="${colors[i % colors.length]}" stroke="#222"/><text x="208" y="${y((layer.depthFrom + layer.depthTo) / 2)}" fill="#eee" font-size="11">${escape(layer.id)} · ${layer.depthFrom}–${layer.depthTo} m${layer.sptN !== null ? ` · raw N=${layer.sptN}` : ''}</text>`).join('');
    const scale = Array.from({ length: 6 }, (_, i) => { const depth = borehole.depth * i / 5; return `<text x="2" y="${y(depth) + 4}" fill="#ccc" font-size="12">${Number(depth.toFixed(2))} m</text><line x1="65" x2="80" y1="${y(depth)}" y2="${y(depth)}" stroke="#aaa"/>`; }).join('');
    const groundwater = borehole.groundwaterDepth === null ? '' : `<line x1="65" x2="470" y1="${y(borehole.groundwaterDepth)}" y2="${y(borehole.groundwaterDepth)}" stroke="#5ec8ff" stroke-width="2" stroke-dasharray="6 4"/><text x="208" y="${y(borehole.groundwaterDepth) - 7}" fill="#5ec8ff" font-size="12">Groundwater ${borehole.groundwaterDepth} m</text>`;
    const samples = result.samples.map(sample => `<circle cx="77" cy="${y(sample.depth)}" r="4" fill="#ffd400"><title>${escape(sample.id)} at ${sample.depth} m</title></circle>`).join('');
    dialog(`Borehole log · ${id}`, `<p class="soil-muted">Depth increases downward from ground level. Blank intervals have no recorded layers. Yellow marks show sample depths; blue marks show observed groundwater. Colours distinguish records only.</p><div class="soil-profile"><svg viewBox="0 0 500 560" role="img" aria-label="Soil profile for ${escape(id)}"><rect x="82" y="35" width="110" height="500" fill="#202020" stroke="#888"/>${layerSvg}${scale}${groundwater}${samples}</svg></div><div class="soil-table-wrap"><table><thead><tr><th>Depth (m)</th><th>Recorded description</th><th>Sample</th></tr></thead><tbody>${result.layers.map(layer => `<tr><td>${layer.depthFrom}–${layer.depthTo}</td><td>${escape(layer.description)}</td><td>${escape(layer.sampleId || '—')}</td></tr>`).join('') || '<tr><td colspan="3">No layers recorded yet.</td></tr>'}</tbody></table></div><p class="soil-muted">${result.samples.map(sample => `${escape(sample.id)}: ${sample.depth} m (${escape(sample.type)})`).join(' · ') || 'No samples recorded.'}</p>`);
  } catch (error) { message(error.message, true); }
}
async function refresh() {
  overview = await api();
  shell();
  await loadRows();
}
async function init() {
  document.body.classList.toggle('soil-embedded', new URLSearchParams(location.search).get('embedded') === '1');
  projectId = ProjectWorkspace.getProjectId();
  if (!projectId) { $('#pw-content').innerHTML = '<div class="soil-alert error">Project ID is required. Open Soil & Geotechnical from your project workspace.</div>'; return; }
  if (!ProjectWorkspace.requireAuth(projectId)) return;
  ProjectWorkspace.renderNav('soil', projectId);
  $('#soil-refresh').onclick = () => { if (!busy) init(); };
  try { await refresh(); }
  catch (error) { $('#pw-content').innerHTML = `<div class="soil-alert error" role="alert">${escape(error.message)}</div><p class="soil-muted">Your records have not been changed. Use Refresh data to retry.</p>`; }
}
init();

// Keep the embedded workspace in the same day/night mode as its parent.
function syncSoilTheme() {
  let theme = localStorage.getItem('ohisee_theme') || 'dark';
  try { if (window.parent !== window) theme = window.parent.document.documentElement.dataset.theme || theme; } catch {}
  document.documentElement.dataset.theme = theme;
}
syncSoilTheme();
window.addEventListener('storage', syncSoilTheme);
try {
  if (window.parent !== window) {
    const themeObserver = new MutationObserver(syncSoilTheme);
    themeObserver.observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pagehide', () => themeObserver.disconnect(), { once: true });
  }
} catch {}
