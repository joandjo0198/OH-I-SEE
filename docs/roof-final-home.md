# Roof and Final Home workflow

The studio now exposes 2D Design, 3D Design, 2D Interior, 3D Interior and Final Home from one saved plan. Review the plan once before conversion. Roof selection, finishes and fixtures persist in browser drafts and JSON. GLB/OBJ exports include the selected roof and actual placed fixtures.

## Roofs and cost
Choose flat terrace, gable or mono-pitch; concrete terrace, terracotta, coated metal or shingles are filtered for compatible shapes. Suggest me a roof uses the selected appearance/use preference, not structural certification. Apply commits the roof and opens Final Home.

Area is the rectangular envelope of enclosed rooms, excluding outside stairs and porch, plus the chosen overhang clipped to plot boundaries. It can cover gaps in irregular plans; inspect the 2D roof outline. Pitched surface = horizontal area / cos(pitch). Order quantity = surface × (1 + waste / 100). Material total = order quantity × supplier rate + other material allowance. Rates start at zero (unquoted), are not market quotations, and exclude labour, tax, transport and engineering. Supporting materials are separate for sheet/tile/shingle coverings. Changing material clears the previous rate.

## Reference interiors and products
Apply reference living style adds editable furniture in a living/drawing room: cream seating, olive cushions, oak-tone tables, rug, art and lighting. It avoids adding another item of an existing catalog type. Existing branded products remain. Review door clearances after applying. The source image is explicitly shown as a style reference, not a generated rendering.

2D Interior uses an orthographic overhead room camera. 3D Interior opens at eye level with a ceiling; Room cutaway returns to an outside orbit. Final Home supports exterior angles, full-house furnished cutaway, free walkthrough and the selected room interior. Walkthrough has no collision detection.

Reuse an added product preserves its product metadata, finish and inside/outside installation type and asks for a new placement in the selected room. All instances remain individually editable and removable.

The render is interactive procedural geometry, not a photorealistic match to the supplied images. Manufacturer-specific geometry needs licensed 3D assets. The design does not automatically create a second storey or change the actual plan to match reference photos.

## Validation
Automated roof tests cover slope/waste costs, missing quotes, import limits, compatible materials, finite geometry and non-duplicating reference furnishing. Existing floor-plan, products, finishes and interior regressions run alongside these tests. Browser checks cover roof suggestion/application, estimate updates, draft restoration, Final Home PNG and room preview.
