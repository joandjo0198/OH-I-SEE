# OH I SEE deployment layout

- `frontend/`: active Vite website, pages, studio and browser assets.
- `backend/`: active Express API (`src/server.js`), database tooling and Python/Blender helpers.
- `backend/legacy-src/`: preserved former root backend; not the active API.
- Frontend variant folders are historical implementations. Their manifests end in `.legacy` so they are not separate package entry points.
- Root package.json only delegates commands to the active applications.

## Vercel website
Import joandjo0198/OH-I-SEE with Root Directory `.` (repository root). Root vercel.json explicitly builds frontend/dist with Other framework, avoiding Python auto-detection. Alternatively choose Root Directory `frontend`, which has its own Vite configuration. Do not import backend/floorplan.

This deploys the website only. The Express API and background Python/Blender workers require separate deployment configuration. Supabase account linking alone does not deploy that API. Configure the intended Supabase project and API endpoint before treating the site as production-ready. Never put a service-role/secret key into frontend configuration.
