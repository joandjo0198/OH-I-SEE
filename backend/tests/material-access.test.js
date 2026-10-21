'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {resolveProject,canAccessAssignment}=require('../src/services/materials/access');
const job={project_id:'P1',customer_id:'owner',contractor_id:'builder',data:{accepted_at:'2026-09-26',stage:'estimating'}};
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
function fixture(jobs=[job]){const calls=[];const project={project_id:'P1',user_id:'owner',id:'uuid'};return {calls,project,bim:{getProjectForUser:async(id,user)=>{calls.push(user);return id==='P1'&&user==='owner'?project:null;}},db:{from:()=>({select(){return this},eq(){return this},then(resolve){return Promise.resolve({data:jobs}).then(resolve)}})}};}
test('Owner retains project access without a contractor assignment',async()=>{const f=fixture([]);assert.equal(await resolveProject('P1',{id:'owner'},f.db,f.bim,fail),f.project);});
test('Accepted assigned constructor resolves the owning client BIM context',async()=>{const f=fixture();assert.equal(await resolveProject('p1',{id:'builder'},f.db,f.bim,fail),f.project);assert.deepEqual(f.calls,['builder','owner']);});
test('Unrelated constructors cannot access another assignment',async()=>{const f=fixture();await assert.rejects(resolveProject('P1',{id:'other'},f.db,f.bim,fail),e=>e.status===404);assert.deepEqual(f.calls,['other']);});
test('Requested, cancelled and mismatched projects are denied',()=>{for(const data of [{stage:'requested'},{accepted_at:'today',stage:'cancelled'}])assert.equal(canAccessAssignment({...job,data},'builder','P1'),false);assert.equal(canAccessAssignment(job,'builder','P2'),false);});
test('An assignment whose client no longer owns the project is denied',async()=>{const f=fixture([{...job,customer_id:'former-owner'}]);await assert.rejects(resolveProject('P1',{id:'builder'},f.db,f.bim,fail),e=>e.status===404);});
