import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadAllCableData, type CableData } from '@/lib/cable-parser';

/**
 * Hook dédié au raccordement : charge les câbles depuis la DB si les colonnes
 * raccordement sont remplies, sinon fallback sur le fichier Extraction_Z34.xlsx.
 */
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

async function loadRaccordementData(): Promise<CableData[]> {
  // Try DB first
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from('cables').select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allData.map(mapCable);
}

export function useRaccordementData() {
  return useQuery<CableData[]>({
    queryKey: ['raccordement-data'],
    queryFn: loadRaccordementData,
    staleTime: 5 * 60 * 1000,
  });
}
