# Fixed-camera construction hero

Uses the existing Three.js residence with fixedConstruction enabled. The former video remains only as a static fallback poster; no video is played.

Construction phases: foundation, columns, ground-floor walls, slab, upper walls, stairs, balcony, roof, services, glazing/furniture, finishes and lights. Parts translate vertically by up to 0.65 model units and fade; their dimensions and final coordinates remain unchanged. The garden and car remain stationary. Elevated planting appears with finishes. Camera setup runs only on resize and never depends on animation progress.

Playback lasts 18 seconds of active rendering and holds the completed house. Pause/Replay, hidden-page suspension, reduced motion, resize observation and disposal are supported. Existing consumers of the residence renderer retain their original behavior.

Validation: Vite build passed; browser camera/projection arrays and mesh scales unchanged across moving frames; reduced-motion progress=1; mobile horizontal overflow=false; desktop and mobile screenshots inspected. Existing local notification-script 404 and unavailable local products API remain unrelated to this change. No claim of photorealistic equivalence to the original image. Navigation and business logic were not modified.
