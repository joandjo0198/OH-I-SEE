# Interior and fixture tools

Convert a reviewed plan to 3D to unlock Interior 2D. Generate a room sketch to unlock Interior 3D for that room. The comparison checkbox and slider use one camera and one rendered frame. Interior PNG includes a room footer. These are editable procedural concept previews, not a photorealistic or construction-certified service.

Open Fixture library, search, and click a fixture then a room, or drag it to the plan/model. Drag placed fixtures to move. Selected fixture provides position, elevation, 15-degree rotation, scale, duplicate/delete, label and light settings. Escape cancels. Pipes accept clicked vertices and finish on double-click. Suggestions are additive and independently undoable. Door/water/fan hints are heuristic review prompts.

`catalog.js` is the single definition list. Sizes are `[width,height,depth]` in feet. Position x/y follows the plan; position z is elevation. Add entries with a stable id, name, category and mount type; customize dimensions in `sizes`. `fixtures3d.mjs` supplies procedural geometry for every item. Optional `modelUrl` should point to a licensed local GLB in `/models/interior/`; document its license alongside the file. Failed model loads retain procedural geometry. No external asset or paid service is required.

Fixtures and layer visibility are part of the existing browser draft and JSON. Restore browser draft explicitly after reloading. GLB exports fixture materials/geometry; OBJ exports geometry. PDF uses the browser print dialog and includes plan symbols/legend. Fixture schedule has CSV and printable PDF. Sketch/render generation readiness resets after plan geometry changes; saved fixtures are retained.

Optional AI enhancement is disabled by default. Set `VITE_INTERIOR_AI_ENDPOINT=/api/your-image-endpoint` in the frontend environment and restart Vite. The endpoint must be same-origin and accept POST JSON `{image, prompt, roomId}` and respond `{imageUrl}` (same-origin or data image URL). Keep provider API keys on the backend. The explicit Enhance button sends a current screenshot only when clicked. Normal interior tools work without this endpoint.

Validation: `node --test backend/tests/floor-plan-studio.test.mjs backend/tests/floor-plan-finishes.test.mjs backend/tests/floor-plan-interior.test.mjs` from repository root.
