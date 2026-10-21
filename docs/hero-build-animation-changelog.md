# Hero build-animation changelog

- Outputs: frontend/public/videos/hero-animation.mp4 (H.264/yuv420p), hero-animation.webm (VP9/yuv420p), hero-poster.png.
- Resolution: 1882 × 836. H.264/yuv420p requires even dimensions, so the requested 1881 width is rounded up by one pixel.
- 30 fps assumed because a JPEG ZIP contains no timing metadata. Source order retained for frames 001–260.
- Frames 261–300 excluded from playback: they contain the double-exposure / baked-in website transition, including frame 280.
- Replacement ending: 12-frame blend to the existing clean finished-residence image, 10-frame hold, 12-frame blend back to frame 001. Total: 294 frames / 9.8 seconds. This is an editorial blend, not a newly rendered physical reassembly.
- All 300 original frames were retouched using a local mask without cropping; lossless versions remain in output/hero-retouched. The final video adds optical-flow-aligned 20% preceding-patch blending to stabilize the repaired area.
- The plumbing typo was corrected in 108 confidently template-matched frames. Automated matching is conservative and is not a guarantee that every changing/generated text variant is corrected.
- Prepared a dark 42% left text-safe zone and feathered transition into the house; source labels in this zone are concealed. Live site text/buttons/navigation remain HTML.
- Poster uses the existing clean house asset. Exact source-camera/reference geometry matching is not achievable through resizing; the final poster blend changes camera composition.
- MP4 approximately 4.5 MB; WebM approximately 4.8 MB. No audio.

## Verification
Production build passed. Browser checks passed: actual loop wrap, dimensions, both source formats declared, reduced-motion no-autoplay, and no mobile horizontal overflow. First and last uncompressed video frames are identical. Sampled every tenth repaired corner at 2x; visible sparkle is removed, but some reconstructed moving-background areas remain soft/smeared. Source JPEG compression and generated labels remain visible; this is not certified broadcast-quality or artifact-free reconstruction.

## Reproduction
Run scripts/retouch-house-sequence.py, then scripts/build-hero-loop.py with OpenCV, NumPy, and the project-local imageio-ffmpeg runtime in output/media-tools. Output audit: output/hero-loop-report.json. Browser verification: output/playwright/hero-loop-check.js.
