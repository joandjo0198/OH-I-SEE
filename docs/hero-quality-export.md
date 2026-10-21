# Hero quality re-export — 27 September 2026

## Diagnosis
Original JPEG frames: 1280 x 720. Previous export: 1882 x 836, H.264 CRF 22 capped at 5 Mbps; VP9 CRF 32. Browser cover cropping could clip callouts, and 2x displays enlarged the encoded video. Partial plumbing text also exists in the source transition, notably around frame 131.

## Processing
3x FSRCNN neural super-resolution on lossless retouched original frames, followed by downsampling/composition. Model: https://github.com/Saafke/FSRCNN_Tensorflow (Apache-2.0; model and license retained in output/sr-models). No denoise, heavy blur or extra deblock filters. No compressed-video intermediate. The original 720p detail is still a ceiling: neural inference does not reproduce an authentic high-resolution architectural render.

## Deliverables
- hero-animation.mp4: 2560 x 1152, H.264 slow / CRF 18 / yuv420p / faststart, 10.69 MB, about 8.73 Mbps average.
- hero-animation.webm: 2560 x 1152, VP9 CRF 26 / b:v 0 / yuv420p, 9.01 MB.
- hero-animation-retina.mp4: 3840 x 1728, H.264 CRF 18, 18.88 MB, about 15.41 Mbps average.
- hero-animation-retina.webm: 3840 x 1728, VP9 CRF 26 / b:v 0, 14.15 MB.
- hero-poster.png: 3840 x 1728.
All assets are in frontend/public/videos. Duration remains 9.8 seconds at 30 fps, no audio. High-DPI clients automatically select the retina variants. Retina assets exceed the size target; quality is prioritized there.

## Label and layout fix
Redrew PLUMBING at native output resolution in 211 frames (1–85 and 120–245), tracking the existing callout with template anchors and interpolating through the source's incomplete lettering. All repaired label bounding boxes are inside the horizontal 4% margin. The video uses contain instead of cover to prevent responsive cropping. The return blend was rebuilt from the corrected first frame.

## Verification
Production build passed. Browser checks at 1920 x 940 and emulated DPR 1/2 decoded 2560 x 1152 / 3840 x 1728 respectively; physical scaling factors were 0.75 and 1.0. No encoded video enlargement at these tested sizes. Frame 131 full-word repair visually inspected. Export sizes measured on disk. This is not verification on physical retina hardware, nor a guarantee of zero source compression artifacts or UI-sharp reconstructed architecture.

Reproduction: scripts/build-hero-superresolution.py then scripts/finalize-hero-quality.py. Test: output/playwright/hero-retina-check.js. Label audit: output/hero-label-repair.json.
