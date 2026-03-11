import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDbAchats() {
  return useQuery({
    queryKey: ['db-achats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('achats').select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDbOtLignes() {
  return useQuery({
    queryKey: ['db-ot-lignes'],
    queryFn: async () => {
      // Fetch all rows (may exceed 1000)
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.from('ot_lignes').select('*').range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDbPointages() {
  return useQuery({
    queryKey: ['db-pointages'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.from('pointages').select('*').range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDbMatieres() {
  return useQuery({
    queryKey: ['db-matieres'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.from('matieres').select('*').range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDbCables() {
  return useQuery({
    queryKey: ['db-cables'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.from('cables').select('*').range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportLogs() {
  return useQuery({
    queryKey: ['import-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('import_logs').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });
}
