// Only derive values from saved records; field measurements remain user-entered.
export function newRecord(kind, overview, uuid = crypto.randomUUID()) {
  const prefix = { investigations: 'INV', boreholes: 'BH', layers: 'LYR', samples: 'SMP' }[kind];
  const values = { id: `${prefix}-${uuid.slice(0, 8).toUpperCase()}` };
  if (kind === 'investigations') values.location = overview.project.location || '';
  if (kind === 'boreholes' && overview.lookups.investigations.length === 1) values.investigationId = overview.lookups.investigations[0].id;
  if (['layers', 'samples'].includes(kind) && overview.lookups.boreholes.length === 1) values.boreholeId = overview.lookups.boreholes[0].id;
  return values;
}

export function nextLayerStart(layers, depth) {
  let start = 0;
  for (const layer of [...layers].sort((a, b) => a.depthFrom - b.depthFrom)) {
    if (layer.depthFrom > start) break;
    start = Math.max(start, layer.depthTo);
  }
  return start < depth ? start : '';
}

export function depthError(kind, values, detail, editingId) {
  if (!detail || !['layers', 'samples'].includes(kind)) return '';
  const max = detail.data.depth;
  if (kind === 'samples') return values.depth > max ? `Sample depth must be within the borehole's ${max} m depth.` : '';
  if (values.depthTo <= values.depthFrom) return 'End depth must be greater than start depth.';
  if (values.depthTo > max) return `End depth cannot exceed the borehole's ${max} m depth. All depths are in metres.`;
  if (detail.layers.some(layer => layer.id !== editingId && values.depthFrom < layer.depthTo && values.depthTo > layer.depthFrom)) return 'This interval overlaps an existing layer. Choose an unrecorded depth interval.';
  if (values.sampleId && !detail.samples.some(sample => sample.id === values.sampleId && sample.depth >= values.depthFrom && sample.depth <= values.depthTo)) return 'Choose a sample within this layer’s depth interval, or leave the linked sample blank.';
  return '';
}
