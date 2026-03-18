import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadAppareilData, type AppareilData } from '@/lib/appareils-parser';

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

const ALLOWED_FNS = ['DES', 'DHA', 'ECD', 'ELP', 'ORD', 'RDI'];

function normalizeKey(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, '');
}

async function fetchAllPages(table: string, filter?: { col: string; val: string }): Promise<any[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = (supabase as any).from(table).select('*');
    if (filter) query = query.eq(filter.col, filter.val);
    query = query.range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

async function loadFromDb(): Promise<AppareilData[]> {
  // Load all appareils (not just GEST) so we can apply enrichments first
  const allAppareils = await fetchAllPages('appareils');
  
  if (allAppareils.length === 0) {
    return loadAppareilData();
  }

  // Load enrichment overrides
  const enrichments = await fetchAllPages('appareil_enrichments');
  
  // Build enrichment lookup by normalized APP value (enrichments store 'app' field = APP column)
  const enrichMap = new Map<string, any>();
  for (const e of enrichments) {
    const key = e.app ? normalizeKey(e.app) : (e.match_key ? normalizeKey(e.match_key) : null);
    if (key) {
      enrichMap.set(key, e);
    }
  }

  console.log(`[use-appareils-data] Appareils: ${allAppareils.length}, Enrichments: ${enrichments.length}`);

  // Map and apply enrichments
  const mapped = allAppareils.map(r => {
    const item = mapAppareil(r);
    const key = normalizeKey(item.app);
    const enrichment = enrichMap.get(key);
    
    if (enrichment) {
      // RESP_POSE: if empty in appareils, apply enriched value
      if (!item.respPose && enrichment.resp_pose) {
        item.respPose = enrichment.resp_pose;
      }
      // DATE_CONTRAINTE: if empty in appareils, apply enriched value
      // Use the best available: date_contrainte (final), y34_date_contrainte_calculated, or y34_date_contrainte
      if (!item.dateContrainte) {
        const enrichedDate = enrichment.date_contrainte || enrichment.y34_date_contrainte_calculated || enrichment.y34_date_contrainte;
        if (enrichedDate) {
          item.dateContrainte = typeof enrichedDate === 'string' ? enrichedDate.substring(0, 10) : null;
        }
      }
    }
    
    return item;
  });

  // Now filter: RESP_POSE = GEST AND (FN in allowed OR LIB_LOCAL = ECR)
  return mapped.filter(a =>
    a.respPose === 'GEST' &&
    (ALLOWED_FNS.includes(a.fn) || a.libLocal.toUpperCase() === 'ECR')
  );
}

export function useAppareilsData() {
  return useQuery<AppareilData[]>({
    queryKey: ['appareils-data'],
    queryFn: loadFromDb,
    staleTime: 5 * 60 * 1000,
  });
}
