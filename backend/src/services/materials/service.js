'use strict';
const crypto=require('node:crypto');
const {resolveProject}=require('./access');
const db=require('../../config/supabase'),bim=require('../bimService'),d=require('./domain');
async function result(q){const {data,error}=await q;if(error){if(error.code==='23505')d.fail('Another change was saved. Refresh and retry.',409);d.fail('Material storage unavailable. Apply material_bim_workflow.sql and check database connectivity.',503);}return data;}
async function context(projectId,user){const project=await resolveProject(projectId,user,db,bim,d.fail);if(!project)d.fail('Project not found.',404);if(!project.id)d.fail('Save this project to the database before selecting products.',409);const payload=await bim.getBimForProject(project.project_id,project.user_id);const model=payload?.model;if(!model)d.fail('Generate and review a BIM model first.',409);const revision=crypto.createHash('sha256').update(JSON.stringify(model.elements||[])).digest('hex');return {project,model,revision};}
async function catalogRows(ids){if(!ids.length)return [];return result(db.from('marketplace_products').select('*,product_bim_specs(*)').in('id',[...new Set(ids)]));}
async function current(ctx){return await result(db.from('project_material_states').select('*').eq('project_id',ctx.project.project_id).maybeSingle())||{project_id:ctx.project.project_id,version:0,state:{selections:[],approvedBimRevision:null}};}
async function summary(ctx,row){const catalog=await catalogRows(row.state.selections.map(s=>s.product.productId));const boq=d.derive(row.state,ctx.model,catalog);if(row.state.approvedBimRevision!==ctx.revision){boq.issues.unshift({code:'bim-review',severity:'error',message:'Review and approve the current BIM geometry before finalizing.'});boq.canFinalize=false;}return {version:row.version,state:row.state,model:ctx.model,bimRevision:ctx.revision,boq};}
async function read(projectId,user){const ctx=await context(projectId,user);return summary(ctx,await current(ctx));}
async function mutate(projectId,user,input){const ctx=await context(projectId,user),row=await current(ctx);if(input.version!==row.version)d.fail('This material schedule changed. Refresh and retry.',409);const state=structuredClone(row.state);state.selections||=[];
 switch(input.action){
 case 'approve-model':state.approvedBimRevision=ctx.revision;break;
 case 'add':case 'update':{
  if(state.selections.length>=500&&input.action==='add')d.fail('Maximum 500 selections per project.');
  const existing=input.action==='update'?state.selections.find(s=>s.id===input.selectionId):null;if(input.action==='update'&&!existing)d.fail('Selection not found.',404);
  let snap=existing?.product;
  if(!snap||input.productId!==snap.productId||input.refreshPrice){const p=(await catalogRows([input.productId]))[0];snap=d.snapshot(p,p?.product_bim_specs);}
  const selected=d.selection(input.selection||{},snap,existing);if(existing)state.selections[state.selections.indexOf(existing)]=selected;else state.selections.push(selected);break;
 }
 case 'remove':{const i=state.selections.findIndex(s=>s.id===input.selectionId);if(i<0)d.fail('Selection not found.',404);state.selections.splice(i,1);break;}
 case 'restore':{const old=await result(db.from('project_material_versions').select('state').eq('project_id',ctx.project.project_id).eq('version',d.number(input.restoreVersion,'Revision',1)).maybeSingle());if(!old)d.fail('Revision not found.',404);Object.assign(state,old.state);break;}
 default:d.fail('Unknown material operation.');
 }
 const next={project_id:ctx.project.project_id,version:row.version+1,state,updated_by:user.id,updated_at:new Date().toISOString()};
 const saved=row.version?await result(db.from('project_material_states').update(next).eq('project_id',row.project_id).eq('version',row.version).select('*').maybeSingle()):await result(db.from('project_material_states').insert(next).select('*').single());
 if(!saved)d.fail('This material schedule changed. Refresh and retry.',409);return summary(ctx,saved);
}
async function versions(projectId,user){const ctx=await context(projectId,user);return result(db.from('project_material_versions').select('version,actor_id,created_at').eq('project_id',ctx.project.project_id).order('version',{ascending:false}).limit(100));}
async function procurementDraft(projectId,user,input){const ctx=await context(projectId,user),row=await current(ctx);if(row.version!==input.version)d.fail('Refresh before creating a procurement draft.',409);const data=await summary(ctx,row);if(!data.boq.canFinalize)d.fail('Resolve critical BIM/material validation issues before procurement.',422);return result(db.from('bim_procurement_drafts').insert({project_id:ctx.project.project_id,material_version:row.version,snapshot:{bimRevision:ctx.revision,selections:row.state.selections,boq:data.boq},created_by:user.id}).select('*').single());}
module.exports={result,read,mutate,versions,procurementDraft};
