# CAD project-creation release

This release adds explicit room selections, deterministic millimetre plan generation, validation and saved-model SVG, PNG, vector PDF and model-space DXF exports.

Outputs are design studies, not approved construction drawings. Multi-floor CAD generation is blocked until stair slab openings are validated. Structural grids, detailed headroom, statutory review, DWG conversion and DXF paper-space layouts remain incomplete. Exact dimensions that conflict with minimum room criteria are rejected.

Validation: frontend build, 30 CAD tests, 16 construction/API tests. The legacy BIM suite has six existing small-plot fit failures reproduced using the published requirements parser; these are not certified as resolved by this release.
