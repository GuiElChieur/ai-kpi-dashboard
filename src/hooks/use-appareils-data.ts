import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppareilData } from '@/lib/appareils-parser';

const ALLOWED_FNS = ['DES', 'DHA', 'ECD', 'ELP', 'ORD', 'RDI'];

const APPAREIL_COLUMNS = 'resp_pose,fn,lot_mtg_app,local,lib_local,app,t_app,lib_design,resp_pret_a_poser,ind_pret_a_poser,ind_pose,date_fin_od,date_contrainte';

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

async function loadFromDb(): Promise<AppareilData[]> {
  // Server-side filter: only GEST resp_pose
  let allData: any[] = [];
  let from = 0;
  const pageSize = 5000;
  while (true) {
    const { data, error } = await (supabase as any)
      .from('appareils_enriched')
      .select(APPAREIL_COLUMNS)
      .eq('resp_pose', 'GEST')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (allData.length === 0) {
    console.warn('[use-appareils-data] Aucune donnée en base.');
    return [];
  }

  console.log(`[use-appareils-data] Loaded ${allData.length} appareils (server-filtered GEST)`);

  const mapped = allData.map(mapAppareilEnriched);

  // Client-side: FN in allowed OR LIB_LOCAL = ECR
  return mapped.filter(a =>
    ALLOWED_FNS.includes(a.fn) || a.libLocal.toUpperCase() === 'ECR'
  );
}

export function useAppareilsData() {
  return useQuery<AppareilData[]>({
    queryKey: ['appareils-data'],
    queryFn: loadFromDb,
    staleTime: 5 * 60 * 1000,
  });
}
