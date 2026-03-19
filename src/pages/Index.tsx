import { useState, useMemo } from 'react';
import { useDashboardData, computePointageKpis, computeMatierKpis, computeAchatKpis } from '@/hooks/use-dashboard-data';
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
import { PoseAppareillage } from '@/components/dashboard/PoseAppareillage';
import { RaccordementTableauPage } from '@/components/dashboard/RaccordementTableauPage';
import { PoseEquipement } from '@/components/dashboard/PoseEquipement';
import { useAppareilsData } from '@/hooks/use-appareils-data';
import { useEquipementData } from '@/hooks/use-equipement-data';
import { PerformancePage } from '@/components/dashboard/PerformancePage';
import { EnrichmentPage } from '@/components/dashboard/EnrichmentPage';
import { DataImport } from '@/components/dashboard/DataImport';
import { CSVUpload } from '@/components/dashboard/CSVUpload';
import { AIChat } from '@/components/dashboard/AIChat';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Upload, LogOut } from 'lucide-react';

const Index = () => {
  const { otData, otLigneData, pointageData, matierData, achatData, isLoading } = useDashboardData();
  const { data: cableData, isLoading: cableLoading } = useCableData();
  const { data: appareilsData, isLoading: appareilsLoading } = useAppareilsData();
  const { data: equipementData, isLoading: equipementLoading } = useEquipementData();
  const { user, signOut } = useAuth();
  const [activePage, setActivePage] = useState('ot-progi');
  const [showUpload, setShowUpload] = useState(false);

  const kpiSummary = useMemo(() => {
    if (isLoading || cableLoading) return '';
    const pt = computePointageKpis(pointageData);
    const mt = computeMatierKpis(matierData);
    const ac = computeAchatKpis(achatData);

    // OT Lignes summary
    const totalLignes = otLigneData.length;
    const totalChargePrev = otLigneData.reduce((s, d) => s + d.chargePrevisionnelle, 0);
    const totalVBTR = otLigneData.reduce((s, d) => s + d.vbtr, 0);
    const totalTP = otLigneData.reduce((s, d) => s + d.tp, 0);
    const avgAvancement = totalLignes > 0 ? otLigneData.reduce((s, d) => s + d.avancementEffectif, 0) / totalLignes : 0;
    const byTypeOT: Record<string, number> = {};
    otLigneData.forEach(d => { byTypeOT[d.typeOT || 'N/A'] = (byTypeOT[d.typeOT || 'N/A'] || 0) + 1; });

    // Cable summary
    const cables = cableData || [];
    const gestCables = cables.filter(c => c.respTirage === 'GEST' && c.indApproCa === 'O');
    const totalLngM = gestCables.reduce((s, c) => s + (c.lngTotal || 0), 0) / 1000;
    const totalTireM = gestCables.reduce((s, c) => s + (c.totLngTiree || 0), 0) / 1000;
    const cablesTires = gestCables.filter(c => c.sttCblBord === 'T').length;

    return `## OT Lignes (ot_lignes)\n- ${totalLignes} lignes OT\n- Charge prévisionnelle totale: ${Math.round(totalChargePrev)}h\n- VBTR total: ${Math.round(totalVBTR)}h, TP total: ${Math.round(totalTP)}h\n- Avancement effectif moyen: ${avgAvancement.toFixed(1)}%\n- Répartition par type OT: ${Object.entries(byTypeOT).map(([k, v]) => `${k}: ${v}`).join(', ')}\n\n## Heures pointées (pointages)\n- Total: ${Math.round(pt.totalHeures)}h, ${pt.nbIntervenants} intervenants\n- Top équipes: ${Object.entries(pt.byEquipe).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}: ${Math.round(v)}h`).join(', ')}\n\n## Matières (matieres)\n- Besoin: ${Math.round(mt.totalBesoin)}, Sortie: ${Math.round(mt.totalSortie)} (${mt.tauxSortie.toFixed(1)}%)\n- En préparation: ${Math.round(mt.totalPreparation)}, ${mt.nbReferences} références\n\n## Achats (achats)\n- Total HT: ${Math.round(ac.totalHT).toLocaleString('fr-FR')}€, ${ac.nbCommandes} commandes, ${ac.nbLignes} lignes\n\n## Câbles (cables, filtre GEST + APPRO_CA=O)\n- ${gestCables.length} câbles dans le périmètre\n- Longueur totale: ${Math.round(totalLngM).toLocaleString('fr-FR')} m\n- Longueur tirée: ${Math.round(totalTireM).toLocaleString('fr-FR')} m (${totalLngM > 0 ? ((totalTireM / totalLngM) * 100).toFixed(1) : 0}%)\n- Câbles tirés (statut T): ${cablesTires} / ${gestCables.length}`;
  }, [isLoading, cableLoading, otLigneData, pointageData, matierData, achatData, cableData]);

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
    <div className="flex h-screen bg-background overflow-hidden">
      <PbiSidebar activePage={activePage} onPageChange={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
          <div className="flex-1 min-h-0"><PointageTab data={pointageData} /></div>
        )}
        {activePage === 'matiere' && (
          <div className="p-4 h-full"><MatierTab data={matierData} achatData={achatData} /></div>
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
          <div className="flex-1 min-h-0"><CourbeFileriePage allData={cableData || []} /></div>
        )}
        {activePage === 'raccordement-tableau' && (
          cableLoading ? <div className="p-6"><Skeleton className="h-[400px]" /></div> :
          <RaccordementTableauPage allData={cableData || []} />
        )}
        {activePage === 'pose-appareillage' && (
          appareilsLoading ? <div className="p-6"><Skeleton className="h-[400px]" /></div> :
          <PoseAppareillage allData={appareilsData || []} />
        )}
        {activePage === 'enrichment' && (
          <EnrichmentPage />
        )}
        {activePage === 'pose-equipement' && (
          (appareilsLoading || equipementLoading) ? <div className="p-6"><Skeleton className="h-[400px]" /></div> :
          <PoseEquipement allData={equipementData || []} />
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
