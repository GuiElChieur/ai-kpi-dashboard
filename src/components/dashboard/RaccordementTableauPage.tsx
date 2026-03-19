import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from 'recharts';
import { RotateCcw, Cable, CheckCircle2, CircleDot, CircleOff, Percent, Search } from 'lucide-react';
import type { CableData } from '@/lib/cable-parser';

const ALLOWED_FNS = ['ESD', 'FBT', 'FDD', 'FDS', 'FDT', 'SNC'];

interface Filters {
  search: string;
  selectedArmoires: string[];
  selectedMonths: string[];
  selectedFns: string[];
  selectedKpi: string | null;
}

const COLORS = {
  raccorde: '#2ECC71',
  raccordable: '#3B82F6',
  nonRaccorde: '#E74C3C',
  tirage: '#F59E0B',
};

const TABLE_COLUMNS = [
  { key: 'fn', label: 'FN' },
  { key: 'lotMtgApo', label: 'LOT_MTG_APO' },
  { key: 'localApo', label: 'LOCAL_APO' },
  { key: 'apo', label: 'APO' },
  { key: 'cblRaccRespO', label: 'CBL_RACC_RESP_O' },
  { key: 'cblRaccordeO', label: 'CBL_RACCORDE_O' },
  { key: 'sttCblBe', label: 'STT_CBL_BE' },
  { key: 'respTirage', label: 'RESP_TIRAGE' },
  { key: 'sttCblBord', label: 'STT_CBL_BORD' },
  { key: 'gam', label: 'GAM' },
  { key: 'cbl', label: 'CBL' },
  { key: 'cblRaccRespA', label: 'CBL_RACC_RESP_A' },
  { key: 'cblRaccordeA', label: 'CBL_RACCORDE_A' },
  { key: 'apa', label: 'APA' },
] as const;

type ColKey = typeof TABLE_COLUMNS[number]['key'];
export function RaccordementTableauPage({ allData }: { allData: CableData[] }) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    selectedArmoires: [],
    selectedMonths: [],
    selectedFns: [],
    selectedKpi: null,
  });

  const [columnFilters, setColumnFilters] = useState<Partial<Record<ColKey, string>>>({});

  const hasActiveFilters = filters.search !== '' || filters.selectedArmoires.length > 0 || filters.selectedMonths.length > 0 || filters.selectedFns.length > 0 || filters.selectedKpi !== null;

  const resetFilters = useCallback(() => {
    setFilters({ search: '', selectedArmoires: [], selectedMonths: [], selectedFns: [], selectedKpi: null });
  }, []);

  const toggleArmoire = useCallback((armoire: string) => {
    setFilters(prev => {
      const arr = prev.selectedArmoires;
      const next = arr.includes(armoire) ? arr.filter(v => v !== armoire) : [...arr, armoire];
      return { ...prev, selectedArmoires: next };
    });
  }, []);

  const toggleMonth = useCallback((month: string) => {
    setFilters(prev => {
      const arr = prev.selectedMonths;
      const next = arr.includes(month) ? arr.filter(v => v !== month) : [...arr, month];
      return { ...prev, selectedMonths: next };
    });
  }, []);

  const toggleKpi = useCallback((kpi: string) => {
    setFilters(prev => ({
      ...prev,
      selectedKpi: prev.selectedKpi === kpi ? null : kpi,
    }));
  }, []);

  const toggleFn = useCallback((fn: string) => {
    setFilters(prev => {
      const arr = prev.selectedFns;
      const next = arr.includes(fn) ? arr.filter(v => v !== fn) : [...arr, fn];
      return { ...prev, selectedFns: next };
    });
  }, []);

  // Base: cables where CBL_RACC_RESP_O="GEST" or CBL_RACC_RESP_A="GEST", FN in allowed list
  const baseData = useMemo(() => {
    const isTB = (v: string) => {
      const u = v.toUpperCase();
      return u.startsWith('Z34-TB') || u.startsWith('TB');
    };
    return allData.filter(c =>
      c.cblRaccRespO === 'GEST' &&
      !isTB(c.apo) && !isTB(c.apa) &&
      ALLOWED_FNS.includes(c.fn.toUpperCase())
    );
  }, [allData]);

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!filters.search) return baseData;
    const q = filters.search.toUpperCase();
    return baseData.filter(c =>
      c.apo.toUpperCase().includes(q) ||
      c.apa.toUpperCase().includes(q) ||
      c.cbl.toUpperCase().includes(q) ||
      c.fn.toUpperCase().includes(q) ||
      c.lotMtgApo.toUpperCase().includes(q)
    );
  }, [baseData, filters.search]);

  // Helper: is raccordé
  const isRaccorde = (c: CableData) => c.cblRaccordeO === 'O' || c.cblRaccordeA === 'O';
  const isRaccordable = (c: CableData) => !isRaccorde(c) && c.sttCblBord === 'T';
  const isNonRaccorde = (c: CableData) => !isRaccorde(c) && c.sttCblBord !== 'T';

  // Apply KPI filter
  const kpiFiltered = useMemo(() => {
    if (!filters.selectedKpi) return searchFiltered;
    switch (filters.selectedKpi) {
      case 'raccorde': return searchFiltered.filter(isRaccorde);
      case 'raccordable': return searchFiltered.filter(isRaccordable);
      case 'non-raccorde': return searchFiltered.filter(isNonRaccorde);
      default: return searchFiltered;
    }
  }, [searchFiltered, filters.selectedKpi]);

  // Cross-filtered data
  const filteredData = useMemo(() => {
    let d = kpiFiltered;
    if (filters.selectedFns.length > 0) {
      d = d.filter(c => filters.selectedFns.includes(c.fn.toUpperCase()));
    }
    if (filters.selectedArmoires.length > 0) {
      d = d.filter(c => filters.selectedArmoires.includes(c.apo || c.apa));
    }
    if (filters.selectedMonths.length > 0) {
      d = d.filter(c => {
        const date = c.dateTirPlusTard;
        if (!date) return false;
        return filters.selectedMonths.includes(date.substring(0, 7));
      });
    }
    return d;
  }, [kpiFiltered, filters.selectedFns, filters.selectedArmoires, filters.selectedMonths]);

  // Table data with column filters applied
  const tableData = useMemo(() => {
    const activeColFilters = Object.entries(columnFilters).filter(([, v]) => v && v.length > 0) as [ColKey, string][];
    if (activeColFilters.length === 0) return filteredData;
    return filteredData.filter(c =>
      activeColFilters.every(([key, val]) => {
        const cellVal = (c[key as keyof CableData] ?? '').toString().toUpperCase();
        return cellVal.includes(val!.toUpperCase());
      })
    );
  }, [filteredData, columnFilters]);

  // Data with FN filter applied (for KPIs)
  const fnFiltered = useMemo(() => {
    if (filters.selectedFns.length === 0) return searchFiltered;
    return searchFiltered.filter(c => filters.selectedFns.includes(c.fn.toUpperCase()));
  }, [searchFiltered, filters.selectedFns]);

  // KPIs
  const kpis = useMemo(() => {
    const total = fnFiltered.length;
    const raccorde = fnFiltered.filter(isRaccorde).length;
    const raccordable = fnFiltered.filter(isRaccordable).length;
    const nonRaccorde = fnFiltered.filter(isNonRaccorde).length;
    const pctAvancement = total > 0 ? Math.round((raccorde / total) * 100) : 0;
    return { total, raccorde, raccordable, nonRaccorde, pctAvancement };
  }, [fnFiltered]);

  // RAF Tirage - cables not yet tiré among our scope
  const rafTirage = useMemo(() => {
    const nonTires = searchFiltered.filter(c => c.sttCblBord !== 'T');
    const byResp: Record<string, number> = {};
    nonTires.forEach(c => {
      const resp = c.respTirage || 'N/A';
      byResp[resp] = (byResp[resp] || 0) + 1;
    });
    return {
      total: nonTires.length,
      byResp: Object.entries(byResp).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [searchFiltered]);

  // Armoires data for horizontal bar chart
  const armoiresData = useMemo(() => {
    const map = new Map<string, { total: number; raccorde: number; raccordable: number }>();
    filteredData.forEach(c => {
      const armoire = c.apo || c.apa || 'N/A';
      if (!map.has(armoire)) map.set(armoire, { total: 0, raccorde: 0, raccordable: 0 });
      const entry = map.get(armoire)!;
      entry.total++;
      if (isRaccorde(c)) entry.raccorde++;
      else if (c.sttCblBord === 'T') entry.raccordable++;
    });
    return Array.from(map.entries())
      .map(([armoire, v]) => ({
        armoire,
        total: v.total,
        raccorde: v.raccorde,
        raccordable: v.raccordable,
        reste: v.total - v.raccorde,
        pct: v.total > 0 ? Math.round((v.raccorde / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Monthly histogram based on DATE_TIR_PLUS_TARD
  const monthlyData = useMemo(() => {
    const map = new Map<string, { raccorde: number; reste: number }>();
    filteredData.forEach(c => {
      const date = c.dateTirPlusTard;
      if (!date) return;
      const month = date.substring(0, 7);
      if (!map.has(month)) map.set(month, { raccorde: 0, reste: 0 });
      const entry = map.get(month)!;
      if (isRaccorde(c)) entry.raccorde++;
      else entry.reste++;
    });
    const monthNames: Record<string, string> = {
      '01': 'janvier', '02': 'février', '03': 'mars', '04': 'avril',
      '05': 'mai', '06': 'juin', '07': 'juillet', '08': 'août',
      '09': 'septembre', '10': 'octobre', '11': 'novembre', '12': 'décembre',
    };
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [year, m] = key.split('-');
        return {
          key,
          label: `${monthNames[m] || m} ${year}`,
          raccorde: v.raccorde,
          reste: v.reste,
        };
      });
  }, [filteredData]);

  // Pie data for donut
  const donutData = useMemo(() => [
    { name: 'Raccordé', value: kpis.raccorde, fill: COLORS.raccorde },
    { name: 'Non raccordé', value: kpis.total - kpis.raccorde, fill: COLORS.nonRaccorde },
  ], [kpis]);

  // RAF pie
  const RAF_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  const rafPieData = useMemo(() =>
    rafTirage.byResp.map((d, i) => ({ ...d, fill: RAF_COLORS[i % RAF_COLORS.length] })),
    [rafTirage]
  );

  const barHeight = Math.max(300, armoiresData.length * 28);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 gap-3">
      {/* Top bar: search + filters */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="h-8 w-56 pl-8 text-xs"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1">
            <RotateCcw className="h-3 w-3" /> Réinitialiser
          </Button>
        )}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">FN:</span>
          {ALLOWED_FNS.map(fn => (
            <Badge
              key={fn}
              variant={filters.selectedFns.includes(fn) ? 'default' : 'outline'}
              className="text-[10px] cursor-pointer px-1.5 py-0"
              onClick={() => toggleFn(fn)}
            >
              {fn}
            </Badge>
          ))}
        </div>
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs">{baseData.length} câbles dans le périmètre</Badge>
      </div>

      {/* KPIs row */}
      <div className="grid grid-cols-5 gap-2 shrink-0">
        <div onClick={() => toggleKpi('total')} className="cursor-pointer">
          <KpiCard
            title="Nombre total"
            value={kpis.total}
            icon={<Cable className="h-5 w-5" />}
            className={filters.selectedKpi === 'total' ? 'ring-2 ring-primary' : ''}
          />
        </div>
        <div onClick={() => toggleKpi('raccorde')} className="cursor-pointer">
          <KpiCard
            title="Raccordé"
            value={kpis.raccorde}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className={filters.selectedKpi === 'raccorde' ? 'ring-2 ring-success' : ''}
          />
        </div>
        <div onClick={() => toggleKpi('raccordable')} className="cursor-pointer">
          <KpiCard
            title="Raccordable"
            value={kpis.raccordable}
            icon={<CircleDot className="h-5 w-5" />}
            className={filters.selectedKpi === 'raccordable' ? 'ring-2 ring-info' : ''}
          />
        </div>
        <div onClick={() => toggleKpi('non-raccorde')} className="cursor-pointer">
          <KpiCard
            title="Non raccordé"
            value={kpis.nonRaccorde}
            icon={<CircleOff className="h-5 w-5" />}
            className={filters.selectedKpi === 'non-raccorde' ? 'ring-2 ring-destructive' : ''}
          />
        </div>
        <KpiCard
          title="Avancement"
          value={`${kpis.pctAvancement}%`}
          icon={<Percent className="h-5 w-5" />}
          subtitle={`${kpis.raccorde} / ${kpis.total}`}
        />
      </div>

      {/* Middle section: donut + RAF + horizontal bars + monthly */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left column: donut + RAF tirage */}
        <div className="w-52 flex flex-col gap-3 shrink-0">
          {/* Donut */}
          <Card className="glass-card flex-1">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-xs">A% RACC</CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={35} outerRadius={55}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString('fr-FR')} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="text-center text-xs text-muted-foreground pb-2">
              {kpis.total.toLocaleString('fr-FR')} ({kpis.pctAvancement}%)
            </div>
          </Card>

          {/* RAF Tirage */}
          <Card className="glass-card flex-1">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-xs">RAF Tirage</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {rafTirage.total === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">Tout est tiré</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie
                        data={rafPieData}
                        cx="50%" cy="50%"
                        innerRadius={25} outerRadius={40}
                        dataKey="value"
                        stroke="none"
                      >
                        {rafPieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString('fr-FR')} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 space-y-0.5">
                    {rafTirage.byResp.slice(0, 5).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1 text-[10px]">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RAF_COLORS[i % RAF_COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                        <span className="ml-auto font-mono">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center: horizontal bar chart by armoire */}
        <Card className="glass-card flex-1 min-w-0 flex flex-col">
          <CardHeader className="p-2 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-xs">Câbles par armoire</CardTitle>
            <div className="flex gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.raccorde }} /> Raccordé</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.nonRaccorde }} /> Reste</span>
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 min-h-0 overflow-auto">
            <div style={{ height: barHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={armoiresData} layout="vertical" margin={{ left: 80, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    type="category"
                    dataKey="armoire"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [v.toLocaleString('fr-FR'), name === 'raccorde' ? 'Raccordé' : 'Reste']}
                  />
                  <Bar dataKey="raccorde" stackId="a" fill={COLORS.raccorde} cursor="pointer"
                    onClick={(d: any) => toggleArmoire(d.armoire)}>
                    {armoiresData.map((d, i) => (
                      <Cell key={i} opacity={filters.selectedArmoires.length === 0 || filters.selectedArmoires.includes(d.armoire) ? 1 : 0.3} />
                    ))}
                  </Bar>
                  <Bar dataKey="reste" stackId="a" fill={COLORS.nonRaccorde} cursor="pointer"
                    onClick={(d: any) => toggleArmoire(d.armoire)}>
                    {armoiresData.map((d, i) => (
                      <Cell key={i} opacity={filters.selectedArmoires.length === 0 || filters.selectedArmoires.includes(d.armoire) ? 1 : 0.3} />
                    ))}
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`}
                      style={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right: monthly histogram */}
        <Card className="glass-card w-[380px] shrink-0 flex flex-col">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-xs">Raccordements par mois</CardTitle>
            <div className="flex gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.raccorde }} /> Raccordé</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.nonRaccorde }} /> Reste</span>
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ left: 5, right: 5, top: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, name: string) => [v.toLocaleString('fr-FR'), name === 'raccorde' ? 'Raccordé' : 'Reste']}
                />
                <Bar dataKey="raccorde" stackId="a" fill={COLORS.raccorde} cursor="pointer"
                  onClick={(d: any) => toggleMonth(d.key)}>
                  {monthlyData.map((d, i) => (
                    <Cell key={i} opacity={filters.selectedMonths.length === 0 || filters.selectedMonths.includes(d.key) ? 1 : 0.3} />
                  ))}
                </Bar>
                <Bar dataKey="reste" stackId="a" fill={COLORS.nonRaccorde} cursor="pointer"
                  onClick={(d: any) => toggleMonth(d.key)}>
                  {monthlyData.map((d, i) => (
                    <Cell key={i} opacity={filters.selectedMonths.length === 0 || filters.selectedMonths.includes(d.key) ? 1 : 0.3} />
                  ))}
                  <LabelList dataKey="reste" position="top"
                    style={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card className="glass-card flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
          {/* Column filters */}
          <div className="flex gap-0 border-b border-border overflow-x-auto shrink-0">
            {TABLE_COLUMNS.map(col => (
              <div key={col.key} className="shrink-0" style={{ minWidth: col.key === 'cbl' ? 120 : 90 }}>
                <Input
                  placeholder={col.label}
                  value={columnFilters[col.key] || ''}
                  onChange={e => setColumnFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                  className="h-6 text-[9px] rounded-none border-0 border-r border-border px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ))}
          </div>
          {/* Scrollable table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {TABLE_COLUMNS.map(col => (
                    <TableHead key={col.key} className="text-[10px] px-2 py-1 whitespace-nowrap sticky top-0 bg-card z-10">
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.slice(0, 500).map((c, i) => (
                  <TableRow key={i} className="text-[10px]">
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.fn}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.lotMtgApo}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.localApo}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.apo}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">
                      <span className={c.cblRaccRespO === 'GEST' ? 'text-primary font-medium' : ''}>{c.cblRaccRespO}</span>
                    </TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">
                      <span className={c.cblRaccordeO === 'O' ? 'text-success font-medium' : c.cblRaccordeO === 'N' ? 'text-destructive font-medium' : ''}>
                        {c.cblRaccordeO}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.sttCblBe}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.respTirage}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.sttCblBord}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.gam}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap font-mono text-[9px]">{c.cbl}</TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">
                      <span className={c.cblRaccRespA === 'GEST' ? 'text-primary font-medium' : ''}>{c.cblRaccRespA}</span>
                    </TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">
                      <span className={c.cblRaccordeA === 'O' ? 'text-success font-medium' : c.cblRaccordeA === 'N' ? 'text-destructive font-medium' : ''}>
                        {c.cblRaccordeA}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-0.5 whitespace-nowrap">{c.apa}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-[10px] text-muted-foreground px-2 py-1 border-t border-border shrink-0">
            {tableData.length} ligne{tableData.length > 1 ? 's' : ''}{tableData.length > 500 ? ' (500 affichées)' : ''}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
