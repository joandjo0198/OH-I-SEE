import test from 'node:test';
import assert from 'node:assert/strict';
import { newRecord, nextLayerStart, depthError } from '../../frontend/js/soil/form-model.mjs';
const overview = {project:{location:'Coimbatore'},lookups:{investigations:[{id:'INV-01'}],boreholes:[{id:'BH-01'}]}};
test('defaults reuse saved location and single relations without inventing measurements', () => {
 assert.equal(newRecord('investigations', overview).location,'Coimbatore');
 assert.equal(newRecord('boreholes',overview).investigationId,'INV-01');
 const layer = newRecord('layers',overview);
 assert.match(layer.id,/^LYR-/); assert.equal(layer.boreholeId,'BH-01');
 assert.equal(layer.depthTo,undefined); assert.equal(layer.description,undefined);
 const multiple = structuredClone(overview); multiple.lookups.boreholes.push({id:'BH-02'});
 assert.equal(newRecord('layers',multiple).boreholeId,undefined);
});
test('next layer uses first unrecorded interval, including gaps and a full borehole', () => {
 assert.equal(nextLayerStart([],12),0);
 assert.equal(nextLayerStart([{depthFrom:2,depthTo:4},{depthFrom:0,depthTo:2}],12),4);
 assert.equal(nextLayerStart([{depthFrom:0,depthTo:2},{depthFrom:5,depthTo:8}],12),2);
 assert.equal(nextLayerStart([{depthFrom:0,depthTo:12}],12),'');
});
test('depth validation rejects overlap, excessive depths and incompatible samples but permits edits', () => {
 const detail = {data:{depth:12},layers:[{id:'L1',depthFrom:0,depthTo:2}],samples:[{id:'S1',depth:3}]};
 assert.match(depthError('layers',{depthFrom:3,depthTo:2},detail),/greater/);
 assert.match(depthError('layers',{depthFrom:2,depthTo:13},detail),/exceed/);
 assert.match(depthError('layers',{depthFrom:1,depthTo:3},detail),/overlap/);
 assert.equal(depthError('layers',{depthFrom:0,depthTo:2},detail,'L1'),'');
 assert.equal(depthError('layers',{depthFrom:2,depthTo:4,sampleId:'S1'},detail),'');
 assert.match(depthError('layers',{depthFrom:4,depthTo:5,sampleId:'S1'},detail),/sample/);
 assert.match(depthError('samples',{depth:13},detail),/within/);
});
