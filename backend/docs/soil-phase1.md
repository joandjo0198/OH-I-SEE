# Soil & Geotechnical — Phase 1

## Scope and architecture

The existing application uses a vanilla JavaScript/Vite frontend, an Express backend, Supabase/PostgreSQL, and an application JWT verified against the users table. The shared ProjectWorkspace shell links Floor Plan, 3D Home, BIM, BOQ and Cost using the public project_id. BIM snapshots produce quantity lines; the current Cost page still uses the project estimate/budget, not a complete model-based pricing engine.

Phase 1 adds the Soil & Geotechnical workspace only. Investigations, boreholes, measured layer logs and sample records can be created, read, edited and deleted. Borehole profiles show recorded intervals, sample positions and observed groundwater. No classifications, calculations, certified approvals, or invented measurements are produced.

Reused components: project-workspace.js, global.css, project-workspace.css, api-core.js/TokenStore, authenticate middleware, existing Supabase client and projects ownership conventions.

New implementation: frontend/pages/project-soil-geotechnical.html, frontend/js/soil/workspace.js, frontend/css/soil-geotechnical.css, backend/src/routes/soil.js and backend/src/services/soil/{domain,service}.js. The page is registered in the Vite production build and shared workspace navigation.

## Storage contract

No migration is needed on the current installation. The existing projects.construction_context JSONB column stores a namespaced soilGeotechnical object:

- schemaVersion: 1
- revision: monotonically increasing integer
- status: Not Started, Data Collection or In Progress, derived from actual records
- investigations, boreholes, layers, samples: validated record arrays
- audit: actor, timestamp, revision, operation and before/after record snapshots

Each record carries its original Project ID, stable ID, record version, creation/update timestamps, updater and Not reviewed status. Engineering approval is not exposed in Phase 1. An Approved or Superseded dataset is read-only.

Every write checks both the submitted soil revision and projects.updated_at. The SQL update filters project_id, user_id and the previously read timestamp. Concurrent changes return 409. Unrelated project context is preserved. There is no memory/localStorage fallback that could masquerade as a durable engineering save. The project must already be persisted and have an update timestamp.

This is bounded Phase 1 storage: 500 boreholes, 2,000 records per other collection, 5,000 audit events and 2 MiB serialized soil state. Pagination reduces response/render work, but the database still reads the bounded project JSON. Before larger datasets or multi-discipline approvals, migrate these collections to indexed project-owned tables and an append-only audit table. Do not silently truncate history or enlarge these limits indefinitely.

## API

All routes require Authorization: Bearer <application JWT> and project ownership.

Base: /api/projects/:projectId/soil

- GET / — project metadata, real summary, lookup IDs and form schema
- GET /investigation, /boreholes, /layers, /samples — paginated records
- GET /{collection}/:id — record details; borehole details include layers and samples
- POST /{collection} — create
- PUT /{collection}/:id — edit without changing the ID
- DELETE /{collection}/:id — delete, refusing orphaned dependents
- GET or POST /boreholes/:id/layers — borehole-scoped layer collection

Investigation uses the singular collection path /investigation. All mutation bodies contain { revision, record }; DELETE needs only revision. Numeric fields must be JSON numbers, and missing optional numeric data is null, never an invented zero. Units are defined in the schema labels (m, mm, degrees and blows). Dates are strict ISO calendar dates.

List query: page (default 1), pageSize (default 20, max 100), search, and optional boreholeId for layers/samples. Search is debounced in the UI. Form failures retain entered data. Every page failure displays a retry action instead of a blank page.

## Validation

IDs are case-insensitively unique within each project collection. Foreign references must belong to the same project. Layer intervals must be increasing, within the borehole and non-overlapping. Sample depths and linked layer depths must agree. Shrinking boreholes cannot exclude saved layers/samples. Latitude/longitude are paired; groundwater and raw SPT counts cannot be negative. Deleting investigations, boreholes or samples with dependencies is blocked. Clients cannot inject reviewed/approved metadata.

The dashboard distinguishes borehole fieldwork completion from engineering approval. SPT/laboratory/report cards are explicitly not recorded/not uploaded; a raw N entry on a layer is not counted as a fully documented SPT test.

## Verification

- npm --prefix backend run test:soil: 14 focused API/domain/storage tests.
- Existing JavaScript suite: 105 tests passed after Phase 1 addition.
- npm --prefix frontend run build: passed, with existing classic-script and chunk-size warnings.
- SOIL_LIVE_TEST=1 npm --prefix backend run test:soil:integration: opt-in local API + actual Supabase test, creates a temporary synthetic auth user/project, verifies CRUD and preserved context, then removes those exact records in finally. Never runs against an existing customer project.
- Browser QA: create investigation/borehole/sample/layers; view profile; reload; edit; search; protected deletion and successful deletion; desktop and 390 px mobile layout.
- Synthetic browser API: node backend/tests/soil-fixture.js (127.0.0.1:3110). It is never loaded by the production server.

Screenshots and browser scripts are under output/playwright/soil-*. Runtime artifacts are ignored by Git.

## Next phases (not implemented here)

2. SPT, groundwater observation series, laboratory tests, classification and source-backed soil parameters.
3. Traceable bearing/settlement engines, profile comparison/export, documents, reports and qualified engineer review/version approval.
4. Foundation workflows and validated calculation modules.
5. Structural models, materials, loads, code-configured RCC/steel/wind/seismic analysis and design checks.
6. Approved structural/foundation BIM quantities into BOQ, pricing and procurement.

Implement each only after its predecessor is tested. Existing architectural controls and quantity/cost behavior are unchanged by Phase 1.
