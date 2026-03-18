import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'accueil', label: 'Accueil' },
  { id: 'ot-progi', label: 'OT Progi' },
  { id: 'pointage', label: 'Pointage' },
  { id: 'performance', label: 'Performance' },
  { id: 'matiere', label: 'Matière' },
  { id: 'achat', label: 'Achats' },
  { id: 'tirage-cables', label: 'Tirage Câbles' },
  { id: 'courbe-filerie', label: 'Courbe Filerie (m)' },
  { id: 'filerie-lot', label: 'Filerie de Lot' },
  { id: 'pose-appareillage', label: 'Pose Appareillage' },
  { id: 'pose-equipement', label: 'Pose Équipement' },
  { id: 'enrichment', label: '🔗 Enrichissement Y34→Z34' },
  { id: 'import', label: '📥 Import données' },
  { id: 'ai', label: 'Analyse IA ✨' },
];

interface PbiSidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export function PbiSidebar({ activePage, onPageChange }: PbiSidebarProps) {
  return (
    <aside className="w-48 h-full bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-sidebar-border">
        <div className="text-xs text-muted-foreground mb-1">Pages</div>
      </div>
      <nav className="flex-1 py-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "w-full text-left px-4 py-2 text-sm transition-colors",
              activePage === item.id
                ? "bg-sidebar-accent text-sidebar-primary font-semibold border-l-2 border-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-2 border-transparent"
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border text-[10px] text-muted-foreground">
        NARVAL-Z34
      </div>
    </aside>
  );
}
