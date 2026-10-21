// Wizard display order; numeric IDs retain compatibility with existing portal stages.
(function (root) {
  'use strict';
  const steps = [
    { id: 1, title: 'Project Setup' }, { id: 2, title: 'Land & Site' },
    { id: 'soil', title: 'Soil & Geotechnical' }, { id: 3, title: 'Requirements' },
    { id: 4, title: 'Design & Engineering' }, { id: 5, title: 'Builder Quotes' },
    { id: 6, title: 'Approvals' }, { id: 7, title: 'Project Execution' },
    { id: 8, title: 'Handover & Maintenance' },
  ];
  const parse = value => value === 'soil' ? 'soil' : Math.min(8, Math.max(1, parseInt(value, 10) || 1));
  const position = value => steps.findIndex(step => step.id === parse(value)) + 1;
  const next = value => steps[Math.min(steps.length - 1, position(value))].id;
  const previous = value => steps[Math.max(0, position(value) - 2)].id;
  const portalStep = value => value === 'soil' ? 2 : parse(value);
  const workflow = { steps, parse, position, next, previous, portalStep };
  if (typeof module !== 'undefined' && module.exports) module.exports = workflow;
  root.IntentWorkflow = workflow;
})(typeof window !== 'undefined' ? window : globalThis);
