import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppareilData } from '@/lib/appareils-parser';

export interface EquipementItem extends AppareilData {
  repereApp: string;
}

const OT_LIGNE_COLUMNS = '*';
const APPAREIL_COLUMNS = '*';

async function fetchAllPages(table: string, columns: string, filters?: { column: string; op: string; value: string }[]): Promise<any[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = (supabase as any).from(table).select(columns).order('id', { ascending: true }).range(from, from + pageSize - 1);
    if (filters) {
      for (const f of filters) {
        if (f.op === 'ilike') query = query.ilike(f.column, f.value);
        else if (f.op === 'eq') query = query.eq(f.column, f.value);
      }
    }
    const { data, error } = await query;
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
    respPose: typeof r.resp_pose === 'string' ? r.resp_pose.trim().toUpperCase() : '',
    fn: typeof r.fn === 'string' ? r.fn.trim().toUpperCase() : '',
    lotMtgApp: typeof r.lot_mtg_app === 'string' ? r.lot_mtg_app.trim() : '',
    local: typeof r.local === 'string' ? r.local.trim() : '',
    libLocal: typeof r.lib_local === 'string' ? r.lib_local.trim() : '',
    app: typeof r.app === 'string' ? r.app.trim() : '',
    tApp: typeof r.t_app === 'string' ? r.t_app.trim() : '',
    libDesign: typeof r.lib_design === 'string' ? r.lib_design.trim() : '',
    respPretAPoser: typeof r.resp_pret_a_poser === 'string' ? r.resp_pret_a_poser.trim() : '',
    indPretAPoser: typeof r.ind_pret_a_poser === 'string' ? r.ind_pret_a_poser.trim().toUpperCase() : '',
    indPose: typeof r.ind_pose === 'string' ? r.ind_pose.trim().toUpperCase() : '',
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
  // Step 1: Load ONLY H7P OT Lignes (server-side filter)
  const otLignes = await fetchAllPages('ot_lignes', OT_LIGNE_COLUMNS, [
    { column: 'identifiant_projet', op: 'ilike', value: '%H7P' },
  ]);

  const h7pReperes = new Set<string>();
  const otInfoMap = new Map<string, OtLigneInfo>();

  for (const r of otLignes) {
    const idProjet = (r.identifiant_projet || '').trim().toUpperCase();
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

  // Step 2: Load appareils from enriched view (GEST only, like Pose Appareillage)
  const allAppareils = await fetchAllPages('appareils_enriched', APPAREIL_COLUMNS, [
    { column: 'resp_pose', op: 'eq', value: 'GEST' },
  ]);

  // Step 3: Build lookup by normalized APP — store all keys for prefix matching
  const allAppareilItems: { key: string; item: AppareilData }[] = [];
  for (const r of allAppareils) {
    const item = mapAppareilEnriched(r);
    const key = normalizeKey(item.app);
    if (!key) continue;
    allAppareilItems.push({ key, item });
  }

  // Step 4: Match H7P repères with appareils using PREFIX matching
  // ot_lignes repere (e.g. A7AB42A) is a prefix of the real app name (e.g. A7AB42AA)
  const result: EquipementItem[] = [];
  const seen = new Set<string>();

  for (const repere of h7pReperes) {
    if (seen.has(repere)) continue;
    seen.add(repere);

    const otInfo = otInfoMap.get(repere);

    // Find all appareils whose normalized key starts with the repere
    const matchedAppareils = allAppareilItems.filter(a => a.key === repere || a.key.startsWith(repere));

    if (matchedAppareils.length > 0) {
      for (const { item } of matchedAppareils) {
        const enriched = { ...item };
        if (!enriched.fn && otInfo?.trigramme) enriched.fn = otInfo.trigramme;
        if (!enriched.lotMtgApp && otInfo?.lot) enriched.lotMtgApp = otInfo.lot;
        if (!enriched.tApp && otInfo?.suffixe) enriched.tApp = otInfo.suffixe;
        result.push({ ...enriched, repereApp: enriched.app });
      }
    } else {
      // Fallback: check appareil_enrichments
      result.push({
        respPose: '',
        fn: otInfo?.trigramme || '',
        lotMtgApp: otInfo?.lot || '',
        local: '',
        libLocal: '',
        app: repere,
        tApp: otInfo?.suffixe || '',
        libDesign: '',
        respPretAPoser: '',
        indPretAPoser: '',
        indPose: '',
        dateFinOd: null,
        dateContrainte: null,
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
