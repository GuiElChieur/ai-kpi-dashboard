import { useQuery } from '@tanstack/react-query';
import {
  loadOTData, loadOTLigneData, loadPointageData,
  loadMatierData, loadAchatData,
  type OTData, type OTLigneData, type PointageData,
  type MatierData, type AchatData
} from '@/lib/csv-parser';

export function useDashboardData() {
  const otQuery = useQuery({ queryKey: ['ot-data'], queryFn: loadOTData, staleTime: Infinity });
  const otLigneQuery = useQuery({ queryKey: ['ot-ligne-data'], queryFn: loadOTLigneData, staleTime: Infinity });
  const pointageQuery = useQuery({ queryKey: ['pointage-data'], queryFn: loadPointageData, staleTime: Infinity });
  const matierQuery = useQuery({ queryKey: ['matier-data'], queryFn: loadMatierData, staleTime: Infinity });
  const achatQuery = useQuery({ queryKey: ['achat-data'], queryFn: loadAchatData, staleTime: Infinity });

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

  // Group by type
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
