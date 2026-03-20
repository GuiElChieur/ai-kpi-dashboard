import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CableData } from '@/lib/cable-parser';

const CABLE_COLUMNS = 'cbl,repere_cbl,resp_tirage,ind_appro_ca,lng_total,tot_lng_tiree,date_tir_plus_tot,date_tir_plus_tard,date_tirage_cbl,stt_cbl_bord,lot_mtg_apo,apo,apa,pt_cbl,cat_cablage,cod_zone_tirage,lot_ou_app_cbl,gam,nav,fn,cbl_racc_resp_o,cbl_racc_resp_a,cbl_raccorde_o,cbl_raccorde_a,stt_cbl_be,local_apo';

function mapCable(r: any): CableData {
  return {
    cbl: r.cbl || '',
    repereCbl: r.repere_cbl || '',
    respTirage: r.resp_tirage || '',
    indApproCa: r.ind_appro_ca || '',
    lngTotal: r.lng_total ?? 0,
    totLngTiree: r.tot_lng_tiree ?? 0,
    dateTirPlusTot: r.date_tir_plus_tot || null,
    dateTirPlusTard: r.date_tir_plus_tard || null,
    dateTirageCbl: r.date_tirage_cbl || null,
    sttCblBord: r.stt_cbl_bord || null,
    lotMtgApo: r.lot_mtg_apo || '',
    apo: r.apo || '',
    apa: r.apa || '',
    ptCbl: r.pt_cbl || '',
    catCablage: r.cat_cablage || '',
    codZoneTirage: r.cod_zone_tirage || '',
    lotOuAppCbl: r.lot_ou_app_cbl || '',
    gam: r.gam || '',
    nav: r.nav || '',
    fn: r.fn || '',
    cblRaccRespO: r.cbl_racc_resp_o || '',
    cblRaccRespA: r.cbl_racc_resp_a || '',
    cblRaccordeO: r.cbl_raccorde_o || '',
    cblRaccordeA: r.cbl_raccorde_a || '',
    sttCblBe: r.stt_cbl_be || '',
    localApo: r.local_apo || '',
  };
}

async function loadCablesFromDb(): Promise<CableData[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 5000;
  while (true) {
    const { data, error } = await supabase
      .from('cables')
      .select(CABLE_COLUMNS)
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
