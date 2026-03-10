import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { computeOTKpis } from '@/hooks/use-dashboard-data';
import type { OTData } from '@/lib/csv-parser';
import { ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const COLORS = ['hsl(220,70%,50%)', 'hsl(160,60%,45%)', 'hsl(38,92%,50%)', 'hsl(280,60%,55%)', 'hsl(0,72%,51%)', 'hsl(200,80%,50%)'];

export function OTTab({ data }: { data: OTData[] }) {
  const kpis = useMemo(() => computeOTKpis(data), [data]);

  const statusData = [
    { name: 'Terminés', value: kpis.completed },
    { name: 'En cours', value: kpis.inProgress },
    { name: 'Non démarrés', value: kpis.notStarted },
  ];

  const typeData = useMemo(() => {
    return Object.entries(kpis.byType)
      .sort((a, b) => b[1].charge - a[1].charge)
      .slice(0, 10)
      .map(([name, v]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, charge: Math.round(v.charge), vbtr: Math.round(v.vbtr), avancement: Math.round(v.avgAvancement) }));
  }, [kpis]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total OT" value={kpis.total} icon={<ClipboardList className="h-5 w-5" />} subtitle="Ordres de travail" />
        <KpiCard title="Terminés" value={kpis.completed} icon={<CheckCircle className="h-5 w-5" />} subtitle={`${kpis.total > 0 ? ((kpis.completed / kpis.total) * 100).toFixed(1) : 0}%`} />
        <KpiCard title="En cours" value={kpis.inProgress} icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Avancement moyen" value={`${kpis.avgAvancement.toFixed(1)}%`} icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Charge par type d'OT (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(0,0%,100%)', border: '1px solid hsl(220,13%,91%)', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="charge" name="Charge prév." fill="hsl(220,70%,50%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="vbtr" name="VBTR" fill="hsl(160,60%,45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
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
