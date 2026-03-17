import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type CableData, getFilerieData } from '@/lib/cable-parser';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from 'recharts';
import { Cable, Ruler, TrendingUp, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FN_COLORS: Record<string, string> = {
  ELP: '#3B82F6', ECD: '#10B981', EPC: '#8B5CF6', RDI: '#EF4444',
  ORD: '#F59E0B', HAB: '#EC4899', HAA: '#06B6D4', BHD: '#84CC16',
  ECM: '#F97316', VAC: '#6B7280', DES: '#A78BFA',
};

function getFnColor(fn: string) {
  return FN_COLORS[fn] || '#9CA3AF';
}

function getBarColor(pct: number) {
  if (pct >= 15) return '#2ECC71';
  if (pct >= 5) return '#F39C12';
  return '#E74C3C';
}

export function CourbeFileriePage({ allData }: { allData: CableData[] }) {
  // Filter on RESP_TIRAGE="GEST" and IND_APPRO_CA="N"
  const filteredAll = useMemo(() =>
    allData.filter(c => c.respTirage === 'GEST' && c.indApproCa === 'N'),
  [allData]);

  const baseData = useMemo(() => getFilerieData(filteredAll), [filteredAll]);
  const [selectedFns, setSelectedFns] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Apply FN filter
  const fnFiltered = useMemo(() => {
    if (selectedFns.size === 0) return baseData;
    return baseData.filter(c => selectedFns.has(c.fn));
  }, [baseData, selectedFns]);

  // KPIs
  const kpis = useMemo(() => {
    const total = fnFiltered.length;
    const lngTotal = fnFiltered.reduce((s, c) => s + c.lngTotal, 0);
    const lngTiree = fnFiltered.filter(c => c.sttCblBord === 'T').reduce((s, c) => s + c.lngTotal, 0);
    const raf = lngTotal - lngTiree;
    const avancement = lngTotal ? (lngTiree / lngTotal) * 100 : 0;
    const tires = fnFiltered.filter(c => c.sttCblBord === 'T').length;
    return { total, lngTotal, lngTiree, raf, avancement, tires };
  }, [fnFiltered]);

  // Daily tire data (using TOT_LNG_TIREE grouped by DATE_TIRAGE_CBL)
  const dailyData = useMemo(() => {
    const byDay: Record<string, number> = {};
    fnFiltered.forEach(c => {
      if (c.sttCblBord !== 'T' || !c.dateTirageCbl) return;
      byDay[c.dateTirageCbl] = (byDay[c.dateTirageCbl] || 0) + c.lngTotal;
    });
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value: Math.round(value) }));
  }, [fnFiltered]);

  // Total project target & last deadline (using dateTirPlusTard for ALL cables, not just filtered)
  const projectTarget = useMemo(() => {
    const lngTotal = filteredAll.reduce((s, c) => s + c.lngTotal, 0);
    const deadlines = filteredAll
      .map(c => c.dateTirPlusTard)
      .filter((d): d is string => !!d)
      .sort((a, b) => a.localeCompare(b));
    const lastDeadline = deadlines.length > 0 ? deadlines[deadlines.length - 1] : null;
    return { lngTotal: Math.round(lngTotal), lastDeadline };
  }, [filteredAll]);

  // Cumulative curve: réalisé stops at last tirage, objectif goes to lastDeadline
  const cumulativeData = useMemo(() => {
    if (dailyData.length === 0) return [];

    const firstDate = dailyData[0].date;
    const lastTirageDate = dailyData[dailyData.length - 1].date;
    const lastDeadline = projectTarget.lastDeadline;
    const endDate = lastDeadline && lastDeadline > lastTirageDate ? lastDeadline : lastTirageDate;

    const startTs = new Date(firstDate).getTime();
    const endTs = new Date(endDate).getTime();
    const totalDays = Math.max(1, (endTs - startTs) / 86400000);

    // Build réalisé cumulé map
    let cumul = 0;
    const cumulMap = new Map<string, number>();
    dailyData.forEach(d => {
      cumul += d.value;
      cumulMap.set(d.date, cumul);
    });

    // Collect all unique dates and generate daily ticks for linear axis
    const allDates = new Set<string>();
    // Add all tirage dates
    dailyData.forEach(d => allDates.add(d.date));
    // Fill gaps day-by-day from first to end for a truly linear axis
    const dayMs = 86400000;
    for (let ts = startTs; ts <= endTs; ts += dayMs) {
      const d = new Date(ts).toISOString().slice(0, 10);
      allDates.add(d);
    }

    const sortedDates = [...allDates].sort((a, b) => a.localeCompare(b));

    let lastCumul = 0;
    return sortedDates.map(date => {
      const ts = new Date(date).getTime();
      const dayOffset = (ts - startTs) / dayMs;
      const objectif = Math.round((dayOffset / totalDays) * projectTarget.lngTotal);
      const isAfterLastTirage = date > lastTirageDate;

      if (cumulMap.has(date)) lastCumul = cumulMap.get(date)!;

      return {
        date,
        ts,
        cumul: isAfterLastTirage ? (null as number | null) : lastCumul,
        objectif,
      };
    });
  }, [dailyData, projectTarget]);

  // FN advancement data
  const fnData = useMemo(() => {
    const byFn: Record<string, { total: number; tiree: number }> = {};
    fnFiltered.forEach(c => {
      if (!c.fn) return;
      if (!byFn[c.fn]) byFn[c.fn] = { total: 0, tiree: 0 };
      byFn[c.fn].total += c.lngTotal;
      if (c.sttCblBord === 'T') byFn[c.fn].tiree += c.lngTotal;
    });
    return Object.entries(byFn)
      .map(([fn, v]) => ({ fn, total: Math.round(v.total), tiree: Math.round(v.tiree), pct: v.total ? (v.tiree / v.total) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [fnFiltered]);

  // FN detail for selected dates
  const fnDetailData = useMemo(() => {
    let data = fnFiltered;
    if (selectedDates.size > 0) {
      data = data.filter(c => c.dateTirageCbl && selectedDates.has(c.dateTirageCbl));
    }
    const byFn: Record<string, number> = {};
    data.forEach(c => {
      if (!c.fn || c.sttCblBord !== 'T') return;
      byFn[c.fn] = (byFn[c.fn] || 0) + c.lngTotal;
    });
    return Object.entries(byFn)
      .map(([fn, value]) => ({ fn, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [fnFiltered, selectedDates]);

  const toggleFn = (fn: string) => {
    setSelectedFns(prev => {
      const n = new Set(prev);
      n.has(fn) ? n.delete(fn) : n.add(fn);
      return n;
    });
  };

  const toggleDate = (date: string) => {
    setSelectedDates(prev => {
      const n = new Set(prev);
      n.has(date) ? n.delete(date) : n.add(date);
      return n;
    });
  };

  const resetAll = () => {
    setSelectedFns(new Set());
    setSelectedDates(new Set());
  };

  const formatDateShort = (d: string) => {
    try {
      return format(new Date(d), 'dd/MM', { locale: fr });
    } catch { return d; }
  };

  const tooltipStyle = {
    background: 'hsl(220 30% 12%)',
    border: '1px solid hsl(220 20% 25%)',
    borderRadius: '8px',
    fontSize: 12,
    color: '#fff',
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in overflow-auto" style={{ background: '#0A1628' }}>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { title: 'Nbre Total Câbles', value: kpis.total.toLocaleString('fr-FR'), icon: <Cable className="h-5 w-5" />, color: '#00D4FF' },
          { title: 'Tiré (m)', value: `${Math.round(kpis.lngTiree).toLocaleString('fr-FR')} m`, icon: <CheckCircle className="h-5 w-5" />, color: '#C084FC' },
          { title: 'RAF (m)', value: `${Math.round(kpis.raf).toLocaleString('fr-FR')} m`, icon: <Ruler className="h-5 w-5" />, color: '#C084FC' },
          { title: 'Avancement', value: `${kpis.avancement.toFixed(1)} %`, icon: <TrendingUp className="h-5 w-5" />, color: '#00D4FF' },
          { title: 'Câbles Tirés', value: kpis.tires.toLocaleString('fr-FR'), icon: <CheckCircle className="h-5 w-5" />, color: '#2ECC71' },
        ].map((kpi, i) => (
          <Card key={i} className="border-0 shadow-lg" style={{ background: '#1B2A3E' }}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8899AA' }}>{kpi.title}</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active filters indicator */}
      {(selectedFns.size > 0 || selectedDates.size > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedFns.size > 0 && (
            <Badge className="text-xs" style={{ background: '#1B2A3E', color: '#00D4FF', border: '1px solid #00D4FF40' }}>
              FN: {[...selectedFns].join(', ')}
            </Badge>
          )}
          {selectedDates.size > 0 && (
            <Badge className="text-xs" style={{ background: '#1B2A3E', color: '#F0A500', border: '1px solid #F0A50040' }}>
              Dates: {[...selectedDates].map(formatDateShort).join(', ')}
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={resetAll} className="h-6 text-xs" style={{ color: '#8899AA' }}>
            <RotateCcw className="h-3 w-3 mr-1" />Tout afficher
          </Button>
        </div>
      )}

      {/* Cumulative curve */}
      <Card className="border-0 shadow-lg" style={{ background: '#1B2A3E' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium" style={{ color: '#8899AA' }}>
          Courbe cumulative — Métré filerie tiré vs Objectif ({projectTarget.lngTotal.toLocaleString('fr-FR')} m)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ left: 10, right: 10, bottom: 30 }}>
                <defs>
                  <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00D4AA" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tick={{ fontSize: 9, fill: '#8899AA' }} angle={-45} textAnchor="end" height={50} tickFormatter={(ts: number) => {
                  try { return format(new Date(ts), 'dd/MM/yy', { locale: fr }); } catch { return ''; }
                }} />
                <YAxis tick={{ fontSize: 10, fill: '#8899AA' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} domain={[0, Math.max(projectTarget.lngTotal * 1.05, kpis.lngTiree * 1.05)]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => {
                  if (v === 0 && name === 'cumul') return [null, null];
                  const label = name === 'cumul' ? 'Réalisé cumulé' : 'Objectif linéaire';
                  return [`${v.toLocaleString('fr-FR')} m`, label];
                }} labelFormatter={(ts: number) => `Date: ${format(new Date(ts), 'dd/MM/yyyy', { locale: fr })}`} />
                <ReferenceLine y={projectTarget.lngTotal} stroke="#F0A500" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Objectif: ${projectTarget.lngTotal.toLocaleString('fr-FR')} m`, position: 'right', fill: '#F0A500', fontSize: 10 }} />
                <Area type="monotone" dataKey="objectif" stroke="#F0A500" strokeWidth={1.5} strokeDasharray="4 2" fill="none" dot={false} name="objectif" />
                <Area type="monotone" dataKey="cumul" stroke="#00D4AA" strokeWidth={2} fill="url(#cumulGrad)" dot={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-2 justify-center text-[10px]" style={{ color: '#8899AA' }}>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5" style={{ background: '#00D4AA' }} />Réalisé cumulé</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#F0A500' }} />Objectif linéaire</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#F0A500' }} />Total: {projectTarget.lngTotal.toLocaleString('fr-FR')} m {projectTarget.lastDeadline ? `(échéance: ${formatDateShort(projectTarget.lastDeadline)})` : ''}</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily histogram + FN detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-lg" style={{ background: '#1B2A3E' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium" style={{ color: '#8899AA' }}>Métré tiré par jour (m)</CardTitle>
              {selectedDates.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSelectedDates(new Set())} className="h-6 text-xs" style={{ color: '#F0A500' }}>
                  Réinitialiser dates
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ left: 10, right: 10, bottom: 30 }}
                  onClick={(e) => { if (e?.activeLabel) toggleDate(e.activeLabel); }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#8899AA' }} angle={-45} textAnchor="end" height={50} tickFormatter={formatDateShort} />
                  <YAxis tick={{ fontSize: 10, fill: '#8899AA' }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString('fr-FR')} m`, 'Métré']} labelFormatter={l => `Date: ${l}`} />
                  <Bar dataKey="value" name="Métré tiré">
                    {dailyData.map((entry) => (
                      <Cell key={entry.date} fill={selectedDates.has(entry.date) ? '#F0A500' : '#2ECC71'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg" style={{ background: '#1B2A3E' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: '#8899AA' }}>
              {selectedDates.size > 0 ? `Métré par trigramme — ${[...selectedDates].map(formatDateShort).join(', ')}` : 'Métré total par trigramme'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fnDetailData} margin={{ left: 10, right: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                  <XAxis dataKey="fn" tick={{ fontSize: 10, fill: '#8899AA' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8899AA' }} tickFormatter={v => `${v}m`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString('fr-FR')} m`, 'Métré']} />
                  <Bar dataKey="value" name="Métré tiré">
                    {fnDetailData.map((entry) => (
                      <Cell key={entry.fn} fill={getFnColor(entry.fn)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* FN legend */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {fnDetailData.map(d => (
                <span key={d.fn} className="flex items-center gap-1 text-[10px]" style={{ color: '#8899AA' }}>
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: getFnColor(d.fn) }} />
                  {d.fn}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Horizontal bar: Avancement par FN */}
      <Card className="border-0 shadow-lg" style={{ background: '#1B2A3E' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium" style={{ color: '#8899AA' }}>
              Avancement par trigramme FN (%) — cliquez pour filtrer
            </CardTitle>
            {selectedFns.size > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedFns(new Set())} className="h-6 text-xs" style={{ color: '#00D4FF' }}>
                Tout afficher
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fnData} layout="vertical" margin={{ left: 40, right: 50, top: 5, bottom: 5 }}
                onClick={(e) => { if (e?.activeLabel) toggleFn(e.activeLabel); }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#8899AA' }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="fn" tick={{ fontSize: 11, fill: '#fff', fontWeight: 600 }} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string, props: any) => [
                  `${v.toFixed(1)}% (${props.payload.tiree.toLocaleString('fr-FR')} / ${props.payload.total.toLocaleString('fr-FR')} m)`,
                  'Avancement'
                ]} />
                <Bar dataKey="pct" name="Avancement %" radius={[0, 4, 4, 0]} background={{ fill: '#0D1B2A', radius: 4 }}>
                  {fnData.map((entry) => (
                    <Cell
                      key={entry.fn}
                      fill={getBarColor(entry.pct)}
                      stroke={selectedFns.has(entry.fn) ? '#fff' : 'transparent'}
                      strokeWidth={selectedFns.has(entry.fn) ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Color legend */}
          <div className="flex gap-4 mt-2 justify-center text-[10px]" style={{ color: '#8899AA' }}>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#2ECC71' }} />≥ 15%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#F39C12' }} />5–15%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#E74C3C' }} />&lt; 5%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
