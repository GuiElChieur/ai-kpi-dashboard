import { cn } from '@/lib/utils';

interface PbiKpiCardProps {
  label: string;
  value: string | number;
  color?: 'primary' | 'info' | 'success' | 'warning' | 'destructive';
  small?: boolean;
}

export function PbiKpiCard({ label, value, color = 'info', small = false }: PbiKpiCardProps) {
  const colorMap = {
    primary: 'text-primary',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <div className="pbi-card px-3 py-2 text-center">
      <div className="pbi-section-title mb-1">{label}</div>
      <div className={cn(
        "font-mono font-bold tracking-tight",
        colorMap[color],
        small ? "text-lg" : "text-2xl"
      )}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </div>
    </div>
  );
}
