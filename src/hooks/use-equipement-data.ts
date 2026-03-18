import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppareilData } from '@/lib/appareils-parser';

export interface EquipementItem extends AppareilData {
  repereApp: string;
}

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

function normalizeKey(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, '').replace(/^(?:Y34|Z34)[-–—:]?/, '');
}

function mapAppareil(r: any): AppareilData {
  return {
    respPose: r.resp_pose || '',
    fn: r.fn || '',
    lotMtgApp: r.lot_mtg_app || '',
    local: r.local || '',
    libLocal: r.lib_local || '',
    app: r.app || '',
    tApp: r.t_app || '',
    libDesign: r.lib_design || '',
    respPretAPoser: r.resp_pret_a_poser || '',
    indPretAPoser: r.ind_pret_a_poser || '',
    indPose: r.ind_pose || '',
    dateFinOd: r.date_fin_od || null,
    dateContrainte: r.date_contrainte || null,
  };
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

async function loadEquipementG7P(): Promise<EquipementItem[]> {
  // Step 1: Load ALL appareils from DB (no FN filter)
  const allAppareils = await fetchAllPages('appareils');

  // Step 2: Load enrichment overrides
  const enrichments = await fetchAllPages('appareil_enrichments');
  const enrichMap = new Map<string, any>();
  for (const e of enrichments) {
    const key = e.app ? normalizeKey(e.app) : (e.match_key ? normalizeKey(e.match_key) : null);
    if (key) enrichMap.set(key, e);
  }

  // Step 3: Map appareils and apply enrichments
  const mapped = allAppareils.map(r => {
    const item = mapAppareil(r);
    const key = normalizeKey(item.app);
    const enrichment = enrichMap.get(key);
    if (enrichment) {
      if (!item.respPose && enrichment.resp_pose) item.respPose = enrichment.resp_pose;
      if (!item.dateContrainte) {
        const enrichedDate = enrichment.date_contrainte || enrichment.y34_date_contrainte_calculated || enrichment.y34_date_contrainte;
        if (enrichedDate) item.dateContrainte = typeof enrichedDate === 'string' ? enrichedDate.substring(0, 10) : null;
      }
    }
    return item;
  });

  // Step 4: Filter RESP_POSE = GEST only (no FN filter!)
  const gestAppareils = mapped.filter(a => a.respPose === 'GEST');

  // Step 5: Load OT Lignes, filter G7P, clean repère
  const otLignes = await fetchAllPages('ot_lignes');
  const g7pReperes = new Set<string>();
  for (const r of otLignes) {
    const idProjet = (r.identifiant_projet || '').trim().toUpperCase();
    if (!idProjet.endsWith('G7P')) continue;
    const cleaned = cleanRepere(r.repere || '');
    if (cleaned) g7pReperes.add(cleaned);
  }

  console.log(`[use-equipement-data] All appareils: ${allAppareils.length}, GEST: ${gestAppareils.length}, G7P repères: ${g7pReperes.size}`);

  // Step 6: Strict matching APP == cleaned repere, dedup by APP
  const seen = new Set<string>();
  const result: EquipementItem[] = [];
  for (const a of gestAppareils) {
    const appKey = (a.app || '').trim().toUpperCase();
    if (!appKey || seen.has(appKey)) continue;
    if (!g7pReperes.has(appKey)) continue;
    seen.add(appKey);
    result.push({ ...a, repereApp: a.app });
  }

  console.log(`[use-equipement-data] Final matched G7P equipements: ${result.length}`);
  return result;
}

export function useEquipementData() {
  return useQuery<EquipementItem[]>({
    queryKey: ['equipement-g7p'],
    queryFn: loadEquipementG7P,
    staleTime: 5 * 60 * 1000,
  });
}
