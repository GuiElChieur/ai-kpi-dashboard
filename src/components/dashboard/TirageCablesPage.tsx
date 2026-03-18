import { useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  type CableData, getTirageData, isTire, isNonTire, isEnRetard,
} from '@/lib/cable-parser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Line, Area, ComposedChart, ReferenceLine,
} from 'recharts';
import { Cable, Ruler, CheckCircle, XCircle, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const PAGE_SIZE = 50;

function StatusBadge({ cable }: { cable: CableData }) {
  if (isTire(cable)) return <Badge className="bg-success/20 text-success border-success/30">✅ Tiré</Badge>;
  if (isEnRetard(cable)) return <Badge className="bg-destructive/20 text-destructive border-destructive/30">🔴 Retard</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-border">⏳ Non tiré</Badge>;
}

export function TirageCablesPage({ allData }: { allData: CableData[] }) {
  const baseData = useMemo(() => getTirageData(allData), [allData]);
  const [showMinReq, setShowMinReq] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'tire' | 'non-tire' | 'retard'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [lotFilter, setLotFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(true);

  const zones = useMemo(() => [...new Set(baseData.map(c => c.codZoneTirage).filter(Boolean))].sort(), [baseData]);
  const lots = useMemo(() => [...new Set(baseData.map(c => c.lotMtgApo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })), [baseData]);

  const filtered = useMemo(() => {
    let d = baseData;
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(c => c.cbl.toLowerCase().includes(s) || c.repereCbl.toLowerCase().includes(s));
    }
    if (statusFilter === 'tire') d = d.filter(isTire);
    else if (statusFilter === 'non-tire') d = d.filter(c => isNonTire(c) && !isEnRetard(c));
    else if (statusFilter === 'retard') d = d.filter(isEnRetard);
    if (zoneFilter) d = d.filter(c => c.codZoneTirage === zoneFilter);
    if (lotFilter) d = d.filter(c => c.lotMtgApo === lotFilter);
    return d;
  }, [baseData, search, statusFilter, zoneFilter, lotFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const tires = filtered.filter(isTire).length;
    const nonTires = filtered.filter(isNonTire).length;
    const retard = filtered.filter(isEnRetard).length;
    const lngTotal = filtered.reduce((s, c) => s + c.lngTotal, 0);
    const lngTiree = filtered.filter(isTire).reduce((s, c) => s + c.lngTotal, 0);
    const lngRestante = filtered.filter(c => !isTire(c)).reduce((s, c) => s + c.lngTotal, 0);
    return { total, tires, nonTires, retard, lngTotal, lngTiree, lngRestante };
  }, [filtered]);

  // Avancement par MOIS (au lieu de semaine)
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { tire: number; restant: number; sortKey: string }> = {};
    filtered.forEach(c => {
      const dateStr = c.dateTirageCbl || c.dateTirPlusTard || c.dateTirPlusTot;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const key = `${mm}/${yyyy}`;
      const sortKey = `${yyyy}-${mm}`;
      if (!byMonth[key]) byMonth[key] = { tire: 0, restant: 0, sortKey };
      if (isTire(c)) byMonth[key].tire += c.lngTotal;
      else byMonth[key].restant += c.lngTotal;
    });
    return Object.entries(byMonth)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([mois, v]) => ({ mois, tire: Math.round(v.tire), restant: Math.round(v.restant) }));
  }, [filtered]);

  // Longueurs tirées par jour (bar chart)
  const dailyTireData = useMemo(() => {
    const byDay: Record<string, number> = {};
    filtered.forEach(c => {
      if (!isTire(c) || !c.dateTirageCbl) return;
      const day = c.dateTirageCbl;
      byDay[day] = (byDay[day] || 0) + c.lngTotal;
    });
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([jour, lng]) => ({ jour, lng: Math.round(lng) }));
  }, [filtered]);

  // ── Avancement cumulé du tirage (full business logic) ──
  const cumulativeResult = useMemo(() => {
    const OBJECTIF_TOTAL = 236027;

    // Câbles tirés avec date
    const tiresWithDate = filtered.filter(c => isTire(c) && c.dateTirageCbl);
    if (tiresWithDate.length === 0) return { data: [], delta: 0, dateFin: '', objectifTotal: OBJECTIF_TOTAL };

    // dateDebut = premier tirage réel
    const allTirDates = tiresWithDate.map(c => c.dateTirageCbl!).sort();
    const dateDebut = new Date(allTirDates[0]);

    // dateFin = max(TIR_PLUS_TARD)
    const deadlines = filtered.filter(c => c.dateTirPlusTard).map(c => c.dateTirPlusTard!);
    const dateFinStr = deadlines.length > 0 ? deadlines.sort().pop()! : allTirDates[allTirDates.length - 1];
    const dateFin = new Date(dateFinStr);

    // Generate all dates
    const allDates: Date[] = [];
    for (let d = new Date(dateDebut); d <= dateFin; d.setDate(d.getDate() + 1)) {
      allDates.push(new Date(d));
    }
    if (allDates.length === 0) return { data: [], delta: 0, dateFin: dateFinStr, objectifTotal: OBJECTIF_TOTAL };

    const toKey = (d: Date) => d.toISOString().substring(0, 10);

    // Real daily aggregation
    const realDaily: Record<string, number> = {};
    tiresWithDate.forEach(c => {
      realDaily[c.dateTirageCbl!] = (realDaily[c.dateTirageCbl!] || 0) + c.lngTotal;
    });

    // Real cumulative
    const realCumulative: number[] = [];
    let cumul = 0;
    allDates.forEach((d, i) => {
      cumul += (realDaily[toKey(d)] || 0);
      realCumulative[i] = Math.round(cumul);
    });

    // Minimum required cumulative (câbles dont TIR_PLUS_TARD <= d)
    // Pre-aggregate by deadline
    const byDeadline: Record<string, number> = {};
    filtered.forEach(c => {
      if (!c.dateTirPlusTard) return;
      byDeadline[c.dateTirPlusTard] = (byDeadline[c.dateTirPlusTard] || 0) + c.lngTotal;
    });
    const deadlineDays = Object.keys(byDeadline).sort();
    let deadlineIdx = 0;
    let minCumul = 0;
    const minimumRequired: number[] = [];
    allDates.forEach((d) => {
      const dk = toKey(d);
      while (deadlineIdx < deadlineDays.length && deadlineDays[deadlineIdx] <= dk) {
        minCumul += byDeadline[deadlineDays[deadlineIdx]];
        deadlineIdx++;
      }
      minimumRequired.push(Math.round(minCumul));
    });

    // ── buildSmoothedTarget ──
    const n = allDates.length;
    const dailyBase = OBJECTIF_TOTAL / Math.max(n - 1, 1);
    // Linear trajectory
    const linear = allDates.map((_, i) => Math.round(dailyBase * i));
    // Force constraints
    const constrained: number[] = [];
    constrained[0] = Math.max(linear[0], minimumRequired[0], 0);
    for (let i = 1; i < n; i++) {
      constrained[i] = Math.max(linear[i], minimumRequired[i], constrained[i - 1]);
    }
    // Extract increments
    const increments = constrained.map((v, i) => i === 0 ? v : v - constrained[i - 1]);
    // Smooth increments (simple moving average, window 7)
    const win = Math.min(7, Math.floor(n / 3));
    const smoothedInc = increments.map((_, i) => {
      let sum = 0, cnt = 0;
      for (let j = Math.max(0, i - win); j <= Math.min(n - 1, i + win); j++) {
        sum += increments[j]; cnt++;
      }
      return sum / cnt;
    });
    // Rebuild cumul from smoothed increments
    const smoothedCum: number[] = [];
    smoothedCum[0] = smoothedInc[0];
    for (let i = 1; i < n; i++) {
      smoothedCum[i] = smoothedCum[i - 1] + smoothedInc[i];
    }
    // Re-constrain & renormalize
    const target: number[] = [];
    target[0] = Math.max(smoothedCum[0], minimumRequired[0], 0);
    for (let i = 1; i < n; i++) {
      target[i] = Math.max(smoothedCum[i], minimumRequired[i], target[i - 1]);
    }
    // Scale to exactly OBJECTIF_TOTAL
    const lastTarget = target[n - 1];
    if (lastTarget > 0 && lastTarget !== OBJECTIF_TOTAL) {
      const scale = OBJECTIF_TOTAL / lastTarget;
      for (let i = 0; i < n; i++) target[i] = Math.round(target[i] * scale);
      // Re-constrain after scaling
      for (let i = 1; i < n; i++) {
        target[i] = Math.max(target[i], minimumRequired[i], target[i - 1]);
      }
      target[n - 1] = OBJECTIF_TOTAL;
    }

    // Format dates DD/MM/YYYY
    const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const data = allDates.map((d, i) => ({
      date: fmtDate(d),
      dateISO: toKey(d),
      real: realCumulative[i],
      target: Math.round(target[i]),
      minReq: minimumRequired[i],
      objectifFinal: OBJECTIF_TOTAL,
    }));

    // Delta on last date with real data
    // Find today's index (or last real data index if today is out of range)
    const todayKey = new Date().toISOString().substring(0, 10);
    let todayIdx = allDates.findIndex(d => toKey(d) === todayKey);
    if (todayIdx < 0) {
      // If today is beyond range, use last index with real data
      for (let i = realCumulative.length - 1; i >= 0; i--) { if (realCumulative[i] > 0) { todayIdx = i; break; } }
    }
    // Delta = écart entre réel et min. requis à la date du jour
    const delta = todayIdx >= 0 ? realCumulative[todayIdx] - minimumRequired[todayIdx] : 0;

    return { data, delta, dateFin: dateFinStr, objectifTotal: OBJECTIF_TOTAL };
  }, [filtered]);

  // Sorted table data
  const sortedFiltered = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = (a as any)[sortCol] ?? '';
      const vb = (b as any)[sortCol] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr', { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortAsc]);

  const pageData = sortedFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedFiltered.length / PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setZoneFilter(''); setLotFilter(''); setPage(0); };

  const exportCSV = () => {
    const headers = ['Câble', 'Repère', 'Type', 'Longueur (m)', 'Date plus tôt', 'Date plus tard', 'Date tirage', 'Statut', 'Zone', 'Lot APO'];
    const rows = sortedFiltered.map(c => [c.cbl, c.repereCbl, c.ptCbl, c.lngTotal, c.dateTirPlusTot || '', c.dateTirPlusTard || '', c.dateTirageCbl || '', c.sttCblBord || 'Non tiré', c.codZoneTirage, c.lotMtgApo]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tirage_cables.csv';
    a.click();
  };

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' };

  return (
    <div className="p-4 space-y-4 animate-fade-in overflow-auto">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="cursor-pointer" onClick={() => { setStatusFilter('all'); setPage(0); }}>
          <KpiCard title="Total câbles" value={kpis.total.toLocaleString('fr-FR')} icon={<Cable className="h-5 w-5" />} className={statusFilter === 'all' ? 'ring-2 ring-primary' : ''} />
        </div>
        <KpiCard title="Longueur totale" value={`${Math.round(kpis.lngTotal).toLocaleString('fr-FR')} m`} icon={<Ruler className="h-5 w-5" />} />
        <KpiCard title="Métré tiré" value={`${Math.round(kpis.lngTiree).toLocaleString('fr-FR')} m (${kpis.lngTotal ? ((kpis.lngTiree / kpis.lngTotal) * 100).toFixed(1) : 0}%)`} icon={<CheckCircle className="h-5 w-5" />} />
        <KpiCard title="Non tirés" value={`${kpis.nonTires}`} icon={<XCircle className="h-5 w-5" />} />
        <div className="cursor-pointer" onClick={() => { setStatusFilter('retard'); setPage(0); setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
          <KpiCard title="En retard" value={`${kpis.retard}`} icon={<AlertTriangle className="h-5 w-5" />} className={statusFilter === 'retard' ? 'ring-2 ring-destructive' : ''} />
        </div>
        <KpiCard title="Long. restante" value={`${Math.round(kpis.lngRestante).toLocaleString('fr-FR')} m`} icon={<Ruler className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="py-3 flex flex-wrap items-center gap-2">
          <Input placeholder="Rechercher câble / repère…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="w-48 h-8 text-xs" />
          {(['all', 'tire', 'non-tire', 'retard'] as const).map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => { setStatusFilter(s); setPage(0); }} className="h-7 text-xs">
              {s === 'all' ? 'Tous' : s === 'tire' ? 'Tirés' : s === 'non-tire' ? 'Non tirés' : 'En retard'}
            </Button>
          ))}
          <select value={zoneFilter} onChange={e => { setZoneFilter(e.target.value); setPage(0); }} className="h-7 text-xs rounded border border-border bg-card px-2 text-foreground">
            <option value="">Toutes zones</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={lotFilter} onChange={e => { setLotFilter(e.target.value); setPage(0); }} className="h-7 text-xs rounded border border-border bg-card px-2 text-foreground">
            <option value="">Tous lots</option>
            {lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs"><RotateCcw className="h-3 w-3 mr-1" />Réinitialiser</Button>
        </CardContent>
      </Card>

      {/* Charts — 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Avancement mensuel */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avancement mensuel — Longueur tirée (m)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ left: 10, right: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mois" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="tire" name="Tiré" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="restant" name="Restant" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Longueurs tirées par jour (bar chart) */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Longueurs tirées par jour (m)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTireData} margin={{ left: 10, right: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="jour" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString('fr-FR')} m`, 'Longueur tirée']} />
                  <Bar dataKey="lng" name="Longueur tirée" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Avancement cumulé du tirage */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Avancement cumulé du tirage (m)</CardTitle>
              {cumulativeResult.data.length > 0 && (
                <Badge className={`mt-1 ${cumulativeResult.delta >= 0 ? 'bg-success/20 text-success border-success/30' : 'bg-destructive/20 text-destructive border-destructive/30'}`}>
                  {cumulativeResult.delta >= 0 ? `En avance de ${cumulativeResult.delta.toLocaleString('fr-FR')} m` : `En retard de ${Math.abs(cumulativeResult.delta).toLocaleString('fr-FR')} m`}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Min. requis</span>
              <Switch checked={showMinReq} onCheckedChange={setShowMinReq} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cumulativeResult.data} margin={{ left: 20, right: 20, bottom: 30, top: 10 }}>
                  <defs>
                    <linearGradient id="gradCumul" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      if (!d) return null;
                      const ecart = d.real - d.target;
                      return (
                        <div style={tooltipStyle} className="p-2 text-xs space-y-0.5">
                          <div className="font-semibold">{label}</div>
                          <div>Réel : <b>{d.real.toLocaleString('fr-FR')} m</b></div>
                          <div>Objectif : <b>{d.target.toLocaleString('fr-FR')} m</b></div>
                          <div>Min. requis : <b>{d.minReq.toLocaleString('fr-FR')} m</b></div>
                          <div className={ecart >= 0 ? 'text-success' : 'text-destructive'}>
                            Écart : <b>{ecart >= 0 ? '+' : ''}{ecart.toLocaleString('fr-FR')} m</b>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={cumulativeResult.objectifTotal} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1} label={{ value: `${cumulativeResult.objectifTotal.toLocaleString('fr-FR')} m`, position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  {cumulativeResult.dateFin && (() => {
                    const df = new Date(cumulativeResult.dateFin);
                    const label = `${String(df.getDate()).padStart(2,'0')}/${String(df.getMonth()+1).padStart(2,'0')}/${df.getFullYear()}`;
                    return <ReferenceLine x={label} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1} label={{ value: label, position: 'top', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />;
                  })()}
                  <Area type="monotone" dataKey="real" name="Cumulé réel tiré" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#gradCumul)" dot={false} />
                  <Line type="monotone" dataKey="target" name="Objectif cumulé lissé" stroke="hsl(var(--warning, 45 93% 47%))" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                  {showMinReq && <Line type="stepAfter" dataKey="minReq" name="Minimum requis" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 2" dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="glass-card" ref={tableRef}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Détail des câbles ({sortedFiltered.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCSV} className="h-7 text-xs">Export CSV</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sortedFiltered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucun câble ne correspond aux filtres sélectionnés.</div>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { key: 'cbl', label: 'Câble' }, { key: 'repereCbl', label: 'Repère' },
                      { key: 'ptCbl', label: 'Type' }, { key: 'lngTotal', label: 'Long. (m)' },
                      { key: 'dateTirPlusTot', label: 'Date +tôt' }, { key: 'dateTirPlusTard', label: 'Date +tard' },
                      { key: 'dateTirageCbl', label: 'Date tirage' }, { key: 'sttCblBord', label: 'Statut' },
                      { key: 'codZoneTirage', label: 'Zone' }, { key: 'lotMtgApo', label: 'Lot APO' },
                    ].map(col => (
                      <th key={col.key} className="text-left py-2 px-2 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort(col.key)}>
                        {col.label} {sortCol === col.key ? (sortAsc ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((c, i) => (
                    <tr key={i} className={`border-b border-border/30 hover:bg-secondary/30 ${isEnRetard(c) ? 'bg-destructive/10' : ''}`}>
                      <td className="py-1.5 px-2 font-mono">{c.cbl}</td>
                      <td className="py-1.5 px-2">{c.repereCbl}</td>
                      <td className="py-1.5 px-2">{c.ptCbl}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{c.lngTotal.toLocaleString('fr-FR')}</td>
                      <td className="py-1.5 px-2">{c.dateTirPlusTot || '—'}</td>
                      <td className="py-1.5 px-2">{c.dateTirPlusTard || '—'}</td>
                      <td className="py-1.5 px-2">{c.dateTirageCbl || '—'}</td>
                      <td className="py-1.5 px-2"><StatusBadge cable={c} /></td>
                      <td className="py-1.5 px-2">{c.codZoneTirage}</td>
                      <td className="py-1.5 px-2">{c.lotMtgApo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7"><ChevronLeft className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7"><ChevronRight className="h-3 w-3" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
