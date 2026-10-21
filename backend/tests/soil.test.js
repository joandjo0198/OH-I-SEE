'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, records, reset, token } = require('./soil-fixture');
const service = require('../src/services/soil/service');
let server, base, revision;
test.before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}/api/projects/P1/soil`; });
test.after(() => new Promise(resolve => server.close(resolve)));
test.beforeEach(() => { reset(); revision = 0; });
async function request(path = '', method = 'GET', record, options = {}) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(options.user === null ? {} : { Authorization: `Bearer ${token(options.user || 'c1')}` }) }, ...(method === 'GET' ? {} : { body: JSON.stringify({ revision: options.revision ?? revision, record }) }) });
  const body = await res.json();
  if (res.ok && body.revision !== undefined) revision = body.revision;
  return { status: res.status, body };
}
const investigation = (id = 'INV-01') => ({ id, type: 'Detailed Investigation', location: 'North plot', method: 'Borehole' });
const borehole = (id = 'BH-01') => ({ id, investigationId: 'INV-01', location: 'North corner', depth: 12, groundwaterDepth: 3.8, status: 'In Progress' });
const layer = (id = 'L-01') => ({ id, boreholeId: 'BH-01', depthFrom: 0, depthTo: 2, description: 'Recorded silty sand' });
const sample = (id = 'S-01') => ({ id, boreholeId: 'BH-01', depth: 1, type: 'Disturbed', condition: 'Disturbed', testStatus: 'Not assigned' });
async function setup() { assert.equal((await request('/investigation', 'POST', investigation())).status, 201); assert.equal((await request('/boreholes', 'POST', borehole())).status, 201); }

test('empty dashboard has no invented measurements, approvals or project copies', async () => {
  const { body } = await request();
  assert.equal(body.project.projectId, 'P1'); assert.equal(body.status, 'Not Started'); assert.equal(body.summary.sptTests, null); assert.equal(body.summary.groundwater, null); assert.equal(records.projects.length, 1);
});
test('create and edit investigation persist independently of other context and retain audit history', async () => {
  await request('/investigation', 'POST', investigation());
  const result = await request('/investigation/INV-01', 'PUT', { ...investigation(), agency: 'Measured Data Lab' });
  assert.equal(result.status, 200); assert.equal(result.body.data.version, 2);
  const state = records.projects[0].construction_context;
  assert.deepEqual(state.homeDesign, { keep: true }); assert.equal(state.soilGeotechnical.audit.length, 2); assert.equal(state.soilGeotechnical.audit[1].before.agency, '');
  assert.equal((await request('/investigation/INV-01')).body.data.agency, 'Measured Data Lab');
});
test('IDs are unique per project including case and cannot be renamed', async () => {
  await request('/investigation', 'POST', investigation());
  assert.equal((await request('/investigation', 'POST', investigation('inv-01'))).status, 409);
  assert.equal((await request('/investigation/INV-01', 'PUT', investigation('INV-02'))).status, 400);
});
test('borehole, layer and sample are persisted and included in the log and dashboard', async () => {
  await setup();
  assert.equal((await request('/samples', 'POST', sample())).status, 201);
  assert.equal((await request('/boreholes/BH-01/layers', 'POST', { ...layer(), sampleId: 'S-01', sptN: 0 })).status, 201);
  const log = (await request('/boreholes/BH-01')).body;
  assert.equal(log.layers[0].sptN, 0); assert.equal(log.samples[0].depth, 1);
  const dashboard = (await request()).body;
  assert.equal(dashboard.summary.groundwater.min, 3.8); assert.equal(dashboard.summary.samples, 1); assert.equal(dashboard.status, 'In Progress');
});
test('numeric, date and coordinate validation rejects bad data without writes', async () => {
  await request('/investigation', 'POST', investigation());
  for (const invalid of [{ depth: '12x' }, { depth: -1 }, { groundwaterDepth: -1 }, { latitude: 12 }, { latitude: 91, longitude: 70 }, { startDate: '2026-02-30' }, { startDate: '2026-09-20', completionDate: '2026-09-01' }]) assert.equal((await request('/boreholes', 'POST', { ...borehole(), ...invalid })).status, 400);
  assert.equal(records.projects[0].construction_context.soilGeotechnical.boreholes.length, 0);
});
test('layers reject reversed depths, overlap, negative SPT and depths below borehole', async () => {
  await setup(); await request('/layers', 'POST', layer());
  for (const invalid of [{ depthFrom: 2, depthTo: 2 }, { depthFrom: 1, depthTo: 3 }, { depthFrom: 2, depthTo: 13 }, { depthFrom: 2, depthTo: 4, sptN: -1 }]) assert.equal((await request('/layers', 'POST', { ...layer('L-02'), ...invalid })).status, 400);
  assert.equal((await request('/layers', 'POST', { ...layer('L-02'), depthFrom: 2, depthTo: 4 })).status, 201);
});
test('foreign references and incompatible linked sample depths are rejected', async () => {
  await setup();
  assert.equal((await request('/samples', 'POST', { ...sample(), boreholeId: 'OTHER' })).status, 400);
  assert.equal((await request('/samples', 'POST', { ...sample(), depth: 13 })).status, 400);
  assert.equal((await request('/layers', 'POST', { ...layer(), sampleId: 'OTHER' })).status, 400);
  await request('/samples', 'POST', sample()); await request('/layers', 'POST', { ...layer(), sampleId: 'S-01' });
  assert.equal((await request('/samples/S-01', 'PUT', { ...sample(), depth: 3 })).status, 400);
  assert.equal((await request('/boreholes/BH-01', 'PUT', { ...borehole(), depth: 1, groundwaterDepth: null })).status, 400);
});
test('deletion preserves audit and refuses orphaned records', async () => {
  await setup(); await request('/samples', 'POST', sample());
  assert.equal((await request('/boreholes/BH-01', 'DELETE')).status, 409);
  assert.equal((await request('/investigation/INV-01', 'DELETE')).status, 409);
  assert.equal((await request('/samples/S-01', 'DELETE')).status, 200);
  assert.equal((await request('/boreholes/BH-01', 'DELETE')).status, 200);
  assert.equal((await request('/boreholes/BH-01')).status, 404);
  assert.ok(records.projects[0].construction_context.soilGeotechnical.audit.some(r => r.action === 'delete'));
});
test('pagination, search and borehole filtering are bounded and deterministic', async () => {
  await setup(); await request('/boreholes', 'POST', borehole('BH-02'));
  assert.equal((await request('/boreholes?page=2&pageSize=1')).body.data[0].id, 'BH-02');
  assert.equal((await request('/boreholes?search=bh-02')).body.total, 1);
  assert.equal((await request('/boreholes?pageSize=999')).status, 400);
  await request('/layers', 'POST', layer());
  assert.equal((await request('/boreholes/BH-02/layers')).body.total, 0);
});
test('unauthenticated and other owners cannot read or mutate project records', async () => {
  for (const user of [null, 'c2']) {
    assert.equal((await request('', 'GET', undefined, { user })).status, user ? 404 : 401);
    assert.equal((await request('/investigation', 'POST', investigation(), { user })).status, user ? 404 : 401);
  }
});
test('stale revisions and simultaneous updates cannot lose data', async () => {
  await request('/investigation', 'POST', investigation());
  assert.equal((await request('/investigation', 'POST', investigation('INV-02'), { revision: 0 })).status, 409);
  const results = await Promise.all([request('/boreholes', 'POST', borehole('BH-01'), { revision: 1 }), request('/boreholes', 'POST', borehole('BH-02'), { revision: 1 })]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
});
test('optimistic database save detects changes from other modules', async () => {
  const project = await service.owned('P1', 'c1'); records.projects[0].updated_at = '2026-09-24T00:00:00.000Z';
  await assert.rejects(service.save(project, 'c1', service.stateOf(project)), error => error.status === 409);
});
test('clients cannot mark data approved; previously approved data cannot be overwritten', async () => {
  await request('/investigation', 'POST', { ...investigation(), reviewStatus: 'Approved' });
  const state = records.projects[0].construction_context.soilGeotechnical;
  assert.equal(state.investigations[0].reviewStatus, 'Not reviewed');
  state.status = 'Approved';
  assert.equal((await request('/investigation/INV-01', 'PUT', investigation())).status, 409);
});
test('user text remains data and missing project timestamps block unsafe persistence', async () => {
  const result = await request('/investigation', 'POST', { ...investigation(), remarks: '<script>alert(1)</script>' });
  assert.equal(result.body.data.remarks, '<script>alert(1)</script>');
  records.projects[0].updated_at = null;
  assert.equal((await request('/boreholes', 'POST', borehole())).status, 409);
});
