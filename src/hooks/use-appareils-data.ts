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

async function loadFromDb(): Promise<AppareilData[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await (supabase as any).from('appareils').select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  if (allData.length > 0) return allData.map(mapAppareil);
  return loadAppareilData();
}

export function useAppareilsData() {
  return useQuery<AppareilData[]>({
    queryKey: ['appareils-data'],
    queryFn: loadFromDb,
    staleTime: 5 * 60 * 1000,
  });
}
