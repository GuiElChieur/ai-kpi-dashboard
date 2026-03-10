import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CSVUploadProps {
  onFilesLoaded: (files: { name: string; file: File }[]) => void;
}

export function CSVUpload({ onFilesLoaded }: CSVUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<{ name: string; file: File }[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter(f => f.name.endsWith('.csv'))
      .map(f => ({ name: f.name, file: f }));
    if (droppedFiles.length) {
      setFiles(prev => [...prev, ...droppedFiles]);
      onFilesLoaded(droppedFiles);
    }
  }, [onFilesLoaded]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
      .filter(f => f.name.endsWith('.csv'))
      .map(f => ({ name: f.name, file: f }));
    if (selected.length) {
      setFiles(prev => [...prev, ...selected]);
      onFilesLoaded(selected);
    }
  }, [onFilesLoaded]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Upload className="h-4 w-4" /> Importer des fichiers CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('csv-input')?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Glissez-déposez vos fichiers CSV ici</p>
          <p className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
          <input id="csv-input" type="file" accept=".csv" multiple className="hidden" onChange={handleInput} />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="flex-1 truncate">{f.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
