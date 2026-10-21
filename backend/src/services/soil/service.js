'use strict';
const crypto = require('node:crypto');
const db = require('../../config/supabase');
const { schemas, validate, relationships, identifier, fail } = require('./domain');
const DISCLAIMER = 'Engineering decision-support output. Final design and construction approval must be reviewed and approved by a qualified engineer according to applicable local codes and site conditions.';
const empty = () => ({ schemaVersion: 1, revision: 0, status: 'Not Started', investigations: [], boreholes: [], layers: [], samples: [], audit: [] });
function stateOf(project) {
  const stored = project.construction_context?.soilGeotechnical;
  if (stored && stored.schemaVersion !== 1) fail('This soil dataset needs a newer application version.', 409);
  return structuredClone(stored || empty());
}
async function owned(projectId, userId) {
  identifier(projectId, 'Project ID');
  const { data, error } = await db.from('projects').select('project_id,user_id,project_name,project_type,location,city,plot_size,floors,construction_context,updated_at').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  if (error) { console.error('Soil project read failed:', error.code || 'database error'); fail('Project storage is unavailable. Retry when the database is connected.', 503); }
  if (!data) fail('Project not found or access denied.', 404);
  return data;
}
function overview(project) {
  const s = stateOf(project);
  const land = project.construction_context?.landSite || {};
  const levels = s.boreholes.filter(r => r.groundwaterDepth !== null);
  return { project: { projectId: project.project_id, name: project.project_name, buildingType: project.project_type, location: project.location || project.city || land.city || '', floors: project.floors, plotArea: project.plot_size || '' }, revision: s.revision, status: s.status, disclaimer: DISCLAIMER, summary: { investigations: s.investigations.length, boreholes: s.boreholes.length, layers: s.layers.length, samples: s.samples.length, groundwater: levels.length ? { min: Math.min(...levels.map(r => r.groundwaterDepth)), max: Math.max(...levels.map(r => r.groundwaterDepth)), count: levels.length, unit: 'm below ground' } : null, sptTests: null, laboratoryTests: null, reportStatus: 'Not uploaded' }, lookups: { investigations: s.investigations.map(({ id }) => ({ id })), boreholes: s.boreholes.map(({ id, depth }) => ({ id, depth })) }, schema: schemas };
}
function listing(project, kind, query = {}) {
  const s = stateOf(project);
  if (!schemas[kind]) fail('Unknown soil record type.', 404);
  const page = Number(query.page || 1), pageSize = Number(query.pageSize || 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) fail('Invalid pagination.');
  const search = String(query.search || '').trim().toLowerCase().slice(0, 100);
  let rows = s[kind].filter(r => (!query.boreholeId || r.boreholeId === query.boreholeId) && (!search || [r.id, r.location, r.description, r.laboratory, r.boreholeId].some(v => String(v || '').toLowerCase().includes(search))));
  if (kind === 'layers') rows.sort((a, b) => a.boreholeId.localeCompare(b.boreholeId) || a.depthFrom - b.depthFrom);
  const total = rows.length;
  rows = rows.slice((page - 1) * pageSize, page * pageSize);
  if (kind === 'boreholes') rows = rows.map(r => ({ ...r, sampleCount: s.samples.filter(v => v.boreholeId === r.id).length, layerCount: s.layers.filter(v => v.boreholeId === r.id).length }));
  return { data: rows, total, page, pageSize, revision: s.revision };
}
function detail(project, kind, id) {
  const s = stateOf(project), record = s[kind]?.find(r => r.id === id);
  if (!record) fail('Record not found.', 404);
  return { data: record, revision: s.revision, ...(kind === 'boreholes' ? { layers: s.layers.filter(r => r.boreholeId === id).sort((a, b) => a.depthFrom - b.depthFrom), samples: s.samples.filter(r => r.boreholeId === id) } : {}) };
}
async function save(project, userId, state) {
  if (!project.updated_at) fail('Project update timestamp is missing. Repair project storage before saving soil data.', 409);
  if (Buffer.byteLength(JSON.stringify(state)) > 2 * 1024 * 1024) fail('The Phase 1 soil storage limit has been reached. Contact support before adding more records.', 413);
  const { data, error } = await db.from('projects').update({ construction_context: { ...project.construction_context, soilGeotechnical: state }, updated_at: new Date(Math.max(Date.now(), Date.parse(project.updated_at) + 1)).toISOString() }).eq('project_id', project.project_id).eq('user_id', userId).eq('updated_at', project.updated_at).select('project_id').maybeSingle();
  if (error) { console.error('Soil project write failed:', error.code || 'database error'); fail('Could not save soil data. Please retry.', 503); }
  if (!data) fail('This project changed in another session. Refresh and review before saving again.', 409);
}
async function mutate(projectId, userId, kind, id, body, remove = false) {
  if (!schemas[kind]) fail('Unknown soil record type.', 404);
  const project = await owned(projectId, userId), state = stateOf(project);
  if (!Number.isInteger(body?.revision) || body.revision !== state.revision) fail('Soil data changed. Refresh and review before saving again.', 409);
  if (['Approved', 'Superseded'].includes(state.status)) fail('This engineering version is locked. Create a new version before editing.', 409);
  const before = id ? state[kind].find(r => r.id === id) : null;
  if (id && !before) fail('Record not found.', 404);
  let record = null;
  if (remove) {
    if (kind === 'investigations' && state.boreholes.some(r => r.investigationId === id)) fail('Remove or reassign the investigation’s boreholes first.', 409);
    if (kind === 'boreholes' && (state.layers.some(r => r.boreholeId === id) || state.samples.some(r => r.boreholeId === id))) fail('Remove the borehole’s layers and samples first.', 409);
    if (kind === 'samples' && state.layers.some(r => r.sampleId === id)) fail('Unlink this sample from its layer first.', 409);
    state[kind] = state[kind].filter(r => r.id !== id);
  } else {
    record = validate(kind, body.record);
    if (id && record.id !== id) fail('Record IDs cannot be changed.');
    if (state[kind].some(r => r.id !== id && r.id.toLowerCase() === record.id.toLowerCase())) fail('This ID already exists in the project.', 409);
    if (!id && state[kind].length >= (kind === 'boreholes' ? 500 : 2000)) fail('Record limit reached. Contact support.', 413);
    relationships(state, kind, record, id);
    record = { ...record, projectId, version: (before?.version || 0) + 1, createdAt: before?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId, reviewStatus: 'Not reviewed' };
    if (id) state[kind] = state[kind].map(r => r.id === id ? record : r);
    else state[kind].push(record);
  }
  state.revision++;
  state.status = state.boreholes.length ? 'In Progress' : state.investigations.length ? 'Data Collection' : 'Not Started';
  if (state.audit.length >= 5000) fail('Audit capacity reached. Contact support before changing this dataset.', 413);
  state.audit.push({ id: crypto.randomUUID(), revision: state.revision, kind, recordId: id || record.id, action: remove ? 'delete' : before ? 'update' : 'create', actor: userId, at: new Date().toISOString(), before, after: record });
  await save(project, userId, state);
  return { data: record, revision: state.revision, status: state.status };
}
module.exports = { owned, overview, listing, detail, mutate, stateOf, save, DISCLAIMER };
