import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  label: string;
  min?: number;
  max?: number;
  color?: 'green' | 'orange' | 'red' | 'blue';
  suffix?: string;
}

export function GaugeChart({ value, label, min = 0, max = 100, color = 'green', suffix = '%' }: GaugeChartProps) {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const angle = (percentage / 100) * 180;

  const colorMap = {
    green: { stroke: 'hsl(142, 71%, 45%)', text: 'text-success' },
    orange: { stroke: 'hsl(38, 92%, 50%)', text: 'text-warning' },
    red: { stroke: 'hsl(0, 72%, 51%)', text: 'text-destructive' },
    blue: { stroke: 'hsl(200, 80%, 50%)', text: 'text-info' },
  };

  const c = colorMap[color];

  // SVG arc path
  const radius = 40;
  const cx = 50;
  const cy = 55;

  const startAngle = Math.PI;
  const endAngle = Math.PI + (angle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);

  const largeArc = angle > 180 ? 1 : 0;

  const bgX2 = cx + radius * Math.cos(0);
  const bgY2 = cy + radius * Math.sin(0);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="pbi-section-title text-center">{label}</span>
      <div className="relative w-[100px] h-[60px]">
        <svg viewBox="0 0 100 60" className="w-full h-full">
          {/* Background arc */}
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${bgX2} ${bgY2}`}
            fill="none"
            stroke="hsl(222, 20%, 25%)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {percentage > 0 && (
            <path
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={c.stroke}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-0">
          <span className={cn("text-lg font-bold font-mono", c.text)}>
            {value.toFixed(1)}{suffix}
          </span>
        </div>
      </div>
      <div className="flex justify-between w-full px-2 text-[9px] text-muted-foreground">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}
