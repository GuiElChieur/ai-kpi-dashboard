import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LabelList } from 'recharts';
import { RotateCcw, CheckCircle2, Circle, Package, PackageCheck, PackageMinus, Percent, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EquipementItem } from '@/hooks/use-equipement-data';

interface Filters {
  fnFilter: string[];
  selectedFns: string[];
  selectedLots: string[];
  selectedMonths: string[];
}

export function PoseEquipement({ allData }: { allData: EquipementItem[] }) {
  const [filters, setFilters] = useState<Filters>({
    fnFilter: [],
    selectedFns: [],
    selectedLots: [],
    selectedMonths: [],
  });

  // Derive available FN values from data
  const availableFns = useMemo(() => {
    const fns = new Set<string>();
    allData.forEach(a => { if (a.fn) fns.add(a.fn); });
    return Array.from(fns).sort();
  }, [allData]);

  const hasActiveFilters = filters.fnFilter.length > 0 || filters.selectedFns.length > 0 || filters.selectedLots.length > 0 || filters.selectedMonths.length > 0;

  const resetFilters = useCallback(() => {
    setFilters({ fnFilter: [], selectedFns: [], selectedLots: [], selectedMonths: [] });
  }, []);

  const toggleFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }, []);

  // Base data with FN user filter
  const baseData = useMemo(() => {
    if (filters.fnFilter.length === 0) return allData;
    return allData.filter(a => filters.fnFilter.includes(a.fn));
  }, [allData, filters.fnFilter]);

  // Cross-filtered data
  const filteredData = useMemo(() => {
    let d = baseData;
    if (filters.selectedFns.length > 0) d = d.filter(a => filters.selectedFns.includes(a.fn));
    if (filters.selectedLots.length > 0) d = d.filter(a => filters.selectedLots.includes(a.lotMtgApp));
    if (filters.selectedMonths.length > 0) d = d.filter(a => {
      const date = a.dateContrainte || a.dateFinOd;
      if (!date) return false;
      return filters.selectedMonths.includes(date.substring(0, 7));
    });
    return d;
  }, [baseData, filters.selectedFns, filters.selectedLots, filters.selectedMonths]);

  // KPIs — no "Prêt à poser"
  const kpis = useMemo(() => {
    const total = filteredData.length;
    const poses = filteredData.filter(a => a.indPose === 'O').length;
    const reste = total - poses;
    const pct = total > 0 ? ((poses / total) * 100).toFixed(1) : '0';
    return { total, poses, reste, pct };
  }, [filteredData]);

  // Chart by FN
  const chartByFn = useMemo(() => {
    const map: Record<string, { fn: string; pose: number; nonPose: number }> = {};
    baseData.forEach(a => {
      if (filters.selectedLots.length > 0 && !filters.selectedLots.includes(a.lotMtgApp)) return;
      if (filters.selectedMonths.length > 0) {
        const date = a.dateContrainte || a.dateFinOd;
        if (!date || !filters.selectedMonths.includes(date.substring(0, 7))) return;
      }
      if (!map[a.fn]) map[a.fn] = { fn: a.fn, pose: 0, nonPose: 0 };
      if (a.indPose === 'O') map[a.fn].pose++;
      else map[a.fn].nonPose++;
    });
    return Object.values(map).sort((a, b) => (b.pose + b.nonPose) - (a.pose + a.nonPose));
  }, [baseData, filters.selectedLots, filters.selectedMonths]);

  // Chart by LOT
  const chartByLot = useMemo(() => {
    const map: Record<string, { lot: string; pose: number; nonPose: number }> = {};
    baseData.forEach(a => {
      if (filters.selectedFns.length > 0 && !filters.selectedFns.includes(a.fn)) return;
      if (filters.selectedMonths.length > 0) {
        const date = a.dateContrainte || a.dateFinOd;
        if (!date || !filters.selectedMonths.includes(date.substring(0, 7))) return;
      }
      const lot = a.lotMtgApp || 'N/A';
      if (!map[lot]) map[lot] = { lot, pose: 0, nonPose: 0 };
      if (a.indPose === 'O') map[lot].pose++;
      else map[lot].nonPose++;
    });
    return Object.values(map).sort((a, b) => (b.pose + b.nonPose) - (a.pose + a.nonPose));
  }, [baseData, filters.selectedFns, filters.selectedMonths]);

  const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Chart by month
  const chartByMonth = useMemo(() => {
    const map: Record<string, { monthKey: string; pose: number; reste: number }> = {};
    baseData.forEach(a => {
      if (filters.selectedFns.length > 0 && !filters.selectedFns.includes(a.fn)) return;
      if (filters.selectedLots.length > 0 && !filters.selectedLots.includes(a.lotMtgApp)) return;
      const date = a.dateContrainte || a.dateFinOd;
      if (!date) return;
      const m = date.substring(0, 7);
      if (!map[m]) map[m] = { monthKey: m, pose: 0, reste: 0 };
      if (a.indPose === 'O') map[m].pose++;
      else map[m].reste++;
    });
    const sorted = Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const years = new Set(sorted.map(d => d.monthKey.substring(0, 4)));
    const multiYear = years.size > 1;
    return sorted.map(d => {
      const [y, mStr] = d.monthKey.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      const label = multiYear ? `${MONTH_NAMES_FR[mIdx]} ${y}` : MONTH_NAMES_FR[mIdx];
      return { ...d, month: label, total: d.pose + d.reste };
    });
  }, [baseData, filters.selectedFns, filters.selectedLots]);

  const fnBarHeight = Math.max(chartByFn.length * 28, 100);
  const lotBarHeight = Math.max(chartByLot.length * 28, 100);

  const tooltipStyle = {
    fontSize: 11,
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 gap-2">
      {/* Trigramme filter badges */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Trigramme :</span>
        {availableFns.map(fn => (
          <Badge
            key={fn}
            variant={filters.fnFilter.includes(fn) ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => toggleFilter('fnFilter', fn)}
          >
            {fn}
          </Badge>
        ))}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-xs gap-1 ml-auto">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        )}
      </div>

      {/* KPIs — 4 cards, no "Prêt à poser" */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 [&>div]:h-full shrink-0">
        <KpiCard title="Total à poser" value={kpis.total} icon={<Package className="h-5 w-5" />} />
        <KpiCard title="Posés" value={kpis.poses} icon={<PackageCheck className="h-5 w-5" />} className="border-l-2 border-l-success" />
        <KpiCard title="Reste à poser" value={kpis.reste} icon={<PackageMinus className="h-5 w-5" />} className="border-l-2 border-l-destructive" />
        <KpiCard title="% Posés" value={`${kpis.pct}%`} icon={<Percent className="h-5 w-5" />} className="border-l-2 border-l-primary" />
      </div>

      {/* Charts */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
        {/* Left: FN + LOT */}
        <div className="flex flex-col gap-2 min-h-0">
          <Card className="glass-card flex-1 flex flex-col min-h-0">
            <CardHeader className="py-1.5 px-3 shrink-0">
              <CardTitle className="text-xs">Avancement par trigramme (FN)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-1">
              <div style={{ height: fnBarHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartByFn} layout="vertical" margin={{ top: 2, right: 10, left: 35, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="fn" tick={{ fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="pose" stackId="a" name="Posé" cursor="pointer"
                      onClick={(d: any) => d && toggleFilter('selectedFns', d.fn)}>
                      {chartByFn.map((e, i) => (
                        <Cell key={i} fill={filters.selectedFns.includes(e.fn) ? 'hsl(142, 76%, 50%)' : 'hsl(142, 76%, 36%)'} />
                      ))}
                    </Bar>
                    <Bar dataKey="nonPose" stackId="a" name="Non posé" cursor="pointer"
                      onClick={(d: any) => d && toggleFilter('selectedFns', d.fn)}>
                      {chartByFn.map((e, i) => (
                        <Cell key={i} fill={filters.selectedFns.includes(e.fn) ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 50%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card flex-1 flex flex-col min-h-0">
            <CardHeader className="py-1.5 px-3 shrink-0">
              <CardTitle className="text-xs">Avancement par lot (LOT_MTG_APP)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-1">
              <div style={{ height: lotBarHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartByLot} layout="vertical" margin={{ top: 2, right: 10, left: 35, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="lot" tick={{ fontSize: 9 }} width={35} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="pose" stackId="a" name="Posé" cursor="pointer"
                      onClick={(d: any) => d && toggleFilter('selectedLots', d.lot)}>
                      {chartByLot.map((e, i) => (
                        <Cell key={i} fill={filters.selectedLots.includes(e.lot) ? 'hsl(142, 76%, 50%)' : 'hsl(142, 76%, 36%)'} />
                      ))}
                    </Bar>
                    <Bar dataKey="nonPose" stackId="a" name="Non posé" cursor="pointer"
                      onClick={(d: any) => d && toggleFilter('selectedLots', d.lot)}>
                      {chartByLot.map((e, i) => (
                        <Cell key={i} fill={filters.selectedLots.includes(e.lot) ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 50%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Monthly chart */}
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="py-1.5 px-3 shrink-0">
            <CardTitle className="text-xs">À poser par mois (DATE_CONTRAINTE)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByMonth} margin={{ top: 10, right: 8, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-40} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const pose = payload.find(p => p.dataKey === 'pose')?.value as number || 0;
                    const reste = payload.find(p => p.dataKey === 'reste')?.value as number || 0;
                    return (
                      <div className="rounded-md border border-border/50 bg-card px-3 py-2 text-xs shadow-xl">
                        <p className="font-semibold text-foreground mb-1">{label}</p>
                        <p className="text-foreground">Total : <span className="font-mono font-bold">{pose + reste}</span></p>
                        <p className="text-success">Posé : <span className="font-mono font-bold">{pose}</span></p>
                        <p className="text-destructive">Reste : <span className="font-mono font-bold">{reste}</span></p>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={20} iconSize={10} wrapperStyle={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }} />
                <Bar dataKey="pose" stackId="monthly" name="Posé" fill="hsl(var(--success))" cursor="pointer" animationDuration={800}
                  onClick={(d: any) => d && toggleFilter('selectedMonths', d.monthKey)}>
                  {chartByMonth.map((e, i) => (
                    <Cell key={i} fill={filters.selectedMonths.includes(e.monthKey) ? 'hsl(142, 76%, 55%)' : 'hsl(var(--success))'} />
                  ))}
                  <LabelList dataKey="pose" position="center" style={{ fontSize: 8, fill: 'hsl(var(--success-foreground))' }} formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
                <Bar dataKey="reste" stackId="monthly" name="Reste à poser" fill="hsl(var(--destructive))" cursor="pointer" animationDuration={800}
                  onClick={(d: any) => d && toggleFilter('selectedMonths', d.monthKey)}>
                  {chartByMonth.map((e, i) => (
                    <Cell key={i} fill={filters.selectedMonths.includes(e.monthKey) ? 'hsl(0, 84%, 65%)' : 'hsl(var(--destructive))'} />
                  ))}
                  <LabelList dataKey="reste" position="center" style={{ fontSize: 8, fill: 'hsl(var(--destructive-foreground))' }} formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="glass-card flex flex-col shrink-0" style={{ maxHeight: '25vh' }}>
        <CardHeader className="py-1.5 px-3 shrink-0">
          <CardTitle className="text-xs">Détail équipements ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] px-2 py-1">LOT</TableHead>
                <TableHead className="text-[10px] px-2 py-1">LOCAL</TableHead>
                <TableHead className="text-[10px] px-2 py-1">LIB_LOCAL</TableHead>
                <TableHead className="text-[10px] px-2 py-1">FN</TableHead>
                <TableHead className="text-[10px] px-2 py-1">APP</TableHead>
                <TableHead className="text-[10px] px-2 py-1">T_APP</TableHead>
                <TableHead className="text-[10px] px-2 py-1">LIB_DESIGN</TableHead>
                <TableHead className="text-[10px] px-2 py-1">RESP PRÊT</TableHead>
                <TableHead className="text-[10px] px-2 py-1 text-center">PRÊT</TableHead>
                <TableHead className="text-[10px] px-2 py-1">RESP POSE</TableHead>
                <TableHead className="text-[10px] px-2 py-1 text-center">POSÉ</TableHead>
                <TableHead className="text-[10px] px-2 py-1">DATE CONTRAINTE</TableHead>
                <TableHead className="text-[10px] px-2 py-1">REPERE_APP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((a, i) => (
                <TableRow key={i} className="text-[10px]">
                  <TableCell className="px-2 py-0.5">{a.lotMtgApp}</TableCell>
                  <TableCell className="px-2 py-0.5">{a.local}</TableCell>
                  <TableCell className="px-2 py-0.5 max-w-[120px] truncate">{a.libLocal}</TableCell>
                  <TableCell className="px-2 py-0.5">{a.fn}</TableCell>
                  <TableCell className="px-2 py-0.5">{a.app}</TableCell>
                  <TableCell className="px-2 py-0.5">{a.tApp}</TableCell>
                  <TableCell className="px-2 py-0.5 max-w-[150px] truncate">{a.libDesign}</TableCell>
                  <TableCell className="px-2 py-0.5">{a.respPretAPoser}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">
                    {a.indPretAPoser === 'O'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success inline-block" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground inline-block" />}
                  </TableCell>
                  <TableCell className="px-2 py-0.5">{a.respPose}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">
                    {a.indPose === 'O'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success inline-block" />
                      : <Circle className="h-3.5 w-3.5 text-destructive inline-block" />}
                  </TableCell>
                  <TableCell className="px-2 py-0.5">{a.dateContrainte ?? a.dateFinOd ?? ''}</TableCell>
                  <TableCell className="px-2 py-0.5">{a.repereApp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
