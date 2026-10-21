'use strict';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const field = (key, label, type = 'text', options = {}) => ({ key, label, type, ...options });
const text = (key, label, required = false) => field(key, label, 'text', { required });
const number = (key, label, min = 0, max = 10000, required = false) => field(key, label, 'number', { min, max, required });
const choice = (key, label, options, required = false) => field(key, label, 'select', { options, required });
const date = (key, label) => field(key, label, 'date');
const schemas = {
  investigations: [text('id', 'Investigation ID', true), choice('type', 'Investigation type', ['Preliminary Investigation', 'Detailed Investigation', 'Foundation Investigation', 'Existing Building Investigation', 'Other'], true), text('agency', 'Investigation agency'), text('engineer', 'Geotechnical engineer'), date('investigationDate', 'Investigation date'), date('reportDate', 'Report date'), text('location', 'Site location', true), choice('method', 'Investigation method', ['Borehole', 'Trial Pit', 'SPT', 'CPT', 'Plate Load Test', 'Other'], true), number('plannedBoreholes', 'Planned boreholes', 0, 500), number('maximumDepth', 'Maximum investigation depth (m)'), text('groundwaterObservation', 'Groundwater observation'), text('remarks', 'Remarks')],
  boreholes: [text('id', 'Borehole ID', true), field('investigationId', 'Investigation', 'investigation', { required: true }), text('location', 'Borehole location', true), number('latitude', 'Latitude (degrees)', -90, 90), number('longitude', 'Longitude (degrees)', -180, 180), number('groundElevation', 'Ground elevation (m)', -500, 10000), number('depth', 'Borehole depth (m)', 0.01, 10000, true), number('diameter', 'Diameter (mm)', 1, 5000), date('startDate', 'Start date'), date('completionDate', 'Completion date'), number('groundwaterDepth', 'Observed groundwater depth (m)'), text('drillingMethod', 'Drilling method'), choice('status', 'Fieldwork status', ['Planned', 'In Progress', 'Completed'], true), text('remarks', 'Remarks')],
  layers: [text('id', 'Layer ID', true), field('boreholeId', 'Borehole', 'borehole', { required: true }), number('depthFrom', 'Depth from (m)', 0, 10000, true), number('depthTo', 'Depth to (m)', 0, 10000, true), text('description', 'Soil description', true), text('soilType', 'Recorded soil type'), text('colour', 'Observed colour'), text('density', 'Recorded density (include unit)'), text('consistency', 'Observed consistency'), text('moisture', 'Moisture condition'), text('sampleType', 'Sample type'), text('sampleId', 'Linked sample ID'), number('sptN', 'Reported raw SPT N (blows)', 0, 1000), text('groundwater', 'Groundwater observation'), text('remarks', 'Remarks')],
  samples: [text('id', 'Sample ID', true), field('boreholeId', 'Borehole', 'borehole', { required: true }), number('depth', 'Sample depth (m)', 0, 10000, true), choice('type', 'Sample type', ['Disturbed', 'Undisturbed', 'Bulk Sample', 'Shelby Tube', 'Core Sample'], true), choice('condition', 'Sample condition', ['Disturbed', 'Undisturbed', 'Not recorded'], true), date('collectionDate', 'Collection date'), text('laboratory', 'Laboratory'), choice('testStatus', 'Test status', ['Not assigned', 'Assigned', 'In Progress', 'Results received'], true), text('remarks', 'Remarks')]
};
function identifier(value, label = 'ID') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) fail(`${label} must be 1–64 letters, numbers, dots, underscores or hyphens.`);
  return value;
}
function validate(kind, input) {
  if (!schemas[kind] || !input || typeof input !== 'object' || Array.isArray(input)) fail('Invalid record.');
  const out = {};
  for (const f of schemas[kind]) {
    const value = input[f.key];
    if (value === undefined || value === null || value === '') {
      if (f.required) fail(`${f.label} is required.`);
      out[f.key] = f.type === 'number' ? null : '';
      continue;
    }
    if (f.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < f.min || value > f.max) fail(`${f.label} must be a number between ${f.min} and ${f.max}.`);
      if (['plannedBoreholes', 'sptN'].includes(f.key) && !Number.isInteger(value)) fail(`${f.label} must be a whole number.`);
      out[f.key] = value;
    } else {
      if (typeof value !== 'string' || value.length > (f.key === 'remarks' ? 2000 : 250)) fail(`${f.label} is too long or invalid.`);
      out[f.key] = value.trim();
      if (f.required && !out[f.key]) fail(`${f.label} is required.`);
      if (f.type === 'select' && !f.options.includes(out[f.key])) fail(`Choose a valid ${f.label.toLowerCase()}.`);
      if (f.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) fail(`${f.label} must be a valid date.`);
    }
  }
  identifier(out.id);
  for (const key of ['investigationId', 'boreholeId', 'sampleId']) if (out[key]) identifier(out[key], key);
  if (kind === 'investigations' && out.reportDate && out.investigationDate && out.reportDate < out.investigationDate) fail('Report date cannot precede investigation date.');
  if (kind === 'boreholes') {
    if ((out.latitude === null) !== (out.longitude === null)) fail('Enter both latitude and longitude.');
    if (out.completionDate && out.startDate && out.completionDate < out.startDate) fail('Completion date cannot precede start date.');
    if (out.groundwaterDepth !== null && out.groundwaterDepth > out.depth) fail('Observed groundwater depth cannot exceed borehole depth.');
  }
  return out;
}
function relationships(state, kind, record, previousId) {
  if (kind === 'boreholes' && !state.investigations.some(r => r.id === record.investigationId)) fail('Select an investigation in this project.');
  if (kind === 'layers' || kind === 'samples') {
    const borehole = state.boreholes.find(r => r.id === record.boreholeId);
    if (!borehole) fail('Select a borehole in this project.');
    if (kind === 'samples' && record.depth > borehole.depth) fail('Sample depth cannot exceed borehole depth.');
    if (kind === 'layers') {
      if (record.depthTo <= record.depthFrom) fail('Depth to must be greater than depth from.');
      if (record.depthTo > borehole.depth) fail('Layer depth cannot exceed borehole depth.');
      if (state.layers.some(r => r.id !== previousId && r.boreholeId === record.boreholeId && record.depthFrom < r.depthTo && record.depthTo > r.depthFrom)) fail('Soil layers cannot overlap in the same borehole.');
      if (record.sampleId) {
        const sample = state.samples.find(r => r.id === record.sampleId && r.boreholeId === record.boreholeId);
        if (!sample || sample.depth < record.depthFrom || sample.depth > record.depthTo) fail('Linked sample must belong to this borehole and layer depth.');
      }
    }
  }
  if (kind === 'boreholes' && (state.layers.some(r => r.boreholeId === record.id && r.depthTo > record.depth) || state.samples.some(r => r.boreholeId === record.id && r.depth > record.depth))) fail('Borehole depth cannot exclude existing layers or samples.');
  if (kind === 'samples' && state.layers.some(r => r.sampleId === record.id && (r.boreholeId !== record.boreholeId || record.depth < r.depthFrom || record.depth > r.depthTo))) fail('Sample location conflicts with its linked layer.');
}
module.exports = { schemas, validate, relationships, identifier, fail };
