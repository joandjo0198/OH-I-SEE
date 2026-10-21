# Hero background cleanup

Built-in image generation tool, edit mode; reference supplied in the conversation. Saved project asset: frontend/public/images/home-design/hero-background-clean.png.

## Prompt

Create a clean architectural background plate from the supplied OH I SEE screenshot. This is an edit: remove the red annotation boxes, black top navigation/header (crop header away), AI badge, both large white/yellow headline lines, gold tagline, white description, all four button rectangles and labels, and statistics panel/numbers/labels. Remove floating chat icon if present. Inpaint just the areas behind those overlays with plausible continuation of the existing scene. Preserve the exact visible house shape, position, car, trees, glass balcony, timber soffits, stone, lighting and dusk sky as closely as possible. Preserve faint architectural blueprint drawings on the left and right. Do not redesign or reframe the house. No text, controls or logos. Output only the wide architectural scene below the original header, approximately 1880:763 ratio, no margins. This will be used as the fixed background behind separately animated HTML text.

## Implementation and verification

Live HTML replaces the baked-in words and buttons. Eight groups enter with negative X translations only, slight blur and opacity, using cubic-bezier(.16,1,.3,1). Delays are 200, 350, 500, 650, 800, 1000, 1150, and 1350ms, all ending by 1800ms. Durations taper for the last groups to satisfy the final timing requirement. The image itself does not animate. No scroll listener controls the text. Ordinary document scrolling still moves the page; the entrance does not add a pinned scroll sequence or restore the removed 3D model.

The homepage loading overlay is suppressed so it cannot mask the entrance. Reduced motion skips animation; keyboard focus settles it immediately. The regenerated background preserves the reference composition closely but is not a pixel-identical recovery of occluded areas. The original supplied image is retained separately.

Playwright checks pass for directions, timing, fixed background/header bounds, no running entrance after two seconds, layout at 1880, 1482, 1167, 390 and 375px, both CTA modals and reduced motion. Production build passes.
