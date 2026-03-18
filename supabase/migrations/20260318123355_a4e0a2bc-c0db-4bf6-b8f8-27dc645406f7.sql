
-- Table to persist enrichment rules (matching Y34 -> Z34)
CREATE TABLE public.appareil_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_key text NOT NULL UNIQUE,
  app text,
  fn text,
  local text,
  lib_local text,
  lot_mtg_app text,
  t_app text,
  resp_pose text,
  resp_pose_source text DEFAULT 'y34',
  date_contrainte date,
  date_contrainte_source text DEFAULT 'y34_plus_10m',
  y34_resp_pose text,
  y34_date_contrainte date,
  y34_date_contrainte_calculated date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table to track enrichment import history
CREATE TABLE public.enrichment_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('y34', 'z34')),
  rows_read integer DEFAULT 0,
  rows_matched integer DEFAULT 0,
  rows_enriched_resp_pose integer DEFAULT 0,
  rows_enriched_date_contrainte integer DEFAULT 0,
  rows_ignored integer DEFAULT 0,
  rows_ambiguous integer DEFAULT 0,
  rows_saved integer DEFAULT 0,
  rows_resp_pose_kept integer DEFAULT 0,
  rows_date_updated_from_z34 integer DEFAULT 0,
  is_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_appareil_enrichments_match_key ON public.appareil_enrichments(match_key);
CREATE INDEX idx_appareil_enrichments_app ON public.appareil_enrichments(app);

-- RLS
ALTER TABLE public.appareil_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read appareil_enrichments" ON public.appareil_enrichments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appareil_enrichments" ON public.appareil_enrichments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appareil_enrichments" ON public.appareil_enrichments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appareil_enrichments" ON public.appareil_enrichments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read enrichment_imports" ON public.enrichment_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert enrichment_imports" ON public.enrichment_imports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update enrichment_imports" ON public.enrichment_imports FOR UPDATE TO authenticated USING (true);
