'use strict';
const router=require('express').Router({mergeParams:true});
const service=require('../services/bimService');
async function owned(req){const p=await service.getProjectForUser(req.params.projectId,req.user.id);if(!p)throw Object.assign(new Error('Project not found.'),{status:404});return p;}
router.get('/',async(req,res)=>{try{const p=await owned(req);res.set('Cache-Control','private, no-store').json({data:p.construction_context?.templatePlan||null});}catch(e){res.status(e.status||500).json({error:e.message});}});
router.put('/',async(req,res)=>{
 try{
  const project=await owned(req),current=project.construction_context?.templatePlan;
  if(!Number.isInteger(req.body?.expectedRevision)||req.body.expectedRevision!==(current?.revision||0))return res.status(409).json({error:'Project draft changed. Reload before saving.'});
  if(!project.id)return res.status(503).json({error:'Project storage unavailable. Download JSON and retry.'});
  const {generatePlan}=await import('../cad/template-planner.mjs');
  const plan=generatePlan(req.body.options);
  const draft={revision:(current?.revision||0)+1,plan,updatedAt:new Date().toISOString()};
  const context={...project.construction_context,templatePlan:draft};
  const db=require('../config/supabase');
  let q=db.from('projects').update({construction_context:context}).eq('id',project.id).eq('user_id',req.user.id);
  q=project.construction_context==null?q.is('construction_context',null):q.eq('construction_context',JSON.stringify(project.construction_context));
  const {data,error}=await q.select('project_id').maybeSingle();
  if(error)return res.status(503).json({error:'Could not save project draft. Download JSON and retry.'});
  if(!data)return res.status(409).json({error:'Project changed during save. Reload before saving.'});
  res.json({data:draft,persisted:true});
 }catch(e){res.status(e.status||500).json({error:e.message,details:e.details});}
});
module.exports=router;
