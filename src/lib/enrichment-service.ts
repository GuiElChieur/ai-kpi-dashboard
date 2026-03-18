/**
 * Enrichment Service — Y34 → Z34 matching, enrichment, and persistence
 * 
 * MATCHING STRATEGY:
 * Primary key: REPERE_APP column (repère appareil, unique identifier across Y34/Z34).
 * Normalization: trim + uppercase + remove extra whitespace.
 * Ambiguity: if multiple Y34 rows have the same REPERE_APP, the match is skipped (ambiguous).
 * 
 * ENRICHMENT RULES:
 * - RESP_POSE: never overwrite if already set in Z34. Fill from Y34 match or persisted DB value.
 * - DATE_CONTRAINTE: from Y34 + 10 months on initial enrichment. On re-import Z34,
 *   a non-empty Z34 date can overwrite the persisted value. Never overwrite with empty.
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { addMonths } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────

export interface RawAppareilRow {
  [key: string]: unknown;
}

export interface AppareilRecord {
  app: string;
  repereApp: string;    // Primary match key (REPERE_APP)
  fn: string;
  local: string;
  libLocal: string;
  lotMtgApp: string;
  tApp: string;
  libDesign: string;
  respPose: string;
  respPretAPoser: string;
  indPretAPoser: string;
  indPose: string;
  dateFinOd: string | null;
  dateContrainte: string | null;
}

export interface EnrichmentResult {
  enrichedData: AppareilRecord[];
  stats: EnrichmentStats;
}

export interface EnrichmentStats {
  z34LinesRead: number;
  y34LinesRead: number;
  matchesFound: number;
  ambiguousMatches: number;
  respPoseCompleted: number;
  respPoseKept: number;
  dateContrainteCalculated: number;
  dateContrainteUpdatedFromZ34: number;
  linesIgnored: number;
  savedToDb: number;
}

export interface PersistedEnrichment {
  match_key: string;
  app: string | null;
  fn: string | null;
  local: string | null;
  lib_local: string | null;
  lot_mtg_app: string | null;
  t_app: string | null;
  resp_pose: string | null;
  resp_pose_source: string | null;
  date_contrainte: string | null;
  date_contrainte_source: string | null;
  y34_resp_pose: string | null;
  y34_date_contrainte: string | null;
  y34_date_contrainte_calculated: string | null;
}

// ─── Column Detection (flexible) ────────────────────────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  APP: ['APP', 'APPAREIL', 'CODE_APP', 'IDE_APP'],
  REPERE_APP: ['REPERE_APP', 'REPERE APP', 'REP_APP', 'REPERE_APPAREIL'],
  FN: ['FN', 'TRIGRAMME', 'CODE_FN'],
  LOCAL: ['LOCAL', 'CODE_LOCAL'],
  LIB_LOCAL: ['LIB_LOCAL', 'LIBELLE_LOCAL', 'LIB LOCAL'],
  LOT_MTG_APP: ['LOT_MTG_APP', 'LOT', 'LOT_APP'],
  T_APP: ['T_APP', 'TYPE_APP', 'TYPE_APPAREIL'],
  LIB_DESIGN: ['LIB_DESIGN', 'LIBELLE_DESIGN', 'DESIGNATION', 'LIB DESIGN'],
  RESP_POSE: ['RESP_POSE', 'RESPONSABLE_POSE', 'RESP POSE'],
  RESP_PRET_A_POSER: ['RESP_PRET_A_POSER', 'RESP PRET A POSER'],
  IND_PRET_A_POSER: ['IND_PRET_A_POSER', 'IND PRET A POSER'],
  IND_POSE: ['IND_POSE', 'IND POSE'],
  DATE_FIN_OD: ['DATE_FIN_OD', 'Date de Fin OD', 'Date_Fin_OD'],
  DATE_CONTRAINTE: ['DATE_CONTRAINTE', 'Date_Contrainte', 'Date Contrainte', 'date_contrainte'],
};

function normalizeColName(name: string): string {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
}

function findColumn(row: Record<string, unknown>, target: string): string | null {
  const aliases = COLUMN_ALIASES[target] || [target];
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalized = normalizeColName(alias);
    for (const key of keys) {
      if (normalizeColName(key) === normalized) return key;
    }
  }
  return null;
}

function getFlexVal(row: Record<string, unknown>, target: string): unknown {
  const col = findColumn(row, target);
  return col ? row[col] : undefined;
}

// ─── Date Helpers ───────────────────────────────────────────────

function excelDateToISO(v: unknown): string | null {
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
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().substring(0, 10);
}

function addTenMonths(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const result = addMonths(d, 10);
  return result.toISOString().substring(0, 10);
}

// ─── Normalization ──────────────────────────────────────────────

function normalizeMatchKey(val: unknown): string {
  return String(val ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
}

// ─── Parse Excel Sheet ─────────────────────────────────────────

function parseSheet(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const ws = wb.Sheets['appareils'] || wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
}

function rowToRecord(row: Record<string, unknown>): AppareilRecord {
  return {
    app: normalizeMatchKey(getFlexVal(row, 'APP')),
    repereApp: normalizeMatchKey(getFlexVal(row, 'REPERE_APP')),
    fn: String(getFlexVal(row, 'FN') ?? '').trim().toUpperCase(),
    local: String(getFlexVal(row, 'LOCAL') ?? ''),
    libLocal: String(getFlexVal(row, 'LIB_LOCAL') ?? ''),
    lotMtgApp: String(getFlexVal(row, 'LOT_MTG_APP') ?? ''),
    tApp: String(getFlexVal(row, 'T_APP') ?? ''),
    libDesign: String(getFlexVal(row, 'LIB_DESIGN') ?? ''),
    respPose: String(getFlexVal(row, 'RESP_POSE') ?? '').trim().toUpperCase(),
    respPretAPoser: String(getFlexVal(row, 'RESP_PRET_A_POSER') ?? ''),
    indPretAPoser: String(getFlexVal(row, 'IND_PRET_A_POSER') ?? '').trim().toUpperCase(),
    indPose: String(getFlexVal(row, 'IND_POSE') ?? '').trim().toUpperCase(),
    dateFinOd: excelDateToISO(getFlexVal(row, 'DATE_FIN_OD')),
    dateContrainte: excelDateToISO(getFlexVal(row, 'DATE_CONTRAINTE')),
  };
}

// ─── Load Z34 from project file ────────────────────────────────

export async function loadZ34FromProject(): Promise<AppareilRecord[]> {
  const res = await fetch('/data/Extraction_NEC_Z34.xlsx');
  if (!res.ok) throw new Error('Fichier Extraction_NEC_Z34.xlsx introuvable dans le projet');
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const rows = parseSheet(wb);
  console.log('[enrichment] Z34 project file: columns =', rows.length > 0 ? Object.keys(rows[0]) : '(empty)');
  return rows.map(rowToRecord);
}

// ─── Load Z34 from DB (appareils table) ────────────────────────

export async function loadZ34FromDb(): Promise<AppareilRecord[]> {
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
  return allData.map((r: any) => ({
    app: normalizeMatchKey(r.app),
    repereApp: normalizeMatchKey(r.app), // DB doesn't have repere_app yet, fallback to app
    fn: (r.fn || '').toUpperCase(),
    local: r.local || '',
    libLocal: r.lib_local || '',
    lotMtgApp: r.lot_mtg_app || '',
    tApp: r.t_app || '',
    libDesign: r.lib_design || '',
    respPose: (r.resp_pose || '').toUpperCase(),
    respPretAPoser: r.resp_pret_a_poser || '',
    indPretAPoser: (r.ind_pret_a_poser || '').toUpperCase(),
    indPose: (r.ind_pose || '').toUpperCase(),
    dateFinOd: r.date_fin_od || null,
    dateContrainte: r.date_contrainte || null,
  }));
}

// ─── Parse uploaded file ────────────────────────────────────────

export function parseExcelFile(file: File): Promise<AppareilRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: 'array' });
        const rows = parseSheet(wb);
        console.log('[enrichment] Parsed file:', file.name, 'rows =', rows.length, 'columns =', rows.length > 0 ? Object.keys(rows[0]) : '(empty)');
        resolve(rows.map(rowToRecord));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Load persisted enrichments from Supabase ──────────────────

export async function loadPersistedEnrichments(): Promise<Map<string, PersistedEnrichment>> {
  const map = new Map<string, PersistedEnrichment>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await (supabase as any).from('appareil_enrichments').select('*').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      map.set(row.match_key, row as PersistedEnrichment);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

// ─── Build Y34 lookup (detect ambiguity) ────────────────────────

function buildY34Lookup(y34Data: AppareilRecord[]): { lookup: Map<string, AppareilRecord>; ambiguous: Set<string> } {
  const counts = new Map<string, number>();
  const lookup = new Map<string, AppareilRecord>();
  const ambiguous = new Set<string>();

  for (const rec of y34Data) {
    const key = rec.repereApp;
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (counts.get(key)! > 1) {
      ambiguous.add(key);
      lookup.delete(key);
    } else {
      lookup.set(key, rec);
    }
  }

  for (const k of ambiguous) lookup.delete(k);

  console.log(`[enrichment] Y34 lookup: ${lookup.size} unique REPERE_APP keys, ${ambiguous.size} ambiguous`);
  return { lookup, ambiguous };
}

// ─── Main Enrichment Logic ──────────────────────────────────────

export async function enrichZ34(
  z34Data: AppareilRecord[],
  y34Data: AppareilRecord[] | null,
  isReimport: boolean = false,
): Promise<EnrichmentResult> {
  const stats: EnrichmentStats = {
    z34LinesRead: z34Data.length,
    y34LinesRead: y34Data?.length ?? 0,
    matchesFound: 0,
    ambiguousMatches: 0,
    respPoseCompleted: 0,
    respPoseKept: 0,
    dateContrainteCalculated: 0,
    dateContrainteUpdatedFromZ34: 0,
    linesIgnored: 0,
    savedToDb: 0,
  };

  // Load persisted enrichments
  const persisted = await loadPersistedEnrichments();

  // Build Y34 lookup if provided
  let y34Lookup: Map<string, AppareilRecord> | null = null;
  let y34Ambiguous: Set<string> | null = null;
  if (y34Data) {
    const result = buildY34Lookup(y34Data);
    y34Lookup = result.lookup;
    y34Ambiguous = result.ambiguous;
    stats.ambiguousMatches = y34Ambiguous.size;
  }

  const enrichedData: AppareilRecord[] = [];
  const upsertBatch: any[] = [];

  for (const z34Row of z34Data) {
    const enriched = { ...z34Row };
    const matchKey = z34Row.repereApp; // Use REPERE_APP as match key

    if (!matchKey) {
      stats.linesIgnored++;
      enrichedData.push(enriched);
      continue;
    }

    // Check if ambiguous
    if (y34Ambiguous?.has(matchKey)) {
      // Don't apply Y34 data but still apply persisted
    }

    const y34Match = y34Lookup?.get(matchKey) ?? null;
    const persistedMatch = persisted.get(matchKey) ?? null;

    if (y34Match) stats.matchesFound++;

    let respPoseSource = persistedMatch?.resp_pose_source ?? null;
    let dateContrainteSource = persistedMatch?.date_contrainte_source ?? null;
    let y34RespPose = persistedMatch?.y34_resp_pose ?? null;
    let y34DateContrainte = persistedMatch?.y34_date_contrainte ?? null;
    let y34DateCalculated = persistedMatch?.y34_date_contrainte_calculated ?? null;

    // ── RESP_POSE Rules ──
    if (z34Row.respPose && z34Row.respPose.trim() !== '') {
      // Rule 1: Z34 already has a value → keep it
      enriched.respPose = z34Row.respPose;
      stats.respPoseKept++;
      if (!respPoseSource || respPoseSource === 'y34') {
        respPoseSource = 'z34_original';
      }
    } else if (persistedMatch?.resp_pose && persistedMatch.resp_pose.trim() !== '') {
      // Rule 4: Re-apply persisted value
      enriched.respPose = persistedMatch.resp_pose;
      stats.respPoseCompleted++;
    } else if (y34Match && y34Match.respPose && y34Match.respPose.trim() !== '') {
      // Rule 2: Fill from Y34
      enriched.respPose = y34Match.respPose;
      y34RespPose = y34Match.respPose;
      respPoseSource = 'y34';
      stats.respPoseCompleted++;
    }

    // ── DATE_CONTRAINTE Rules ──
    if (isReimport && z34Row.dateContrainte && z34Row.dateContrainte.trim() !== '') {
      // Rule 3 (re-import): Z34 has a real date → it can overwrite
      enriched.dateContrainte = z34Row.dateContrainte;
      dateContrainteSource = 'z34_reimport';
      stats.dateContrainteUpdatedFromZ34++;
    } else if (isReimport && (!z34Row.dateContrainte || z34Row.dateContrainte.trim() === '') && persistedMatch?.date_contrainte) {
      // Rule 4 (re-import): Z34 empty → keep persisted
      enriched.dateContrainte = persistedMatch.date_contrainte;
    } else if (!isReimport && z34Row.dateContrainte && z34Row.dateContrainte.trim() !== '') {
      // Initial: Z34 already has value → keep
      enriched.dateContrainte = z34Row.dateContrainte;
      if (!dateContrainteSource) dateContrainteSource = 'z34_original';
    } else if (persistedMatch?.date_contrainte) {
      // Apply persisted
      enriched.dateContrainte = persistedMatch.date_contrainte;
    } else if (y34Match && y34Match.dateContrainte) {
      // Initial enrichment from Y34 + 10 months
      y34DateContrainte = y34Match.dateContrainte;
      const calculated = addTenMonths(y34Match.dateContrainte);
      y34DateCalculated = calculated;
      enriched.dateContrainte = calculated;
      dateContrainteSource = 'y34_plus_10m';
      stats.dateContrainteCalculated++;
    }

    // Prepare upsert record
    if (y34Match || persistedMatch || enriched.respPose || enriched.dateContrainte) {
      upsertBatch.push({
        match_key: matchKey,
        app: enriched.app || null,
        fn: enriched.fn || null,
        local: enriched.local || null,
        lib_local: enriched.libLocal || null,
        lot_mtg_app: enriched.lotMtgApp || null,
        t_app: enriched.tApp || null,
        resp_pose: enriched.respPose || null,
        resp_pose_source: respPoseSource,
        date_contrainte: enriched.dateContrainte || null,
        date_contrainte_source: dateContrainteSource,
        y34_resp_pose: y34RespPose,
        y34_date_contrainte: y34DateContrainte,
        y34_date_contrainte_calculated: y34DateCalculated,
        updated_at: new Date().toISOString(),
      });
    }

    enrichedData.push(enriched);
  }

  // Upsert to Supabase in batches
  const batchSize = 500;
  for (let i = 0; i < upsertBatch.length; i += batchSize) {
    const batch = upsertBatch.slice(i, i + batchSize);
    const { error } = await (supabase as any)
      .from('appareil_enrichments')
      .upsert(batch, { onConflict: 'match_key' });
    if (error) {
      console.error('[enrichment] Upsert error:', error);
      throw new Error(`Erreur upsert enrichments batch ${i}: ${error.message}`);
    }
    stats.savedToDb += batch.length;
  }

  return { enrichedData, stats };
}

// ─── Log import ─────────────────────────────────────────────────

export async function logEnrichmentImport(
  fileName: string,
  fileType: 'y34' | 'z34',
  stats: EnrichmentStats,
) {
  await (supabase as any).from('enrichment_imports').insert({
    file_name: fileName,
    file_type: fileType,
    rows_read: fileType === 'y34' ? stats.y34LinesRead : stats.z34LinesRead,
    rows_matched: stats.matchesFound,
    rows_enriched_resp_pose: stats.respPoseCompleted,
    rows_enriched_date_contrainte: stats.dateContrainteCalculated,
    rows_ignored: stats.linesIgnored,
    rows_ambiguous: stats.ambiguousMatches,
    rows_saved: stats.savedToDb,
    rows_resp_pose_kept: stats.respPoseKept,
    rows_date_updated_from_z34: stats.dateContrainteUpdatedFromZ34,
    is_active: true,
  });
}

// ─── Export enriched Excel ──────────────────────────────────────

export async function exportEnrichedExcel(
  enrichedData: AppareilRecord[],
  originalFile?: ArrayBuffer,
): Promise<Blob> {
  let wb: XLSX.WorkBook;

  if (originalFile) {
    // Preserve other sheets from the original file
    wb = XLSX.read(originalFile, { type: 'array' });
    // Find or create appareils sheet
    const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'appareils') || 'appareils';
    const rows = enrichedData.map(r => ({
      APP: r.app,
      REPERE_APP: r.repereApp,
      FN: r.fn,
      LOCAL: r.local,
      LIB_LOCAL: r.libLocal,
      LOT_MTG_APP: r.lotMtgApp,
      T_APP: r.tApp,
      LIB_DESIGN: r.libDesign,
      RESP_POSE: r.respPose,
      RESP_PRET_A_POSER: r.respPretAPoser,
      IND_PRET_A_POSER: r.indPretAPoser,
      IND_POSE: r.indPose,
      DATE_FIN_OD: r.dateFinOd,
      DATE_CONTRAINTE: r.dateContrainte,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    if (wb.SheetNames.includes(sheetName)) {
      wb.Sheets[sheetName] = ws;
    } else {
      XLSX.utils.book_append_sheet(wb, ws, 'appareils');
    }
  } else {
    wb = XLSX.utils.book_new();
    const rows = enrichedData.map(r => ({
      APP: r.app,
      REPERE_APP: r.repereApp,
      FN: r.fn,
      LOCAL: r.local,
      LIB_LOCAL: r.libLocal,
      LOT_MTG_APP: r.lotMtgApp,
      T_APP: r.tApp,
      LIB_DESIGN: r.libDesign,
      RESP_POSE: r.respPose,
      RESP_PRET_A_POSER: r.respPretAPoser,
      IND_PRET_A_POSER: r.indPretAPoser,
      IND_POSE: r.indPose,
      DATE_FIN_OD: r.dateFinOd,
      DATE_CONTRAINTE: r.dateContrainte,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'appareils');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ─── Update appareils table in DB ───────────────────────────────

export async function updateAppareilsInDb(enrichedData: AppareilRecord[]) {
  // Delete and re-insert to the appareils table
  await (supabase as any).from('appareils').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const mapped = enrichedData.map(r => ({
    app: r.app || null,
    fn: r.fn || null,
    local: r.local || null,
    lib_local: r.libLocal || null,
    lot_mtg_app: r.lotMtgApp || null,
    t_app: r.tApp || null,
    lib_design: r.libDesign || null,
    resp_pose: r.respPose || null,
    resp_pret_a_poser: r.respPretAPoser || null,
    ind_pret_a_poser: r.indPretAPoser || null,
    ind_pose: r.indPose || null,
    date_fin_od: r.dateFinOd || null,
    date_contrainte: r.dateContrainte || null,
  }));

  const batchSize = 500;
  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    const { error } = await (supabase as any).from('appareils').insert(batch);
    if (error) throw new Error(`Insert appareils batch ${i}: ${error.message}`);
  }
}
