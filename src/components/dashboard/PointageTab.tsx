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

const TABLE_COLUMNS: { key: string; label: string; isNumeric?: boolean }[] = [
  { key: 'codeLibreTable', label: 'Code libre Table' },
  { key: 'intitule', label: 'Intitulé' },
  { key: 'intituleAffaire', label: "Intitulé de l'affaire" },
  { key: 'codeLibreAlpha', label: 'Code libre alpha' },
  { key: 'nomPrenom', label: 'Nom Prenom' },
  { key: 'employeur', label: 'Employeur' },
  { key: 'objetTravail', label: 'Objet travail' },
  { key: 'dateSaisie', label: 'Date saisie' },
  { key: 'quantite', label: 'Somme de Quantité', isNumeric: true },
];

export function PointageTab({ data }: { data: PointageData[] }) {
  const [selectedEmployeurs, setSelectedEmployeurs] = useState<string[]>([]);
  const [selectedCodeLibre, setSelectedCodeLibre] = useState<string[]>([]);
  const [searchNom, setSearchNom] = useState('');
  const [searchOT, setSearchOT] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
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

  // Helper functions (before filtered2 which depends on them)
  const parseDateFn = (s: string) => {
    if (!s) return null;
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(s);
    const parts = s.split('/');
    if (parts.length === 3) {
      return new Date(parts[2].length === 4 ? parseInt(parts[2]) : 2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
  };

  const getWeekNumberFn = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  // Apply month/week filters on top of filtered
  const filteredFinal = useMemo(() => {
    let d = filtered;
    if (selectedMonth) {
      d = d.filter(r => {
        const date = parseDateFn(r.dateSaisie);
        if (!date) return false;
        const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        return label === selectedMonth;
      });
    }
    if (selectedWeek) {
      d = d.filter(r => {
        const date = parseDateFn(r.dateSaisie);
        if (!date) return false;
        return `S${getWeekNumberFn(date)}` === selectedWeek;
      });
    }
    return d;
  }, [filtered, selectedMonth, selectedWeek]);

  // KPIs - use filteredFinal
  const totalHeures = useMemo(() => filteredFinal.reduce((s, d) => s + d.quantite, 0), [filteredFinal]);
  const nbPersonnes = useMemo(() => {
    const allDates = filteredFinal.map(d => d.dateSaisie).filter(Boolean).sort();
    if (allDates.length === 0) return 0;
    const uniqueDates = [...new Set(allDates)].sort();
    const j1 = uniqueDates.length >= 2 ? uniqueDates[uniqueDates.length - 2] : uniqueDates[uniqueDates.length - 1];
    const personnes = new Set(filteredFinal.filter(d => d.dateSaisie === j1).map(d => d.nomPrenom).filter(Boolean));
    return personnes.size;
  }, [filteredFinal]);
  const totalChargePrev = useMemo(() => data.reduce((s, d) => s + d.quantite, 0), [data]);
  const budgetTP = totalChargePrev > 0 ? (totalHeures / totalChargePrev) * 10000 : 0;

  // Projection mensuelle KPI
  const projectionMensuelle = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Helper: is working day (Mon-Fri, no public holidays for simplicity)
    const isWorkingDay = (d: Date) => {
      const day = d.getDay();
      return day !== 0 && day !== 6;
    };

    // Count total working days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let totalWorkingDays = 0;
    let elapsedWorkingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      if (isWorkingDay(d)) {
        totalWorkingDays++;
        if (i <= today.getDate()) elapsedWorkingDays++;
      }
    }

    // Hours in current month from filtered data (respects employer/code filters)
    const currentMonthData = filtered.filter(r => {
      const date = parseDateFn(r.dateSaisie);
      if (!date) return false;
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const heuresMoisCourant = currentMonthData.reduce((s, r) => s + r.quantite, 0);
    const joursSaisis = new Set(currentMonthData.map(r => r.dateSaisie).filter(Boolean)).size;

    // Previous month hours
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthData = filtered.filter(r => {
      const date = parseDateFn(r.dateSaisie);
      if (!date) return false;
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    });
    const heuresMoisPrecedent = prevMonthData.reduce((s, r) => s + r.quantite, 0);

    if (joursSaisis < 2 || elapsedWorkingDays === 0) {
      return { projection: null, joursSaisis, trend: 'neutral' as const, trendPct: 0 };
    }

    const moyenneJournaliere = heuresMoisCourant / joursSaisis;
    const projection = Math.round(moyenneJournaliere * totalWorkingDays);

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    let trendPct = 0;
    if (heuresMoisPrecedent > 0) {
      trendPct = Math.round(((projection - heuresMoisPrecedent) / heuresMoisPrecedent) * 100);
      trend = trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'neutral';
    }

    return { projection, joursSaisis, trend, trendPct };
  }, [filtered]);

  // Stacked bar by month (uses `filtered` not `filteredFinal` so all months stay visible)
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { sortKey: string; label: string; codes: Record<string, number> }> = {};
    filtered.forEach(d => {
      const date = parseDateFn(d.dateSaisie);
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

  // Weekly stacked bar chart (uses `filtered`)
  const weeklyData = useMemo(() => {
    const byWeek: Record<string, { sortKey: number; label: string; codes: Record<string, number> }> = {};
    filtered.forEach(d => {
      const date = parseDateFn(d.dateSaisie);
      if (!date) return;
      const week = getWeekNumberFn(date);
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

  // Pie chart by employer - uses filtered (not filteredFinal) so all employers stay visible
  const pieData = useMemo(() => {
    const byEmp: Record<string, number> = {};
    // Apply month/week filters but not employer filter for the pie
    let d = filtered;
    if (selectedMonth) {
      d = d.filter(r => {
        const date = parseDateFn(r.dateSaisie);
        if (!date) return false;
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}` === selectedMonth;
      });
    }
    if (selectedWeek) {
      d = d.filter(r => {
        const date = parseDateFn(r.dateSaisie);
        if (!date) return false;
        return `S${getWeekNumberFn(date)}` === selectedWeek;
      });
    }
    d.forEach(r => {
      const emp = r.employeur || 'Autre';
      byEmp[emp] = (byEmp[emp] || 0) + r.quantite;
    });
    const total = Object.values(byEmp).reduce((s, v) => s + v, 0);
    return Object.entries(byEmp)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }));
  }, [filtered, selectedMonth, selectedWeek]);

  // All code libre keys for stacked bars
  const allCodeLibreKeys = useMemo(() => {
    const keys = new Set<string>();
    filtered.forEach(d => keys.add(d.codeLibreTable || 'Autre'));
    return Array.from(keys).sort();
  }, [filtered]);

  // Table data - uses filteredFinal
  const tableData = useMemo(() => {
    let d = filteredFinal;
    // Apply column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value.trim()) {
        const s = value.trim().toLowerCase();
        d = d.filter(r => {
          const v = (r as any)[key];
          return v != null && String(v).toLowerCase().includes(s);
        });
      }
    });
    return d
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 100);
  }, [filteredFinal, columnFilters]);

  // Custom clickable X axis ticks
  const MonthTick = ({ x, y, payload }: any) => {
    const isSelected = selectedMonth === payload.value;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0} y={0} dy={8} textAnchor="end" transform="rotate(-20)"
          fill={isSelected ? 'hsl(200,80%,65%)' : 'hsl(215,15%,60%)'}
          fontSize={9} fontWeight={isSelected ? 700 : 400}
          style={{ cursor: 'pointer', textDecoration: isSelected ? 'underline' : 'none' }}
          onClick={() => setSelectedMonth(prev => prev === payload.value ? null : payload.value)}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const WeekTick = ({ x, y, payload }: any) => {
    const isSelected = selectedWeek === payload.value;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0} y={0} dy={8} textAnchor="middle"
          fill={isSelected ? 'hsl(200,80%,65%)' : 'hsl(215,15%,60%)'}
          fontSize={9} fontWeight={isSelected ? 700 : 400}
          style={{ cursor: 'pointer', textDecoration: isSelected ? 'underline' : 'none' }}
          onClick={() => setSelectedWeek(prev => prev === payload.value ? null : payload.value)}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 gap-1">
      {/* Top filters row */}
      <div className="flex gap-2 items-start flex-wrap shrink-0">
        <div className="pbi-card p-1.5 flex-1 min-w-[200px]">
          <div className="flex flex-wrap gap-1 max-h-[28px] overflow-auto">
            {employeurs.map(e => (
              <button
                key={e}
                onClick={() => toggleEmployeur(e)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
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
        <div className="pbi-card p-1.5">
          <div className="flex flex-wrap gap-1">
            {codeLibreValues.map(c => (
              <button
                key={c}
                onClick={() => toggleCodeLibre(c)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
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

      {/* Main content row - charts */}
      <div className="flex gap-2 shrink-0" style={{ height: 'calc(48vh - 40px)' }}>
        {/* Left KPI column */}
        <div className="flex flex-col gap-2 min-w-[130px] shrink-0">
          <PbiKpiCard label="Temps Passé" value={Math.round(totalHeures).toLocaleString('fr-FR')} color="info" />
          <PbiKpiCard label="Nbre de personnes à bord" value={nbPersonnes} color="warning" />
          <PbiKpiCard
            label="📈 Projection mensuelle"
            value={projectionMensuelle.projection !== null ? projectionMensuelle.projection.toLocaleString('fr-FR') : '—'}
            color={projectionMensuelle.projection === null ? 'primary' : projectionMensuelle.trend === 'up' ? 'success' : projectionMensuelle.trend === 'down' ? 'destructive' : 'info'}
            small
          />
          {projectionMensuelle.projection !== null && (
            <div className="pbi-card px-2 py-1 text-center -mt-1">
              <div className="text-[9px] text-muted-foreground">
                Basé sur {projectionMensuelle.joursSaisis} jours saisis
              </div>
              {projectionMensuelle.trendPct !== 0 && (
                <div className={`text-[9px] font-medium ${
                  projectionMensuelle.trend === 'up' ? 'text-success' : projectionMensuelle.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {projectionMensuelle.trend === 'up' ? '↑' : projectionMensuelle.trend === 'down' ? '↓' : '→'} {projectionMensuelle.trendPct > 0 ? '+' : ''}{projectionMensuelle.trendPct}% vs mois préc.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center charts */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="pbi-card p-2 h-1/2 flex flex-col">
            <div className="flex items-center gap-2 mb-1 flex-wrap shrink-0">
              <span className="pbi-section-title text-[10px]">Code libre Table</span>
              {allCodeLibreKeys.map(k => (
                <div key={k} className="flex items-center gap-1 text-[9px]">
                  <div className="w-2 h-2 rounded-sm" style={{ background: CODE_LIBRE_COLORS[k] || 'hsl(215,15%,60%)' }} />
                  <span className="text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ bottom: 18, left: 5, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,25%)" />
                  <XAxis dataKey="month" tick={<MonthTick />} interval={0} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(215,15%,60%)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} width={35} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 10, color: 'hsl(210,20%,92%)' }}
                    formatter={(v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  />
                  {allCodeLibreKeys.map(k => (
                    <Bar key={k} dataKey={k} stackId="a" fill={CODE_LIBRE_COLORS[k] || 'hsl(215,15%,60%)'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pbi-card p-2 h-1/2 flex flex-col">
            <div className="flex-1 min-h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ bottom: 18, left: 5, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,25%)" />
                  <XAxis dataKey="semaine" tick={<WeekTick />} interval={0} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(215,15%,60%)' }} width={35} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 10, color: 'hsl(210,20%,92%)' }}
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

        {/* Right: Pie chart + employer table */}
        <div className="pbi-card p-2 w-[230px] shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={25}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${percent}%`}
                  labelLine={{ stroke: 'hsl(215,15%,60%)' }}
                  style={{ fontSize: 8, cursor: 'pointer' }}
                  onClick={(entry: any) => {
                    if (entry?.name) {
                      toggleEmployeur(entry.name);
                    }
                  }}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      opacity={selectedEmployeurs.length > 0 && !selectedEmployeurs.includes(entry.name) ? 0.3 : 1}
                      stroke={selectedEmployeurs.includes(entry.name) ? 'hsl(210,20%,92%)' : 'none'}
                      strokeWidth={selectedEmployeurs.includes(entry.name) ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 10, color: 'hsl(210,20%,92%)' }}
                  formatter={(v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Employer percentage table */}
          <div className="shrink-0 max-h-[100px] overflow-y-auto border-t border-border/30 pt-1">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left px-1 py-0.5 font-semibold">Employeur</th>
                  <th className="text-right px-1 py-0.5 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {pieData.map((entry, i) => (
                  <tr key={entry.name} className="hover:bg-secondary/30">
                    <td className="px-1 py-0.5 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{entry.name}</span>
                    </td>
                    <td className="text-right px-1 py-0.5 font-mono">{entry.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom: Data table */}
      <div className="pbi-card overflow-hidden flex-1 min-h-0">
        <div className="overflow-auto h-full">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border/50">
                {TABLE_COLUMNS.map(col => (
                  <th key={col.key} className={`${col.isNumeric ? 'text-right' : 'text-left'} px-2 py-1 font-semibold text-muted-foreground`}>
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                {TABLE_COLUMNS.map(col => (
                  <th key={col.key} className="px-1 py-0.5">
                    <input
                      type="text"
                      placeholder="🔍"
                      value={columnFilters[col.key] || ''}
                      onChange={e => setColumnFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                      className="w-full bg-secondary/50 text-foreground text-[9px] px-1 py-0.5 rounded-sm border border-border/30 focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-secondary/30">
                  {TABLE_COLUMNS.map(col => (
                    <td key={col.key} className={`px-2 py-0.5 ${col.isNumeric ? 'text-right font-mono' : ''} ${col.key === 'intituleAffaire' || col.key === 'codeLibreAlpha' ? 'text-[9px]' : ''} ${col.key === 'codeLibreAlpha' ? 'font-mono' : ''}`}>
                      {col.isNumeric
                        ? (row as any)[col.key].toLocaleString('fr-FR', { minimumFractionDigits: 2 })
                        : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-semibold">
              <tr>
                <td className="px-2 py-0.5" colSpan={8}>Total</td>
                <td className="px-2 py-0.5 text-right font-mono">
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
