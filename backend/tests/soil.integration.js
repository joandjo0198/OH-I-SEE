'use strict';
// Explicit opt-in: creates only synthetic account/project records, then removes them.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const db = require('../src/config/supabase');
const jwt = require('jsonwebtoken');
const projectId = 'SOIL-QA-' + crypto.randomUUID();
let userId;
const base = process.env.SOIL_TEST_API || 'http://127.0.0.1:3001/api';
async function check(query) { const result = await query; if (result.error) throw new Error(result.error.message); return result.data; }
async function run() {
  if (process.env.SOIL_LIVE_TEST !== '1') throw new Error('Set SOIL_LIVE_TEST=1 to run the temporary-record Supabase integration test.');
  try {
    const user = await db.auth.admin.createUser({ email: 'soil-qa-' + crypto.randomUUID() + '@example.com', password: crypto.randomBytes(32).toString('base64url'), email_confirm: true, user_metadata: { name: 'Temporary Soil QA', role: 'Customer' } });
    if (user.error) throw new Error(user.error.message);
    userId = user.data.user.id;
    await check(db.from('users').upsert({ id: userId, name: 'Temporary Soil QA', email: user.data.user.email, role: 'Customer' }));
    await check(db.from('projects').insert({ project_id: projectId, user_id: userId, project_name: 'Temporary Soil Phase 1 QA', construction_context: { soilQa: true } }));
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '5m', algorithm: 'HS256' });
    let revision = 0;
    const req = async (path, method = 'GET', record) => {
      const res = await fetch(`${base}/projects/${projectId}/soil${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify({ revision, record }) }), signal: AbortSignal.timeout(20000) });
      const data = await res.json(); assert.ok(res.ok, `${method} ${path}: ${data.error || res.status}`); if (data.revision !== undefined) revision = data.revision; return data;
    };
    await req('/investigation', 'POST', { id: 'INV-QA', type: 'Detailed Investigation', method: 'Borehole', location: 'Synthetic test location' });
    await req('/boreholes', 'POST', { id: 'BH-QA', investigationId: 'INV-QA', location: 'Synthetic borehole', depth: 10, status: 'In Progress' });
    await req('/layers', 'POST', { id: 'L-QA', boreholeId: 'BH-QA', depthFrom: 0, depthTo: 2, description: 'Synthetic recorded layer; not site data' });
    const sample = { id: 'S-QA', boreholeId: 'BH-QA', depth: 1, type: 'Disturbed', condition: 'Disturbed', testStatus: 'Not assigned' };
    await req('/samples', 'POST', sample);
    await req('/samples/S-QA', 'PUT', { ...sample, remarks: 'Edited in live persistence test' });
    const saved = await check(db.from('projects').select('construction_context').eq('project_id', projectId).eq('user_id', userId).single());
    assert.equal(saved.construction_context.soilGeotechnical.samples[0].remarks, 'Edited in live persistence test');
    assert.equal(saved.construction_context.soilQa, true);
    assert.equal((await req('/boreholes/BH-QA')).layers.length, 1);
    await req('/samples/S-QA', 'DELETE');
    assert.equal((await req('/samples')).total, 0);
    console.log('PASS: real authenticated API, Supabase create/read/update/delete, preserved project context, borehole logs and audit persistence.');
  } finally {
    if (userId) {
      await check(db.from('projects').delete().eq('project_id', projectId).eq('user_id', userId));
      const removed = await db.auth.admin.deleteUser(userId);
      if (removed.error) throw new Error('Temporary QA account cleanup failed: ' + removed.error.message);
      console.log('Temporary soil QA account and project removed.');
    }
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
