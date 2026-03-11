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

function parseRow(row: Record<string, unknown>): CableData {
  return {
    cbl: String(row['CBL'] ?? ''),
    repereCbl: String(row['REPERE_CBL'] ?? ''),
    respTirage: String(row['RESP_TIRAGE'] ?? '').trim().toUpperCase(),
    indApproCa: String(row['IND_APPRO_CA'] ?? '').trim().toUpperCase(),
    lngTotal: Number(row['LNG_TOTAL']) || 0,
    totLngTiree: Number(row['TOT_LNG_TIREE']) || 0,
    dateTirPlusTot: excelDateToString(row['DATE_TIR_PLUS_TOT']),
    dateTirPlusTard: excelDateToString(row['DATE_TIR_PLUS_TARD']),
    dateTirageCbl: excelDateToString(row['DATE_TIRAGE_CBL']),
    sttCblBord: row['STT_CBL_BORD'] ? String(row['STT_CBL_BORD']).trim().toUpperCase() : null,
    lotMtgApo: String(row['LOT_MTG_APO'] ?? ''),
    apo: String(row['APO'] ?? ''),
    apa: String(row['APA'] ?? ''),
    ptCbl: String(row['PT_CBL'] ?? ''),
    catCablage: String(row['CAT_CABLAGE'] ?? ''),
    codZoneTirage: String(row['COD_ZONE_TIRAGE'] ?? ''),
    lotOuAppCbl: String(row['LOT_OU_APP_CBL'] ?? ''),
    gam: String(row['GAM'] ?? ''),
    nav: String(row['NAV'] ?? ''),
    fn: String(row['FN'] ?? '').trim().toUpperCase(),
  };
}

export async function loadCableData(): Promise<CableData[]> {
  const res = await fetch('/data/Extraction_NEC_Z34.xlsx');
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets['cables'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  if (rows.length > 0) console.log('[cable-parser] columns:', Object.keys(rows[0]).join(', '));
  if (rows.length > 0) console.log('[cable-parser] sample TOT_LNG_TIREE:', rows[0]['TOT_LNG_TIREE'], 'FN:', rows[0]['FN']);
  return rows.map(parseRow).filter(c => c.respTirage === 'GEST');
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
        resolve(rows.map(parseRow).filter(c => c.respTirage === 'GEST'));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Filter helpers
export function getTirageData(data: CableData[]) {
  return data.filter(c => c.indApproCa === 'O');
}

export function getFilerieData(data: CableData[]) {
  return data.filter(c => c.indApproCa !== 'O');
}

export function isTire(c: CableData) { return c.sttCblBord === 'T'; }
export function isLovage(c: CableData) { return c.sttCblBord === 'L'; }
export function isNonTire(c: CableData) { return !c.sttCblBord; }
export function isEnRetard(c: CableData) {
  if (isTire(c)) return false;
  if (!c.dateTirPlusTard) return false;
  return c.dateTirPlusTard < new Date().toISOString().substring(0, 10);
}
