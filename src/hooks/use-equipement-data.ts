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
  if (parts.length >= 3) return parts.slice(1, -1).join('-');
  if (parts.length === 2) return parts[1];
  return trimmed;
}

async function loadEquipementH7P(): Promise<EquipementItem[]> {
  // Step 1: Load OT Lignes, filter H7P, clean repère
  const otLignes = await fetchAllPages('ot_lignes');
  const h7pReperes = new Set<string>();
  for (const r of otLignes) {
    const idProjet = (r.identifiant_projet || '').trim().toUpperCase();
    if (!idProjet.endsWith('H7P')) continue;
    const cleaned = cleanRepere(r.repere || '');
    if (cleaned) h7pReperes.add(cleaned);
  }

  console.log(`[use-equipement-data] H7P unique repères: ${h7pReperes.size}`);

  // Step 2: Load ALL appareils from DB
  const allAppareils = await fetchAllPages('appareils');

  // Step 3: Load enrichment overrides
  const enrichments = await fetchAllPages('appareil_enrichments');
  const enrichMap = new Map<string, any>();
  for (const e of enrichments) {
    const key = e.app ? normalizeKey(e.app) : (e.match_key ? normalizeKey(e.match_key) : null);
    if (key) enrichMap.set(key, e);
  }

  // Step 4: Map appareils and apply enrichments
  const appareilByApp = new Map<string, AppareilData>();
  for (const r of allAppareils) {
    const item = mapAppareil(r);
    const key = normalizeKey(item.app);
    if (!key) continue;

    const enrichment = enrichMap.get(key);
    if (enrichment) {
      if (!item.respPose && enrichment.resp_pose) item.respPose = enrichment.resp_pose;
      if (!item.dateContrainte) {
        const enrichedDate = enrichment.date_contrainte || enrichment.y34_date_contrainte_calculated || enrichment.y34_date_contrainte;
        if (enrichedDate) item.dateContrainte = typeof enrichedDate === 'string' ? enrichedDate.substring(0, 10) : null;
      }
    }

    // Keep first occurrence (dedup by APP)
    if (!appareilByApp.has(key)) {
      appareilByApp.set(key, item);
    }
  }

  // Step 5: Match H7P repères with appareils — NO RESP_POSE filter
  // Include ALL matched items + create stubs for unmatched repères
  const result: EquipementItem[] = [];
  const seen = new Set<string>();

  for (const repere of h7pReperes) {
    if (seen.has(repere)) continue;
    seen.add(repere);

    const appareil = appareilByApp.get(repere);
    if (appareil) {
      result.push({ ...appareil, repereApp: appareil.app });
    } else {
      // Check enrichments for data
      const enrichment = enrichMap.get(repere);
      result.push({
        respPose: enrichment?.resp_pose || '',
        fn: enrichment?.fn || '',
        lotMtgApp: enrichment?.lot_mtg_app || '',
        local: enrichment?.local || '',
        libLocal: enrichment?.lib_local || '',
        app: repere,
        tApp: enrichment?.t_app || '',
        libDesign: '',
        respPretAPoser: '',
        indPretAPoser: '',
        indPose: '',
        dateFinOd: null,
        dateContrainte: enrichment?.date_contrainte || enrichment?.y34_date_contrainte_calculated || null,
        repereApp: repere,
      });
    }
  }

  console.log(`[use-equipement-data] Final H7P equipements: ${result.length} (from ${h7pReperes.size} repères, ${appareilByApp.size} appareils in DB)`);
  return result;
}

export function useEquipementData() {
  return useQuery<EquipementItem[]>({
    queryKey: ['equipement-h7p'],
    queryFn: loadEquipementH7P,
    staleTime: 5 * 60 * 1000,
  });
}
