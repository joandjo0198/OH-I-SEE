You are a senior full-stack engineer and a civil/architectural engineer. Fix and upgrade the "Land & Site -> Requirements -> Generate Design Options" flow of my React/Vite app so that it generates a professional, Vastu-compliant, dimensionally exact floor plan for any customer input. Use the reference plan below as the ground truth for tests.

REFERENCE PLAN (ground truth)
- Plot 32' W x 55' L = 1760 sq.ft, East-facing, road on the east, 1 road side.
- Setbacks: front (road) 6'6", rear 3'6", left 3'6", right 3'6".
- Buildable envelope = (32-3.5-3.5) x (55-6.5-3.5) = 25' x 45' = 1125 sq.ft. Sitout 31'x6'6" sits in the front setback.
- Sizes below are clear internal dimensions (wall thickness is deducted separately):
  Master Bedroom 11'3"x20'; Attached Toilet 6'6"x4' + Dressing 4'6"x4'; Kid's Bedroom 11'6"x11'; Passage 6'x7'6"; Puja 5'x7'; Common Toilet 6'6"x4' + Dressing 4'3"x4'; Dining 12'x8'; Living 11'6"x9'3"; Kitchen 11'3"x10'; Drawing Room 11'6"x10'.
- Vastu placement (road/entrance at the bottom of the drawing = East): Master SW; Kitchen SE; Puja NE/N; Drawing/Living NE-E; Kid's bedroom NW; Dining between kitchen and living; main door East.

CURRENT BUGS
1. Buildable footprint shows 1315.7199999 sq.ft: floating-point error, and it ignores the side setbacks. Rear setback shows 1.6 ft, which is wrong.
2. Buildable area (2.3 and 3.1) is not computed correctly and is asked for again in 3.1.
3. "Auto calculate room sizes" uses generic sq.ft values (Master 175, Bed2 146, Living 204, Dining 116, etc.) instead of proper room dimensions and proportions.
4. Clicking "Generate Design Options" fails with: Room "Dining" does not fit at its requested dimensions. No room sizes were reduced.

REQUIRED CHANGES
A. Single source of truth: create a pure, unit-tested function computeSite(plot, setbacks) that returns { envelopeWidth, envelopeDepth, buildableArea } with:
   envelopeWidth = plotWidth - left - right; envelopeDepth = plotLength - front - rear.
   - Plot area is auto-calculated (read-only). Buildable area is auto-calculated and read-only in 2.3, then only displayed in 3.1 (never asked again).
   - Setbacks are required for all four sides (front, rear, left, right), with defaults for Tamil Nadu residential rules that the user can edit.
   - Work internally in inches (integers) or round to 0.25 ft. Display feet-inches (e.g. 11'3"). Never show raw floats.
   - Validate: setbacks cannot exceed the plot, and the envelope must be >0.
B. Replace the percentage/area-based "Auto calculate room sizes" with a rule-based layout engine:
   - Room catalog with min/preferred/max width x depth, aspect-ratio limits (<=1:2 for habitable rooms), and attached-bath and dressing rules.
   - Inputs: envelope dims, road-facing side, number of bedrooms/floors, and selected rooms (pooja, home office, parking, etc.).
   - Vastu zone map per road facing (East, West, North, South) that maps each room to its preferred zone (use the reference for East).
   - Layout method: divide the envelope into a grid of zones (3x3 Vastu grid), place rooms in their preferred zones, then use a constraint solver/guillotine-cut packing to resolve widths and depths so every row and column sums exactly to the envelope minus walls.
   - Sizes should land on the reference values when the inputs match the reference plot (32x55, East, 2BHK + puja + drawing room).
   - Wall thickness: 9" external, 4.5" internal, deducted from the usable area. Passage, toilets, dressing and stair areas are part of the plan, not "remaining".
   - If rooms don't fit, auto-scale non-critical rooms (within min sizes) in this order: drawing/living -> dining -> bedrooms -> kitchen. Then show a clear message listing exactly what changed, and never fail silently.
   - If it is impossible, return which rooms to remove or which envelope dimension is short, with numbers.
C. Fix the "Dining does not fit" error: the check must compare against the placed grid cell (width x depth after walls), not total area. Add the dining/living combined-hall logic as in the reference (open dining + living, 12'x8' dining).
D. One floor-plan JSON drives everything: after generation, store a canonical plan object { envelope, walls[], rooms[{id,name,x,y,w,h,zone,doors,windows}], setbacks, facing }. The 2D floor plan, room schedule, area statement, 3D exterior, 3D interior, structural (column grid/beams), electrical, plumbing and BOQ must all read from this same object. No module may recompute its own dimensions.
E. 2D output must look like a professional drawing: the plan rotated so the road faces the bottom, blue wall fills, door/window symbols, room labels with sizes in ft-in, overall dimension lines, north arrow/compass, area statement (plot, built-up, carpet, setback areas) and title block.
F. Add 3-4 design options (Vastu-strict, max-space, compact) as separate plan objects, all validated.
G. Tests (Vitest/Jest): the reference plot must give envelope 25x45, buildable 1125 sq.ft, all rooms placed with zero overlaps, zero gaps beyond wall thickness, every room >= its minimum size, and the Vastu zones as listed. Add extra cases for 30x40 North, 40x60 West, and a narrow 20x50 plot. Assert that no float artifacts appear in the UI.

Deliver: the changed files, the new utils (siteCalc.ts, roomCatalog.ts, vastuRules.ts, layoutEngine.ts), the updated components, and a short summary of how each bug above was fixed.