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

function mapAppareilEnriched(r: any): AppareilData {
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
    dateContrainte: r.date_contrainte ? (typeof r.date_contrainte === 'string' ? r.date_contrainte.substring(0, 10) : null) : null,
  };
}

function cleanRepere(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === 'POINTAGE' || trimmed === '') return null;
  const parts = trimmed.split('-');
  if (parts.length >= 3) return parts.slice(1, -1).join('-');
  if (parts.length === 2) return parts[1];
  return trimmed;
}

interface OtLigneInfo {
  trigramme: string;
  lot: string;
  suffixe: string;
}

async function loadEquipementH7P(): Promise<EquipementItem[]> {
  // Step 1: Load OT Lignes, filter H7P
  const otLignes = await fetchAllPages('ot_lignes');
  const h7pReperes = new Set<string>();
  const otInfoMap = new Map<string, OtLigneInfo>();

  for (const r of otLignes) {
    const idProjet = (r.identifiant_projet || '').trim().toUpperCase();
    if (!idProjet.endsWith('H7P')) continue;
    const cleaned = cleanRepere(r.repere || '');
    if (!cleaned) continue;
    h7pReperes.add(cleaned);

    if (!otInfoMap.has(cleaned)) {
      const projParts = idProjet.split('-');
      const suffixe = projParts.length > 0 ? projParts[projParts.length - 1] : '';
      otInfoMap.set(cleaned, {
        trigramme: (r.trigramme || '').trim(),
        lot: (r.lot || '').trim(),
        suffixe,
      });
    }
  }

  console.log(`[use-equipement-data] H7P unique repères: ${h7pReperes.size}`);

  // Step 2: Use pre-joined view instead of separate appareils + 118k enrichments
  const allAppareils = await fetchAllPages('appareils_enriched');

  // Step 3: Build lookup by normalized APP
  const appareilByApp = new Map<string, AppareilData>();
  for (const r of allAppareils) {
    const item = mapAppareilEnriched(r);
    const key = normalizeKey(item.app);
    if (!key) continue;
    if (!appareilByApp.has(key)) {
      appareilByApp.set(key, item);
    }
  }

  // Step 4: Also load enrichments for stubs (only the ones we need)
  // We still need enrichment data for stubs not found in appareils
  // But now we can filter: only load enrichments matching H7P repères
  const enrichMap = new Map<string, any>();
  const missingReperes = [...h7pReperes].filter(r => !appareilByApp.has(r));
  
  if (missingReperes.length > 0) {
    // Fetch only needed enrichments in batches
    for (let i = 0; i < missingReperes.length; i += 50) {
      const batch = missingReperes.slice(i, i + 50);
      const { data } = await supabase
        .from('appareil_enrichments')
        .select('*')
        .in('match_key', batch);
      if (data) {
        for (const e of data) {
          const key = e.app ? normalizeKey(e.app) : normalizeKey(e.match_key);
          if (key) enrichMap.set(key, e);
        }
      }
    }
  }

  // Step 5: Match H7P repères with appareils
  const result: EquipementItem[] = [];
  const seen = new Set<string>();

  for (const repere of h7pReperes) {
    if (seen.has(repere)) continue;
    seen.add(repere);

    const appareil = appareilByApp.get(repere);
    const otInfo = otInfoMap.get(repere);

    if (appareil) {
      if (!appareil.fn && otInfo?.trigramme) appareil.fn = otInfo.trigramme;
      if (!appareil.lotMtgApp && otInfo?.lot) appareil.lotMtgApp = otInfo.lot;
      if (!appareil.tApp && otInfo?.suffixe) appareil.tApp = otInfo.suffixe;
      result.push({ ...appareil, repereApp: appareil.app });
    } else {
      const enrichment = enrichMap.get(repere);
      result.push({
        respPose: enrichment?.resp_pose || '',
        fn: otInfo?.trigramme || enrichment?.fn || '',
        lotMtgApp: otInfo?.lot || enrichment?.lot_mtg_app || '',
        local: enrichment?.local || '',
        libLocal: enrichment?.lib_local || '',
        app: repere,
        tApp: otInfo?.suffixe || enrichment?.t_app || '',
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

  console.log(`[use-equipement-data] Final H7P equipements: ${result.length}`);
  return result;
}

export function useEquipementData() {
  return useQuery<EquipementItem[]>({
    queryKey: ['equipement-h7p'],
    queryFn: loadEquipementH7P,
    staleTime: 5 * 60 * 1000,
  });
}
