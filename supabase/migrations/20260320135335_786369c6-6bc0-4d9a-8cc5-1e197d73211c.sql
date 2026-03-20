CREATE OR REPLACE VIEW appareils_enriched AS
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
    COALESCE(NULLIF(a.resp_pose, ''), e.resp_pose) AS resp_pose,
    COALESCE(a.date_contrainte, e.date_contrainte, e.y34_date_contrainte_calculated, e.y34_date_contrainte) AS date_contrainte
FROM appareils a
LEFT JOIN appareil_enrichments e 
    ON regexp_replace(upper(trim(a.app)), '^(Y34|Z34)\s*[-–—:]\s*', '', 'i') = upper(trim(e.match_key));