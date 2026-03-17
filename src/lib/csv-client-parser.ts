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

export function parseOTCSV(text: string) {
  return parseCSV(text, ';').map(row => ({
    date_jour: parseDate(getVal(row, 'DATE_DU_JOUR', 'Date du jour')),
    affaire: getVal(row, 'AFFAIRE', 'Affaire'),
    code_responsable: getVal(row, 'CODE_DU_RESPONSABLE', 'Code du responsable'),
    num_ot: getVal(row, 'N_OT', 'N° OT', 'NUM_OT'),
    libelle_projet: getVal(row, 'LIBELLE_PROJET', 'Libellé projet', 'LIBELLE_DU_PROJET'),
    lot: getVal(row, 'LOT', 'Lot'),
    charge_previsionnelle: parseNumber(getVal(row, 'CHARGE_PREVISIONNELLE', 'Charge prévisionnelle')),
    tp: parseNumber(getVal(row, 'TP')),
    avancement_effectif: parseNumber(getVal(row, 'AVANCEMENT_EFFECTIF', 'Avancement effectif')),
    vbtr: parseNumber(getVal(row, 'VBTR')),
    type: getVal(row, 'TYPE', 'Type'),
    tranche: getVal(row, 'TRANCHE', 'Tranche'),
    zone: getVal(row, 'ZONE', 'Zone'),
    debut_plus_tot: getVal(row, 'DEBUT_PLUS_TOT', 'Début plus tôt'),
    fin_plus_tot: getVal(row, 'FIN_PLUS_TOT', 'Fin plus tôt'),
    debut_plus_tard: getVal(row, 'DEBUT_PLUS_TARD', 'Début plus tard'),
    fin_plus_tard: getVal(row, 'FIN_PLUS_TARD', 'Fin plus tard'),
    date_debut_theorique: getVal(row, 'DATE_DEBUT_THEORIQUE', 'Date début théorique'),
    statut: getVal(row, 'STATUT', 'Statut'),
    societe: getVal(row, 'SOCIETE', 'Société'),
    stade: getVal(row, 'STADE', 'Stade'),
    type_ot_bis: getVal(row, 'TYPE_OT_BIS', 'Type OT bis', 'TYPE_OT'),
    nature_ot: getVal(row, 'NATURE_OT', 'Nature OT'),
    mo_prev: parseNumber(getVal(row, 'MO_PREV', 'MO Prev')),
    statut_projet: getVal(row, 'STATUT_DU_PROJET', 'Statut du projet'),
  }));
}

export function parseMatiereCSV(text: string) {
  const rows = parseCSV(text, ';');
  return rows.map(row => ({
    affaire: getVal(row, 'AFFAIRE', 'Affaire'),
    ot: getVal(row, 'OT'),
    lot: getVal(row, 'LOT', 'Lot'),
    date_debut: parseDate(getVal(row, 'DATE_DEBUT', 'Date début', 'DATE_DEBUT')),
    date_livraison: parseDate(getVal(row, 'DATE_DE_LIVRAISON', 'Date de livraison', 'DATE_LIVRAISON', 'Date livraison')),
    tri: getVal(row, 'TRI'),
    rep: getVal(row, 'REP', 'Rep'),
    quantite_besoin: parseNumber(getVal(row, 'QUANTITE_BESOIN', 'Quantité Besoin', 'Quantité besoin')),
    quantite_preparation: parseNumber(getVal(row, 'QUANTITE_EN_PREPARATION', 'Quantité en préparation')),
    quantite_sortie: parseNumber(getVal(row, 'QUANTITE_SORTIE', 'Quantité sortie')),
    reference_interne: getVal(row, 'REFERENCE_INTERNE', 'Référence interne'),
    designation_produit: getVal(row, 'DESIGNATION_PRODUIT', 'Désignation produit'),
    statut_projet: getVal(row, 'STATUT_DU_PROJET', 'Statut du projet'),
  }));
}

export function mapMatiereRows(rawRows: Record<string, unknown>[]) {
  // Normalize: remove accents, all non-alphanumeric chars, uppercase
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Log first row keys for debugging
  if (rawRows.length > 0) {
    const keys = Object.keys(rawRows[0]);
    console.log('[MATIERE XLSX] Column headers:', keys);
    console.log('[MATIERE XLSX] Normalized headers:', keys.map(norm));
    console.log('[MATIERE XLSX] First row values:', JSON.stringify(rawRows[0]));
  }

  const g = (row: Record<string, unknown>, ...keys: string[]) => {
    const normKeys = keys.map(norm);
    // Pass 1: exact normalized match only
    for (const rk of Object.keys(row)) {
      const nrk = norm(rk);
      if (normKeys.includes(nrk)) return row[rk];
    }
    // Pass 2: partial match, but only for keys with length >= 5 to avoid false positives (e.g. LOT matching OT)
    for (const rk of Object.keys(row)) {
      const nrk = norm(rk);
      for (const nk of normKeys) {
        if (nk.length >= 5 && nrk.length >= 5 && (nrk.includes(nk) || nk.includes(nrk))) return row[rk];
      }
    }
    return null;
  };

  function xlsxDate(v: unknown): string | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
      const d = new Date((v - 25569) * 86400 * 1000);
      return d.toISOString().substring(0, 10);
    }
    if (typeof v === 'string') return parseDate(v);
    return null;
  }

  const toNum = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'string') {
      const n = Number(v.replace(',', '.'));
      return isNaN(n) ? null : n;
    }
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  // Log what g() finds for first row
  if (rawRows.length > 0) {
    const row = rawRows[0];
    console.log('[MATIERE XLSX] g(Quantité Besoin):', g(row, 'Quantité Besoin', 'Quantite Besoin'));
    console.log('[MATIERE XLSX] g(Quantité sortie):', g(row, 'Quantité sortie', 'Quantite sortie'));
    console.log('[MATIERE XLSX] g(Date de livraison):', g(row, 'Date de livraison', 'Date livraison'));
  }

  return rawRows.map(row => ({
    affaire: String(g(row, 'Affaire') ?? ''),
    ot: String(g(row, 'OT') ?? ''),
    lot: String(g(row, 'Lot') ?? ''),
    date_debut: xlsxDate(g(row, 'Date début', 'Date debut', 'Datedebut')),
    date_livraison: xlsxDate(g(row, 'Date de livraison', 'Date livraison', 'Datedelivraison')),
    tri: String(g(row, 'TRI') ?? ''),
    rep: String(g(row, 'Rep') ?? ''),
    quantite_besoin: toNum(g(row, 'Quantité Besoin', 'Quantite Besoin', 'QuantiteBesoin')),
    quantite_preparation: toNum(g(row, 'Quantité en préparation', 'Quantite en preparation', 'Quantiteenpreparation')),
    quantite_sortie: toNum(g(row, 'Quantité sortie', 'Quantite sortie', 'Quantitesortie')),
    reference_interne: String(g(row, 'Référence interne', 'Reference interne', 'Referenceinterne') ?? ''),
    designation_produit: String(g(row, 'Désignation produit', 'Designation produit', 'Designationproduit') ?? ''),
    statut_projet: String(g(row, 'Statut du projet', 'Statutduprojet') ?? ''),
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
