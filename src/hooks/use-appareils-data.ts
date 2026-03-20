import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppareilData } from '@/lib/appareils-parser';

const ALLOWED_FNS = ['DES', 'DHA', 'ECD', 'ELP', 'ORD', 'RDI'];

const APPAREIL_COLUMNS = '*';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUpper(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

function mapAppareilEnriched(r: any): AppareilData {
  return {
    respPose: normalizeUpper(r.resp_pose),
    fn: normalizeUpper(r.fn),
    lotMtgApp: normalizeText(r.lot_mtg_app),
    local: normalizeText(r.local),
    libLocal: normalizeText(r.lib_local),
    app: normalizeText(r.app),
    tApp: normalizeText(r.t_app),
    libDesign: normalizeText(r.lib_design),
    respPretAPoser: normalizeText(r.resp_pret_a_poser),
    indPretAPoser: normalizeUpper(r.ind_pret_a_poser),
    indPose: normalizeUpper(r.ind_pose),
    dateFinOd: r.date_fin_od || null,
    dateContrainte: r.date_contrainte ? (typeof r.date_contrainte === 'string' ? r.date_contrainte.substring(0, 10) : null) : null,
  };
}

async function loadFromDb(): Promise<AppareilData[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await (supabase as any)
      .from('appareils_enriched')
      .select(APPAREIL_COLUMNS)
      .eq('resp_pose', 'GEST')
      .order('id', { ascending: true })
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
