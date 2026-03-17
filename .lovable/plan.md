

## Plan: Ajouter une table employeur sous le camembert + no-scroll

### Changements dans `src/components/dashboard/PointageTab.tsx`

**1. Ajouter une mini-table sous le camembert**
- Sous le `PieChart` existant (ligne 375-412), ajouter un petit tableau compact affichant `Employeur | %` en réutilisant les données `pieData` déjà calculées (qui contiennent `name`, `value`, `percent`).
- Style : texte `text-[10px]`, pas de bordures lourdes, couleur pastille alignée avec `PIE_COLORS`.

**2. Rendre la page no-scroll**
- Remplacer le conteneur racine `div` (ligne 269) : passer de `space-y-3 p-3 overflow-auto` a `h-full flex flex-col overflow-hidden p-2 gap-2`.
- Réduire les hauteurs fixes des graphiques : camembert de `h-[360px]` a une taille flexible, bar charts de `h-[180px]`/`h-[160px]` a des valeurs plus compactes.
- La section "Main content row" (ligne 315) devient `flex-1 min-h-0` pour occuper l'espace restant.
- Le tableau de détail du bas garde un `overflow-auto` interne mais avec une hauteur contrainte par `flex-1 min-h-0`.

**3. Structure du panneau droit (camembert + table)**
Le panneau droit contiendra en colonne :
- Le camembert (flex-1, prend l'espace disponible)
- La table employeur en dessous (hauteur auto, scroll interne si nécessaire)

```text
┌─────────────────────────────────────────────────────┐
│ Filtres employeur  |  Filtres code libre            │
├────┬────────────────────────────────┬───────────────┤
│KPIs│  Bar chart mensuel             │  Camembert    │
│    │  Bar chart hebdo               │  Table %      │
├────┴────────────────────────────────┴───────────────┤
│ Tableau de détail (scroll interne)                  │
└─────────────────────────────────────────────────────┘
```

