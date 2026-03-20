import { useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  type CableData, getFilerieData, isTire, isEnRetard,
} from '@/lib/cable-parser';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Cable, Ruler, Layers, CalendarClock, AlertTriangle, RotateCcw, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';

const LOT_COLORS = [
  'hsl(200,80%,55%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(280,60%,55%)',
  'hsl(0,72%,51%)', 'hsl(160,60%,45%)', 'hsl(45,100%,55%)', 'hsl(220,70%,50%)',
  'hsl(320,60%,50%)', 'hsl(180,60%,45%)', 'hsl(30,80%,55%)',
];
const PAGE_SIZE = 50;

export function FilerieLotPage({ allData }: { allData: CableData[] }) {
  const baseData = useMemo(() => allData.filter(c => c.respTirage === 'GEST' && c.indApproCa === 'N'), [allData]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [lotFilter, setLotFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'retard'>('all');
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  const lots = useMemo(() => [...new Set(baseData.map(c => c.lotMtgApo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })), [baseData]);

  const filtered = useMemo(() => {
    let d = baseData;
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(c => c.cbl.toLowerCase().includes(s) || c.repereCbl.toLowerCase().includes(s));
    }
    if (lotFilter) d = d.filter(c => c.lotMtgApo === lotFilter);
    if (statusFilter === 'retard') d = d.filter(isEnRetard);
    return d.sort((a, b) => a.lotMtgApo.localeCompare(b.lotMtgApo, 'fr', { numeric: true }));
  }, [baseData, search, lotFilter, statusFilter]);

  const today = new Date().toISOString().substring(0, 10);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const tires = filtered.filter(isTire).length;
    const lngTotal = filtered.reduce((s, c) => s + c.lngTotal, 0);
    const lngTire = filtered.filter(isTire).reduce((s, c) => s + c.lngTotal, 0);
    const nbLots = new Set(filtered.map(c => c.lotMtgApo)).size;
    const dansFenetre = filtered.filter(c => c.dateTirPlusTot && c.dateTirPlusTard && c.dateTirPlusTot <= today && today <= c.dateTirPlusTard).length;
    const retard = filtered.filter(isEnRetard).length;
    const pctQty = total ? ((tires / total) * 100).toFixed(1) : '0';
    const pctLng = lngTotal ? ((lngTire / lngTotal) * 100).toFixed(1) : '0';
    return { total, tires, lngTotal, lngTire, nbLots, dansFenetre, retard, pctQty, pctLng };
  }, [filtered, today]);

  // Bar chart: longueur par lot (tiré vs non tiré)
  const lotLngData = useMemo(() => {
    const byLot: Record<string, { tire: number; nonTire: number }> = {};
    filtered.forEach(c => {
      const lot = c.lotMtgApo || 'N/A';
      if (!byLot[lot]) byLot[lot] = { tire: 0, nonTire: 0 };
      if (isTire(c)) byLot[lot].tire += c.lngTotal;
      else byLot[lot].nonTire += c.lngTotal;
    });
    return Object.entries(byLot)
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
      .map(([lot, v]) => ({ lot, tire: Math.round(v.tire), nonTire: Math.round(v.nonTire) }));
  }, [filtered]);

  // Bar chart: quantité câbles par lot (tiré vs non tiré)
  const lotQtyData = useMemo(() => {
    const byLot: Record<string, { tire: number; nonTire: number }> = {};
    filtered.forEach(c => {
      const lot = c.lotMtgApo || 'N/A';
      if (!byLot[lot]) byLot[lot] = { tire: 0, nonTire: 0 };
      if (isTire(c)) byLot[lot].tire += 1;
      else byLot[lot].nonTire += 1;
    });
    return Object.entries(byLot)
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
      .map(([lot, v]) => ({ lot, tire: v.tire, nonTire: v.nonTire }));
  }, [filtered]);

  // Grouped data
  const groupedByLot = useMemo(() => {
    const groups: Record<string, CableData[]> = {};
    filtered.forEach(c => {
      const lot = c.lotMtgApo || 'N/A';
      if (!groups[lot]) groups[lot] = [];
      groups[lot].push(c);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }));
  }, [filtered]);

  const toggleLot = (lot: string) => {
    setExpandedLots(prev => {
      const n = new Set(prev);
      n.has(lot) ? n.delete(lot) : n.add(lot);
      return n;
    });
  };

  const expandAll = () => setExpandedLots(new Set(groupedByLot.map(([lot]) => lot)));
  const collapseAll = () => setExpandedLots(new Set());
  const resetFilters = () => { setSearch(''); setLotFilter(''); setStatusFilter('all'); };

  const exportCSV = (data: CableData[], filename: string) => {
    const headers = ['Câble', 'Repère', 'Type', 'Longueur (m)', 'Date plus tôt', 'Date plus tard', 'Date tirage', 'APO', 'APA', 'Lot'];
    const rows = data.map(c => [c.cbl, c.repereCbl, c.ptCbl, c.lngTotal, c.dateTirPlusTot || '', c.dateTirPlusTard || '', c.dateTirageCbl || '', c.apo, c.apa, c.lotMtgApo]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in overflow-auto">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 [&>div]:h-full">
        <KpiCard title="Total câbles filerie" value={kpis.total.toLocaleString('fr-FR')} icon={<Cable className="h-5 w-5" />} className="h-full" />
        <KpiCard title="Longueur totale" value={`${Math.round(kpis.lngTotal).toLocaleString('fr-FR')} m`} icon={<Ruler className="h-5 w-5" />} className="h-full" />
        <KpiCard title="Lots distincts" value={kpis.nbLots.toString()} icon={<Layers className="h-5 w-5" />} className="h-full" />
        <KpiCard title="Dans la fenêtre" value={kpis.dansFenetre.toString()} icon={<CalendarClock className="h-5 w-5" />} className="h-full" />
        <div className="cursor-pointer" onClick={() => { setStatusFilter(statusFilter === 'retard' ? 'all' : 'retard'); setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
          <KpiCard title="En retard" value={kpis.retard.toString()} icon={<AlertTriangle className="h-5 w-5" />} className={`h-full ${statusFilter === 'retard' ? 'ring-2 ring-destructive' : ''}`} />
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="py-3 flex flex-wrap items-center gap-2">
          <Input placeholder="Rechercher câble / repère…" value={search} onChange={e => setSearch(e.target.value)} className="w-48 h-8 text-xs" />
          <Button size="sm" variant={!lotFilter ? 'default' : 'outline'} onClick={() => setLotFilter('')} className="h-7 text-xs">Tous</Button>
          {lots.map(l => (
            <Button key={l} size="sm" variant={lotFilter === l ? 'default' : 'outline'} onClick={() => setLotFilter(lotFilter === l ? '' : l)} className="h-7 text-xs">
              {l}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs"><RotateCcw className="h-3 w-3 mr-1" />Réinitialiser</Button>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Longueur par lot — Tiré vs Non tiré (m)</CardTitle>
            <Badge className="bg-success/20 text-success border-success/30 text-xs font-mono">{kpis.pctLng}% tiré</Badge>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lotLngData} margin={{ left: 10, right: 10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="lot" tick={{ fontSize: 10, fontWeight: 600 }} angle={-90} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v}m`} width={45} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => `${v.toLocaleString('fr-FR')} m`} />
                  <Bar dataKey="tire" name="Tiré" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="nonTire" name="Non tiré" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 -mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--success))' }} />Tiré</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--muted-foreground))' }} />Non tiré</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quantité câbles par lot — Tiré vs Non tiré</CardTitle>
            <Badge className="bg-success/20 text-success border-success/30 text-xs font-mono">{kpis.pctQty}% tiré</Badge>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lotQtyData} margin={{ left: 10, right: 10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="lot" tick={{ fontSize: 10, fontWeight: 600 }} angle={-90} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 9 }} width={35} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12, color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="tire" name="Tiré" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="nonTire" name="Non tiré" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 -mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--success))' }} />Tiré</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--muted-foreground))' }} />Non tiré</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped table */}
      <Card className="glass-card" ref={tableRef}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Câbles par lot ({filtered.length}){statusFilter === 'retard' && ' — En retard'}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={expandAll} className="h-7 text-xs">Tout déplier</Button>
            <Button size="sm" variant="ghost" onClick={collapseAll} className="h-7 text-xs">Tout replier</Button>
            <Button size="sm" variant="outline" onClick={() => exportCSV(filtered, 'filerie_lot.csv')} className="h-7 text-xs">Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {groupedByLot.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucun câble ne correspond aux filtres sélectionnés.</div>
          ) : (
            <div className="space-y-1">
              {groupedByLot.map(([lot, cables], li) => {
                const isOpen = expandedLots.has(lot);
                const lotLng = cables.reduce((s, c) => s + c.lngTotal, 0);
                return (
                  <div key={lot}>
                    <button
                      onClick={() => toggleLot(lot)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded text-sm font-medium hover:bg-secondary/50 transition-colors"
                      style={{ borderLeft: `3px solid ${LOT_COLORS[li % LOT_COLORS.length]}` }}
                    >
                      <span className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        Lot {lot}
                      </span>
                      <span className="text-xs text-muted-foreground">{cables.length} câbles · {Math.round(lotLng).toLocaleString('fr-FR')} m</span>
                    </button>
                    {isOpen && (
                      <div className="overflow-x-auto ml-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="text-left py-1.5 px-2">Câble</th>
                              <th className="text-left py-1.5 px-2">Repère</th>
                              <th className="text-left py-1.5 px-2">Type</th>
                              <th className="text-right py-1.5 px-2">Long. (m)</th>
                              <th className="text-left py-1.5 px-2">Date +tôt</th>
                              <th className="text-left py-1.5 px-2">Date +tard</th>
                              <th className="text-left py-1.5 px-2">Date tirage</th>
                              <th className="text-left py-1.5 px-2">APO</th>
                              <th className="text-left py-1.5 px-2">APA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cables.map((c, i) => (
                              <tr key={i} className={`border-b border-border/20 hover:bg-secondary/30 ${isEnRetard(c) ? 'bg-destructive/10' : ''}`}>
                                <td className="py-1 px-2 font-mono">{c.cbl}</td>
                                <td className="py-1 px-2">{c.repereCbl}</td>
                                <td className="py-1 px-2">{c.ptCbl}</td>
                                <td className="py-1 px-2 text-right font-mono">{c.lngTotal.toLocaleString('fr-FR')}</td>
                                <td className="py-1 px-2">{c.dateTirPlusTot || '—'}</td>
                                <td className="py-1 px-2">{c.dateTirPlusTard || '—'}</td>
                                <td className="py-1 px-2">{c.dateTirageCbl || '—'}</td>
                                <td className="py-1 px-2">{c.apo}</td>
                                <td className="py-1 px-2">{c.apa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
