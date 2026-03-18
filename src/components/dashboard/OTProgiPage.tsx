import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GaugeChart } from './GaugeChart';
import { PbiKpiCard } from './PbiKpiCard';
import { normalizeText } from '@/lib/text-utils';
import type { OTData, OTLigneData, PointageData } from '@/lib/csv-parser';

const FILTER_CATEGORIES = ['APPRO', 'ETUDE', 'GESTI', 'MAIT', 'MONTA', 'MODIF'] as const;

// These OT types are forced to 100% rendement — excluded from rendement ratio
const FORCED_100_TYPES = ['10_phase 1 cdc', '60_bouchage_surbaux'];
function isForced100(typeOT: string) {
  return FORCED_100_TYPES.some(t => typeOT.toLowerCase().includes(t));
}

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

  const latest = useMemo(() => {
    const latestDate = otData[0]?.dateJour;
    return latestDate ? otData.filter(d => d.dateJour === latestDate) : otData;
  }, [otData]);

  const filtered = useMemo(() => {
    if (activeFilters.length === 0) return latest;
    return latest.filter(d => activeFilters.some(f => d.natureOT?.toUpperCase().includes(f)));
  }, [latest, activeFilters]);

  const filteredLigne = useMemo(() => {
    let data = otLigneData;
    if (activeFilters.length > 0) {
      const filteredIds = new Set(filtered.map(d => d.numOT));
      data = data.filter(d => filteredIds.has(d.identifiantProjet) || activeFilters.some(f => d.codeLibreTable?.toUpperCase().includes(f)));
    }
    if (selectedTypeOT) data = data.filter(d => d.typeOT === selectedTypeOT);
    if (selectedLot) data = data.filter(d => d.lot === selectedLot);
    return data;
  }, [otLigneData, filtered, activeFilters, selectedTypeOT, selectedLot]);

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
        name: normalizeText(name.length > 18 ? name.slice(0, 18) + '…' : name),
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
          fontSize={10}
          fontWeight={isSelected ? 700 : 400}
          transform="rotate(-30)"
          style={{ cursor: 'pointer', textDecoration: isSelected ? 'underline' : 'none' }}
          onClick={() => setSelectedTypeOT(prev => prev === fullName ? null : fullName)}
        >
          {normalizeText(payload.value)}
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
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value.trim()) {
        const s = value.trim().toLowerCase();
        rows = rows.filter(r => {
          const v = (r as any)[key];
          return v != null && String(v).toLowerCase().includes(s);
        });
      }
    });
    return rows.sort((a, b) => b.resultat - a.resultat).slice(0, 50);
  }, [filteredLigne, columnFilters]);

  const lots = useMemo(() => {
    const lotSet = new Set<string>();
    otLigneData.forEach(d => { if (d.lot && d.lot !== 'x' && d.lot !== 'X') lotSet.add(d.lot); });
    return Array.from(lotSet).sort();
  }, [otLigneData]);

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 gap-2">
      {/* Top row: Gauges + Lot grid */}
      <div className="flex gap-2 items-start shrink-0">
        <div className="pbi-card p-2 flex flex-col items-center justify-center min-w-[100px]">
          <div className="text-lg font-bold text-primary">GESTAL</div>
          <div className="text-[10px] text-muted-foreground">Affaire 1935</div>
        </div>
        <div className="flex gap-2 flex-1 justify-center">
          <div className="pbi-card p-1.5">
            <GaugeChart value={kpis.avancementBudget} label="Avancement Budget" color={kpis.avancementBudget > 20 ? 'orange' : 'green'} />
          </div>
          <div className="pbi-card p-1.5">
            <GaugeChart value={kpis.avancementReel} label="Avancement Réel" color={kpis.avancementReel > 15 ? 'orange' : 'green'} />
          </div>
          <div className="pbi-card p-1.5">
            <GaugeChart value={kpis.ecartAvancement} label="Écart Avancement" min={-10} max={10} suffix="%" color={kpis.ecartAvancement < 0 ? 'red' : 'green'} />
          </div>
          <div className="pbi-card p-1.5">
            <GaugeChart value={kpis.rendement} label="Rendement" color={kpis.rendement >= 95 ? 'green' : 'orange'} max={200} />
          </div>
        </div>
        <div className="pbi-card p-2">
          <div className="pbi-section-title mb-1 text-center">Lots</div>
          <div className="grid grid-cols-4 gap-1 max-h-[70px] overflow-auto">
            {lots.map(l => (
              <button
                key={l}
                onClick={() => setSelectedLot(prev => prev === l ? null : l)}
                className={`px-2 py-0.5 text-[10px] font-mono text-center rounded-sm transition-colors cursor-pointer ${
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

      {/* Middle row: KPI cards + Bar chart */}
      <div className="flex gap-2 flex-[3] min-h-0">
        {/* Left KPI cards */}
        <div className="flex flex-col gap-1.5 min-w-[140px] shrink-0">
          <PbiKpiCard label="Heures prévues" value={Math.round(kpis.totalCharge)} color="info" />
          <PbiKpiCard label="Temps passé" value={Math.round(kpis.totalTP)} color="warning" />
          <PbiKpiCard label="Temps produit (VBTR)" value={Math.round(kpis.totalVBTR)} color="success" />
          <PbiKpiCard label="Résultat" value={Math.round(kpis.resultat)} color={kpis.resultat >= 0 ? 'success' : 'destructive'} />
          <PbiKpiCard label="Heures pointées" value={Math.round(kpis.totalHeuresPointees)} color="info" small />
          <div className="pbi-card p-2">
            <div className="pbi-section-title mb-1">Nature OT</div>
            <div className="grid grid-cols-2 gap-1">
              {FILTER_CATEGORIES.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFilter(f)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
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
          {selectedTypeOT && (
            <div className="pbi-card p-2">
              <div className="pbi-section-title mb-1">Filtre actif</div>
              <button
                onClick={() => setSelectedTypeOT(null)}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-sm bg-primary text-primary-foreground w-full text-left truncate"
                title={normalizeText(selectedTypeOT)}
              >
                ✕ {normalizeText(selectedTypeOT)}
              </button>
            </div>
          )}
        </div>

        {/* Center bar chart — maximized */}
        <div className="pbi-card p-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 shrink-0">
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
            <div className="text-lg font-bold text-primary font-mono ml-auto">1935</div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,25%)" />
                <XAxis dataKey="name" tick={<CustomXAxisTick />} interval={0} height={50} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215,15%,60%)' }} width={50} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222,30%,18%)', border: '1px solid hsl(222,20%,25%)', borderRadius: '4px', fontSize: 12, color: 'hsl(210,20%,92%)' }}
                  itemStyle={{ color: 'hsl(210,20%,92%)' }}
                  formatter={(v: number) => v.toLocaleString('fr-FR')}
                  labelFormatter={(label) => normalizeText(String(label))}
                />
                <Bar dataKey="Charge prév." fill="hsl(200,80%,55%)" radius={[2, 2, 0, 0]} maxBarSize={40} />
                <Bar dataKey="TP" fill="hsl(0,72%,55%)" radius={[2, 2, 0, 0]} maxBarSize={40} />
                <Bar dataKey="VBTR" fill="hsl(142,71%,50%)" radius={[2, 2, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: Data table */}
      <div className="pbi-card overflow-hidden shrink-0 max-h-[30vh] min-h-[120px]">
        <div className="overflow-auto h-full">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border/50">
                {OT_TABLE_COLUMNS.map(col => (
                  <th key={col.key} className={`${col.isNumeric ? 'text-right' : 'text-left'} px-3 py-1.5 font-semibold text-muted-foreground`}>
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/30">
                {OT_TABLE_COLUMNS.map(col => (
                  <th key={col.key} className="px-2 py-0.5">
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
                      <td key={col.key} className={`px-3 py-1 ${col.isNumeric ? 'text-right font-mono' : ''} ${col.key === 'identifiant' ? 'font-mono text-[10px]' : ''} ${col.key === 'resultat' ? 'font-semibold' : ''}`} style={cellStyle}>
                        {col.isNumeric ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : normalizeText(String(val))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-semibold sticky bottom-0">
              <tr>
                <td className="px-3 py-1" colSpan={2}>Total</td>
                <td className="px-3 py-1 text-right font-mono">{tableData.reduce((s, r) => s + r.qtePrev, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1 text-right font-mono">{tableData.reduce((s, r) => s + r.qteReal, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1"></td>
                <td className="px-3 py-1 text-right font-mono">{tableData.reduce((s, r) => s + r.charge, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1 text-right font-mono" style={{ color: 'hsl(200,80%,55%)' }}>{tableData.reduce((s, r) => s + r.vbtr, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1 text-right font-mono">{tableData.reduce((s, r) => s + r.tp, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-1 text-right font-mono" style={{ color: tableData.reduce((s, r) => s + r.resultat, 0) >= 0 ? 'hsl(142,71%,50%)' : 'hsl(0,72%,51%)' }}>
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
