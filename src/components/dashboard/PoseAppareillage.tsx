import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PbiKpiCard } from '@/components/dashboard/PbiKpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RotateCcw, CheckCircle2, Circle } from 'lucide-react';
import type { AppareilData } from '@/lib/appareils-parser';

const FN_OPTIONS = ['DES', 'DHA', 'ECD', 'ELP', 'ORD', 'RDI'];

interface Filters {
  fnFilter: string[];
  selectedFns: string[];
  selectedLots: string[];
  selectedMonths: string[];
}

export function PoseAppareillage({ allData }: { allData: AppareilData[] }) {
  const [filters, setFilters] = useState<Filters>({
    fnFilter: [],
    selectedFns: [],
    selectedLots: [],
    selectedMonths: [],
  });

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

  // Base data: RESP_POSE = GEST (already filtered at load) + FN user filter
  const baseData = useMemo(() => {
    let d = allData;
    if (filters.fnFilter.length > 0) d = d.filter(a => filters.fnFilter.includes(a.fn));
    return d;
  }, [allData, filters.fnFilter]);

  // Cross-filtered data
  const filteredData = useMemo(() => {
    let d = baseData;
    if (filters.selectedFns.length > 0) d = d.filter(a => filters.selectedFns.includes(a.fn));
    if (filters.selectedLots.length > 0) d = d.filter(a => filters.selectedLots.includes(a.lotMtgApp));
    if (filters.selectedMonths.length > 0) d = d.filter(a => {
      if (!a.dateFinOd) return false;
      const m = a.dateFinOd.substring(0, 7);
      return filters.selectedMonths.includes(m);
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
      // Apply lot + month filters for cross-filter
      if (filters.selectedLots.length > 0 && !filters.selectedLots.includes(a.lotMtgApp)) return;
      if (filters.selectedMonths.length > 0) {
        if (!a.dateFinOd) return;
        if (!filters.selectedMonths.includes(a.dateFinOd.substring(0, 7))) return;
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
        if (!a.dateFinOd) return;
        if (!filters.selectedMonths.includes(a.dateFinOd.substring(0, 7))) return;
      }
      const lot = a.lotMtgApp || 'N/A';
      if (!map[lot]) map[lot] = { lot, pose: 0, nonPose: 0 };
      if (a.indPose === 'O') map[lot].pose++;
      else map[lot].nonPose++;
    });
    return Object.values(map).sort((a, b) => (b.pose + b.nonPose) - (a.pose + a.nonPose));
  }, [baseData, filters.selectedFns, filters.selectedMonths]);

  // Chart 3: by month (non posé only)
  const chartByMonth = useMemo(() => {
    const map: Record<string, { month: string; count: number }> = {};
    baseData.forEach(a => {
      if (a.indPose === 'O') return;
      if (filters.selectedFns.length > 0 && !filters.selectedFns.includes(a.fn)) return;
      if (filters.selectedLots.length > 0 && !filters.selectedLots.includes(a.lotMtgApp)) return;
      if (!a.dateFinOd) return;
      const m = a.dateFinOd.substring(0, 7);
      if (!map[m]) map[m] = { month: m, count: 0 };
      map[m].count++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [baseData, filters.selectedFns, filters.selectedLots]);

  return (
    <div className="flex flex-col h-full gap-2 p-3 overflow-hidden">
      {/* Top: FN Filter + Reset */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0">
        <PbiKpiCard label="Total à poser" value={kpis.total} color="info" small />
        <PbiKpiCard label="Posés" value={kpis.poses} color="success" small />
        <PbiKpiCard label="Reste à poser" value={kpis.reste} color="destructive" small />
        <PbiKpiCard label="Prêt à poser" value={kpis.pretNonPose} color="warning" small />
        <PbiKpiCard label="% Posés" value={`${kpis.pct}%`} color="primary" small />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 shrink-0" style={{ height: '220px' }}>
        {/* Chart 1: By FN (horizontal) */}
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="py-1.5 px-3 shrink-0">
            <CardTitle className="text-xs">Avancement par trigramme</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByFn} layout="vertical" margin={{ top: 2, right: 10, left: 30, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="fn" tick={{ fontSize: 9 }} width={30} />
                <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
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
          </CardContent>
        </Card>

        {/* Chart 2: By LOT */}
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="py-1.5 px-3 shrink-0">
            <CardTitle className="text-xs">Avancement par lot</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByLot} margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="lot" tick={{ fontSize: 8 }} interval={0} angle={-30} textAnchor="end" height={35} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
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
          </CardContent>
        </Card>

        {/* Chart 3: By month */}
        <Card className="glass-card flex flex-col min-h-0">
          <CardHeader className="py-1.5 px-3 shrink-0">
            <CardTitle className="text-xs">À poser par mois</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByMonth} margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} interval={0} angle={-30} textAnchor="end" height={35} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
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

      {/* Table */}
      <Card className="glass-card flex-1 min-h-0 flex flex-col">
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
                <TableHead className="text-[10px] px-2 py-1">DATE FIN OD</TableHead>
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
                  <TableCell className="px-2 py-0.5">{a.dateFinOd ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
