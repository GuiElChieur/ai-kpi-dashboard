
-- Indexes for cables table (used by tirage, filerie, raccordement, courbe)
CREATE INDEX IF NOT EXISTS idx_cables_resp_tirage ON public.cables (resp_tirage);
CREATE INDEX IF NOT EXISTS idx_cables_ind_appro_ca ON public.cables (ind_appro_ca);
CREATE INDEX IF NOT EXISTS idx_cables_cbl_racc_resp_o ON public.cables (cbl_racc_resp_o);
CREATE INDEX IF NOT EXISTS idx_cables_fn ON public.cables (fn);
CREATE INDEX IF NOT EXISTS idx_cables_stt_cbl_bord ON public.cables (stt_cbl_bord);

-- Indexes for appareils table
CREATE INDEX IF NOT EXISTS idx_appareils_resp_pose ON public.appareils (resp_pose);
CREATE INDEX IF NOT EXISTS idx_appareils_fn ON public.appareils (fn);
CREATE INDEX IF NOT EXISTS idx_appareils_app ON public.appareils (app);

-- Indexes for appareil_enrichments table
CREATE INDEX IF NOT EXISTS idx_appareil_enrichments_app ON public.appareil_enrichments (app);
CREATE INDEX IF NOT EXISTS idx_appareil_enrichments_match_key ON public.appareil_enrichments (match_key);

-- Index for ot_lignes used by equipement H7P
CREATE INDEX IF NOT EXISTS idx_ot_lignes_identifiant_projet ON public.ot_lignes (identifiant_projet);

-- View: appareils joined with enrichments (avoids 118k+ client-side fetches)
CREATE OR REPLACE VIEW public.appareils_enriched AS
SELECT
  a.id,
  a.app,
  a.fn,
  a.local,
  a.lib_local,
  a.lot_mtg_app,
  a.t_app,
  a.lib_design,
  a.resp_pret_a_poser,
  a.ind_pret_a_poser,
  a.ind_pose,
  a.date_fin_od,
  -- Apply enrichment: resp_pose from appareils first, fallback to enrichment
  COALESCE(NULLIF(a.resp_pose, ''), e.resp_pose) AS resp_pose,
  -- Apply enrichment: date_contrainte from appareils first, fallback to enrichment chain
  COALESCE(a.date_contrainte, e.date_contrainte, e.y34_date_contrainte_calculated, e.y34_date_contrainte) AS date_contrainte
FROM public.appareils a
LEFT JOIN public.appareil_enrichments e
  ON UPPER(TRIM(a.app)) = UPPER(TRIM(e.app));
