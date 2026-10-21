# Supplied architectural video — homepage integration

Input: the user's `Architectural_exploded_view_anim…_1080p_20260927225420 (online-video-cutter.com).mp4`.

The actual source is 1280 × 720, 30 fps, 300 frames / 10 seconds. Its navigation, headline, buttons and statistics are embedded pixels, including clipped text. The original file is preserved.

Preparation in `scripts/prepare-supplied-hero.py`:
- Remove the baked navigation strip (64 source pixels).
- Repair the embedded webpage text and buttons using a fixed inpainting mask; blend the repaired left area beneath a dark copy panel.
- Preserve the house's aspect ratio and right-align the scene. No stretched building or unrelated image strips.
- FSRCNN x3 neural upscaling, followed by area resampling to 2560 × 1152.
- Replace two matched malformed generated annotation words with neutral DETAIL labels.
- Encode directly from prepared PNG frames: H.264 CRF 17 / medium / yuv420p / faststart; VP9 CRF 24 / variable bitrate / yuv420p. No audio, denoise or added motion blur.

Outputs in `frontend/public/videos/`: `supplied-hero.mp4`, `supplied-hero.webm`, `supplied-hero-poster.png`.

Integration retains live HTML controls and copy. Video covers the available hero without changing its aspect ratio; mobile uses a closer architectural crop and stronger text contrast. Pause/resume, reduced-motion poster fallback and background-tab pausing remain available.

Quality limitation: this is a repaired, upscaled 720p recording, not a native 2.5K render. Inpainted regions and source compression can remain softer, especially on high-DPI screens. Upscaling does not establish new authentic architectural detail or guarantee zero pixelation.

Verified: both exports decode all 300 frames at 30 fps / 10 seconds / 2560x1152. MP4 9.42 MB (7.54 Mbps average); WebM 8.06 MB (6.45 Mbps average). Browser checks passed at 1920x940 DPR1, 1440x900 DPR2, and 390x844 DPR2: autoplay, pause/resume, no horizontal overflow, no paragraph/button overlap, and live project modal. Reduced-motion fallback passed. Production build passed.
