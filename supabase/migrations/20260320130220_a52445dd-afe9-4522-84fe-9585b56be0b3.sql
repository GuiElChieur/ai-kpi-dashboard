
CREATE INDEX IF NOT EXISTS idx_cables_resp_tirage ON public.cables (resp_tirage);
CREATE INDEX IF NOT EXISTS idx_cables_ind_appro_ca ON public.cables (ind_appro_ca);
CREATE INDEX IF NOT EXISTS idx_cables_resp_tirage_appro ON public.cables (resp_tirage, ind_appro_ca);
CREATE INDEX IF NOT EXISTS idx_cables_stt_cbl_bord ON public.cables (stt_cbl_bord);
CREATE INDEX IF NOT EXISTS idx_cables_fn ON public.cables (fn);
CREATE INDEX IF NOT EXISTS idx_appareils_resp_pose ON public.appareils (resp_pose);
CREATE INDEX IF NOT EXISTS idx_appareils_fn ON public.appareils (fn);
CREATE INDEX IF NOT EXISTS idx_appareils_resp_pose_fn ON public.appareils (resp_pose, fn);
CREATE INDEX IF NOT EXISTS idx_ot_lignes_identifiant_projet ON public.ot_lignes (identifiant_projet);
CREATE INDEX IF NOT EXISTS idx_enrichments_match_key ON public.appareil_enrichments (match_key);
