# Adaptive floor planner
Open /pages/template-planner.html, or Adaptive Floor Planner in a project workspace.
A project link carries projectId; saving is authenticated and owner-scoped with optimistic concurrency. It saves a concept in construction_context.templatePlan. It does not replace existing BIM versions or their engineering/BOQ outputs.

## Implemented
- A for envelopes >=30 ft wide; B for narrower envelopes.
- Integer-inch geometry, 3-inch internal band snapping, 38%/29% band targets with bedroom minimum allocation.
- Canonical room cells, shared walls/openings, fixtures, stairs, site, compass, tables and indicative quantities.
- The SVG and interactive 3D cutaway consume the same generated geometry.
- Server regenerates from input options rather than trusting submitted geometry.
- Invalid minimum sizes, unavailable optional room slots and unavailable parking bays stop rendering.
- Ground-floor concepts only. JSON/SVG exports and owner-scoped draft save.

## Reference conflicts and limits
Template B is an adaptation, not an exact reproduction: specified clear column widths plus walls do not fit the stated 25-ft envelope; the reference depths do not share a single rectangular tiling. Actual cell dimensions and reference differences appear in the UI.
The adaptive layout moves attached toilets to the rear, omits separate dressing rooms, and combines drawing/living on compact plots. The requested 31-ft sit-out cannot fit a 25-ft buildable width and is not fabricated.
Exterior stairs are shown only when a reserved 6-by-12-foot footprint fits; otherwise the UI warns. A requested stair is not a verified inter-floor circulation design.
Central Template A dining has no external wall; this is explicitly flagged, rather than placing a fake interior window. This means the original every-habitable-room-has-an-external-window criterion is not met by the supplied A topology.
Minimum tests use gross cells, not clear wall-face dimensions. Fixtures that cannot fit without obstructing openings are omitted and reported. These concepts need further design review.
Structural/MEP fields contain coordination references only; no engineering sizing. Wall quantity is indicative and can double count intersections.
A/B generation does not yet replace the existing multi-floor BIM generator.

## Verification
Vitest covers three requested plot sizes, no overlaps, exact tiling, adjacency/opening clearance, opening collisions, compass, table totals, invalid inputs and parking/optional-room rejection. An additional test enforces exact parity of frontend deployment copies with backend canonical modules.
Run with a Vitest-compatible Node version:
node backend/node_modules/vitest/vitest.mjs run backend/tests/template-a.test.mjs backend/tests/template-planner.test.mjs
npm --prefix frontend run build

The canonical modules live in backend/src/cad. Their frontend copies are required because frontend and backend are deployed with separate Vercel root directories.
