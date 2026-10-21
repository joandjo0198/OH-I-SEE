# PRJ-89790 — blueprint acceptance review

28 September 2026. Existing version 3 is retained, not approved.

## Confirmed inputs
- North frontage 32.1 ft; depth 68.5 ft; G+1.
- Setbacks: front 10 ft, rear/left/right 5 ft.
- Plot: 2,198.85 sq.ft. Buildable envelope: 22.1 × 53.5 ft = 1,182.35 sq.ft per floor.
- Total built-up cap: 2,000 sq.ft. Strict traditional Vastu target: 85/100.
- Room areas have not been reduced. Bathroom dimensions remain assumed.

## Current draft findings
- Built-up: approximately 2,110 sq.ft, 110 sq.ft above the cap.
- Preliminary centroid-based Vastu score: 29/100; not certification. Non-applicable pooja weight is excluded and the remaining applicable weights are normalized to 100.
- Parking crosses the buildable envelope into setbacks.
- Some external glazing areas are too small; opening fractions are absent.
- Stair risers, treads and headroom are unverified.
- Connectivity, exact dimension/grid checks, fixture positions, vertical wet-room separation and detailed entrance padas are not fully implemented. They remain explicit failures, never presumed passes.

## Implemented
- Project-specific policy stored separately from model requirements, so generated data cannot loosen it.
- Current model retrieval attaches an acceptance report and review status.
- Validation reports failures. Generation rejects a failing candidate before snapshot persistence, preserving the current version.
- Floor-plan PNG/PDF buttons are disabled for the rejected draft. Other export modules have not been changed.
- Report includes area budget, provisional weighted breakdown and failed/unverified checks.

## Verification
- 36 regression tests passed; frontend production build passed.
- Database readback confirmed version 3; failed generation left version ID unchanged.
- Isolated browser test used the live model with intercepted API responses: score and budget displayed, eight breakdown rows, PNG/PDF disabled, no page errors.

## Outstanding work
This is an acceptance gate and diagnostic report, not a completed compliant-layout solver. The requested compliant SVG/JSON floor plans have not been issued. The 2,000 sq.ft cap alone does not prove the brief infeasible; the present corridor layout exceeds it.
The saved brief also includes pool, lift, home theatre and basement/visitor parking without sizes. Their inclusion versus deferral remains a user decision before a fully budgeted redesign. No extras have been silently removed.
