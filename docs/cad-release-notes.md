# CAD project-creation release

The millimetre CAD model now supports one to four floors, subject to room fit.
Upper floor slabs contain aligned stairwell openings. The front arrival landing
remains solid; the two flights and middle landing occupy the opening. The top
floor gets an upward flight only when roof access or terrace is selected.
Saved BIM, 3D meshes and slab quantities use the same openings. Missing or moved
openings fail validation before export. Top-floor arrival audits do not require
a fictitious extra upward flight.

Outputs remain design studies, not approved construction drawings. Structural
grids, site-specific headroom/beam checks, statutory review, DWG conversion and
DXF paper-space layouts require further work. Exact dimensions that conflict
with minimum room criteria are rejected.

The previous legacy BIM success fixture requested too many rooms for its
setbacks and stair zone. Generation, quantity and editing tests now use a
feasible 60 x 50 ft site; the overcrowded 30 x 40 ft programme has an explicit
rejection test. No fit validation was disabled or rooms silently removed.

Verification: 37 CAD tests, 12 BIM tests, 2 actual Three.js geometry tests,
construction/API tests and frontend production build.
