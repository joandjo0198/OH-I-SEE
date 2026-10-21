# OH I SEE Floor Plan Studio

Open `http://127.0.0.1:3000/pages/visualizer-3d.html`. This is the existing
3D Visualizer entry point. The previous AI rendering interface remains at
`/pages/ai-renderer.html` and is linked from the studio header.

## Run locally

The studio uses the existing Vite + Three.js frontend and Express API. A separate
FastAPI service is unnecessary: Express runs a bounded Python process for image
analysis. No OpenAI key is needed for the studio or local OCR.

```powershell
# From the repository root. Node 20+ and Python 3.13 are supported.
npm --prefix frontend ci
npm --prefix backend ci
py -3.13 -m venv backend/.venv-floorplan
backend/.venv-floorplan/Scripts/python.exe -m pip install -r backend/floorplan/requirements.txt

# Separate terminals:
cd backend
npm run server
# From the root in another terminal:
npm --prefix frontend run dev
```

On Linux use `python3 -m venv backend/.venv-floorplan` and
`backend/.venv-floorplan/bin/pip install -r backend/floorplan/requirements.txt`.
`FLOORPLAN_PYTHON` overrides the detector's Python executable path. RapidOCR's
installed package supplies the local OCR models. The normal API database and
authentication configuration is unchanged; the studio's browser drafts do not
write into existing customer projects.

For deployment, retain the repository's `backend` and `frontend` sibling
directories: the detection adapter imports the same model module as the browser.
Include the Python environment and models in the backend host/container. The
existing generic backend image does not install these optional detector packages;
without them only upload detection is unavailable. Form generation and reference
conversion remain entirely client-side. `npm --prefix frontend run build`
includes the studio and retained AI renderer.

## Files and data contract

- `backend/src/schemas/floor-plan.schema.json`: JSON Schema, version 1.
- `docs/examples/floor-plan-reference.json`: importable reference-plan example.
- `frontend/js/floorplan/model.mjs`: reference fixture, form generator, geometry
  validation, wall and opening representation, and opening subtraction.
- `frontend/js/floorplan/plan-svg.mjs`: editor/print SVG with blue walls, room
  dimensions, compass, road, gate and plot-area title block.
- `frontend/js/floorplan/viewer.mjs`: metre-based Three.js model and cameras.
- `frontend/js/floorplan/studio.mjs`: editor, review flow, draft storage and exports.
- `backend/floorplan/detect.py`: image/PDF preprocessing, deskew, blue/dark wall
  masks, OCR labels/dimensions and editable geometric hypotheses.
- `backend/src/routes/floorplan.js`: multipart upload adapter, temporary-file
  lifecycle, rate/concurrency limits and OCR opening-label association.
- `backend/tests/floor-plan-studio.test.mjs`: model, reference, geometry, units,
  adjacency, orientation and SVG tests.

Canonical geometry uses feet: `x` increases to drawing right, `y` to drawing
bottom, with the plot origin at top left. Room dimensions are **nominal spans**,
not guaranteed finished clear dimensions. Wall centre lines use horizontal/vertical
axis, fixed coordinate, start/end, owners and external/internal classification.
Openings reference a wall ID and carry offset, width, sill and height. Their
volumes are removed from walls, including overlapping cuts. Exports use metres
and rotate the model so the selected facing points in its geographic direction
(world north is negative Z).

## Workflows

1. **Reference:** load the 32 × 55 ft example. The 13 supplied room/porch dimensions
   are preserved, plus an interpreted outside staircase. Review the notes and
   check the review box, then Convert to 3D.
2. **Form:** choose plot, units, setbacks, room counts and optional preferred sizes.
   Generate 2D Plan creates bedroom suites with attached-service access, adjoining
   kitchen/dining zones and central circulation. Infeasible requests return an
   error rather than silently dropping rooms or reducing preferred dimensions.
   The Vastu toggle is a directional preference, not a certification.
3. **Upload:** choose a PNG/JPEG/PDF (6 MB maximum), select the PDF page and Detect
   layout. The detector runs locally. Compare the source overlay and OCR output,
   select a known room and calibrate its verified width. Edit geometry and resolve
   all overlap/setback errors, then review and convert. Unknown scale is visibly
   provisional and cannot be converted until calibration is confirmed.
4. Drag room interiors to move them; drag walls to resize their owning rooms.
   The inspector edits name, position and size. Add/remove rooms and Undo support
   correcting incomplete detections. Editing room geometry regenerates openings;
   review them afterward. JSON allows individual wall/opening edits.
5. Orbit, top cutaway and walkthrough are available. Walkthrough uses WASD/arrows
   and drag to look; it is free movement without collision detection. Roof and sun
   hour controls are available (illustrative sun movement, not a geolocated solar
   study). GLB includes materials; OBJ is geometry-only. PNG exports the current
   view. 2D PDF / Print uses the browser's print dialog: choose Save as PDF.

Drafts use this browser origin's localStorage. Export JSON to transfer or retain a
copy. Upload images are temporary and are not saved into the draft. Refresh does
not overwrite the previous draft; use Restore browser draft.

## Reference-image findings and limits

The supplied 350 × 607 raster yields 13 labelled spaces and useful room dimensions
in local OCR. It reads the attached toilet as 4 ft 6 in × 4 ft rather than the
specified 6 ft 6 in × 4 ft. Stair geometry has no complete dimension label.
Openings and incomplete wall boundaries can be ambiguous; candidate rooms can
overlap. These are surfaced for correction, not silently labelled accurate. Use
the explicit reference fixture for the stated 6 ft 6 in toilet dimension and
all other user-supplied nominal sizes. Arbitrary drawings are not guaranteed to
be reconstructed exactly by OCR; higher-resolution scans improve results.

The reference's footprint, room spans, setbacks, staircase and 31 ft porch do not
provide a fully reconciled construction drawing. Preserving the stated values
leaves interpreted gaps and a porch/staircase occupying setback space. The model
is a design concept with explicit review notes, not a construction approval.

## Validation

```powershell
node --test backend/tests/floor-plan-studio.test.mjs
npm --prefix frontend run build
```

The API accepts `POST /api/floorplan/detect` multipart fields `plan` and `page`.
Uploads are content-sniffed; 24-megapixel image and 6 MB file limits apply. Only
one detector runs at a time, with a 150-second timeout and five requests/minute.
Output is capped and temporary input files are removed after completion.


## Colours and textures

The 3D studio includes 48 local swatches across paint, timber, tile, marble,
stone, brick and concrete. Search by name, library code (for example WD-001),
HEX value or texture. Codes belong to this design library, not a manufacturer.
Click an exposed floor, wall or roof in the model, or choose a surface in the
area selector; the yellow outline identifies the target. Clicking a swatch
updates that surface immediately and saves its finish to the browser draft.
Custom HEX colours can be paired with any texture. Undo finish and Reset area
restore earlier/default appearances without changing geometry.

Finish choices are stored in the plan's optional `finishes` map using `floor:<roomId>`,
`wall:<wallId>` and `roof` keys. JSON and GLB retain the selected finishes; PNG
captures the current view. OBJ is geometry-only. Procedural textures are created
locally and are indicative rather than manufacturer samples. Selecting a wall
changes both faces and all wall pieces around its openings. Geometry edits keep
finishes on unchanged walls and drop finishes on changed walls to avoid assigning
them to a different wall accidentally.
