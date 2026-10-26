'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const bimService = require('../services/bimService');

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use('/template',require('./templatePlan'));

// All drawing formats come from the saved, owner-scoped canonical plan.
router.get('/cad', async (req,res) => {
  try {
    const result=await bimService.getBimForProject(req.params.projectId,req.user.id);
    const plan=result?.model?.metadata?.cadPlan;
    if(!plan)return res.status(409).json({error:'This saved design predates the validated drawing workflow. Review requirements and generate a new version first.'});
    require('../cad/planValidator').enforce(plan);
    const format=String(req.query.format||'json'),floor=Number(req.query.floor||0),sheet=String(req.query.sheet||'A-02');
    if(!Number.isInteger(floor)||!plan.floors.some(f=>f.index===floor)||!['A-01','A-02','A-03','A-04'].includes(sheet))return res.status(400).json({error:'Invalid floor or sheet.'});
    const options={floor,sheet,units:req.query.units==='mm'?'mm':'imperial',projectId:req.params.projectId};
    res.set('Cache-Control','private, no-store');
    if(format==='json')return res.json({success:true,data:plan});
    if(format==='svg')return res.type('image/svg+xml').send(require('../cad/drawingRenderer').render(plan,options));
    if(format==='pdf')return res.set('Content-Disposition','attachment; filename="drawing-set.pdf"').type('application/pdf').send(await require('../cad/sheetComposer').pdf(plan,options));
    if(format==='dxf')return res.set('Content-Disposition',`attachment; filename="floor-${floor}.dxf"`).type('application/dxf').send(require('../cad/cadWriter').dxf(plan,options));
    return res.status(400).json({error:'Supported formats: json, svg, pdf, dxf. DWG conversion requires a configured external CAD converter.'});
  } catch(e) {res.status(e.status||500).json({error:e.message,details:e.details});}
});
const running=new Set();
router.use((req,res,next)=>{if(req.method!=='POST'||!['/modify','/generate'].includes(req.path))return next();const key=req.user.id+':'+req.params.projectId;if(running.has(key))return res.status(409).json({error:'A design is already being generated for this project. Please wait.'});running.add(key);res.once('finish',()=>running.delete(key));next();});

// GET /api/projects/:projectId/bim
router.get('/', async (req, res) => {
  try {
    const result = await bimService.getBimForProject(req.params.projectId, req.user.id);
    if (!result) return res.status(404).json({ error: 'Project not found.' });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Failed to load BIM model.' });
  }
});

// POST /api/projects/:projectId/bim/generate
router.post('/generate', async (req, res) => {
  try {
    const project = await bimService.getProjectForUser(req.params.projectId, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const data = await bimService.generateFromProject(project, req.user.id, {
      label: req.body?.label,
    });
    return res.status(201).json({
      success: true,
      data,
      warning: data.warning,
    });
  } catch (e) {
    res.status(e.status || 500).json({
      error: e.message || 'BIM generation failed.',
      details: e.details,
    });
  }
});

// POST /api/projects/:projectId/bim/modify — natural language design changes
router.post('/modify', async (req, res) => {
  try {
    const prompt = req.body?.prompt?.trim();
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const data = await bimService.modifyFromPrompt(req.params.projectId, req.user.id, prompt, {
      project: req.body?.project,
      bim: req.body?.bim,
    });
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    return res.status(200).json({
      success: true,
      data,
      summary: data.modification?.summary,
    });
  } catch (e) {
    res.status(e.status || 500).json({
      error: e.message || 'Design modification failed.',
      details: e.details,
    });
  }
});

// POST /api/projects/:projectId/bim/validate
router.post('/validate', async (req, res) => {
  try {
    const result = await bimService.getBimForProject(req.params.projectId, req.user.id);
    if (!result?.model) return res.status(404).json({ error: 'No BIM model to validate.' });
    const validation = bimService.validate(result.model);
    const audit=result.model.metadata?.programAudit;
    if(audit&&!audit.matches){validation.errors.push(...audit.issues);validation.valid=false;}
    const acceptance=result.model.metadata?.blueprintAcceptance;
    if(acceptance&&!acceptance.passed){validation.errors.push(...acceptance.issues);validation.valid=false;}
    validation.blueprintAcceptance=acceptance||null;
    validation.requiresReview=result.status==='review';
    res.json({ success: true, data: validation });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Validation failed.' });
  }
});

// GET /api/projects/:projectId/bim/quantities
router.get('/quantities', async (req, res) => {
  try {
    const result = await bimService.getBimForProject(req.params.projectId, req.user.id);
    if (!result?.model) return res.status(404).json({ error: 'No BIM model.' });
    const quantities = bimService.calculateQuantities(result.model);
    res.json({ success: true, data: quantities });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Quantity calculation failed.' });
  }
});

// GET /api/projects/:projectId/bim/versions
router.get('/versions', async (req, res) => {
  try {
    const versions = await bimService.listVersions(req.params.projectId, req.user.id);
    if (versions === null) return res.status(404).json({ error: 'Project not found.' });
    res.json({ success: true, data: versions });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Failed to list versions.' });
  }
});

// GET /api/projects/:projectId/bim/elements/:elementId
router.get('/elements/:elementId', async (req, res) => {
  try {
    const result = await bimService.getBimForProject(req.params.projectId, req.user.id);
    if (!result?.model) return res.status(404).json({ error: 'No BIM model.' });
    const el = (result.model.elements || []).find(
      (e) => e.id === req.params.elementId || e.globalId === req.params.elementId
    );
    if (!el) return res.status(404).json({ error: 'Element not found.' });
    const rels = (result.model.relationships || []).filter(
      (r) => r.sourceId === el.id || r.targetId === el.id
    );
    res.json({ success: true, data: { element: el, relationships: rels } });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Failed to load element.' });
  }
});

module.exports = router;
