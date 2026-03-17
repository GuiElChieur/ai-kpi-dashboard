import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  loadOTData,
  type OTData, type OTLigneData, type PointageData,
  type MatierData, type AchatData
} from '@/lib/csv-parser';

// --- DB fetch helpers with pagination ---
async function fetchAll(table: string) {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await (supabase as any).from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

// --- DB row → interface mappers ---
function mapOtLigne(r: any): OTLigneData {
  return {
    dateJour: r.date_jour || '',
    affaireMaitre: r.affaire_maitre || '',
    identifiantProjet: r.identifiant_projet || '',
    trigramme: r.trigramme || '',
    repere: r.repere || '',
    typeMO: r.type_mo || '',
    libelleTache: r.libelle_tache || '',
    qtePrevue: r.qte_prevue ?? 0,
    qteRealisee: r.qte_realisee ?? 0,
    chargePrevisionnelle: r.charge_previsionnelle ?? 0,
    vbtr: r.vbtr ?? 0,
    chargeRestante: r.charge_restante ?? 0,
    avancementEffectif: r.avancement_effectif ?? 0,
    tp: r.tp ?? 0,
    typeOT: r.type_ot || '',
    lot: r.lot || '',
    zone: r.zone || '',
    stade: r.stade || '',
    monteur: r.monteur || '',
    codeResponsable: r.code_responsable || '',
    codeLibreTable: r.code_libre_table || '',
  };
}

function mapPointage(r: any): PointageData {
  return {
    intitule: r.intitule || '',
    codeLibreAlpha: r.code_libre_alpha || '',
    nomPrenom: r.nom_prenom || '',
    quantite99: 0,
    dateSaisie: r.date_saisie || '',
    affaireMaitre: r.affaire_maitre || '',
    intituleAffaire: r.intitule_affaire || '',
    employeur: r.employeur || '',
    quantite: r.quantite ?? 0,
    objetTravail: r.objet_travail || '',
    codeLibreTable: r.code_libre_table || '',
    numAffaire: r.num_affaire || '',
    user: r.username || '',
    intervenant: r.intervenant || '',
    dateModif: r.date_modif || '',
    equipe: r.equipe || '',
    identifiantProjet: r.identifiant_projet || '',
  };
}

function mapMatiere(r: any): MatierData {
  return {
    affaire: r.affaire || '',
    ot: r.ot || '',
    lot: r.lot || '',
    dateDebut: r.date_debut || '',
    tri: r.tri || '',
    rep: r.rep || '',
    quantiteBesoin: r.quantite_besoin ?? 0,
    quantiteEnPreparation: r.quantite_preparation ?? 0,
    quantiteSortie: r.quantite_sortie ?? 0,
    referenceInterne: r.reference_interne || '',
    designationProduit: r.designation_produit || '',
    dateLivraison: r.date_livraison || '',
    statutProjet: r.statut_projet || '',
  };
}

function mapAchat(r: any): AchatData {
  return {
    typeSaisie: r.type_saisie || '',
    dateCommande: r.date_commande || '',
    dateLivPrevue: r.date_livraison || '',
    codeAffaire: r.code_affaire || '',
    numCommande: r.num_commande || '',
    numBL: r.num_bl || '',
    referenceCommande: r.reference_commande || '',
    adresseFacturation: r.adresse_facturation || '',
    typeElement: r.type_element || '',
    numProduit: r.num_produit || '',
    designationProduit: r.designation_produit || '',
    referenceInterne: r.reference_interne || '',
    quantite: r.quantite ?? 0,
    prixAchat: r.prix_achat ?? 0,
    totalHT: r.total_ht ?? 0,
  };
}

// --- OT mapper ---
function mapOT(r: any): OTData {
  return {
    dateJour: r.date_jour || '',
    affaire: r.affaire || '',
    codeResponsable: r.code_responsable || '',
    numOT: r.num_ot || '',
    libelleProjet: r.libelle_projet || '',
    lot: r.lot || '',
    chargePrevisionnelle: r.charge_previsionnelle ?? 0,
    tp: r.tp ?? 0,
    avancementEffectif: r.avancement_effectif ?? 0,
    vbtr: r.vbtr ?? 0,
    type: r.type || '',
    tranche: r.tranche || '',
    zone: r.zone || '',
    debutPlusTot: r.debut_plus_tot || '',
    finPlusTot: r.fin_plus_tot || '',
    debutPlusTard: r.debut_plus_tard || '',
    finPlusTard: r.fin_plus_tard || '',
    dateDebutTheorique: r.date_debut_theorique || '',
    statut: r.statut || '',
    societe: r.societe || '',
    stade: r.stade || '',
    typeOTBis: r.type_ot_bis || '',
    natureOT: r.nature_ot || '',
    moPrev: r.mo_prev ?? 0,
    statutProjet: r.statut_projet || '',
  };
}

// --- Smart loaders: try DB first, fallback to CSV ---
async function loadOTsFromDb(): Promise<OTData[]> {
  const rows = await fetchAll('ots');
  if (rows.length > 0) return rows.map(mapOT);
  return loadOTData();
}

async function loadOtLignesFromDb(): Promise<OTLigneData[]> {
  const rows = await fetchAll('ot_lignes');
  if (rows.length > 0) return rows.map(mapOtLigne);
  // Fallback to CSV
  const { loadOTLigneData } = await import('@/lib/csv-parser');
  return loadOTLigneData();
}

async function loadPointagesFromDb(): Promise<PointageData[]> {
  const rows = await fetchAll('pointages');
  if (rows.length > 0) return rows.map(mapPointage);
  const { loadPointageData } = await import('@/lib/csv-parser');
  return loadPointageData();
}

async function loadMatieresFromDb(): Promise<MatierData[]> {
  const rows = await fetchAll('matieres');
  if (rows.length > 0) return rows.map(mapMatiere);
  const { loadMatierData } = await import('@/lib/csv-parser');
  return loadMatierData();
}

async function loadAchatsFromDb(): Promise<AchatData[]> {
  const rows = await fetchAll('achats');
  if (rows.length > 0) return rows.map(mapAchat);
  const { loadAchatData } = await import('@/lib/csv-parser');
  return loadAchatData();
}

export function useDashboardData() {
  const otQuery = useQuery({ queryKey: ['ot-data'], queryFn: loadOTsFromDb, staleTime: 5 * 60 * 1000 });
  // DB-backed queries
  const otLigneQuery = useQuery({ queryKey: ['ot-ligne-data'], queryFn: loadOtLignesFromDb, staleTime: 5 * 60 * 1000 });
  const pointageQuery = useQuery({ queryKey: ['pointage-data'], queryFn: loadPointagesFromDb, staleTime: 5 * 60 * 1000 });
  const matierQuery = useQuery({ queryKey: ['matier-data'], queryFn: loadMatieresFromDb, staleTime: 5 * 60 * 1000 });
  const achatQuery = useQuery({ queryKey: ['achat-data'], queryFn: loadAchatsFromDb, staleTime: 5 * 60 * 1000 });

  const isLoading = otQuery.isLoading || otLigneQuery.isLoading || pointageQuery.isLoading || matierQuery.isLoading || achatQuery.isLoading;
  const isError = otQuery.isError || otLigneQuery.isError || pointageQuery.isError || matierQuery.isError || achatQuery.isError;

  return {
    otData: otQuery.data || [] as OTData[],
    otLigneData: otLigneQuery.data || [] as OTLigneData[],
    pointageData: pointageQuery.data || [] as PointageData[],
    matierData: matierQuery.data || [] as MatierData[],
    achatData: achatQuery.data || [] as AchatData[],
    isLoading,
    isError,
  };
}

// KPI computations
export function computeOTKpis(data: OTData[]) {
  const latest = data.filter(d => d.dateJour === data[0]?.dateJour);
  const total = latest.length;
  const completed = latest.filter(d => d.avancementEffectif >= 100).length;
  const inProgress = latest.filter(d => d.avancementEffectif > 0 && d.avancementEffectif < 100).length;
  const notStarted = latest.filter(d => d.avancementEffectif === 0).length;
  const totalCharge = latest.reduce((s, d) => s + d.chargePrevisionnelle, 0);
  const totalVBTR = latest.reduce((s, d) => s + d.vbtr, 0);
  const avgAvancement = total > 0 ? latest.reduce((s, d) => s + d.avancementEffectif, 0) / total : 0;

  const byType: Record<string, { count: number; charge: number; vbtr: number; avgAvancement: number }> = {};
  latest.forEach(d => {
    const t = d.type || 'Non défini';
    if (!byType[t]) byType[t] = { count: 0, charge: 0, vbtr: 0, avgAvancement: 0 };
    byType[t].count++;
    byType[t].charge += d.chargePrevisionnelle;
    byType[t].vbtr += d.vbtr;
    byType[t].avgAvancement += d.avancementEffectif;
  });
  Object.keys(byType).forEach(k => {
    byType[k].avgAvancement /= byType[k].count;
  });

  return { total, completed, inProgress, notStarted, totalCharge, totalVBTR, avgAvancement, byType };
}

export function computePointageKpis(data: PointageData[]) {
  const totalHeures = data.reduce((s, d) => s + d.quantite, 0);
  
  const byPersonne: Record<string, number> = {};
  const byEquipe: Record<string, number> = {};
  const byEmployeur: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  data.forEach(d => {
    const name = d.nomPrenom || 'Inconnu';
    byPersonne[name] = (byPersonne[name] || 0) + d.quantite;
    const eq = d.equipe || 'Non défini';
    byEquipe[eq] = (byEquipe[eq] || 0) + d.quantite;
    const emp = d.employeur || 'Non défini';
    byEmployeur[emp] = (byEmployeur[emp] || 0) + d.quantite;
    const date = d.dateSaisie || '';
    byDate[date] = (byDate[date] || 0) + d.quantite;
  });

  return { totalHeures, byPersonne, byEquipe, byEmployeur, byDate, nbIntervenants: Object.keys(byPersonne).length };
}

export function computeMatierKpis(data: MatierData[]) {
  const totalBesoin = data.reduce((s, d) => s + d.quantiteBesoin, 0);
  const totalSortie = data.reduce((s, d) => s + d.quantiteSortie, 0);
  const totalPreparation = data.reduce((s, d) => s + d.quantiteEnPreparation, 0);
  const tauxSortie = totalBesoin > 0 ? (totalSortie / totalBesoin) * 100 : 0;

  const byStatut: Record<string, number> = {};
  data.forEach(d => {
    const s = d.statutProjet || 'Non défini';
    byStatut[s] = (byStatut[s] || 0) + 1;
  });

  return { totalBesoin, totalSortie, totalPreparation, tauxSortie, nbReferences: data.length, byStatut };
}

export function computeAchatKpis(data: AchatData[]) {
  const totalHT = data.reduce((s, d) => s + d.totalHT, 0);
  const nbCommandes = new Set(data.map(d => d.numCommande)).size;
  
  const byFournisseur: Record<string, number> = {};
  data.forEach(d => {
    const f = d.adresseFacturation || 'Non défini';
    byFournisseur[f] = (byFournisseur[f] || 0) + d.totalHT;
  });

  const byMonth: Record<string, number> = {};
  data.forEach(d => {
    const m = d.dateCommande?.substring(0, 7) || 'N/A';
    byMonth[m] = (byMonth[m] || 0) + d.totalHT;
  });

  return { totalHT, nbCommandes, nbLignes: data.length, byFournisseur, byMonth };
}
