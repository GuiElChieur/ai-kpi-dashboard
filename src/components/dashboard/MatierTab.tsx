import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { computeMatierKpis } from '@/hooks/use-dashboard-data';
import type { MatierData } from '@/lib/csv-parser';
import { Package, TrendingUp, Layers, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(220,70%,50%)', 'hsl(160,60%,45%)', 'hsl(38,92%,50%)', 'hsl(280,60%,55%)', 'hsl(0,72%,51%)'];

export function MatierTab({ data }: { data: MatierData[] }) {
  const kpis = useMemo(() => computeMatierKpis(data), [data]);

  const statutData = useMemo(() => {
    return Object.entries(kpis.byStatut).map(([name, value]) => ({ name, value }));
  }, [kpis]);

  // Répartition par lot (reste à sortir vs sorti)
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Qté besoin totale" value={Math.round(kpis.totalBesoin).toLocaleString('fr-FR')} icon={<Package className="h-5 w-5" />} />
        <KpiCard title="Qté sortie" value={Math.round(kpis.totalSortie).toLocaleString('fr-FR')} icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Taux de sortie" value={`${kpis.tauxSortie.toFixed(1)}%`} icon={<BarChart3 className="h-5 w-5" />} />
        <KpiCard title="Références" value={kpis.nbReferences.toLocaleString('fr-FR')} icon={<Layers className="h-5 w-5" />} />
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Statut Matière par lot (Reste à sortir vs Sortie)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLotData} margin={{ left: 10, right: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="lot" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(0,0%,100%)', border: '1px solid hsl(220,13%,91%)', borderRadius: '8px', fontSize: 12 }} />
                <Legend />
                <Bar dataKey="resteSortir" name="Reste à sortir" stackId="a" fill="hsl(0,72%,60%)" />
                <Bar dataKey="sortie" name="Sortie" stackId="a" fill="hsl(160,60%,45%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
