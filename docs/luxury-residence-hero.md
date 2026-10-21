# OH I SEE architectural hero

## Active implementation

The existing Vite/vanilla-JavaScript homepage retains its header, routes, authentication, API integration and all four CTA handlers. Hero-only markup adds a title span and a guarded entry bootstrap. `home-luxury.css` controls the fixed composition; `hero-background.js` controls entry, stage UI and scroll; `luxury-residence-plan.js` contains the shared ground/upper walls, openings, balcony and roof; `luxury-residence-scene.js` renders construction; `residence-details.js` builds original furnishing, vehicle, planting and lighting geometry.

The 200svh track pins one hero beneath the measured existing header. The content, canvas and controls have identical bounding boxes throughout the five stages. Mobile reserves the measured content height and the existing 60px bottom navigation. A responsive reflow happens only when viewport dimensions change, not when the construction stage changes.

The seven entry items start at 0.5, 0.8, 1.0, 1.2, 1.4, 1.6 and 1.8 seconds, each lasting 480ms. Transform/opacity/blur animate without changing layout. Focus completes entry immediately. The bootstrap restores content after 2.5 seconds even if the scene module cannot initialize. Reduced motion bypasses entry and opens the completed model with discrete stage controls.

## One model throughout

Blueprint and floor plan use the same wall coordinates/openings as the meshes. Ground walls rise, then upper walls and columns. Slabs and roof reveal at their correct heights. The floor slab has a stairwell opening, and the staircase rises to the first-floor level. Glazing, doors, balcony, cladding, furniture, landscaping and lights appear progressively. The matching elevation drawing fades to a subtle annotation. No photographic image replaces the model at any stage.

PBR materials use local color, normal and roughness maps, world-sized UVs, outdoor HDR reflections, warm local lights and shadows. Desktop adds restrained screen-space ambient occlusion and multisampled render targets. Mobile skips the occlusion pass, reduces planting density and shadow resolution. Vegetation uses shared instanced geometry. Rendering is event-driven apart from the brief initial line drawing.

## Assets and provenance

Wood Floor, Stone Tiles, Concrete Floor 02, and Kloofendal 48d Partly Cloudy Pure Sky are from Poly Haven, under CC0-1.0: https://polyhaven.com/license . These are surface/lighting assets; the house geometry remains original and unchanged in identity. No live third-party service or API is called by the homepage.

Nine 512px JPEG material maps total approximately 514 KB; the 1k HDR is approximately 1.44 MB. Source URLs, source MD5s, delivered SHA-256 hashes, byte counts and processing are recorded in `frontend/public/images/home-design/materials/sources.json`. Downloads were checked against published MD5s before processing. Previously generated house images are unused.

## Validation and limits

`output/playwright/premium-acceptance.js` checks fixed bounding boxes across all five stages and 1920, 1880, 1280, 768, 390 and 375px viewport widths. `premium-entry.js` checks seven timed entry animations, no continuing text animation, slow incremental scrolling, and reduced-motion final state. `architecture-check.js` covers stage reversal, keyboard operation, both hero modals, overflow and no-WebGL fallback. Local screenshots are saved alongside these scripts.

The scene is a detailed real-time procedural visualization. It is not a surveyed construction plan or a photographic render, and it still does not match the reference photograph's fine detail and realism. A production GLB adapter can retain the current `render(progress)` / `dispose()` interface but must preserve the plan dimensions and construction groups. The no-WebGL fallback is explicitly a simplified SVG projection.

Existing unrelated notifications.js 404 and build warnings for classic scripts/Three.js chunk size remain.

## Reference-composition and geometry revision

The narrow-column composition was replaced with a full-bleed canvas, a large single-line desktop heading, reference-sized left CTAs/statistics, and a lower front three-quarter camera. The scene includes a procedural clouded sky dome. The same taller G+1 structure, larger side glazing and balcony remain throughout construction.

The live WebGL blueprint no longer uses an SVG or raster plan texture. `residence-linework.js` builds world-space line segments for walls, openings, door swings, stairs, furniture, parking, balcony, dimensions, north arrow and grid. Room floor zones are box meshes using the shared room coordinates. Small text labels use text-only textures. The SVG remains only as a subtle background annotation and the explicitly simplified no-WebGL fallback.

`luxury-residence-plan.js` is the shared source for wall coordinates, openings, roof, balcony and floor height. The model has separate named groups for base, ground walls, upper walls, slab, balcony, stairs, roof, glazing, finish, garden, furniture, columns and lighting. `inspect()` exposes measured group states for verification. At scroll progress 0, .48 and .58, the ground-wall scale was .001, .455933 and 1 respectively; the roof remains absent until its construction interval. No house photograph is loaded or substituted.

The final geometry has been exported to `frontend/public/models/oh-i-see-residence.glb` (approximately 7.37 MB). This is the same residence, with embedded PBR textures and named construction groups, independently loaded and inspected using GLTFLoader. It is a static export of the completed model; the homepage's procedural model/controller supplies the construction animation. The exported file excludes the distant terrain plane and hidden structural line overlays. It is not automatically downloaded by the homepage.

Additional verification: `reference-model.js` measures the construction transforms and exports the GLB; `reference-glb-check.js` independently loads it and checks meshes/instancing/bounds. Existing stage, accessibility, modal and viewport checks continue to pass. The reference framing is closer, but the real-time rendering is not an exact photographic match to Image 2.

## Latest facade revision

The reference facade now has a deeper balcony-covering roof, actual timber soffit joints and recessed luminaires, pale procedural limestone with geometric panel joints, balcony return glazing, timber entrance reveals, raised planters and denser instanced planting. The roof dimensions remain in the shared plan. The desktop camera is closer and framing is stable through all stages.

Rectangular warm lights supplement the interior and carport in the live scene. Standard glTF export does not include these rectangular lights; the exported GLB retains its point lights, geometry and materials but requires environment/area lighting in a viewer for the same presentation. The old stone-tile maps remain on disk for provenance but are no longer loaded by the scene.

The 1880 x 836 reference-size test found and fixed a statistics/stage-navigation overlap. The acceptance check now explicitly asserts separation at six viewport sizes. Production build and geometric extrusion checks pass. Fine architectural detail, vehicle/vegetation quality and photographic lighting still differ from the supplied reference; this is not an exact reconstruction. The local product API is unavailable while its separate backend is stopped, independently of the hero.

## Automatic entry construction

On entry near the top of the page, the live model holds the blueprint for 0.65 seconds and automatically constructs over 6.5 seconds. It holds the finished geometry afterward, including across resizes. Playback pauses when the document is hidden or the hero is outside the viewport. Scrolling or selecting a stage takes control immediately. Reduced-motion users retain a static completed view and discrete stage navigation. No house image is introduced.

`automatic-construction.js` verified progress 0 -> 0.31 -> 1, unchanged scroll position and content bounds, final-state persistence on resize, and manual stage takeover. The production build passes. This controller update does not resolve the outstanding photographic fidelity gap to the supplied reference.

## Exact supplied image after completion (latest user direction)

The user's latest instruction explicitly requests replacing the completed model view with the second supplied image. The automatic sequence still builds real geometry, then switches at progress 1 to `reference-final-exact.png`. This is an unmodified copy of the user attachment, SHA-256 `797353CCD2CB305CC60888AA09815DB9ADE4D925B2E70B03A5984917DFFFC39E`. It is a photographic reference handoff, not a claim that the procedural model has become photorealistic.

CSS excludes the screenshot's baked header, preserves the complete hero composition without stretching, and retains the existing live site header. Four accessible controls over the supplied button positions keep both modal actions and destination links. The covered live controls are inert while this final view is visible. A replay button returns to the construction sequence. Differently proportioned screens use dark space around the reference rather than crop its text or distort the image.

`exact-reference-check.js` verified automatic completion at scrollY 0, final image loading, both CTA modals, destination links, replay, and reduced-motion final view. Production build passes. Earlier acceptance scripts that assume the original stage navigation remains clickable over the completed scene need to use replay first under this new final-image behavior.


Latest alignment update: construction now takes approximately 7–8 seconds in the browser (7.828 seconds measured). The desktop renderer and final image use the same centered 1880:763 frame at 1880px and 1167px widths. Camera aim, parking position, entrance tree and balcony tree were adjusted against the supplied reference to reduce the positional jump. The different house silhouettes and plant/car meshes still prevent pixel-identical object outlines.

## Full-screen final view

The latest user request removes letterboxing. The reference frame now fills the hero bounds in both dimensions, scaling the image and its percentage-based button targets together. Desktop WebGL uses the same full hero bounds with the reference camera aspect, preserving the alignment under this scaling. This intentionally stretches the reference at differing aspect ratios instead of leaving black bands. Verified exact frame/hero bounds at 1482x866, 1167x836, 1880x836 and 390x844, plus the project CTA. This supersedes the earlier centered-frame/letterbox notes.

## Static image hero — current implementation

The user explicitly removed the conversion requirement. The homepage now renders the supplied image directly in HTML from first load, with eager loading and preload. The live header and four accessible button/link targets remain. Construction markup, replay, stage navigation, the 200svh animation track and the controller import have been removed from the active homepage. `home-architecture.js` only measures the header; it does not import Three.js or `hero-background.js`. Historical 3D source/assets remain unused on disk.

The static image fills the available hero without letterboxing. The live navigation collapses at intermediate desktop widths to avoid overflow. `static-image-check.js` verified no 3D resource requests, no construction controls, no excess track height, four viewport sizes, both modal CTAs and no uncaught page errors. This supersedes all earlier conversion/handoff descriptions in this document.
