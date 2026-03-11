import { useState, useMemo } from 'react';
import { useDashboardData, computeOTKpis, computePointageKpis, computeMatierKpis, computeAchatKpis } from '@/hooks/use-dashboard-data';
import { useCableData } from '@/hooks/use-cable-data';
import { useAuth } from '@/hooks/use-auth';
import { PbiSidebar } from '@/components/dashboard/PbiSidebar';
import { OTProgiPage } from '@/components/dashboard/OTProgiPage';
import { PointageTab } from '@/components/dashboard/PointageTab';
import { MatierTab } from '@/components/dashboard/MatierTab';
import { AchatTab } from '@/components/dashboard/AchatTab';
import { TirageCablesPage } from '@/components/dashboard/TirageCablesPage';
import { FilerieLotPage } from '@/components/dashboard/FilerieLotPage';
import { CourbeFileriePage } from '@/components/dashboard/CourbeFileriePage';
import { PerformancePage } from '@/components/dashboard/PerformancePage';
import { DataImport } from '@/components/dashboard/DataImport';
import { CSVUpload } from '@/components/dashboard/CSVUpload';
import { AIChat } from '@/components/dashboard/AIChat';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Upload, LogOut } from 'lucide-react';

const Index = () => {
  const { otData, otLigneData, pointageData, matierData, achatData, isLoading } = useDashboardData();
  const { data: cableData, isLoading: cableLoading } = useCableData();
  const { user, signOut } = useAuth();
  const [activePage, setActivePage] = useState('ot-progi');
  const [showUpload, setShowUpload] = useState(false);

  const kpiSummary = useMemo(() => {
    if (isLoading) return '';
    const ot = computeOTKpis(otData);
    const pt = computePointageKpis(pointageData);
    const mt = computeMatierKpis(matierData);
    const ac = computeAchatKpis(achatData);
    return `## Avancement OT\n- Total OT: ${ot.total}, Terminés: ${ot.completed}, En cours: ${ot.inProgress}, Non démarrés: ${ot.notStarted}\n- Avancement moyen: ${ot.avgAvancement.toFixed(1)}%\n- Charge totale: ${Math.round(ot.totalCharge)}h, VBTR: ${Math.round(ot.totalVBTR)}h\n\n## Heures pointées\n- Total: ${Math.round(pt.totalHeures)}h, ${pt.nbIntervenants} intervenants\n\n## Matières\n- Besoin: ${Math.round(mt.totalBesoin)}, Sortie: ${Math.round(mt.totalSortie)} (${mt.tauxSortie.toFixed(1)}%)\n\n## Achats\n- Total HT: ${Math.round(ac.totalHT).toLocaleString('fr-FR')}€, ${ac.nbCommandes} commandes`;
  }, [isLoading, otData, pointageData, matierData, achatData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="w-48 bg-sidebar" />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PbiSidebar activePage={activePage} onPageChange={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">NARVAL-Z34</span>
            <span className="text-xs text-muted-foreground">Données mises à jour le 10/03/26</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition-colors text-muted-foreground"
            >
              <Upload className="h-3.5 w-3.5" />
              CSV local
            </button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground h-7">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        {showUpload && (
          <div className="p-3">
            <CSVUpload onFilesLoaded={(files) => console.log('Files loaded:', files)} />
          </div>
        )}

        {/* Page content */}
        {activePage === 'ot-progi' && (
          <OTProgiPage otData={otData} otLigneData={otLigneData} pointageData={pointageData} />
        )}
        {activePage === 'pointage' && (
          <div className="p-4"><PointageTab data={pointageData} /></div>
        )}
        {activePage === 'matiere' && (
          <div className="p-4"><MatierTab data={matierData} achatData={achatData} /></div>
        )}
        {activePage === 'achat' && (
          <div className="p-4"><AchatTab data={achatData} /></div>
        )}
        {activePage === 'tirage-cables' && (
          cableLoading ? <div className="p-6"><Skeleton className="h-[400px]" /></div> :
          <TirageCablesPage allData={cableData || []} />
        )}
        {activePage === 'filerie-lot' && (
          cableLoading ? <div className="p-6"><Skeleton className="h-[400px]" /></div> :
          <FilerieLotPage allData={cableData || []} />
        )}
        {activePage === 'courbe-filerie' && (
          cableLoading ? <div className="p-6"><Skeleton className="h-[400px]" /></div> :
          <CourbeFileriePage allData={cableData || []} />
        )}
        {activePage === 'import' && (
          <DataImport />
        )}
        {activePage === 'ai' && (
          <div className="p-4"><AIChat kpiSummary={kpiSummary} /></div>
        )}
        {activePage === 'accueil' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold text-primary font-mono">1935</div>
              <div className="text-lg text-muted-foreground">Tableau de bord de pilotage industriel</div>
              <div className="text-sm text-muted-foreground">Sélectionnez une page dans le menu</div>
            </div>
          </div>
        )}
        {activePage === 'performance' && (
          <PerformancePage otLigneData={otLigneData} />
        )}
      </div>
    </div>
  );
};

export default Index;
