// Client-side CSV parsing and mapping for import

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
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
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

export function parseAchatCSV(text: string) {
  return parseCSV(text, ';').map(row => ({
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
  }));
}

export function parseOTLigneCSV(text: string) {
  return parseCSV(text, ';').map(row => ({
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
  }));
}

export function parsePointageCSV(text: string) {
  return parseCSV(text, ';').map(row => ({
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
  }));
}

export function parseMatiereCSV(text: string) {
  return parseCSV(text, ';').map(row => ({
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
  }));
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

export function mapCableRows(rawRows: Record<string, unknown>[]) {
  const g = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const k of keys) {
      for (const rk of Object.keys(row)) {
        if (rk.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '') === k.toUpperCase().replace(/[^A-Z0-9_]/g, '')) {
          return row[rk];
        }
      }
    }
    return null;
  };

  return rawRows
    .map(row => ({
      cbl: String(g(row, 'CBL') ?? ''),
      repere_cbl: String(g(row, 'REPERE_CBL') ?? ''),
      resp_tirage: String(g(row, 'RESP_TIRAGE') ?? '').trim().toUpperCase(),
      ind_appro_ca: String(g(row, 'IND_APPRO_CA') ?? '').trim().toUpperCase(),
      lng_total: (Number(g(row, 'LNG_TOTAL', 'LNG_TOTALE')) || 0) / 1000,
      tot_lng_tiree: (Number(g(row, 'TOT_LNG_TIREE') ?? 0) || 0) / 1000,
      date_tir_plus_tot: excelDateToISO(g(row, 'DATE_TIR_PLUS_TOT')),
      date_tir_plus_tard: excelDateToISO(g(row, 'DATE_TIR_PLUS_TARD')),
      date_tirage_cbl: excelDateToISO(g(row, 'DATE_TIRAGE_CBL')),
      stt_cbl_bord: g(row, 'STT_CBL_BORD') ? String(g(row, 'STT_CBL_BORD')).trim().toUpperCase() : null,
      lot_mtg_apo: String(g(row, 'LOT_MTG_APO') ?? ''),
      apo: String(g(row, 'APO') ?? ''),
      apa: String(g(row, 'APA') ?? ''),
      pt_cbl: String(g(row, 'PT_CBL') ?? ''),
      cat_cablage: String(g(row, 'CAT_CABLAGE') ?? ''),
      cod_zone_tirage: String(g(row, 'COD_ZONE_TIRAGE') ?? ''),
      lot_ou_app_cbl: String(g(row, 'LOT_OU_APP_CBL') ?? ''),
      gam: String(g(row, 'GAM') ?? ''),
      nav: String(g(row, 'NAV') ?? ''),
      fn: String(g(row, 'FN') ?? ''),
    }))
    .filter(c => c.resp_tirage === 'GEST');
}
