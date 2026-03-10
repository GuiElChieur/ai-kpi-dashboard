import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GaugeChart } from './GaugeChart';
import { PbiKpiCard } from './PbiKpiCard';
import type { OTData, OTLigneData, PointageData } from '@/lib/csv-parser';

const FILTER_CATEGORIES = ['APPRO', 'ETUDE', 'GESTI', 'MAIT', 'MONTA', 'MODIF'] as const;

interface OTProgiPageProps {
  otData: OTData[];
  otLigneData: OTLigneData[];
  pointageData: PointageData[];
}

export function OTProgiPage({ otData, otLigneData, pointageData }: OTProgiPageProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedTypeOT, setSelectedTypeOT] = useState<string | null>(null);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  // Get latest snapshot
  const latest = useMemo(() => {
    const latestDate = otData[0]?.dateJour;
    return latestDate ? otData.filter(d => d.dateJour === latestDate) : otData;
  }, [otData]);

  // Filter by nature OT if filters active
  const filtered = useMemo(() => {
    if (activeFilters.length === 0) return latest;
    return latest.filter(d => activeFilters.some(f => d.natureOT?.toUpperCase().includes(f)));
  }, [latest, activeFilters]);

  // Filter OT Ligne data based on nature filters + typeOT selection
  const filteredLigne = useMemo(() => {
    let data = otLigneData;
    
    if (activeFilters.length > 0) {
      const filteredIds = new Set(filtered.map(d => d.numOT));
      data = data.filter(d => filteredIds.has(d.identifiantProjet) || activeFilters.some(f => d.codeLibreTable?.toUpperCase().includes(f)));
    }
    
    if (selectedTypeOT) {
      data = data.filter(d => d.typeOT === selectedTypeOT);
    }

    if (selectedLot) {
      data = data.filter(d => d.lot === selectedLot);
    }
    
    return data;
  }, [otLigneData, filtered, activeFilters, selectedTypeOT, selectedLot]);

  // KPIs - from DATA_OT_LIGNE
  const kpis = useMemo(() => {
    const totalCharge = filteredLigne.reduce((s, d) => s + d.chargePrevisionnelle, 0);
    const totalVBTR = filteredLigne.reduce((s, d) => s + d.vbtr, 0);
    const totalTP = filteredLigne.reduce((s, d) => s + d.tp, 0);
    const totalHeuresPointees = pointageData.reduce((s, d) => s + d.quantite, 0);
    const resultat = totalVBTR - totalTP;

    const avancementBudget = totalCharge > 0 ? (totalTP / totalCharge) * 100 : 0;
    const avancementReel = totalCharge > 0 ? (totalVBTR / totalCharge) * 100 : 0;
    const ecartAvancement = avancementReel - avancementBudget;
    const rendement = totalTP > 0 ? (totalVBTR / totalTP) * 100 : 0;

    return { totalCharge, totalVBTR, totalTP, totalHeuresPointees, resultat, avancementBudget, avancementReel, ecartAvancement, rendement };
  }, [filteredLigne, pointageData]);

  // Bar chart data by type OT from DATA_OT_LIGNE (typeOT field: 10_Phase 1 CDC, 30_Phase 2, 35_Filerie, etc.)
  const chartData = useMemo(() => {
    const byType: Record<string, { charge: number; tp: number; vbtr: number }> = {};
    
    filteredLigne.forEach(d => {
      const type = d.typeOT || 'Non défini';
      if (!byType[type]) byType[type] = { charge: 0, tp: 0, vbtr: 0 };
      byType[type].charge += d.chargePrevisionnelle;
      byType[type].tp += d.tp;
      byType[type].vbtr += d.vbtr;
    });

    return Object.entries(byType)
      .sort((a, b) => b[1].charge - a[1].charge)
      .map(([name, v]) => ({
        name: name.length > 18 ? name.slice(0, 18) + '…' : name,
        fullName: name,
        'Charge prév.': Math.round(v.charge),
        'TP': Math.round(v.tp),
        'VBTR': Math.round(v.vbtr),
      }));
  }, [filteredLigne]);

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.fullName) {
      const clicked = data.activePayload[0].payload.fullName;
      setSelectedTypeOT(prev => prev === clicked ? null : clicked);
    }
  };

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const entry = chartData.find(d => d.name === payload.value);
    const fullName = entry?.fullName || payload.value;
    const isSelected = selectedTypeOT === fullName;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0} y={0} dy={8}
          textAnchor="end"
          fill={isSelected ? 'hsl(200,80%,65%)' : 'hsl(215,15%,60%)'}
          fontSize={9}
          fontWeight={isSelected ? 700 : 400}
          transform="rotate(-45)"
          style={{ cursor: 'pointer', textDecoration: isSelected ? 'underline' : 'none' }}
          onClick={() => setSelectedTypeOT(prev => prev === fullName ? null : fullName)}
        >
          {payload.value}
        </text>
      </g>
    );
  };


  const OT_TABLE_COLUMNS: { key: string; label: string; isNumeric?: boolean; style?: React.CSSProperties }[] = [
    { key: 'typeOT', label: 'Type OT' },
    { key: 'identifiant', label: 'Identifiant du projet' },
    { key: 'qtePrev', label: 'Qté Prévue', isNumeric: true },
    { key: 'qteReal', label: 'Qté Réalisée', isNumeric: true },
    { key: 'typeMO', label: 'Type M-O' },
    { key: 'charge', label: 'Charge prév.', isNumeric: true },
    { key: 'vbtr', label: 'VBTR', isNumeric: true, style: { color: 'hsl(200,80%,55%)' } },
    { key: 'tp', label: 'TP', isNumeric: true },
    { key: 'resultat', label: 'Résultat', isNumeric: true },
  ];

  const tableData = useMemo(() => {
    const byKey: Record<string, { typeOT: string; identifiant: string; qtePrev: number; qteReal: number; typeMO: string; charge: number; vbtr: number; tp: number; resultat: number }> = {};
    filteredLigne.forEach(d => {
      const key = `${d.typeOT}|${d.identifiantProjet}`;
      if (!byKey[key]) byKey[key] = { typeOT: d.typeOT, identifiant: d.identifiantProjet, qtePrev: 0, qteReal: 0, typeMO: d.typeMO, charge: 0, vbtr: 0, tp: 0, resultat: 0 };
      byKey[key].qtePrev += d.qtePrevue;
      byKey[key].qteReal += d.qteRealisee;
      byKey[key].charge += d.chargePrevisionnelle;
      byKey[key].vbtr += d.vbtr;
      byKey[key].tp += d.tp;
    });
    let rows = Object.values(byKey).map(r => ({ ...r, resultat: r.vbtr - r.tp }));
    // Apply column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value.trim()) {
        const s = value.trim().toLowerCase();
        rows = rows.filter(r => {
          const v = (r as any)[key];
          return v != null && String(v).toLowerCase().includes(s);
        });
      }
    });
    return rows
      .sort((a, b) => b.resultat - a.resultat)
      .slice(0, 50);
  }, [filteredLigne, columnFilters]);

  // Lot numbers for grid - from otLigneData (unfiltered by lot)
  const lots = useMemo(() => {
    const lotSet = new Set<string>();
    otLigneData.forEach(d => { if (d.lot && d.lot !== 'x' && d.lot !== 'X') lotSet.add(d.lot); });
    return Array.from(lotSet).sort();
  }, [otLigneData]);

  return (
    <div className="flex-1 space-y-3 p-3 overflow-auto">
      {/* Top row: Gauges + Lot grid */}
      <div className="flex gap-3 items-start">
        {/* Logo area */}
        <div className="pbi-card p-3 flex flex-col items-center justify-center min-w-[120px]">
          <div className="text-xl font-bold text-primary">GESTAL</div>
          <div className="text-[10px] text-muted-foreground mt-1">Affaire 1935</div>
        </div>

        {/* Gauges */}
        <div className="flex gap-2 flex-1 justify-center">
          <div className="pbi-card p-2">
            <GaugeChart value={kpis.avancementBudget} label="Avancement Budget" color={kpis.avancementBudget > 20 ? 'orange' : 'green'} />
          </div>
          <div className="pbi-card p-2">
            <GaugeChart value={kpis.avancementReel} label="Avancement Réel" color={kpis.avancementReel > 15 ? 'orange' : 'green'} />
          </div>
          <div className="pbi-card p-2">
            <GaugeChart value={kpis.ecartAvancement} label="Ecart Avancement" min={-10} max={10} suffix="%" color={kpis.ecartAvancement < 0 ? 'red' : 'green'} />
          </div>
          <div className="pbi-card p-2">
            <GaugeChart value={kpis.rendement} label="Rendement" color={kpis.rendement >= 95 ? 'green' : 'orange'} max={200} />
          </div>
        </div>

        {/* Lot grid - clickable filter */}
        <div className="pbi-card p-2">
          <div className="pbi-section-title mb-1 text-center">Lots</div>
          <div className="grid grid-cols-4 gap-1 max-h-[80px] overflow-auto">
            {lots.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLot(prev => prev === l ? null : l)}
                className={`px-2 py-1 text-[10px] font-mono text-center rounded-sm transition-colors cursor-pointer ${
                  selectedLot === l
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-foreground hover:bg-secondary/80'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle row: KPI cards + Bar chart + Rendement lots */}
      <div className="flex gap-3">
        {/* Left KPI cards */}
        <div className="flex flex-col gap-2 min-w-[160px]">
          <PbiKpiCard label="Heures prévues" value={Math.round(kpis.totalCharge)} color="info" />
          <PbiKpiCard label="Temps passé" value={Math.round(kpis.totalTP)} color="warning" />
          <PbiKpiCard label="Temps produit (VBTR)" value={Math.round(kpis.totalVBTR)} color="success" />
          <PbiKpiCard label="Résultat" value={Math.round(kpis.resultat)} color={kpis.resultat >= 0 ? 'success' : 'destructive'} />
          <PbiKpiCard label="Heures pointées" value={Math.round(kpis.totalHeuresPointees)} color="info" small />

          {/* Filter buttons - Nature OT */}
          <div className="pbi-card p-2">
            <div className="pbi-section-title mb-1">Nature OT</div>
            <div className="grid grid-cols-2 gap-1">
              {FILTER_CATEGORIES.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFilter(f)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-sm transition-colors ${
                    activeFilters.includes(f)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Selected type indicator */}
          {selectedTypeOT && (
            <div className="pbi-card p-2">
              <div className="pbi-section-title mb-1">Filtre actif</div>
              <button
                onClick={() => setSelectedTypeOT(null)}
                className="px-2 py-1 text-[10px] font-semibold rounded-sm bg-primary text-primary-foreground w-full text-left truncate"
                title={selectedTypeOT}
              >
                ✕ {selectedTypeOT}
              </button>
            </div>
          )}
        </div>

        {/* Center bar chart */}
        <div className="pbi-card p-3 flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(200,80%,55%)' }} />
              <span className="text-muted-foreground">Charge prévisionnelle</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(0,72%,55%)' }} />
              <span className="text-muted-foreground">Somme de TP</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(142,71%,50%)' }} />
              <span className="text-muted-foreground">Somme de VBTR</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-primary font-mono text-center mb-2">1935</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ bottom: 60, left: 10, right: 10 }} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,25%)" />
                <XAxis dataKey="name" tick={<CustomXAxisTick />} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215,15%,60%)' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 11, color: 'hsl(210,20%,92%)' }}
                  itemStyle={{ color: 'hsl(210,20%,92%)' }}
                  formatter={(v: number) => v.toLocaleString('fr-FR')}
                />
                <Bar dataKey="Charge prév." fill="hsl(200,80%,55%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="TP" fill="hsl(0,72%,55%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="VBTR" fill="hsl(142,71%,50%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom: Data table */}
      <div className="pbi-card overflow-hidden">
        <div className="overflow-auto max-h-[220px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border/50">
                {OT_TABLE_COLUMNS.map(col => (
                  <th key={col.key} className={`${col.isNumeric ? 'text-right' : 'text-left'} px-3 py-2 font-semibold text-muted-foreground`}>
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                {OT_TABLE_COLUMNS.map(col => (
                  <th key={col.key} className="px-2 py-1">
                    <input
                      type="text"
                      placeholder="🔍"
                      value={columnFilters[col.key] || ''}
                      onChange={e => setColumnFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                      className="w-full bg-secondary/50 text-foreground text-[10px] px-1.5 py-0.5 rounded-sm border border-border/30 focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-secondary/30">
                  {OT_TABLE_COLUMNS.map(col => {
                    const val = (row as any)[col.key];
                    const cellStyle = col.key === 'resultat'
                      ? { color: val >= 0 ? 'hsl(142,71%,50%)' : 'hsl(0,72%,51%)' }
                      : col.style || {};
                    return (
                      <td key={col.key} className={`px-3 py-1.5 ${col.isNumeric ? 'text-right font-mono' : ''} ${col.key === 'identifiant' ? 'font-mono text-[10px]' : ''} ${col.key === 'resultat' ? 'font-semibold' : ''}`} style={cellStyle}>
                        {col.isNumeric ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-semibold">
              <tr>
                <td className="px-3 py-1.5" colSpan={2}>Total</td>
                <td className="px-3 py-1.5 text-right font-mono">{tableData.reduce((s, r) => s + r.qtePrev, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5 text-right font-mono">{tableData.reduce((s, r) => s + r.qteReal, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5"></td>
                <td className="px-3 py-1.5 text-right font-mono">{tableData.reduce((s, r) => s + r.charge, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: 'hsl(200,80%,55%)' }}>{tableData.reduce((s, r) => s + r.vbtr, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5 text-right font-mono">{tableData.reduce((s, r) => s + r.tp, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: tableData.reduce((s, r) => s + r.resultat, 0) >= 0 ? 'hsl(142,71%,50%)' : 'hsl(0,72%,51%)' }}>
                  {tableData.reduce((s, r) => s + r.resultat, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
