import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppareilsData } from './use-appareils-data';
import type { AppareilData } from '@/lib/appareils-parser';

async function fetchAllPages(table: string): Promise<any[]> {
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

/**
 * Extract the middle segment from repere: XXX-VALEUR-YYY → VALEUR
 */
function cleanRepere(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === 'POINTAGE' || trimmed === '') return null;
  const parts = trimmed.split('-');
  if (parts.length >= 3) return parts[1];
  if (parts.length === 2) return parts[1];
  return trimmed;
}

export interface EquipementItem extends AppareilData {
  repereApp: string; // the APP value used as REPERE_APP key
}

async function loadG7PReperes(): Promise<Set<string>> {
  const otLignes = await fetchAllPages('ot_lignes');
  const g7p = otLignes.filter(r => {
    const idProjet = (r.identifiant_projet || '').trim().toUpperCase();
    return idProjet.endsWith('G7P');
  });

  const reperes = new Set<string>();
  for (const r of g7p) {
    const raw = r.repere || '';
    const cleaned = cleanRepere(raw);
    if (cleaned) reperes.add(cleaned);
  }

  console.log(`[use-equipement-data] OT Lignes G7P: ${g7p.length}, repères uniques nettoyés: ${reperes.size}`);
  return reperes;
}

export function useEquipementData(appareilsData: AppareilData[] | undefined) {
  return useQuery<EquipementItem[]>({
    queryKey: ['equipement-g7p', appareilsData?.length],
    queryFn: async () => {
      if (!appareilsData || appareilsData.length === 0) return [];

      const g7pReperes = await loadG7PReperes();

      // Strict matching: APP == cleaned repere
      // Dedup by APP
      const seen = new Set<string>();
      const result: EquipementItem[] = [];

      for (const a of appareilsData) {
        const appKey = (a.app || '').trim().toUpperCase();
        if (!appKey || seen.has(appKey)) continue;
        if (!g7pReperes.has(appKey)) continue;
        seen.add(appKey);
        result.push({ ...a, repereApp: a.app });
      }

      console.log(`[use-equipement-data] Appareils GEST: ${appareilsData.length}, matched G7P: ${result.length}`);
      return result;
    },
    enabled: !!appareilsData && appareilsData.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
