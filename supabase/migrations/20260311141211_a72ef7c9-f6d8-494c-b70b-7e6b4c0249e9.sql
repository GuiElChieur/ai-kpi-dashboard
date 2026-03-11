
CREATE TABLE public.ots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_jour date,
  affaire text,
  code_responsable text,
  num_ot text,
  libelle_projet text,
  lot text,
  charge_previsionnelle numeric,
  tp numeric,
  avancement_effectif numeric,
  vbtr numeric,
  type text,
  tranche text,
  zone text,
  debut_plus_tot text,
  fin_plus_tot text,
  debut_plus_tard text,
  fin_plus_tard text,
  date_debut_theorique text,
  statut text,
  societe text,
  stade text,
  type_ot_bis text,
  nature_ot text,
  mo_prev numeric,
  statut_projet text,
  imported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ots" ON public.ots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ots" ON public.ots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete ots" ON public.ots FOR DELETE TO authenticated USING (true);
