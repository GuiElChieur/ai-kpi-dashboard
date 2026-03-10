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

  // Top references by besoin
  const topRefs = useMemo(() => {
    const byRef: Record<string, { besoin: number; sortie: number; prep: number }> = {};
    data.forEach(d => {
      const ref = d.designationProduit || d.referenceInterne || 'N/A';
      if (!byRef[ref]) byRef[ref] = { besoin: 0, sortie: 0, prep: 0 };
      byRef[ref].besoin += d.quantiteBesoin;
      byRef[ref].sortie += d.quantiteSortie;
      byRef[ref].prep += d.quantiteEnPreparation;
    });
    return Object.entries(byRef)
      .sort((a, b) => b[1].besoin - a[1].besoin)
      .slice(0, 10)
      .map(([name, v]) => ({ name: name.length > 30 ? name.slice(0, 30) + '…' : name, besoin: Math.round(v.besoin), sortie: Math.round(v.sortie) }));
  }, [data]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top 10 références (besoin vs sortie)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRefs} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: 'hsl(0,0%,100%)', border: '1px solid hsl(220,13%,91%)', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="besoin" name="Besoin" fill="hsl(220,70%,50%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="sortie" name="Sortie" fill="hsl(160,60%,45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Par statut projet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
