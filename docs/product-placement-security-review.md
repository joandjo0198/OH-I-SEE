# Product placement and hardening — 18 October 2026

## Using the studio

1. Restore or create a plan, then select the room under Interior & fixtures.
2. **Add a branded product** searches the existing `/api/products` catalog. Select a fixture shape and enter or select the brand, product/model, optional SKU and finish. The store must be running to search; manual supplier entries work offline.
3. Click **Place this product**, then click its position in the plan, house model or interior. Wall and ceiling mounting is preserved. Product metadata, position, room and material are saved in the existing draft and JSON, and included in the 3D object metadata.
4. **External electrical components** supports custom supplier items and outdoor installation. Choose Outside selected room for outdoor wall/floor fittings. Wall fittings snap to an exterior wall owned by that room; outdoor floor fittings must be in the plot and outside rooms. A room without an exterior wall cannot receive an outdoor wall fitting.
5. The added-products list contains only placements in the selected room. Locate/edit highlights a fitting in the interior; remove, undo and redo update the list. The schedule distinguishes brands, models, SKUs and indoor/outdoor installations.
6. Convert the reviewed plan, then generate the sketch and final 3D preview. Small rooms open as a cutaway with a Frame room control. Product labels can be hidden for a clean PNG. All views use the same stored placement coordinates. No automatic placeholder furniture is displayed; Suggest fixtures is an explicit additive action.

Geometry is a representative procedural preview. A brand name does not imply a manufacturer-certified mesh, exact dimensions, a verified SKU, availability, price or bathroom/outdoor suitability. Add licensed manufacturer geometry through the existing local GLB hook when available. No new brand/model specifications or purchasable SKUs are invented.

## Implemented security changes

- Compatible dependency patches plus Vite 6.4.3 and Nodemailer 10.1.2. Removed nodemon's vulnerable dependency chain; `npm run dev` in backend now uses `node --watch`.
- npm audit: backend went from 11 advisories (including 1 critical) to 0; frontend from 5 to 0. Reports: `output/backend-audit-after.json`, `output/frontend-audit-after.json`. This is the registry's known-advisory result, not a guarantee against all vulnerabilities.
- Production startup requires a JWT secret of at least 32 bytes and an explicit HTTPS FRONTEND_URL origin. Development localhost origins remain supported. Removed the second permissive CORS preflight handler.
- Public catalog pagination is bounded to 100 results, offset to 100,000, search to 100 characters, with finite price filters and integer pagination.
- Product/fixture metadata is bounded and validated. UI labels use textContent; SVG labels are escaped. CSV cells neutralize spreadsheet formula prefixes.
- Manual plan JSON is limited to 2 MB, in addition to the existing file-import limit. Fixture count remains bounded at 500; malformed layer data and light settings are rejected.
- Drawing analysis reserves its single worker slot before buffering uploads, rejects excess requests with 429, limits upload duration to 30 seconds and processing to the existing 150 seconds, and releases the slot safely. This admission limit is per Node process.
- SMTP disallows message-level file and URL loading. Password reset tokens are no longer written to development logs; production reset delivery fails if SMTP credentials are missing.

## Performance and scale

The interior builds only the selected room's walls, openings and fixtures. Rendering stops for hidden tabs/views, caps animation at 30 fps and DPR at 2, and redraws static rooms only when controls or scene settings change. Room changes dispose the old renderer resources. Catalog searches are bounded, cancellable and time-limited. The full house remains available in the existing 3D Model tab.

Before operating multiple API replicas: configure a shared rate-limit store and job queue, move drawing work to bounded workers, use managed object storage for uploads, verify database indexes and tenant authorization policies, and load-test realistic concurrent users. Current limits are per process; browser drafts remain local to that browser. These architectural changes were not silently introduced into the existing deployment.

## Validation and remaining scope

Automated tests cover room isolation, exact product positions, brand-specific schedules, outdoor snapping, metadata/XSS/CSV defenses, authentication/API regression, production configuration, catalog bounds, and an offline Nodemailer rendering smoke test. Production frontend build and dependency audits were run.

This was a targeted code/dependency review, not a whole-project penetration test. Existing database RLS policies, cloud IAM, secret rotation, payment providers, SMTP delivery, backup/restore, every legacy route and sustained production load still require deployment-specific validation. No claim of universal security or unlimited scalability is made.
