import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useImportLogs } from '@/hooks/use-db-data';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import {
  parseAchatCSV,
  parseOTCSV,
  parseOTLigneCSV,
  parsePointageCSV,
  parseMatiereCSV,
  mapCableRows,
} from '@/lib/csv-client-parser';

const FILE_TYPES = [
  { key: 'achat', label: 'Achats', accept: '.csv', pattern: 'ACHAT' },
  { key: 'ot', label: 'OT', accept: '.csv', pattern: 'DATA_OT_Z' },
  { key: 'ot_ligne', label: 'OT Lignes', accept: '.csv', pattern: 'OT_LIGNE' },
  { key: 'pointage', label: 'Pointage', accept: '.csv', pattern: 'POINTAGE' },
  { key: 'matiere', label: 'Matières', accept: '.csv', pattern: 'MATIER' },
  { key: 'cables', label: 'Câbles (XLSX)', accept: '.xlsx', pattern: 'EXTRACTION' },
];

const TABLE_MAP: Record<string, string> = {
  achat: 'achats',
  ot: 'ots',
  ot_ligne: 'ot_lignes',
  pointage: 'pointages',
  matiere: 'matieres',
  cables: 'cables',
};

async function insertBatch(tableName: string, data: any[], batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(tableName).insert(batch);
    if (error) throw new Error(`Insert ${tableName} batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

export function DataImport() {
  const [files, setFiles] = useState<Record<string, File>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: logs } = useImportLogs();
  const queryClient = useQueryClient();

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: Record<string, File> = { ...files };
    Array.from(e.target.files).forEach(file => {
      const name = file.name.toUpperCase();
      const type = FILE_TYPES.find(t => name.includes(t.pattern));
      if (type) newFiles[type.key] = file;
    });
    setFiles(newFiles);
  };

  const handleImport = async () => {
    const entries = Object.entries(files);
    if (entries.length === 0) {
      toast.error('Sélectionnez au moins un fichier');
      return;
    }

    setImporting(true);
    setResults([]);
    const allResults: any[] = [];

    try {
      for (let idx = 0; idx < entries.length; idx++) {
        const [key, file] = entries[idx];
        const tableName = TABLE_MAP[key];
        setImportProgress(`${idx + 1}/${entries.length} — ${tableName}`);

        try {
          let mapped: any[];

          if (key === 'cables') {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('cable')) || wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
            mapped = mapCableRows(rawRows);
          } else {
            const text = await file.text();
            switch (key) {
              case 'achat': mapped = parseAchatCSV(text); break;
              case 'ot': mapped = parseOTCSV(text); break;
              case 'ot_ligne': mapped = parseOTLigneCSV(text); break;
              case 'pointage': mapped = parsePointageCSV(text); break;
              case 'matiere': mapped = parseMatiereCSV(text); break;
              default: mapped = [];
            }
          }

          // Delete existing data then insert
          await (supabase as any).from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          const count = await insertBatch(tableName, mapped);

          // Log success
          await supabase.from('import_logs').insert({
            table_name: tableName,
            rows_imported: count,
            status: 'success',
          });

          allResults.push({ table: tableName, rows: count, status: 'success' });
        } catch (err: any) {
          allResults.push({ table: tableName, rows: 0, status: 'error', error: err.message });
          await supabase.from('import_logs').insert({
            table_name: tableName,
            rows_imported: 0,
            status: 'error',
            error_message: err.message,
          });
        }
      }

      setResults(allResults);
      const successCount = allResults.filter(r => r.status === 'success').length;
      toast.success(`${successCount} table(s) importée(s) avec succès`);

      // Invalidate all dashboard query keys
      queryClient.invalidateQueries({ queryKey: ['achat-data'] });
      queryClient.invalidateQueries({ queryKey: ['ot-data'] });
      queryClient.invalidateQueries({ queryKey: ['ot-ligne-data'] });
      queryClient.invalidateQueries({ queryKey: ['pointage-data'] });
      queryClient.invalidateQueries({ queryKey: ['matier-data'] });
      queryClient.invalidateQueries({ queryKey: ['cable-data'] });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      // Also invalidate db-* keys used by use-db-data hooks
      queryClient.invalidateQueries({ queryKey: ['db-achats'] });
      queryClient.invalidateQueries({ queryKey: ['db-ot-lignes'] });
      queryClient.invalidateQueries({ queryKey: ['db-pointages'] });
      queryClient.invalidateQueries({ queryKey: ['db-matieres'] });
      queryClient.invalidateQueries({ queryKey: ['db-cables'] });

      setFiles({});
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import de données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {FILE_TYPES.map(type => (
              <div
                key={type.key}
                className="rounded-lg p-3 text-center border border-border bg-secondary/30"
              >
                <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">{type.label}</p>
                {files[type.key] ? (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {files[type.key].name.substring(0, 20)}
                  </Badge>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">{type.accept}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx"
              onChange={handleFiles}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Sélectionner les fichiers
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importing || Object.keys(files).length === 0}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              {importing ? 'Import en cours...' : 'Importer'}
            </Button>
            {importProgress && (
              <span className="text-xs text-muted-foreground">{importProgress}</span>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.status === 'success' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className="text-foreground font-medium">{r.table}</span>
                  <span className="text-muted-foreground">
                    {r.status === 'success' ? `${r.rows} lignes` : r.error}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {logs && logs.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historique des imports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  {log.status === 'success' ? (
                    <CheckCircle className="h-3 w-3 text-success" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-foreground font-medium">{log.table_name}</span>
                  <span className="text-muted-foreground">{log.rows_imported} lignes</span>
                  <span className="text-muted-foreground ml-auto">
                    {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
