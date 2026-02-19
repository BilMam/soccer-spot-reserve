
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Découper une période en sous-périodes de maxDays jours
// pour contourner le plafond PostgREST de 1000 lignes côté serveur
function getDateChunks(startDate: Date, endDate: Date, maxDays: number = 7): Array<{start: string, end: string}> {
  const chunks: Array<{start: string, end: string}> = [];

  let chunkStart = new Date(startDate);
  while (chunkStart <= endDate) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1);
    if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

    chunks.push({
      start: format(chunkStart, 'yyyy-MM-dd'),
      end: format(chunkEnd, 'yyyy-MM-dd')
    });

    chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() + 1);
  }

  return chunks;
}

export const useExistingSlots = (fieldId: string, startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['existing-slots', fieldId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const chunks = getDateChunks(startDate, endDate);

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const { data, error } = await supabase
            .from('field_availability')
            .select('*')
            .eq('field_id', fieldId)
            .gte('date', chunk.start)
            .lte('date', chunk.end)
            .order('date')
            .order('start_time');

          if (error) throw error;
          return data || [];
        })
      );

      return results.flat();
    },
    enabled: !!fieldId && !!startDate && !!endDate
  });
};
