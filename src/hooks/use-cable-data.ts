import { useQuery } from '@tanstack/react-query';
import { loadCableData, type CableData } from '@/lib/cable-parser';

export function useCableData() {
  return useQuery<CableData[]>({
    queryKey: ['cable-data'],
    queryFn: loadCableData,
    staleTime: Infinity,
  });
}
