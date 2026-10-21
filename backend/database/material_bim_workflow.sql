-- Apply after marketplace_flow.sql and BIM migrations. No catalog example products are seeded.
BEGIN;
CREATE TABLE IF NOT EXISTS public.product_bim_specs (
 product_id uuid PRIMARY KEY REFERENCES public.marketplace_products(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','archived')),
 metadata jsonb NOT NULL DEFAULT '{}', updated_by uuid REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.project_material_states (
 project_id text PRIMARY KEY REFERENCES public.projects(project_id), version integer NOT NULL CHECK(version>0),
 state jsonb NOT NULL, updated_by uuid NOT NULL REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.project_material_versions (
 project_id text NOT NULL REFERENCES public.projects(project_id), version integer NOT NULL,
 state jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES public.users(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,version)
);
CREATE TABLE IF NOT EXISTS public.bim_procurement_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id text NOT NULL REFERENCES public.projects(project_id),
 material_version integer NOT NULL, snapshot jsonb NOT NULL, created_by uuid NOT NULL REFERENCES public.users(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','cancelled')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,material_version)
);
CREATE OR REPLACE FUNCTION public.archive_material_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN INSERT INTO project_material_versions(project_id,version,state,actor_id) VALUES(NEW.project_id,NEW.version,NEW.state,NEW.updated_by); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS archive_material_revision ON public.project_material_states;
CREATE TRIGGER archive_material_revision AFTER INSERT OR UPDATE ON public.project_material_states FOR EACH ROW EXECUTE FUNCTION public.archive_material_revision();
ALTER TABLE public.product_bim_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bim_procurement_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_bim_specs,public.project_material_states,public.project_material_versions,public.bim_procurement_drafts FROM anon,authenticated;
GRANT ALL ON public.product_bim_specs,public.project_material_states,public.project_material_versions,public.bim_procurement_drafts TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
