import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RotateCcw, CheckCircle2, Circle, Package, PackageCheck, PackageMinus, PackageOpen, Percent } from 'lucide-react';
import type { AppareilData } from '@/lib/appareils-parser';

const FN_OPTIONS = ['DES', 'DHA', 'ECD', 'ELP', 'ORD', 'RDI'];
const ECR_LABEL = 'ECR';

interface Filters {
  fnFilter: string[];
  ecrOnly: boolean;
  selectedFns: string[];
  selectedLots: string[];
  selectedMonths: string[];
}

export function PoseAppareillage({ allData }: { allData: AppareilData[] }) {
  const [filters, setFilters] = useState<Filters>({
    fnFilter: [],
    ecrOnly: false,
    selectedFns: [],
    selectedLots: [],
    selectedMonths: [],
  });

  const hasActiveFilters = filters.fnFilter.length > 0 || filters.ecrOnly || filters.selectedFns.length > 0 || filters.selectedLots.length > 0 || filters.selectedMonths.length > 0;

  const resetFilters = useCallback(() => {
    setFilters({ fnFilter: [], ecrOnly: false, selectedFns: [], selectedLots: [], selectedMonths: [] });
  }, []);

  const toggleFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const toggleEcr = useCallback(() => {
    setFilters(prev => ({ ...prev, ecrOnly: !prev.ecrOnly }));
  }, []);

  // Base data: RESP_POSE = GEST (already filtered at load) + FN/ECR user filter
  const baseData = useMemo(() => {
    let d = allData;
    const hasFn = filters.fnFilter.length > 0;
    const hasEcr = filters.ecrOnly;
    if (hasFn || hasEcr) {
      d = d.filter(a => {
        const matchFn = hasFn && filters.fnFilter.includes(a.fn);
        const matchEcr = hasEcr && a.libLocal.toUpperCase() === 'ECR';
        if (hasFn && hasEcr) return matchFn || matchEcr;
        if (hasFn) return matchFn;
        return matchEcr;
      });
    }
    return d;
  }, [allData, filters.fnFilter, filters.ecrOnly]);

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

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredData.length;
    const poses = filteredData.filter(a => a.indPose === 'O').length;
    const reste = total - poses;
    const pretNonPose = filteredData.filter(a => a.indPretAPoser === 'O' && a.indPose !== 'O').length;
    const pct = total > 0 ? ((poses / total) * 100).toFixed(1) : '0';
    return { total, poses, reste, pretNonPose, pct };
  }, [filteredData]);

  // Chart 1: by FN
  const chartByFn = useMemo(() => {
    const map: Record<string, { fn: string; pose: number; nonPose: number }> = {};
    baseData.forEach(a => {
      if (filters.selectedLots.length > 0 && !filters.selectedLots.includes(a.lotMtgApp)) return;
      if (filters.selectedMonths.length > 0) {
        const date = a.dateContrainte || a.dateFinOd;
        if (!date) return;
        if (!filters.selectedMonths.includes(date.substring(0, 7))) return;
      }
      if (!map[a.fn]) map[a.fn] = { fn: a.fn, pose: 0, nonPose: 0 };
      if (a.indPose === 'O') map[a.fn].pose++;
      else map[a.fn].nonPose++;
    });
    return Object.values(map).sort((a, b) => (b.pose + b.nonPose) - (a.pose + a.nonPose));
  }, [baseData, filters.selectedLots, filters.selectedMonths]);

  // Chart 2: by LOT
  const chartByLot = useMemo(() => {
    const map: Record<string, { lot: string; pose: number; nonPose: number }> = {};
    baseData.forEach(a => {
      if (filters.selectedFns.length > 0 && !filters.selectedFns.includes(a.fn)) return;
      if (filters.selectedMonths.length > 0) {
        const date = a.dateContrainte || a.dateFinOd;
        if (!date) return;
        if (!filters.selectedMonths.includes(date.substring(0, 7))) return;
      }
      const lot = a.lotMtgApp || 'N/A';
      if (!map[lot]) map[lot] = { lot, pose: 0, nonPose: 0 };
      if (a.indPose === 'O') map[lot].pose++;
      else map[lot].nonPose++;
    });
    return Object.values(map).sort((a, b) => (b.pose + b.nonPose) - (a.pose + a.nonPose));
  }, [baseData, filters.selectedFns, filters.selectedMonths]);

  // Chart 3: by month (non posé only) using DATE_CONTRAINTE
  const chartByMonth = useMemo(() => {
    const map: Record<string, { month: string; count: number }> = {};
    baseData.forEach(a => {
      if (a.indPose === 'O') return;
      if (filters.selectedFns.length > 0 && !filters.selectedFns.includes(a.fn)) return;
      if (filters.selectedLots.length > 0 && !filters.selectedLots.includes(a.lotMtgApp)) return;
      const date = a.dateContrainte || a.dateFinOd;
      if (!date) return;
      const m = date.substring(0, 7);
      if (!map[m]) map[m] = { month: m, count: 0 };
      map[m].count++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [baseData, filters.selectedFns, filters.selectedLots]);

  const fnBarHeight = Math.max(chartByFn.length * 28, 100);
  const lotBarHeight = Math.max(chartByLot.length * 28, 100);

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 gap-2">
      {/* Row 0: FN filter badges + Reset */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Trigramme :</span>
        {FN_OPTIONS.map(fn => (
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

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0">
        <KpiCard title="Total à poser" value={kpis.total} icon={<Package className="h-5 w-5" />} />
        <KpiCard title="Posés" value={kpis.poses} icon={<PackageCheck className="h-5 w-5" />} className="border-l-2 border-l-success" />
        <KpiCard title="Reste à poser" value={kpis.reste} icon={<PackageMinus className="h-5 w-5" />} className="border-l-2 border-l-destructive" />
        <KpiCard title="Prêt à poser" value={kpis.pretNonPose} icon={<PackageOpen className="h-5 w-5" />} className="border-l-2 border-l-warning" />
        <KpiCard title="% Posés" value={`${kpis.pct}%`} icon={<Percent className="h-5 w-5" />} className="border-l-2 border-l-primary" />
      </div>

      {/* Row 2: Charts — takes remaining space minus table */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr] gap-2">
        {/* Left column: FN + LOT stacked */}
        <div className="flex flex-col gap-2 min-h-0">
          {/* Chart FN */}
          <Card className="glass-card flex-1 flex flex-col min-h-0">
            <CardHeader className="py-1.5 px-3 shrink-0">
              <CardTitle className="text-xs">Avancement par trigramme</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-1">
              <div style={{ height: fnBarHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartByFn} layout="vertical" margin={{ top: 2, right: 10, left: 35, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="fn" tick={{ fontSize: 10 }} width={35} />
                    <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
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

          {/* Chart LOT */}
          <Card className="glass-card flex-1 flex flex-col min-h-0">
            <CardHeader className="py-1.5 px-3 shrink-0">
              <CardTitle className="text-xs">Avancement par lot</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-1">
              <div style={{ height: lotBarHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartByLot} layout="vertical" margin={{ top: 2, right: 10, left: 35, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="lot" tick={{ fontSize: 9 }} width={35} />
                    <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
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

        {/* Center column: removed, LOT is now in left stack */}

        {/* Right column: Monthly histogram */}
        <Card className="glass-card flex flex-col min-h-0 lg:col-span-1">
          <CardHeader className="py-1.5 px-3 shrink-0">
            <CardTitle className="text-xs">À poser par mois (DATE_CONTRAINTE)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="count" name="À poser" cursor="pointer"
                  onClick={(d: any) => d && toggleFilter('selectedMonths', d.month)}>
                  {chartByMonth.map((e, i) => (
                    <Cell key={i} fill={filters.selectedMonths.includes(e.month) ? 'hsl(217, 91%, 65%)' : 'hsl(217, 91%, 50%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Table — max 25% height */}
      <Card className="glass-card flex flex-col shrink-0" style={{ maxHeight: '25vh' }}>
        <CardHeader className="py-1.5 px-3 shrink-0">
          <CardTitle className="text-xs">Détail appareils ({filteredData.length})</CardTitle>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
