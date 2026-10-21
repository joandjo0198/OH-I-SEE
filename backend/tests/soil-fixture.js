'use strict';
// Synthetic project API for automated tests; never mounted in the application.
const { app, records, reset: resetRecords, token } = require('./marketplace-fixture');
function reset() {
  resetRecords();
  Object.assign(records.projects[0], { updated_at: '2026-09-23T00:00:00.000Z', project_name: 'Soil QA Project', construction_context: { landSite: { city: 'Coimbatore' }, homeDesign: { keep: true } } });
}
reset();
app.use('/api/projects/:projectId/soil', require('../src/routes/soil'));
app.get('/__test__/session', (req, res) => res.json({ token: token('c1') }));
module.exports = { app, records, reset, token };
if (require.main === module) app.listen(3110, '127.0.0.1', () => console.log('Soil synthetic API on 3110'));
