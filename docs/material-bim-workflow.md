# Materials and BIM workflow — implementation status

## Implemented
- Project-owned material schedules with optimistic concurrency and immutable revision snapshots.
- Approved vendor product selection; frozen identity, vendor, specification and price snapshots.
- Catalog specification editor and administrator approval; vendor edits return to pending review.
- Room coordinates, grid placement, rotation, host IDs and fixture light settings.
- GLTF assets, surface materials and explicit magenta dimensional fallbacks.
- Real spot lights with lumens, temperature, beam, brightness and enabled state.
- Geometry quantity calculations, wastage, ancillary costs, tax, stock aggregation and grouped estimates.
- Critical validation gates for final CSV and procurement drafts; drafts do not contact vendors.

## Database status
The migration has been applied to the configured Supabase project. All four tables are available through the API. A rollback-only transaction verified schedule insertion/update, automatic revision history, service-role permissions and restricted client permissions. No test records were retained. The database connection is configured privately in backend/.env.

## Verification
- `node --test backend/tests/material-workflow.test.js`: 8 tests passed.
- Frontend Vite production build passed, including the material catalog entry.
- Browser WebGL check: six fixtures produce six scene objects and six spot lights; disabled light has zero intensity; different temperatures produce different colors.
- Database migration and rollback-only persistence verification passed.

## Still required for the full brief
This is an initial integrated workflow, not the complete production system. Remaining work includes uploaded drawing recognition and correction, managed category hierarchies, richer specification forms, drag/snap placement, physical clash and circuit/plumbing connectivity checks, product asset ingestion/security, Excel/PDF exports, production operations, and end-to-end persistence/security tests after migration. The existing main BIM dashboard is not yet synchronized with this new product preview. Current catalog management lists the first 100 accessible products. Night mode is a preview preference; individual fixture settings persist with selections.
