import * as XLSX from 'xlsx';

export interface CableData {
  cbl: string;
  repereCbl: string;
  respTirage: string;
  indApproCa: string;
  lngTotal: number;
  totLngTiree: number;
  dateTirPlusTot: string | null;
  dateTirPlusTard: string | null;
  dateTirageCbl: string | null;
  sttCblBord: string | null;
  lotMtgApo: string;
  apo: string;
  apa: string;
  ptCbl: string;
  catCablage: string;
  codZoneTirage: string;
  lotOuAppCbl: string;
  gam: string;
  nav: string;
  fn: string;
}

function excelDateToString(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial date
    const d = new Date((v - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().substring(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  // Try DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Try ISO
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().substring(0, 10);
}

function getVal(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
  }
  return undefined;
}

function parseRow(row: Record<string, unknown>): CableData {
  return {
    cbl: String(getVal(row, 'CBL') ?? ''),
    repereCbl: String(getVal(row, 'REPERE_CBL') ?? ''),
    respTirage: String(getVal(row, 'RESP_TIRAGE') ?? '').trim().toUpperCase(),
    indApproCa: String(getVal(row, 'IND_APPRO_CA') ?? '').trim().toUpperCase(),
    lngTotal: (Number(getVal(row, 'LNG_TOTAL', 'LNG_TOTALE')) || 0) / 100,
    totLngTiree: (Number(getVal(row, 'TOT_LNG_TIREE') ?? 0) || 0) / 100,
    dateTirPlusTot: excelDateToString(getVal(row, 'DATE_TIR_PLUS_TOT')),
    dateTirPlusTard: excelDateToString(getVal(row, 'DATE_TIR_PLUS_TARD')),
    dateTirageCbl: excelDateToString(getVal(row, 'DATE_TIRAGE_CBL')),
    sttCblBord: getVal(row, 'STT_CBL_BORD') ? String(getVal(row, 'STT_CBL_BORD')).trim().toUpperCase() : null,
    lotMtgApo: String(getVal(row, 'LOT_MTG_APO') ?? ''),
    apo: String(getVal(row, 'APO') ?? ''),
    apa: String(getVal(row, 'APA') ?? ''),
    ptCbl: String(getVal(row, 'PT_CBL') ?? ''),
    catCablage: String(getVal(row, 'CAT_CABLAGE') ?? ''),
    codZoneTirage: String(getVal(row, 'COD_ZONE_TIRAGE') ?? ''),
    lotOuAppCbl: String(getVal(row, 'LOT_OU_APP_CBL') ?? ''),
    gam: String(getVal(row, 'GAM') ?? ''),
    nav: String(getVal(row, 'NAV') ?? ''),
    fn: String(getVal(row, 'FN') ?? '').trim().toUpperCase(),
  };
}

export async function loadCableData(): Promise<CableData[]> {
  const res = await fetch('/data/Extraction_NEC_Z34.xlsx');
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets['cables'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  
  // Debug: log column names and sample data
  if (rows.length > 0) {
    const cols = Object.keys(rows[0]);
    console.log('[cable-parser] Columns:', cols);
    console.log('[cable-parser] Sample row:', JSON.stringify(rows[0]));
    console.log('[cable-parser] Total rows:', rows.length);
    // Check LNG columns
    const lngCols = cols.filter(c => c.toUpperCase().includes('LNG'));
    console.log('[cable-parser] LNG columns:', lngCols);
  }
  
  // Filtre global : uniquement RESP_TIRAGE = GEST
  const result = rows.map(parseRow).filter(c => c.respTirage === 'GEST');
  const filerie = result.filter(c => c.indApproCa !== 'O');
  console.log('[cable-parser] Columns:', rows.length > 0 ? Object.keys(rows[0]) : []);
  console.log('[cable-parser] GEST count:', result.length, '| Filerie count:', filerie.length);
  console.log('[cable-parser] Filerie LNG_TOTAL:', Math.round(filerie.reduce((s, c) => s + c.lngTotal, 0)));
  console.log('[cable-parser] Filerie Tiré:', Math.round(filerie.filter(c => c.sttCblBord === 'T').reduce((s, c) => s + c.lngTotal, 0)));
  console.log('[cable-parser] IND_APPRO_CA values:', [...new Set(result.map(c => c.indApproCa))]);
  return result;
}

export function parseCableFile(file: File): Promise<CableData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets['cables'] || wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        // Filtre global : uniquement RESP_TIRAGE = GEST
        resolve(rows.map(parseRow).filter(c => c.respTirage === 'GEST'));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Filter helpers (RESP_TIRAGE=GEST déjà appliqué au chargement)
export function getTirageData(data: CableData[]) {
  return data.filter(c => c.indApproCa === 'O');
}

export function getFilerieData(data: CableData[]) {
  return data.filter(c => c.indApproCa !== 'O');
}

/** Toutes les données (déjà filtrées GEST) */
export function getAllGestData(data: CableData[]) {
  return data;
}

export function isTire(c: CableData) { return c.sttCblBord === 'T'; }
export function isLovage(c: CableData) { return c.sttCblBord === 'L'; }
export function isNonTire(c: CableData) { return !c.sttCblBord; }
export function isEnRetard(c: CableData) {
  if (isTire(c)) return false;
  if (!c.dateTirPlusTard) return false;
  return c.dateTirPlusTard < new Date().toISOString().substring(0, 10);
}
