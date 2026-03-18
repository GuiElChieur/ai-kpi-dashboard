import * as XLSX from 'xlsx';

export interface AppareilData {
  respPose: string;
  fn: string;
  lotMtgApp: string;
  local: string;
  libLocal: string;
  app: string;
  tApp: string;
  libDesign: string;
  respPretAPoser: string;
  indPretAPoser: string;
  indPose: string;
  dateFinOd: string | null;
  dateContrainte: string | null;
}

function excelDateToString(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().substring(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().substring(0, 10);
}

function getVal(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
  }
  return undefined;
}

function parseRow(row: Record<string, unknown>): AppareilData {
  return {
    respPose: String(getVal(row, 'RESP_POSE') ?? '').trim().toUpperCase(),
    fn: String(getVal(row, 'FN') ?? '').trim().toUpperCase(),
    lotMtgApp: String(getVal(row, 'LOT_MTG_APP') ?? ''),
    local: String(getVal(row, 'LOCAL') ?? ''),
    libLocal: String(getVal(row, 'LIB_LOCAL') ?? ''),
    app: String(getVal(row, 'APP') ?? ''),
    tApp: String(getVal(row, 'T_APP') ?? ''),
    libDesign: String(getVal(row, 'LIB_DESIGN') ?? ''),
    respPretAPoser: String(getVal(row, 'RESP_PRET_A_POSER') ?? ''),
    indPretAPoser: String(getVal(row, 'IND_PRET_A_POSER') ?? '').trim().toUpperCase(),
    indPose: String(getVal(row, 'IND_POSE') ?? '').trim().toUpperCase(),
    dateFinOd: excelDateToString(getVal(row, 'Date de Fin OD', 'DATE_FIN_OD', 'Date_Fin_OD')),
    dateContrainte: excelDateToString(getVal(row, 'DATE_CONTRAINTE', 'Date_Contrainte', 'date_contrainte')),
  };
}

export async function loadAppareilData(): Promise<AppareilData[]> {
  const res = await fetch('/data/Extraction_NEC_Z34.xlsx');
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets['appareils'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  if (rows.length > 0) {
    console.log('[appareils-parser] Columns:', Object.keys(rows[0]));
    console.log('[appareils-parser] Total rows:', rows.length);
  }

  const result = rows.map(parseRow).filter(c => c.respPose === 'GEST');
  console.log('[appareils-parser] GEST count:', result.length);
  return result;
}

export function parseAppareilFile(file: File): Promise<AppareilData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets['appareils'] || wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        resolve(rows.map(parseRow).filter(c => c.respPose === 'GEST'));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
