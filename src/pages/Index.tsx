import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardData, computeOTKpis, computePointageKpis, computeMatierKpis, computeAchatKpis } from '@/hooks/use-dashboard-data';
import { OTTab } from '@/components/dashboard/OTTab';
import { PointageTab } from '@/components/dashboard/PointageTab';
import { MatierTab } from '@/components/dashboard/MatierTab';
import { AchatTab } from '@/components/dashboard/AchatTab';
import { CSVUpload } from '@/components/dashboard/CSVUpload';
import { AIChat } from '@/components/dashboard/AIChat';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Clock, Package, ShoppingCart, Upload, Activity, Bot } from 'lucide-react';

const Index = () => {
  const { otData, pointageData, matierData, achatData, isLoading } = useDashboardData();
  const [showUpload, setShowUpload] = useState(false);

  const kpiSummary = useMemo(() => {
    if (isLoading) return '';
    const ot = computeOTKpis(otData);
    const pt = computePointageKpis(pointageData);
    const mt = computeMatierKpis(matierData);
    const ac = computeAchatKpis(achatData);

    return `## Avancement OT
- Total OT: ${ot.total}, Terminés: ${ot.completed}, En cours: ${ot.inProgress}, Non démarrés: ${ot.notStarted}
- Avancement moyen: ${ot.avgAvancement.toFixed(1)}%
- Charge prévisionnelle totale: ${Math.round(ot.totalCharge)}h, VBTR: ${Math.round(ot.totalVBTR)}h
- Types principaux: ${Object.entries(ot.byType).sort((a, b) => b[1].charge - a[1].charge).slice(0, 5).map(([t, v]) => `${t} (${v.count} OT, ${v.avgAvancement.toFixed(0)}% avancé)`).join(', ')}

## Heures pointées
- Total heures: ${Math.round(pt.totalHeures)}h
- ${pt.nbIntervenants} intervenants, ${Object.keys(pt.byEquipe).length} équipes
- Top intervenants: ${Object.entries(pt.byPersonne).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, h]) => `${n} (${Math.round(h)}h)`).join(', ')}

## Matières
- Besoin total: ${Math.round(mt.totalBesoin)} unités
- Sortie: ${Math.round(mt.totalSortie)} unités (taux: ${mt.tauxSortie.toFixed(1)}%)
- En préparation: ${Math.round(mt.totalPreparation)} unités
- ${mt.nbReferences} références

## Achats
- Total HT: ${Math.round(ac.totalHT).toLocaleString('fr-FR')}€
- ${ac.nbCommandes} commandes, ${ac.nbLignes} lignes
- Top fournisseurs: ${Object.entries(ac.byFournisseur).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, t]) => `${f} (${Math.round(t).toLocaleString('fr-FR')}€)`).join(', ')}`;
  }, [isLoading, otData, pointageData, matierData, achatData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Pilotage Industriel</h1>
              <p className="text-xs text-muted-foreground">Affaire 1935 — Tableau de bord KPI</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {showUpload && (
          <CSVUpload onFilesLoaded={(files) => { console.log('Files loaded:', files); }} />
        )}

        <Tabs defaultValue="ot" className="space-y-6">
          <TabsList className="bg-card border border-border/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="ot" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4" /> Avancement OT
            </TabsTrigger>
            <TabsTrigger value="pointage" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="h-4 w-4" /> Heures pointées
            </TabsTrigger>
            <TabsTrigger value="matier" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-4 w-4" /> Matières
            </TabsTrigger>
            <TabsTrigger value="achat" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShoppingCart className="h-4 w-4" /> Achats
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-4 w-4" /> Analyse IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ot"><OTTab data={otData} /></TabsContent>
          <TabsContent value="pointage"><PointageTab data={pointageData} /></TabsContent>
          <TabsContent value="matier"><MatierTab data={matierData} /></TabsContent>
          <TabsContent value="achat"><AchatTab data={achatData} /></TabsContent>
          <TabsContent value="ai"><AIChat kpiSummary={kpiSummary} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
