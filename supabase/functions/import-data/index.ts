import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseCSV(text: string, separator = ';'): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

function parseNumber(v: string): number | null {
  if (!v || v.trim() === '') return null;
  return Number(v.replace(',', '.')) || 0;
}

function parseDate(v: string): string | null {
  if (!v || v.trim() === '') return null;
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
  // Handle DD/MM/YYYY
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function getVal(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '') === k.toUpperCase().replace(/[^A-Z0-9_]/g, '')) {
        return row[rk] || '';
      }
    }
  }
  return '';
}

function mapAchat(row: Record<string, string>) {
  return {
    type_saisie: getVal(row, 'TYPE_DE_SAISIE_PC', 'Type de saisie (P,C)'),
    date_commande: parseDate(getVal(row, 'DATE_COMMANDE', 'Date commande')),
    date_livraison: parseDate(getVal(row, 'DATE_LIVCONSFAB_PREVUE', 'Date liv/cons/fab prévue')),
    code_affaire: getVal(row, 'CODE_AFFAIRE', 'Code affaire'),
    num_commande: getVal(row, 'N_COMMANDE', 'N° Commande'),
    num_bl: getVal(row, 'N_BL', 'N° B.L'),
    reference_commande: getVal(row, 'REFERENCE_COMMANDE', 'Référence commande'),
    adresse_facturation: getVal(row, 'ADRESSE_FACTURATION', 'Adresse facturation'),
    type_element: getVal(row, 'TYPE_DELEMENT', "Type d'élément"),
    num_produit: getVal(row, 'N_PRODUIT', 'N° Produit'),
    designation_produit: getVal(row, 'DESIGNATION_PRODUIT', 'Désignation produit'),
    reference_interne: getVal(row, 'REFERENCE_INTERNE', 'Référence interne'),
    quantite: parseNumber(getVal(row, 'QUANTITE', 'Quantité')),
    prix_achat: parseNumber(getVal(row, 'PRIX_ACHAT', 'Prix achat')),
    total_ht: parseNumber(getVal(row, 'TOTAL_HT', 'Total HT')),
  };
}

function mapOTLigne(row: Record<string, string>) {
  return {
    date_jour: parseDate(getVal(row, 'DATE_DU_JOUR', 'Date du jour')),
    affaire_maitre: getVal(row, 'AFFAIRE_MAITRE', 'Affaire Maitre'),
    identifiant_projet: getVal(row, 'IDENTIFIANT_DU_PROJET', 'Identifiant du projet'),
    trigramme: getVal(row, 'TRIGRAMME', 'Trigramme'),
    repere: getVal(row, 'REPERE', 'Repere'),
    type_mo: getVal(row, 'TYPE_MO', 'Type M-O'),
    libelle_tache: getVal(row, 'LIBELLE_DE_LA_TACHE', 'Libellé de la tâche'),
    qte_prevue: parseNumber(getVal(row, 'QTE_PREVUE', 'Qte Prévue')),
    qte_realisee: parseNumber(getVal(row, 'QTE_REALISEE', 'Qte Réalisée')),
    charge_previsionnelle: parseNumber(getVal(row, 'CHARGE_PREVISIONNELLE', 'Charge prévisionnelle')),
    vbtr: parseNumber(getVal(row, 'VBTR')),
    charge_restante: parseNumber(getVal(row, 'CHARGE_RESTANTE', 'Charge restante')),
    avancement_effectif: parseNumber(getVal(row, 'AVANCEMENT_EFFECTIF', 'Avancement effectif')),
    tp: parseNumber(getVal(row, 'TP')),
    type_ot: getVal(row, 'TYPE_OT', 'type Ot'),
    lot: getVal(row, 'LOT', 'Lot'),
    zone: getVal(row, 'ZONE', 'Zone'),
    stade: getVal(row, 'STADE', 'Stade'),
    monteur: getVal(row, 'MONTEUR', 'Monteur'),
    code_responsable: getVal(row, 'CODE_DU_RESPONSABLE', 'Code du responsable'),
    code_libre_table: getVal(row, 'CODE_LIBRE_TABLE', 'Code libre Table'),
  };
}

function mapPointage(row: Record<string, string>) {
  return {
    intitule: getVal(row, 'INTITULE', 'Intitulé'),
    code_libre_alpha: getVal(row, 'CODE_LIBRE_ALPHA', 'Code libre alpha'),
    nom_prenom: getVal(row, 'NOM_PRENOM', 'Nom Prenom'),
    code_99: getVal(row, '99'),
    date_saisie: parseDate(getVal(row, 'DATE_SAISIE', 'Date saisie')),
    affaire_maitre: getVal(row, 'AFFAIRE_MAITRE', 'Affaire maître'),
    intitule_affaire: getVal(row, 'INTITULE_DE_LAFFAIRE', "Intitulé de l'affaire"),
    employeur: getVal(row, 'EMPLOYEUR', 'Employeur'),
    quantite: parseNumber(getVal(row, 'QUANTITE', 'Quantité')),
    objet_travail: getVal(row, 'OBJET_TRAVAIL', 'Objet travail'),
    code_libre_table: getVal(row, 'CODE_LIBRE_TABLE', 'Code libre Table'),
    num_affaire: getVal(row, 'N_AFFAIRE', 'N° Affaire'),
    username: getVal(row, 'USER', 'user'),
    intervenant: getVal(row, 'INTERVENANT', 'Intervenant'),
    date_modif: parseDate(getVal(row, 'DATE_MODIF', 'Date modif')),
    equipe: getVal(row, 'EQUIPE', 'Equipe'),
    identifiant_projet: getVal(row, 'IDENTIFIANT_DU_PROJET', 'Identifiant du projet'),
    code_libre_alpha3: getVal(row, 'CODE_LIBRE_ALPHA_3', 'Code libre Alpha 3'),
    code_libre_alpha1: getVal(row, 'CODE_LIBRE_ALPHA_1', 'Code libre alpha 1'),
  };
}

function mapMatiere(row: Record<string, string>) {
  return {
    affaire: getVal(row, 'AFFAIRE', 'Affaire'),
    ot: getVal(row, 'OT'),
    lot: getVal(row, 'LOT', 'Lot'),
    date_debut: parseDate(getVal(row, 'DATE_DEBUT', 'Date début')),
    tri: getVal(row, 'TRI'),
    rep: getVal(row, 'REP', 'Rep'),
    quantite_besoin: parseNumber(getVal(row, 'QUANTITE_BESOIN', 'Quantité Besoin')),
    quantite_preparation: parseNumber(getVal(row, 'QUANTITE_EN_PREPARATION', 'Quantité en préparation')),
    quantite_sortie: parseNumber(getVal(row, 'QUANTITE_SORTIE', 'Quantité sortie')),
    reference_interne: getVal(row, 'REFERENCE_INTERNE', 'Référence interne'),
    designation_produit: getVal(row, 'DESIGNATION_PRODUIT', 'Désignation produit'),
    statut_projet: getVal(row, 'STATUT_DU_PROJET', 'Statut du projet'),
  };
}

function excelDateToISO(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().substring(0, 10);
  }
  if (typeof v === 'string') return parseDate(v);
  return null;
}

function mapCable(row: Record<string, unknown>) {
  const g = (...keys: string[]) => {
    for (const k of keys) {
      for (const rk of Object.keys(row)) {
        if (rk.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '') === k.toUpperCase().replace(/[^A-Z0-9_]/g, '')) {
          return row[rk];
        }
      }
    }
    return null;
  };
  return {
    cbl: String(g('CBL') ?? ''),
    repere_cbl: String(g('REPERE_CBL') ?? ''),
    resp_tirage: String(g('RESP_TIRAGE') ?? '').trim().toUpperCase(),
    ind_appro_ca: String(g('IND_APPRO_CA') ?? '').trim().toUpperCase(),
    lng_total: (Number(g('LNG_TOTAL', 'LNG_TOTALE')) || 0) / 1000,
    tot_lng_tiree: (Number(g('TOT_LNG_TIREE') ?? 0) || 0) / 1000,
    date_tir_plus_tot: excelDateToISO(g('DATE_TIR_PLUS_TOT')),
    date_tir_plus_tard: excelDateToISO(g('DATE_TIR_PLUS_TARD')),
    date_tirage_cbl: excelDateToISO(g('DATE_TIRAGE_CBL')),
    stt_cbl_bord: g('STT_CBL_BORD') ? String(g('STT_CBL_BORD')).trim().toUpperCase() : null,
    lot_mtg_apo: String(g('LOT_MTG_APO') ?? ''),
    apo: String(g('APO') ?? ''),
    apa: String(g('APA') ?? ''),
    pt_cbl: String(g('PT_CBL') ?? ''),
    cat_cablage: String(g('CAT_CABLAGE') ?? ''),
    cod_zone_tirage: String(g('COD_ZONE_TIRAGE') ?? ''),
    lot_ou_app_cbl: String(g('LOT_OU_APP_CBL') ?? ''),
    gam: String(g('GAM') ?? ''),
    nav: String(g('NAV') ?? ''),
    fn: String(g('FN') ?? ''),
  };
}

async function insertBatch(supabase: any, table: string, data: any[], batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Insert ${table} batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: authError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub;

    const formData = await req.formData();
    const results: { table: string; rows: number; status: string; error?: string }[] = [];

    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) continue;
      const fileName = value.name.toUpperCase();

      try {
        if (fileName.includes('ACHAT')) {
          const text = await value.text();
          const rows = parseCSV(text, ';');
          const mapped = rows.map(mapAchat);
          await supabase.from('achats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const count = await insertBatch(supabase, 'achats', mapped);
          await supabase.from('import_logs').insert({ table_name: 'achats', rows_imported: count, status: 'success', imported_by: userId });
          results.push({ table: 'achats', rows: count, status: 'success' });
        }
        else if (fileName.includes('OT_LIGNE') || fileName.includes('DATA_OT_LIGNE')) {
          const text = await value.text();
          const rows = parseCSV(text, ';');
          const mapped = rows.map(mapOTLigne);
          await supabase.from('ot_lignes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const count = await insertBatch(supabase, 'ot_lignes', mapped);
          await supabase.from('import_logs').insert({ table_name: 'ot_lignes', rows_imported: count, status: 'success', imported_by: userId });
          results.push({ table: 'ot_lignes', rows: count, status: 'success' });
        }
        else if (fileName.includes('POINTAGE')) {
          const text = await value.text();
          const rows = parseCSV(text, ';');
          const mapped = rows.map(mapPointage);
          await supabase.from('pointages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const count = await insertBatch(supabase, 'pointages', mapped);
          await supabase.from('import_logs').insert({ table_name: 'pointages', rows_imported: count, status: 'success', imported_by: userId });
          results.push({ table: 'pointages', rows: count, status: 'success' });
        }
        else if (fileName.includes('MATIER')) {
          const text = await value.text();
          const rows = parseCSV(text, ';');
          const mapped = rows.map(mapMatiere);
          await supabase.from('matieres').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const count = await insertBatch(supabase, 'matieres', mapped);
          await supabase.from('import_logs').insert({ table_name: 'matieres', rows_imported: count, status: 'success', imported_by: userId });
          results.push({ table: 'matieres', rows: count, status: 'success' });
        }
        else if (fileName.includes('EXTRACTION') || fileName.endsWith('.XLSX')) {
          // For XLSX, we need to parse it - use a simple approach
          const arrayBuffer = await value.arrayBuffer();
          // Import xlsx library for Deno
          const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          // Find the cables sheet
          const sheetName = workbook.SheetNames.find((n: string) => n.toLowerCase().includes('cable')) || workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
          // Filter RESP_TIRAGE = GEST
          const mapped = rawRows
            .map(mapCable)
            .filter(c => c.resp_tirage === 'GEST');
          await supabase.from('cables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const count = await insertBatch(supabase, 'cables', mapped);
          await supabase.from('import_logs').insert({ table_name: 'cables', rows_imported: count, status: 'success', imported_by: userId });
          results.push({ table: 'cables', rows: count, status: 'success' });
        }
        else {
          results.push({ table: key, rows: 0, status: 'skipped', error: 'Unrecognized file name' });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ table: key, rows: 0, status: 'error', error: msg });
        await supabase.from('import_logs').insert({ table_name: key, rows_imported: 0, status: 'error', error_message: msg, imported_by: userId });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
