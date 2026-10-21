'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const service = require('../services/soil/service');
const router = express.Router({ mergeParams: true });
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    if (!error.status) console.error('Soil API failure:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Soil data could not be processed. Review your inputs or retry.' });
  }
};
router.use(authenticate);
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.get('/', wrap(async (req, res) => res.json(service.overview(await service.owned(req.params.projectId, req.user.id)))));
for (const [path, kind] of [['investigation', 'investigations'], ['boreholes', 'boreholes'], ['layers', 'layers'], ['samples', 'samples']]) {
  router.get(`/${path}`, wrap(async (req, res) => res.json(service.listing(await service.owned(req.params.projectId, req.user.id), kind, req.query))));
  router.get(`/${path}/:id`, wrap(async (req, res) => res.json(service.detail(await service.owned(req.params.projectId, req.user.id), kind, req.params.id))));
  router.post(`/${path}`, wrap(async (req, res) => res.status(201).json(await service.mutate(req.params.projectId, req.user.id, kind, null, req.body))));
  router.put(`/${path}/:id`, wrap(async (req, res) => res.json(await service.mutate(req.params.projectId, req.user.id, kind, req.params.id, req.body))));
  router.delete(`/${path}/:id`, wrap(async (req, res) => res.json(await service.mutate(req.params.projectId, req.user.id, kind, req.params.id, req.body, true))));
}
router.get('/boreholes/:id/layers', wrap(async (req, res) => {
  const p = await service.owned(req.params.projectId, req.user.id);
  service.detail(p, 'boreholes', req.params.id);
  res.json(service.listing(p, 'layers', { ...req.query, boreholeId: req.params.id }));
}));
router.post('/boreholes/:id/layers', wrap(async (req, res) => {
  if (req.body?.record?.boreholeId && req.body.record.boreholeId !== req.params.id) return res.status(400).json({ error: 'Borehole ID does not match the route.' });
  res.status(201).json(await service.mutate(req.params.projectId, req.user.id, 'layers', null, { ...req.body, record: { ...req.body?.record, boreholeId: req.params.id } }));
}));
module.exports = router;
