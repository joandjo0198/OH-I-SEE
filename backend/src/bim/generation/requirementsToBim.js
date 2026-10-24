'use strict';

const { buildHouseModel } = require('./houseModelBuilder');
const { validateHouseModel } = require('../validation/houseModelValidator');
const { houseModelToBim } = require('./houseModelToBim');

/**
 * Parametric BIM generator from structured building requirements.
 * Pipeline: requirements → canonical HouseModel → validation → BimModel
 */
function generate(requirements) {
  let cadPlan;
  if(requirements.building?.cadEngine) {
    cadPlan=require('../../cad/layoutEngine').layoutEngine(requirements);
    cadPlan.validation=require('../../cad/planValidator').enforce(cadPlan);
  }
  const houseModel = cadPlan ? require('../../cad/houseAdapter').toHouse(cadPlan,requirements) : buildHouseModel(requirements);
  const houseValidation = validateHouseModel(houseModel);

  if (!houseValidation.valid) {
    const err = new Error(houseValidation.errors[0] || 'Floor plan validation failed.');
    err.status = 422;
    err.details = houseValidation.errors;
    err.warnings = houseValidation.warnings;
    throw err;
  }

  const model = houseModelToBim(houseModel, requirements);
  if(cadPlan)model.metadata.cadPlan=cadPlan;
  const vastuAudit=require('../validation/vastuAudit').auditVastu(houseModel);
  model.metadata.vastuAudit=vastuAudit;
  if(requirements.building?.vastu==='Yes' && !vastuAudit.compliant) {
    houseValidation.warnings.push('Vastu review required: '+vastuAudit.issues.join(' '));
  }
  houseValidation.warnings=[...(houseValidation.warnings||[]),...(houseModel.layoutWarnings||[])];
  if (houseValidation.warnings?.length) {
    model.metadata.layoutWarnings = houseValidation.warnings;
  }
  return model;
}

module.exports = { generate };
