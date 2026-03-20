import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppareilData } from '@/lib/appareils-parser';

const ALLOWED_FNS = ['DES', 'DHA', 'ECD', 'ELP', 'ORD', 'RDI'];

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

async function loadFromDb(): Promise<AppareilData[]> {
  // Use the pre-joined view instead of fetching 118k+ enrichments separately
  const allAppareils = await fetchAllPages('appareils_enriched');
  
  if (allAppareils.length === 0) {
    console.warn('[use-appareils-data] Aucune donnée en base.');
    return [];
  }

  console.log(`[use-appareils-data] Loaded ${allAppareils.length} appareils from enriched view`);

  const mapped = allAppareils.map(mapAppareilEnriched);

  // Filter: RESP_POSE = GEST AND (FN in allowed OR LIB_LOCAL = ECR)
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
