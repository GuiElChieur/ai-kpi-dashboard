
CREATE TABLE public.appareils (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resp_pose text,
  fn text,
  lot_mtg_app text,
  local text,
  lib_local text,
  app text,
  t_app text,
  lib_design text,
  resp_pret_a_poser text,
  ind_pret_a_poser text,
  ind_pose text,
  date_fin_od date,
  imported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appareils ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read appareils" ON public.appareils FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appareils" ON public.appareils FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete appareils" ON public.appareils FOR DELETE TO authenticated USING (true);
