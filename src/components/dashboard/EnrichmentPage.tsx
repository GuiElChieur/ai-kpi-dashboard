import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle, XCircle, Loader2, Download,
  Database, RefreshCw, FileSpreadsheet, ArrowRight, Info,
} from 'lucide-react';
import {
  loadZ34FromProject,
  loadZ34FromDb,
  parseExcelFile,
  enrichZ34,
  logEnrichmentImport,
  exportEnrichedExcel,
  updateAppareilsInDb,
  type AppareilRecord,
  type EnrichmentStats,
} from '@/lib/enrichment-service';

type Step = 'idle' | 'loading' | 'ready' | 'enriching' | 'done' | 'error';

export function EnrichmentPage() {
  const [step, setStep] = useState<Step>('idle');
  const [z34Source, setZ34Source] = useState<'project' | 'db' | 'upload'>('project');
  const [z34Data, setZ34Data] = useState<AppareilRecord[] | null>(null);
  const [y34Data, setY34Data] = useState<AppareilRecord[] | null>(null);
  const [y34FileName, setY34FileName] = useState('');
  const [newZ34File, setNewZ34File] = useState<File | null>(null);
  const [newZ34Data, setNewZ34Data] = useState<AppareilRecord[] | null>(null);
  const [enrichedData, setEnrichedData] = useState<AppareilRecord[] | null>(null);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const y34InputRef = useRef<HTMLInputElement>(null);
  const z34InputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ── Load Z34 ──
  const handleLoadZ34 = useCallback(async (source: 'project' | 'db') => {
    setProcessing(true);
    setErrorMsg('');
    try {
      let data: AppareilRecord[];
      if (source === 'db') {
        data = await loadZ34FromDb();
        if (data.length === 0) {
          data = await loadZ34FromProject();
          setZ34Source('project');
        } else {
          setZ34Source('db');
        }
      } else {
        data = await loadZ34FromProject();
        setZ34Source('project');
      }
      setZ34Data(data);
      setStep('ready');
      toast.success(`Z34 chargé : ${data.length} appareils`);
    } catch (err: any) {
      setErrorMsg(err.message);
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  }, []);

  // ── Upload Y34 ──
  const handleY34Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const data = await parseExcelFile(file);
      setY34Data(data);
      setY34FileName(file.name);
      toast.success(`Y34 chargé : ${data.length} appareils`);
    } catch (err: any) {
      toast.error(`Erreur Y34 : ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }, []);

  // ── Upload new Z34 (optional re-import) ──
  const handleNewZ34Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const data = await parseExcelFile(file);
      setNewZ34File(file);
      setNewZ34Data(data);
      toast.success(`Nouveau Z34 chargé : ${data.length} appareils`);
    } catch (err: any) {
      toast.error(`Erreur nouveau Z34 : ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }, []);

  // ── Run Enrichment ──
  const handleEnrich = useCallback(async () => {
    const sourceZ34 = newZ34Data || z34Data;
    if (!sourceZ34) {
      toast.error('Aucune donnée Z34 disponible');
      return;
    }

    setProcessing(true);
    setStep('enriching');
    setErrorMsg('');
    try {
      const isReimport = !!newZ34Data;
      const result = await enrichZ34(sourceZ34, y34Data, isReimport);

      // Update appareils table in DB
      await updateAppareilsInDb(result.enrichedData);

      // Log the import
      if (y34Data) {
        await logEnrichmentImport(y34FileName || 'Extraction_Y34.xlsx', 'y34', result.stats);
      }
      if (newZ34Data && newZ34File) {
        await logEnrichmentImport(newZ34File.name, 'z34', result.stats);
      }

      setEnrichedData(result.enrichedData);
      setStats(result.stats);
      setStep('done');

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['appareils-data'] });

      toast.success('Enrichissement terminé avec succès');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('error');
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  }, [z34Data, y34Data, newZ34Data, newZ34File, y34FileName, queryClient]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (!enrichedData) return;
    try {
      // Try to use original file as base for preserving other sheets
      let originalBuf: ArrayBuffer | undefined;
      try {
        const res = await fetch('/data/Extraction_NEC_Z34.xlsx');
        if (res.ok) originalBuf = await res.arrayBuffer();
      } catch { /* ignore */ }

      const blob = await exportEnrichedExcel(enrichedData, originalBuf);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Extraction_Z34_enrichi.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Fichier exporté');
    } catch (err: any) {
      toast.error(`Export error: ${err.message}`);
    }
  }, [enrichedData]);

  // ── Stat display helper ──
  const StatRow = ({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) => (
    <div className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-bold text-primary' : 'font-medium text-foreground'}>{value}</span>
    </div>
  );

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Enrichissement Y34 → Z34</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Column 1: Z34 Source ── */}
        <Card className="border-border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              1. Source Z34
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              Le fichier <code className="bg-secondary px-1 rounded">Extraction_NEC_Z34.xlsx</code> est disponible dans le projet.
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={z34Source === 'project' && z34Data ? 'default' : 'outline'}
                onClick={() => handleLoadZ34('project')}
                disabled={processing}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Fichier projet
              </Button>
              <Button
                size="sm"
                variant={z34Source === 'db' && z34Data ? 'default' : 'outline'}
                onClick={() => handleLoadZ34('db')}
                disabled={processing}
              >
                <Database className="h-3.5 w-3.5 mr-1" />
                Base de données
              </Button>
            </div>

            {z34Data && (
              <div className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{z34Data.length} appareils chargés ({z34Source === 'db' ? 'DB' : 'fichier projet'})</span>
              </div>
            )}

            {/* Optional: new Z34 upload */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Optionnel : charger un nouveau Z34 (réimport)
              </p>
              <input ref={z34InputRef} type="file" accept=".xlsx" className="hidden" onChange={handleNewZ34Upload} />
              <Button size="sm" variant="ghost" onClick={() => z34InputRef.current?.click()} disabled={processing}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                Nouveau Z34
              </Button>
              {newZ34Data && (
                <div className="flex items-center gap-2 text-xs text-foreground mt-1">
                  <CheckCircle className="h-3.5 w-3.5 text-warning" />
                  <span>{newZ34Data.length} appareils (réimport : {newZ34File?.name})</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Column 2: Y34 Upload ── */}
        <Card className="border-border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Upload className="h-4 w-4" />
              2. Upload Y34
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              Chargez le fichier <code className="bg-secondary px-1 rounded">Extraction_Y34.xlsx</code> pour enrichir Z34.
            </p>

            <input ref={y34InputRef} type="file" accept=".xlsx" className="hidden" onChange={handleY34Upload} />
            <Button size="sm" variant="secondary" onClick={() => y34InputRef.current?.click()} disabled={processing}>
              <FileText className="h-3.5 w-3.5 mr-1" />
              Sélectionner Y34
            </Button>

            {y34Data && (
              <div className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>{y34Data.length} appareils chargés ({y34FileName})</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                L'upload Y34 est optionnel si des enrichissements sont déjà persistés en base.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Column 3: Actions ── */}
        <Card className="border-border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
              3. Enrichir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <Button
              onClick={handleEnrich}
              disabled={processing || (!z34Data && !newZ34Data)}
              className="w-full"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {processing ? 'Traitement en cours...' : 'Analyser et enrichir'}
            </Button>

            {enrichedData && (
              <Button variant="secondary" onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Télécharger Z34 enrichi
              </Button>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t border-border/50">
              <p>• <strong>Matching</strong> : clé APP (trim + uppercase)</p>
              <p>• <strong>RESP_POSE</strong> : ne jamais écraser si déjà renseigné</p>
              <p>• <strong>DATE_CONTRAINTE</strong> : Y34 + 10 mois, ou Z34 si réimport</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Lecture des fichiers</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <StatRow label="Lignes lues Z34" value={stats.z34LinesRead} />
              <StatRow label="Lignes lues Y34" value={stats.y34LinesRead} />
              <StatRow label="Correspondances trouvées" value={stats.matchesFound} highlight />
              <StatRow label="Matchings ambigus" value={stats.ambiguousMatches} />
              <StatRow label="Lignes ignorées" value={stats.linesIgnored} />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Enrichissement</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <StatRow label="RESP_POSE complétés" value={stats.respPoseCompleted} highlight />
              <StatRow label="RESP_POSE conservés (déjà renseignés)" value={stats.respPoseKept} />
              <StatRow label="DATE_CONTRAINTE calculées (Y34+10m)" value={stats.dateContrainteCalculated} highlight />
              <StatRow label="DATE_CONTRAINTE mises à jour (nouveau Z34)" value={stats.dateContrainteUpdatedFromZ34} />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Persistance</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <StatRow label="Enregistrements sauvegardés en base" value={stats.savedToDb} highlight />
              <StatRow label="Total appareils enrichis" value={enrichedData?.length ?? 0} />
              <StatRow
                label="RESP_POSE = GEST"
                value={enrichedData?.filter(a => a.respPose === 'GEST').length ?? 0}
                highlight
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Preview table ── */}
      {enrichedData && enrichedData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Aperçu des données enrichies (100 premières lignes)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 overflow-auto max-h-[300px]">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  {['REPERE_APP', 'APP', 'FN', 'LOCAL', 'LOT', 'RESP_POSE', 'IND_POSE', 'DATE_CONTRAINTE'].map(h => (
                    <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrichedData.slice(0, 100).map((a, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/20">
                    <td className="px-2 py-0.5">{a.repereApp}</td>
                    <td className="px-2 py-0.5">{a.app}</td>
                    <td className="px-2 py-0.5">{a.fn}</td>
                    <td className="px-2 py-0.5">{a.local}</td>
                    <td className="px-2 py-0.5">{a.lotMtgApp}</td>
                    <td className="px-2 py-0.5">
                      <Badge variant={a.respPose === 'GEST' ? 'default' : 'outline'} className="text-[9px] px-1 py-0">
                        {a.respPose || '—'}
                      </Badge>
                    </td>
                    <td className="px-2 py-0.5 text-center">
                      {a.indPose === 'O' ? (
                        <CheckCircle className="h-3 w-3 text-success inline-block" />
                      ) : (
                        <XCircle className="h-3 w-3 text-muted-foreground inline-block" />
                      )}
                    </td>
                    <td className="px-2 py-0.5">{a.dateContrainte ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
