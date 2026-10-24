ROLE
You are a certified civil/structural engineer and CAD manager with 15+ years in a corporate architectural consultancy, and also a senior React/TypeScript engineer. Build a floor plan generator whose output is a CAD-grade drawing set that could be issued to a client, a Tamil Nadu local body for plan approval, or a contractor. Boxes with room names are a failure.

QUALITY BAR
Reference: the manually drawn East-facing plan (32'x55' plot, 3'6" side/rear setbacks, 6'6" front setback, sitout 31'x6'6", external staircase, MD, MG). For that exact input, reproduce its room sizes, Vastu zoning and drawing style.

DEFECTS TO FIX (all mandatory)
1. Car parking drawn though input was blank/"No". Blank, 0, "No" and unchecked mean NOT REQUESTED.
2. Rooms overlap; no partition walls.
3. Labels float outside rooms.
4. No main door, internal doors, windows or ventilators.
5. No road, road label, main gate or sitout.
6. No compass.
7. No staircase.
8. Toilets lack WC, wash basin and dressing detail.
9. Dimensions do not tie to plot/setbacks; width and depth swapped.
10. No passage or circulation; not a coherent plan.

1. CAD STANDARDS (AutoCAD conventions)
- Unit: millimetres, integer model space, drawn at 1:1. Origin (0,0) at the SW corner of the plot. Display feet-inches or mm by toggle. Never show raw floats.
- Codes: IS 962 (drawing practice), NBC 2016 Part 3 (development control) and Tamil Nadu Combined Development and Building Rules 2019. Keep all limits in one editable config file (rules/tnbc.ts), not hard-coded.
- Layers (name | colour | linetype | lineweight):
  A-PLOT (white, continuous, 0.35) plot boundary
  A-SETBACK (red, DASHED, 0.25)
  A-WALL-EXT (blue, continuous, 0.70) 230mm brick, SOLID hatch
  A-WALL-INT (blue, continuous, 0.50) 115mm
  A-COLS (cyan, continuous, 0.70) column marks
  A-DOOR (green, continuous, 0.25) with swing arcs
  A-WIND (cyan, continuous, 0.25)
  A-STAIR (magenta, continuous, 0.25) steps and UP arrow
  A-FURN (grey, continuous, 0.13)
  A-FIXT (grey, continuous, 0.18) WC, basin, sink, hob
  A-DIMS (yellow, continuous, 0.18)
  A-ANNO-TEXT, A-ANNO-TTLB, A-ANNO-NPLT (north/compass), A-ROAD, A-GRID (center linetype), A-HATCH
- Text styles: ISO 3098 or Arial. Plotted height 2.5mm for notes, 3.5mm for room names, 5mm for titles. Dimension style: architectural ticks, arrow size 2.5mm, text height 2.5mm, 1:50 scale, extension line gap 1.5mm.
- Wall geometry: draw double-line walls with a cleaned joint network (T, L and + junctions trimmed like AutoCAD's WALL CLEANUP). Cut real openings in the wall for doors and windows. Plastered wall faces are the room clear dimensions.
- Blocks: define reusable blocks (door, double door, sliding window, ventilator, WC, wash basin, kitchen sink, hob, bed, sofa, dining set, compass, north arrow). Insert them with attributes (mark, size).
- Column grid: structural grid with bubbles A-B-C and 1-2-3, column marks (C1 230x300). Columns sit at wall junctions and sit inside the walls.

2. INPUT NORMALISATION
- Only generate what the user explicitly requested. Remove all hidden defaults (car parking, two-wheeler, home office, etc.).
- Auto-add only what the plan needs (passage, toilets, staircase) as "system rooms", tag them "auto-added", and list them in the area statement.
- Build a validated InputModel and log it in dev mode so every drawn element traces to an input.

3. SITE MODEL
- Plot -> setbacks (front, rear, left, right) -> buildable envelope in integer mm. Setbacks come from the TNCDBR config and are editable. Validate they do not exceed the plot.
- Rotate the drawing so the road is at the bottom for East/West/North/South facings. Keep a true-north angle for the compass.
- Compute plot area, built-up area, carpet area, FAR/FSI and ground coverage from the plan object only.

4. LAYOUT ENGINE (rule-based, deterministic)
- 3x3 Vastu grid. East facing: Master SW, Kitchen SE, Pooja NE, Living/Drawing NE-E near the entrance, Kids/Guest NW, Dining between kitchen and living, Toilets on W/NW, Staircase SW/S/W or external in the setback, Main door East. Provide zone maps for the other three facings.
- Circulation spine: passage 1.05m minimum clear (1.2m preferred). Every room opens onto a passage, hall or another room. No room is reached only through a toilet.
- NBC minimums (config): habitable room >= 9.5 sq.m with min width 2.4m; kitchen >= 4.5 sq.m with width 1.8m; bathroom >= 1.8 sq.m with width 1.0m; WC >= 1.1 sq.m with width 0.9m; combined bath+WC >= 2.8 sq.m; clear height >= 2.75m.
- Attached toilet (WC, wash basin, shower) plus dressing for bedrooms. Common toilet near the passage. Toilets and kitchen on external walls.
- Rooms share walls: zero overlap, zero gap. Width = E-W and depth = N-S in the schedule, the drawing and the labels.
- VALIDATION GATE before drawing: no overlaps, everything inside the envelope, rows and columns sum to the envelope, every room >= minimum, every habitable room has an external wall. On failure, auto-adjust (drawing -> dining -> bedrooms -> kitchen), report exactly what changed, and never render an invalid plan.

5. DOORS, WINDOWS, STAIRS
- MD 1.07m (3'6"), facing the road, opening to the sitout/living. MG on the road boundary. Bedroom door D 0.9-1.0m, toilet door D1 0.75m. Swing arcs must not collide.
- Window sill 0.9-1.0m, lintel 2.1m. Every habitable room has at least one window on an external wall with glazed area >= 1/10 of floor area (config). Kitchen window above the platform. Toilet ventilator V 0.6x0.45m, high level.
- Schedules: door schedule (mark, width, height, count) and window schedule (W, W1, V). Drawing marks must match the schedules.
- Staircase (calculated, not drawn freehand): riser <= 190mm, tread >= 250mm, width >= 1.0m (1.07m preferred), landing >= width, headroom >= 2.2m. Risers = floor height / riser. Treads = risers - 1. Draw step lines, the break line, an UP arrow and the text "UP - 16R @ 172mm". Include the stairwell on every floor and a stair cabin/headroom on the terrace.
- Sitout and parking are drawn only if requested. If parking > 0, place it in the front setback or a ground floor bay without overlapping rooms.

6. DRAWING SHEETS
Generate a multi-sheet set in paper space (A3 landscape, 1:100 for the overall plan, 1:50 for detail), each with a title block:
- A-01 Site plan: plot boundary, setbacks, road with width and label "ROAD", MG, north arrow, area table.
- A-02 Ground floor plan: walls, openings, stairs, column grid, room tags (name + size in ft-in), overall and chain dimensions on all four sides, compass rose with true angle, "EAST FACING PLAN" title.
- A-03 Furnished plan: furniture and fixtures.
- A-04 Schedules: room schedule, door and window schedules, area statement (plot, built-up, carpet, setback areas), legend (D, D1, W, V, MD, MG, PD), notes (wall thickness, brick, sills, lintels).
- Title block: project name, project ID, date, scale, drawn by, checked by, sheet number, revision table.
- Room labels are centred and auto-scaled inside rooms, with collision detection and leader lines for small rooms.

7. EXPORT
- DXF output (R2018) via a library such as dxf-writer or @tarikjabiri/dxf, with real layers, blocks, DIMENSION entities and layouts. Open it directly in AutoCAD, BricsCAD or DraftSight. Add a server-side DWG conversion option (ODA File Converter).
- PDF (vector, A3) and PNG. In the browser, an SVG preview with Fit, Zoom, Layers toggle and Print view, readable on a 380px screen.

8. ONE PLAN OBJECT
Canonical JSON {facing, units, envelope, setbacks, grid, columns[], walls[], rooms[{id,name,type,x,y,w,h,zone,doors[],windows[]}], stairs, sitout, road, compass}. The 2D plan, DXF, schedules, area statement, 3D exterior and interior, structural, electrical, plumbing and BOQ all read from it. No module recomputes geometry.

9. TESTS (Vitest)
- Reference input (32x55 East, 2BHK + pooja + drawing, no parking): room sizes within 75mm of the reference, zero overlaps, MD present, windows >= habitable rooms, stair present, compass present, no parking.
- Parking = 2: placed without overlap. Blank parking: no parking in the output.
- Extra plots: 30x40 North, 40x60 West, 20x50 narrow.
- DXF test: required layers exist, every DIMENSION entity matches the plan object, no text overlaps, all labels inside their room bounds.

DELIVERABLES
Changed files; new modules (inputNormalizer, siteCalc, tnbcRules, roomCatalog, vastuRules, layoutEngine, planValidator, stairCalculator, cadWriter, drawingRenderer, dimensionEngine, sheetComposer); sample DXF and PDF for the reference plot; a before/after screenshot; and a short note on how each of the 10 defects was fixed.