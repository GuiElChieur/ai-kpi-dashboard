import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { GaugeChart } from './GaugeChart';
import { PbiKpiCard } from './PbiKpiCard';
import type { PointageData } from '@/lib/csv-parser';

const CODE_LIBRE_COLORS: Record<string, string> = {
  APPRO: 'hsl(200,80%,55%)',
  ETUDE: 'hsl(142,71%,50%)',
  GESTI: 'hsl(0,72%,55%)',
  MAIT: 'hsl(38,92%,50%)',
  MODIF: 'hsl(270,60%,55%)',
  MONTA: 'hsl(180,60%,45%)',
};

const PIE_COLORS = [
  'hsl(200,80%,55%)', 'hsl(38,92%,50%)', 'hsl(142,71%,50%)',
  'hsl(0,72%,55%)', 'hsl(270,60%,55%)', 'hsl(180,60%,45%)',
  'hsl(320,60%,55%)', 'hsl(60,70%,50%)',
];

export function PointageTab({ data }: { data: PointageData[] }) {
  const [selectedEmployeurs, setSelectedEmployeurs] = useState<string[]>([]);
  const [selectedCodeLibre, setSelectedCodeLibre] = useState<string[]>([]);
  const [searchNom, setSearchNom] = useState('');
  const [searchOT, setSearchOT] = useState('');

  // Extract unique employers
  const employeurs = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => { if (d.employeur) set.add(d.employeur); });
    return Array.from(set).sort();
  }, [data]);

  // Extract unique code libre table values
  const codeLibreValues = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => { if (d.codeLibreTable) set.add(d.codeLibreTable); });
    return Array.from(set).sort();
  }, [data]);

  const toggleEmployeur = (e: string) => {
    setSelectedEmployeurs(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const toggleCodeLibre = (c: string) => {
    setSelectedCodeLibre(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  // Filtered data
  const filtered = useMemo(() => {
    let d = data;
    if (selectedEmployeurs.length > 0) {
      d = d.filter(r => selectedEmployeurs.includes(r.employeur));
    }
    if (selectedCodeLibre.length > 0) {
      d = d.filter(r => selectedCodeLibre.includes(r.codeLibreTable));
    }
    if (searchNom.trim()) {
      const s = searchNom.trim().toLowerCase();
      d = d.filter(r => r.nomPrenom.toLowerCase().includes(s));
    }
    if (searchOT.trim()) {
      const s = searchOT.trim().toLowerCase();
      d = d.filter(r => r.identifiantProjet.toLowerCase().includes(s) || r.intituleAffaire.toLowerCase().includes(s));
    }
    return d;
  }, [data, selectedEmployeurs, selectedCodeLibre, searchNom, searchOT]);

  // KPIs
  const totalHeures = useMemo(() => filtered.reduce((s, d) => s + d.quantite, 0), [filtered]);
  const nbPersonnes = useMemo(() => new Set(filtered.map(d => d.nomPrenom).filter(Boolean)).size, [filtered]);
  const totalChargePrev = useMemo(() => data.reduce((s, d) => s + d.quantite, 0), [data]);
  const budgetTP = totalChargePrev > 0 ? (totalHeures / totalChargePrev) * 10000 : 0;

  // Helper: parse DD/MM/YYYY date
  const parseDate = (s: string) => {
    const parts = s.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parts[2].length === 4 ? parseInt(parts[2]) : 2000 + parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return null;
  };

  // Get ISO week number
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Stacked bar by month
  const monthlyData = useMemo(() => {
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const byMonth: Record<string, { sortKey: string; label: string; codes: Record<string, number> }> = {};
    filtered.forEach(d => {
      const date = parseDate(d.dateSaisie);
      if (!date) return;
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (!byMonth[sortKey]) byMonth[sortKey] = { sortKey, label, codes: {} };
      const code = d.codeLibreTable || 'Autre';
      byMonth[sortKey].codes[code] = (byMonth[sortKey].codes[code] || 0) + d.quantite;
    });

    return Object.values(byMonth)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, codes }) => ({ month: label, ...codes }));
  }, [filtered]);

  // Weekly stacked bar chart
  const weeklyData = useMemo(() => {
    const byWeek: Record<string, { sortKey: number; label: string; codes: Record<string, number> }> = {};
    filtered.forEach(d => {
      const date = parseDate(d.dateSaisie);
      if (!date) return;
      const week = getWeekNumber(date);
      const key = `${date.getFullYear()}-S${String(week).padStart(2, '0')}`;
      const label = `S${week}`;
      if (!byWeek[key]) byWeek[key] = { sortKey: date.getFullYear() * 100 + week, label, codes: {} };
      const code = d.codeLibreTable || 'Autre';
      byWeek[key].codes[code] = (byWeek[key].codes[code] || 0) + d.quantite;
    });

    return Object.values(byWeek)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-10)
      .map(({ label, codes }) => ({ semaine: label, ...codes }));
  }, [filtered]);

  // Pie chart by employer
  const pieData = useMemo(() => {
    const byEmp: Record<string, number> = {};
    filtered.forEach(d => {
      const emp = d.employeur || 'Autre';
      byEmp[emp] = (byEmp[emp] || 0) + d.quantite;
    });
    const total = Object.values(byEmp).reduce((s, v) => s + v, 0);
    return Object.entries(byEmp)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }));
  }, [filtered]);

  // All code libre keys for stacked bars
  const allCodeLibreKeys = useMemo(() => {
    const keys = new Set<string>();
    filtered.forEach(d => keys.add(d.codeLibreTable || 'Autre'));
    return Array.from(keys).sort();
  }, [filtered]);

  // Table data
  const tableData = useMemo(() => {
    return filtered
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 100);
  }, [filtered]);

  return (
    <div className="flex-1 space-y-3 p-3 overflow-auto">
      {/* Top filters row */}
      <div className="flex gap-3 items-start flex-wrap">
        {/* Employer filter buttons */}
        <div className="pbi-card p-2 flex-1 min-w-[200px]">
          
          <div className="flex flex-wrap gap-1 max-h-[60px] overflow-auto">
            {employeurs.map(e => (
              <button
                key={e}
                onClick={() => toggleEmployeur(e)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-sm transition-colors ${
                  selectedEmployeurs.includes(e)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>


        {/* Code libre Table filter */}
        <div className="pbi-card p-2">
          
          <div className="flex flex-wrap gap-1">
            {codeLibreValues.map(c => (
              <button
                key={c}
                onClick={() => toggleCodeLibre(c)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-sm transition-colors ${
                  selectedCodeLibre.includes(c)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content row */}
      <div className="flex gap-3">
        {/* Left KPI column */}
        <div className="flex flex-col gap-2 min-w-[160px]">
          <PbiKpiCard label="Temps Passé" value={Math.round(totalHeures).toLocaleString('fr-FR')} color="info" />
          <PbiKpiCard label="Nbre de personnes à bord" value={nbPersonnes} color="warning" />
        </div>

        {/* Center charts */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Stacked bar by month */}
          <div className="pbi-card p-3">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="pbi-section-title">Code libre Table</span>
              {allCodeLibreKeys.map(k => (
                <div key={k} className="flex items-center gap-1 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CODE_LIBRE_COLORS[k] || 'hsl(215,15%,60%)' }} />
                  <span className="text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ bottom: 20, left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,25%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(215,15%,60%)' }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215,15%,60%)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 11, color: 'hsl(210,20%,92%)' }}
                    formatter={(v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  />
                  {allCodeLibreKeys.map(k => (
                    <Bar key={k} dataKey={k} stackId="a" fill={CODE_LIBRE_COLORS[k] || 'hsl(215,15%,60%)'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly stacked bar */}
          <div className="pbi-card p-3">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ bottom: 20, left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,25%)" />
                  <XAxis dataKey="semaine" tick={{ fontSize: 9, fill: 'hsl(215,15%,60%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215,15%,60%)' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 11, color: 'hsl(210,20%,92%)' }}
                    formatter={(v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  />
                  {allCodeLibreKeys.map(k => (
                    <Bar key={k} dataKey={k} stackId="a" fill={CODE_LIBRE_COLORS[k] || 'hsl(215,15%,60%)'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Pie chart by employer */}
        <div className="pbi-card p-3 min-w-[260px]">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={40}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${percent}%`}
                  labelLine={{ stroke: 'hsl(215,15%,60%)' }}
                  style={{ fontSize: 10 }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 11, color: 'hsl(210,20%,92%)' }}
                  formatter={(v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: Data table */}
      <div className="pbi-card overflow-hidden">
        <div className="overflow-auto max-h-[220px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Code libre Table</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Intitulé</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Intitulé de l'affaire</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Code libre alpha</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nom Prenom</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Employeur</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Objet travail</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date saisie</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Somme de Quantité</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-secondary/30">
                  <td className="px-3 py-1.5">{row.codeLibreTable}</td>
                  <td className="px-3 py-1.5">{row.intitule}</td>
                  <td className="px-3 py-1.5 text-[10px]">{row.intituleAffaire}</td>
                  <td className="px-3 py-1.5 font-mono text-[10px]">{row.codeLibreAlpha}</td>
                  <td className="px-3 py-1.5">{row.nomPrenom}</td>
                  <td className="px-3 py-1.5">{row.employeur}</td>
                  <td className="px-3 py-1.5">{row.objetTravail}</td>
                  <td className="px-3 py-1.5">{row.dateSaisie}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{row.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-semibold">
              <tr>
                <td className="px-3 py-1.5" colSpan={8}>Total</td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {totalHeures.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
