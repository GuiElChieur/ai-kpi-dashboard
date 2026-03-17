import Papa from 'papaparse';

export interface OTData {
  dateJour: string;
  affaire: string;
  codeResponsable: string;
  numOT: string;
  libelleProjet: string;
  lot: string;
  chargePrevisionnelle: number;
  tp: number;
  avancementEffectif: number;
  vbtr: number;
  type: string;
  tranche: string;
  zone: string;
  debutPlusTot: string;
  finPlusTot: string;
  debutPlusTard: string;
  finPlusTard: string;
  dateDebutTheorique: string;
  statut: string;
  societe: string;
  stade: string;
  typeOTBis: string;
  natureOT: string;
  moPrev: number;
  statutProjet: string;
}

export interface OTLigneData {
  dateJour: string;
  affaireMaitre: string;
  identifiantProjet: string;
  trigramme: string;
  repere: string;
  typeMO: string;
  libelleTache: string;
  qtePrevue: number;
  qteRealisee: number;
  chargePrevisionnelle: number;
  vbtr: number;
  chargeRestante: number;
  avancementEffectif: number;
  tp: number;
  typeOT: string;
  lot: string;
  zone: string;
  stade: string;
  monteur: string;
  codeResponsable: string;
  codeLibreTable: string;
}

export interface PointageData {
  intitule: string;
  codeLibreAlpha: string;
  nomPrenom: string;
  quantite99: number;
  dateSaisie: string;
  affaireMaitre: string;
  intituleAffaire: string;
  employeur: string;
  quantite: number;
  objetTravail: string;
  codeLibreTable: string;
  numAffaire: string;
  user: string;
  intervenant: string;
  dateModif: string;
  equipe: string;
  identifiantProjet: string;
}

export interface MatierData {
  affaire: string;
  ot: string;
  lot: string;
  dateDebut: string;
  tri: string;
  rep: string;
  quantiteBesoin: number;
  quantiteEnPreparation: number;
  quantiteSortie: number;
  referenceInterne: string;
  designationProduit: string;
  dateLivraison: string;
  statutProjet: string;
}

export interface AchatData {
  typeSaisie: string;
  dateCommande: string;
  dateLivPrevue: string;
  codeAffaire: string;
  numCommande: string;
  numBL: string;
  referenceCommande: string;
  adresseFacturation: string;
  typeElement: string;
  numProduit: string;
  designationProduit: string;
  referenceInterne: string;
  quantite: number;
  prixAchat: number;
  totalHT: number;
}

function parseNumber(val: string | undefined): number {
  if (!val || val === '-' || val === '') return 0;
  return parseFloat(val.replace(',', '.')) || 0;
}

async function loadCSV(url: string): Promise<string[][]> {
  const response = await fetch(url);
  const text = await response.text();
  const result = Papa.parse(text, { delimiter: ';', skipEmptyLines: true });
  return result.data as string[][];
}

export async function loadOTData(): Promise<OTData[]> {
  const rows = await loadCSV('/data/DATA_OT_Z34_1935.csv');
  return rows.slice(1).map(r => ({
    dateJour: r[0] || '',
    affaire: r[1] || '',
    codeResponsable: r[2] || '',
    numOT: r[3] || '',
    libelleProjet: r[4] || '',
    lot: r[5] || '',
    chargePrevisionnelle: parseNumber(r[6]),
    tp: parseNumber(r[7]),
    avancementEffectif: parseNumber(r[8]),
    vbtr: parseNumber(r[9]),
    type: r[10] || '',
    tranche: r[11] || '',
    zone: r[12] || '',
    debutPlusTot: r[13] || '',
    finPlusTot: r[14] || '',
    debutPlusTard: r[15] || '',
    finPlusTard: r[16] || '',
    dateDebutTheorique: r[17] || '',
    statut: r[18] || '',
    societe: r[19] || '',
    stade: r[20] || '',
    typeOTBis: r[21] || '',
    natureOT: r[22] || '',
    moPrev: parseNumber(r[23]),
    statutProjet: r[27] || '',
  }));
}

export async function loadOTLigneData(): Promise<OTLigneData[]> {
  const rows = await loadCSV('/data/DATA_OT_LIGNE_Z34_1935.csv');
  return rows.slice(1).map(r => ({
    dateJour: r[0] || '',
    affaireMaitre: r[1] || '',
    identifiantProjet: r[2] || '',
    trigramme: r[3] || '',
    repere: r[4] || '',
    typeMO: r[5] || '',
    libelleTache: r[6] || '',
    qtePrevue: parseNumber(r[7]),
    qteRealisee: parseNumber(r[8]),
    chargePrevisionnelle: parseNumber(r[9]),
    vbtr: parseNumber(r[10]),
    chargeRestante: parseNumber(r[11]),
    avancementEffectif: parseNumber(r[12]),
    tp: parseNumber(r[13]),
    typeOT: r[14] || '',
    lot: r[15] || '',
    zone: r[16] || '',
    stade: r[17] || '',
    monteur: r[18] || '',
    codeResponsable: r[19] || '',
    codeLibreTable: r[20] || '',
  }));
}

export async function loadPointageData(): Promise<PointageData[]> {
  const rows = await loadCSV('/data/DATA_POINTAGE_Z34_1935.csv');
  return rows.slice(1).map(r => ({
    intitule: r[0] || '',
    codeLibreAlpha: r[1] || '',
    nomPrenom: r[2] || '',
    quantite99: parseNumber(r[3]),
    dateSaisie: r[4] || '',
    affaireMaitre: r[5] || '',
    intituleAffaire: r[6] || '',
    employeur: r[7] || '',
    quantite: parseNumber(r[8]),
    objetTravail: r[9] || '',
    codeLibreTable: r[10] || '',
    numAffaire: r[11] || '',
    user: r[12] || '',
    intervenant: r[13] || '',
    dateModif: r[14] || '',
    equipe: r[15] || '',
    identifiantProjet: r[16] || '',
  }));
}

export async function loadMatierData(): Promise<MatierData[]> {
  const rows = await loadCSV('/data/MATIER_OT_Z34_1935.csv');
  return rows.slice(1).map(r => ({
    affaire: r[0] || '',
    ot: r[1] || '',
    lot: r[2] || '',
    dateDebut: r[3] || '',
    tri: r[4] || '',
    rep: r[5] || '',
    quantiteBesoin: parseNumber(r[6]),
    quantiteEnPreparation: parseNumber(r[7]),
    quantiteSortie: parseNumber(r[8]),
    referenceInterne: r[9] || '',
    designationProduit: r[10] || '',
    dateLivraison: r[11] || '',
    statutProjet: r[12] || '',
  }));
}

export async function loadAchatData(): Promise<AchatData[]> {
  const rows = await loadCSV('/data/ACHAT2_Z34_1935.csv');
  return rows.slice(1).map(r => ({
    typeSaisie: r[0] || '',
    dateCommande: r[1] || '',
    dateLivPrevue: r[2] || '',
    codeAffaire: r[3] || '',
    numCommande: r[4] || '',
    numBL: r[5] || '',
    referenceCommande: r[6] || '',
    adresseFacturation: r[7] || '',
    typeElement: r[8] || '',
    numProduit: r[9] || '',
    designationProduit: r[10] || '',
    referenceInterne: r[11] || '',
    quantite: parseNumber(r[12]),
    prixAchat: parseNumber(r[13]),
    totalHT: parseNumber(r[14]),
  }));
}

// Parse uploaded CSV file
export function parseCSVFile<T>(file: File, mapper: (rows: string[][]) => T[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      delimiter: ';',
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const data = mapper(result.data as string[][]);
          resolve(data);
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}
