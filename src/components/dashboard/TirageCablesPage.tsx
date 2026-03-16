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
  Legend, LineChart, Line,
} from 'recharts';
import { Cable, Ruler, CheckCircle, XCircle, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const PAGE_SIZE = 50;

function StatusBadge({ cable }: { cable: CableData }) {
  if (isTire(cable)) return <Badge className="bg-success/20 text-success border-success/30">✅ Tiré</Badge>;
  if (isEnRetard(cable)) return <Badge className="bg-destructive/20 text-destructive border-destructive/30">🔴 Retard</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-border">⏳ Non tiré</Badge>;
}

export function TirageCablesPage({ allData }: { allData: CableData[] }) {
  const baseData = useMemo(() => getTirageData(allData), [allData]);
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

  // Avancement par semaine
  const weeklyData = useMemo(() => {
    const byWeek: Record<string, { tire: number; restant: number }> = {};
    filtered.forEach(c => {
      const dateStr = c.dateTirageCbl || c.dateTirPlusTard || c.dateTirPlusTot;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const wk = `S${getISOWeek(d)}-${d.getFullYear()}`;
      if (!byWeek[wk]) byWeek[wk] = { tire: 0, restant: 0 };
      if (isTire(c)) byWeek[wk].tire += c.lngTotal;
      else byWeek[wk].restant += c.lngTotal;
    });
    return Object.entries(byWeek)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sem, v]) => ({ sem, tire: Math.round(v.tire), restant: Math.round(v.restant) }));
  }, [filtered]);

  const weeklyChargeData = useMemo(() => {
    const MAX_PER_WEEK = 13000; // mètres max par semaine
    const today = new Date();
    const todayWk = startOfWeek(today, { weekStartsOn: 1 });

    // Câbles non tirés avec deadline, triés par date au plus tard croissante
    const nonTires = filtered
      .filter(c => !isTire(c) && c.dateTirPlusTard)
      .sort((a, b) => a.dateTirPlusTard!.localeCompare(b.dateTirPlusTard!));

    // Générer toutes les semaines de aujourd'hui jusqu'à la dernière deadline
    const lastDeadline = nonTires.length > 0
      ? new Date(nonTires[nonTires.length - 1].dateTirPlusTard!)
      : today;
    const allWeekStarts: Date[] = [];
    let wk = new Date(todayWk);
    while (wk <= lastDeadline) {
      allWeekStarts.push(new Date(wk));
      wk = new Date(wk.getTime() + 7 * 24 * 3600 * 1000);
    }
    if (allWeekStarts.length === 0) allWeekStarts.push(new Date(todayWk));

    // Initialiser la charge lissée par semaine
    const weekCharge: number[] = new Array(allWeekStarts.length).fill(0);

    // Pour chaque câble (trié par deadline), l'affecter à la semaine la plus tardive
    // possible (deadline - 1 semaine) puis remonter si la capacité est dépassée
    nonTires.forEach(c => {
      const deadline = new Date(c.dateTirPlusTard!);
      const targetDate = new Date(deadline.getTime() - 7 * 24 * 3600 * 1000);
      // Trouver l'index de la semaine cible (la plus tardive <= targetDate)
      let targetIdx = allWeekStarts.length - 1;
      for (let i = allWeekStarts.length - 1; i >= 0; i--) {
        if (allWeekStarts[i] <= targetDate) { targetIdx = i; break; }
        if (i === 0) targetIdx = 0;
      }
      // Placer le câble : remonter dans le temps si capacité dépassée
      let placed = false;
      for (let i = targetIdx; i >= 0; i--) {
        if (weekCharge[i] + c.lngTotal <= MAX_PER_WEEK) {
          weekCharge[i] += c.lngTotal;
          placed = true;
          break;
        }
      }
      // Si pas de place, forcer sur la semaine cible (dépassement signalé)
      if (!placed) {
        weekCharge[targetIdx] += c.lngTotal;
      }
    });

    // Câbles déjà tirés par semaine de tirage réel
    const tires = filtered.filter(c => isTire(c) && c.dateTirageCbl);
    const byWeekTire: Record<string, number> = {};
    tires.forEach(c => {
      const d = new Date(c.dateTirageCbl!);
      const wkStart = startOfWeek(d, { weekStartsOn: 1 });
      const wkKey = format(wkStart, 'dd/MM', { locale: fr });
      byWeekTire[wkKey] = (byWeekTire[wkKey] || 0) + c.lngTotal;
    });

    // Construire le résultat final
    const result: { sem: string; objectif: number; realise: number; cap: number }[] = [];
    // D'abord les semaines passées (tirées uniquement)
    const futureKeys = new Set(allWeekStarts.map(w => format(w, 'dd/MM', { locale: fr })));
    const pastKeys = Object.keys(byWeekTire).filter(k => !futureKeys.has(k));
    pastKeys.sort((a, b) => {
      const [da, ma] = a.split('/').map(Number);
      const [db, mb] = b.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
    });
    pastKeys.forEach(k => {
      result.push({ sem: `S${k}`, objectif: 0, realise: Math.round(byWeekTire[k]), cap: MAX_PER_WEEK });
    });
    // Puis les semaines planifiées
    allWeekStarts.forEach((ws, i) => {
      const key = format(ws, 'dd/MM', { locale: fr });
      result.push({
        sem: `S${key}`,
        objectif: Math.round(weekCharge[i]),
        realise: Math.round(byWeekTire[key] || 0),
        cap: MAX_PER_WEEK,
      });
    });
    return result;
  }, [filtered]);

  // Longueurs tirées par jour
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avancement hebdomadaire — Longueur tirée (m)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ left: 10, right: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="sem" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} />
                  <Legend />
                  <Bar dataKey="tire" name="Tiré" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="restant" name="Restant" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Charge hebdo lissée — Objectif vs Réalisé (m)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChargeData} margin={{ left: 10, right: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="sem" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [`${v.toLocaleString('fr-FR')} m`]} />
                  <Legend />
                  <Bar dataKey="objectif" name="Objectif (−1 sem.)" fill="hsl(var(--primary))" opacity={0.6} />
                  <Bar dataKey="realise" name="Réalisé" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Longueurs tirées par jour (m)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTireData} margin={{ left: 10, right: 10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="jour" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [`${v.toLocaleString('fr-FR')} m`, 'Longueur tirée']} />
                  <Line type="monotone" dataKey="lng" name="Longueur tirée" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
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
