
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Achats table
CREATE TABLE public.achats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_saisie TEXT,
  date_commande DATE,
  date_livraison DATE,
  code_affaire TEXT,
  num_commande TEXT,
  num_bl TEXT,
  reference_commande TEXT,
  adresse_facturation TEXT,
  type_element TEXT,
  num_produit TEXT,
  designation_produit TEXT,
  reference_interne TEXT,
  quantite NUMERIC,
  prix_achat NUMERIC,
  total_ht NUMERIC,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read achats" ON public.achats FOR SELECT TO authenticated USING (true);

-- OT Lignes table
CREATE TABLE public.ot_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_jour DATE,
  affaire_maitre TEXT,
  identifiant_projet TEXT,
  trigramme TEXT,
  repere TEXT,
  type_mo TEXT,
  libelle_tache TEXT,
  qte_prevue NUMERIC,
  qte_realisee NUMERIC,
  charge_previsionnelle NUMERIC,
  vbtr NUMERIC,
  charge_restante NUMERIC,
  avancement_effectif NUMERIC,
  tp NUMERIC,
  type_ot TEXT,
  lot TEXT,
  zone TEXT,
  stade TEXT,
  monteur TEXT,
  code_responsable TEXT,
  code_libre_table TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ot_lignes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read ot_lignes" ON public.ot_lignes FOR SELECT TO authenticated USING (true);

-- Pointages table
CREATE TABLE public.pointages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intitule TEXT,
  code_libre_alpha TEXT,
  nom_prenom TEXT,
  code_99 TEXT,
  date_saisie DATE,
  affaire_maitre TEXT,
  intitule_affaire TEXT,
  employeur TEXT,
  quantite NUMERIC,
  objet_travail TEXT,
  code_libre_table TEXT,
  num_affaire TEXT,
  username TEXT,
  intervenant TEXT,
  date_modif DATE,
  equipe TEXT,
  identifiant_projet TEXT,
  code_libre_alpha3 TEXT,
  code_libre_alpha1 TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pointages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read pointages" ON public.pointages FOR SELECT TO authenticated USING (true);

-- Matieres table
CREATE TABLE public.matieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affaire TEXT,
  ot TEXT,
  lot TEXT,
  date_debut DATE,
  tri TEXT,
  rep TEXT,
  quantite_besoin NUMERIC,
  quantite_preparation NUMERIC,
  quantite_sortie NUMERIC,
  reference_interne TEXT,
  designation_produit TEXT,
  statut_projet TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read matieres" ON public.matieres FOR SELECT TO authenticated USING (true);

-- Cables table
CREATE TABLE public.cables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cbl TEXT,
  repere_cbl TEXT,
  resp_tirage TEXT,
  ind_appro_ca TEXT,
  lng_total NUMERIC,
  tot_lng_tiree NUMERIC,
  date_tir_plus_tot DATE,
  date_tir_plus_tard DATE,
  date_tirage_cbl DATE,
  stt_cbl_bord TEXT,
  lot_mtg_apo TEXT,
  apo TEXT,
  apa TEXT,
  pt_cbl TEXT,
  cat_cablage TEXT,
  cod_zone_tirage TEXT,
  lot_ou_app_cbl TEXT,
  gam TEXT,
  nav TEXT,
  fn TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read cables" ON public.cables FOR SELECT TO authenticated USING (true);

-- Import logs table
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read import_logs" ON public.import_logs FOR SELECT TO authenticated USING (true);
