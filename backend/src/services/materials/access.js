'use strict';
const stages=new Set(['estimating','proposal_sent','revision_requested','approved','in_execution','completed']);
function canAccessAssignment(job,userId,projectId){return Boolean(job&&job.contractor_id===userId&&job.project_id===projectId&&job.customer_id&&job.data?.accepted_at&&stages.has(job.data.stage));}
async function resolveProject(projectId,user,db,bim,fail){
 const id=String(projectId).trim().toUpperCase();
 const owned=await bim.getProjectForUser(id,user.id);if(owned)return owned;
 const {data:jobs,error}=await db.from('marketplace_jobs').select('project_id,customer_id,contractor_id,data').eq('project_id',id).eq('contractor_id',user.id);
 if(error)fail('Unable to verify constructor project access.',503);
 const job=(jobs||[]).find(j=>canAccessAssignment(j,user.id,id));if(!job)fail('Project not found.',404);
 const project=await bim.getProjectForUser(id,job.customer_id);if(!project)fail('Project not found.',404);return project;
}
module.exports={canAccessAssignment,resolveProject};
