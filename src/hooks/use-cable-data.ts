import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CableData } from '@/lib/cable-parser';

const CABLE_COLUMNS = '*';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUpper(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

function mapCable(r: any): CableData {
  return {
    cbl: normalizeText(r.cbl),
    repereCbl: normalizeText(r.repere_cbl),
    respTirage: normalizeUpper(r.resp_tirage),
    indApproCa: normalizeUpper(r.ind_appro_ca),
    lngTotal: r.lng_total ?? 0,
    totLngTiree: r.tot_lng_tiree ?? 0,
    dateTirPlusTot: r.date_tir_plus_tot || null,
    dateTirPlusTard: r.date_tir_plus_tard || null,
    dateTirageCbl: r.date_tirage_cbl || null,
    sttCblBord: normalizeUpper(r.stt_cbl_bord) || null,
    lotMtgApo: normalizeText(r.lot_mtg_apo),
    apo: normalizeText(r.apo),
    apa: normalizeText(r.apa),
    ptCbl: normalizeText(r.pt_cbl),
    catCablage: normalizeText(r.cat_cablage),
    codZoneTirage: normalizeText(r.cod_zone_tirage),
    lotOuAppCbl: normalizeText(r.lot_ou_app_cbl),
    gam: normalizeText(r.gam),
    nav: normalizeText(r.nav),
    fn: normalizeUpper(r.fn),
    cblRaccRespO: normalizeUpper(r.cbl_racc_resp_o),
    cblRaccRespA: normalizeUpper(r.cbl_racc_resp_a),
    cblRaccordeO: normalizeUpper(r.cbl_raccorde_o),
    cblRaccordeA: normalizeUpper(r.cbl_raccorde_a),
    sttCblBe: normalizeUpper(r.stt_cbl_be),
    localApo: normalizeText(r.local_apo),
  };
}

async function loadCablesFromDb(): Promise<CableData[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('cables')
      .select(CABLE_COLUMNS)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData.map(mapCable);
}

export function useCableData() {
  return useQuery<CableData[]>({
    queryKey: ['cable-data'],
    queryFn: loadCablesFromDb,
    staleTime: 5 * 60 * 1000,
  });
}
