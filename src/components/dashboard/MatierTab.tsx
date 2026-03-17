import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { computeMatierKpis } from '@/hooks/use-dashboard-data';
import type { MatierData, AchatData } from '@/lib/csv-parser';
import { Package, TrendingUp, Layers, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 25;

export function MatierTab({ data, achatData }: { data: MatierData[]; achatData: AchatData[] }) {
  const kpis = useMemo(() => computeMatierKpis(data), [data]);
  const [lotPage, setLotPage] = useState(0);
  const [lotFilter, setLotFilter] = useState<string>('all');

  // Agrégation stricte par lot (somme de toutes les lignes par lot)
  const byLotData = useMemo(() => {
    const byLot: Record<string, { resteSortir: number; sortie: number }> = {};
    data.forEach(d => {
      const lot = d.lot || 'N/A';
      if (!byLot[lot]) byLot[lot] = { resteSortir: 0, sortie: 0 };
      byLot[lot].sortie += d.quantiteSortie;
      byLot[lot].resteSortir += Math.max(0, d.quantiteBesoin - d.quantiteSortie);
    });
    return Object.entries(byLot)
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
      .map(([lot, v]) => ({ lot, resteSortir: Math.round(v.resteSortir), sortie: Math.round(v.sortie) }));
  }, [data]);

  // Extraire les préfixes de lot pour le filtre
  const lotPrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    byLotData.forEach(d => {
      const parts = d.lot.split('-');
      if (parts.length >= 4) {
        prefixes.add(parts.slice(0, 3).join('-'));
      }
    });
    return Array.from(prefixes).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  }, [byLotData]);

  // Filtrage + pagination
  const filteredLotData = useMemo(() => {
    if (lotFilter === 'all') return byLotData;
    return byLotData.filter(d => d.lot.startsWith(lotFilter));
  }, [byLotData, lotFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLotData.length / PAGE_SIZE));
  const pagedLotData = filteredLotData.slice(lotPage * PAGE_SIZE, (lotPage + 1) * PAGE_SIZE);

  // Reset page when filter changes
  const handleFilterChange = (val: string) => {
    setLotFilter(val);
    setLotPage(0);
  };

  // Coût des sorties par mois (croisement MATIER_OT × ACHAT2 via referenceInterne)
  const coutSortieParMois = useMemo(() => {
    const prixByRef: Record<string, { totalHT: number; totalQte: number }> = {};
    achatData.forEach(a => {
      const ref = a.referenceInterne || '';
      if (!ref || a.quantite === 0) return;
      if (!prixByRef[ref]) prixByRef[ref] = { totalHT: 0, totalQte: 0 };
      prixByRef[ref].totalHT += a.totalHT;
      prixByRef[ref].totalQte += a.quantite;
    });

    const prixUnitaire: Record<string, number> = {};
    Object.entries(prixByRef).forEach(([ref, v]) => {
      prixUnitaire[ref] = v.totalQte > 0 ? v.totalHT / v.totalQte : 0;
    });

    const byMonth: Record<string, number> = {};
    data.forEach(d => {
      const ref = d.referenceInterne || '';
      const prix = prixUnitaire[ref];
      if (!prix || d.quantiteSortie === 0) return;
      const month = d.dateLivraison?.substring(0, 7) || d.dateDebut?.substring(0, 7) || 'N/A';
      byMonth[month] = (byMonth[month] || 0) + d.quantiteSortie * prix;
    });

    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    let cumul = 0;
    return sorted.map(([mois, cout]) => {
      cumul += cout;
      return { mois, cout: Math.round(cout * 100) / 100, cumul: Math.round(cumul * 100) / 100 };
    });
  }, [data, achatData]);

  // Raccourcir les labels de lot pour l'affichage
  const formatLotLabel = (lot: string) => {
    const parts = lot.split('-');
    if (parts.length >= 4) return parts.slice(2).join('-');
    return lot;
  };

  return (
    <div className="flex flex-col h-full gap-3 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <KpiCard title="Qté besoin totale" value={Math.round(kpis.totalBesoin).toLocaleString('fr-FR')} icon={<Package className="h-5 w-5" />} />
        <KpiCard title="Qté sortie" value={Math.round(kpis.totalSortie).toLocaleString('fr-FR')} icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Taux de sortie" value={`${kpis.tauxSortie.toFixed(1)}%`} icon={<BarChart3 className="h-5 w-5" />} />
        <KpiCard title="Références" value={kpis.nbReferences.toLocaleString('fr-FR')} icon={<Layers className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="pb-1 pt-3 px-4 shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Statut Matière par lot — {filteredLotData.length} lots
              </CardTitle>
              <div className="flex items-center gap-1">
                <Select value={lotFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-[160px] h-7 text-xs">
                    <SelectValue placeholder="Filtrer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les lots</SelectItem>
                    {lotPrefixes.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={lotPage === 0} onClick={() => setLotPage(p => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[40px] text-center">{lotPage + 1}/{totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={lotPage >= totalPages - 1} onClick={() => setLotPage(p => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-2 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pagedLotData} margin={{ left: 5, right: 10, bottom: 30, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis
                  dataKey="lot"
                  tick={{ fontSize: 8 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={formatLotLabel}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10 }} width={45} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11, color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [value.toLocaleString('fr-FR'), name]}
                  labelFormatter={(label: string) => `Lot: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="resteSortir" name="Reste à sortir" stackId="a" fill="hsl(0,72%,60%)" />
                <Bar dataKey="sortie" name="Sortie" stackId="a" fill="hsl(160,60%,45%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="pb-1 pt-3 px-4 shrink-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Coût cumulé des sorties par mois (Matière × Achats)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-2 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={coutSortieParMois} margin={{ left: 15, right: 15, bottom: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11, color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="cout" name="Coût mensuel" fill="hsl(220,70%,50%)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" dataKey="cumul" name="Cumul" type="monotone" stroke="hsl(0,72%,51%)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
