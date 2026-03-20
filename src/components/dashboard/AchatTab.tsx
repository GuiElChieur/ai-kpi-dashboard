import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { computeAchatKpis } from '@/hooks/use-dashboard-data';
import type { AchatData } from '@/lib/csv-parser';
import { ShoppingCart, CreditCard, FileText, TrendingUp } from 'lucide-react';

export function AchatTab({ data }: { data: AchatData[] }) {
  const kpis = useMemo(() => computeAchatKpis(data), [data]);

  const topFournisseurs = useMemo(() => {
    return Object.entries(kpis.byFournisseur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, total]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, total: Math.round(total) }));
  }, [kpis]);

  const monthlyData = useMemo(() => {
    return Object.entries(kpis.byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total: Math.round(total) }));
  }, [kpis]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 [&>div]:h-full">
        <KpiCard title="Total HT" value={`${Math.round(kpis.totalHT).toLocaleString('fr-FR')} €`} icon={<CreditCard className="h-5 w-5" />} />
        <KpiCard title="Commandes" value={kpis.nbCommandes} icon={<ShoppingCart className="h-5 w-5" />} />
        <KpiCard title="Lignes d'achat" value={kpis.nbLignes} icon={<FileText className="h-5 w-5" />} />
        <KpiCard title="Prix moyen / ligne" value={`${kpis.nbLignes > 0 ? Math.round(kpis.totalHT / kpis.nbLignes).toLocaleString('fr-FR') : 0} €`} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top 10 fournisseurs (€ HT)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFournisseurs} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => `${v.toLocaleString('fr-FR')} €`} />
                  <Bar dataKey="total" name="Total HT" fill="hsl(280,60%,55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Évolution mensuelle des achats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => `${v.toLocaleString('fr-FR')} €`} />
                  <Line type="monotone" dataKey="total" stroke="hsl(220,70%,50%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
