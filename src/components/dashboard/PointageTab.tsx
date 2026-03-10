import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { computePointageKpis } from '@/hooks/use-dashboard-data';
import type { PointageData } from '@/lib/csv-parser';
import { Users, Clock, Building, CalendarDays } from 'lucide-react';

export function PointageTab({ data }: { data: PointageData[] }) {
  const kpis = useMemo(() => computePointageKpis(data), [data]);

  const topPersonnes = useMemo(() => {
    return Object.entries(kpis.byPersonne)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, heures]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, heures: Math.round(heures * 10) / 10 }));
  }, [kpis]);

  const heuresParJour = useMemo(() => {
    return Object.entries(kpis.byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, heures]) => ({ date: date.slice(5), heures: Math.round(heures * 10) / 10 }));
  }, [kpis]);

  const topEmployeurs = useMemo(() => {
    return Object.entries(kpis.byEmployeur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, heures]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, heures: Math.round(heures * 10) / 10 }));
  }, [kpis]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Heures totales" value={`${Math.round(kpis.totalHeures).toLocaleString('fr-FR')}h`} icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Intervenants" value={kpis.nbIntervenants} icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Équipes" value={Object.keys(kpis.byEquipe).length} icon={<Building className="h-5 w-5" />} />
        <KpiCard title="Jours pointés" value={Object.keys(kpis.byDate).length} icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Heures par intervenant (Top 15)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPersonnes} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(0,0%,100%)', border: '1px solid hsl(220,13%,91%)', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="heures" name="Heures" fill="hsl(220,70%,50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Évolution quotidienne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={heuresParJour} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(0,0%,100%)', border: '1px solid hsl(220,13%,91%)', borderRadius: '8px', fontSize: 12 }} />
                  <Line type="monotone" dataKey="heures" stroke="hsl(160,60%,45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Heures par employeur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEmployeurs} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(0,0%,100%)', border: '1px solid hsl(220,13%,91%)', borderRadius: '8px', fontSize: 12 }} />
                <Bar dataKey="heures" name="Heures" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
