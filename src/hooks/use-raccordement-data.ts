import { useCableData } from './use-cable-data';
import type { CableData } from '@/lib/cable-parser';

/**
 * Hook dédié au raccordement : réutilise le cache cable-data
 * au lieu de faire une requête séparée identique.
 */
export function useRaccordementData() {
  return useCableData();
}
