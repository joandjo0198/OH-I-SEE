# Homepage architectural preview

The homepage hero is an SVG working-plan illustration. The bounded section below it uses the existing Three.js dependency to show the same plan becoming a house. It is an illustrative concept, not the result of a generation API or a construction-certified design.

## Source boundaries

- `frontend/js/home-architecture-plan.js`: room coordinates, walls and openings in metres; SVG drafting and the non-WebGL axonometric fallback. Keep any future project-design adapter here so the drawing and mesh use the same validated data.
- `frontend/js/home-architecture-scene.js`: procedural geometry, surfaces, camera and lighting. Window and door openings are actual gaps in wall geometry. No downloaded models, textures or generation calls.
- `frontend/js/home-architecture.js`: five scroll stages, keyboard-accessible stage buttons, lazy import, visibility handling and fallback modes.
- `frontend/css/home-architecture.css`: scoped desktop, tablet, mobile and reduced-motion layouts.
- `frontend/pages/index.html`: retained hero actions and navigation, initial inline SVG fallback, transformation section and links to existing project flows.

The stage ranges are 0–20% blueprint, 20–40% floor plan, 40–60% architectural form, 60–80% massing, and 80–100% material/landscape preview. Geometry and camera motion interpolate across the ranges. The scroll region is bounded; the remainder of the homepage scrolls normally.

The renderer loads near the section and renders on scroll/resize. Pixel ratio is capped. Reduced-motion users receive sequential static blueprint, floor-plan and axonometric views without loading Three.js. WebGL failures use the same static views. Motion preference changes are supported at runtime.

## Verification

Browser checks and screenshots are under `output/playwright/`:

- Five stages and reverse scrolling; Enter activates stage controls.
- Desktop 1440×1000, mobile 390×844 and tablet 768×1024 fit checks.
- Reduced-motion first load and runtime switching; WebGL unavailable fallback.
- Existing Build My Project and Build & Supply modals open.
- Hero has no video; obsolete playback handler and runtime video URL removed.
- Production build via `npm --prefix frontend run build`.

Existing homepage console issue observed before this change: `/js/components/notifications.js` returns 404. Existing Vite classic-script warnings remain. These are outside the hero change.

## Full-width hero update

The separate hero blueprint card has been removed. `hero-background.js` now drives the same residence renderer as a transparent background behind the full-width hero copy. Its bounded scroll region builds the house from blueprint to 3D while retaining the headline and working actions in front. The hero maintains a dark contrast layer in both site themes. Reduced motion uses a static architectural background. Shared `site-motion.js` provides text entrances and section/card reveals across public pages.

Verified the background's initial, intermediate and final states, 390 px mobile layout, project modal, reduced-motion switching and production build after this update. Screenshots: `output/playwright/immersive-hero-plan.png`, `immersive-hero-1.png`, and `immersive-mobile.png`.
