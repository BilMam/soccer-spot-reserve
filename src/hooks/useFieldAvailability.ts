
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Découper une période en sous-périodes de maxDays jours
// pour contourner le plafond PostgREST de 1000 lignes côté serveur
function getDateChunks(startDate: string, endDate: string, maxDays: number = 7): Array<{start: string, end: string}> {
  const chunks: Array<{start: string, end: string}> = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  let chunkStart = new Date(start);
  while (chunkStart <= end) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    chunks.push({ start: fmt(chunkStart), end: fmt(chunkEnd) });

    chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() + 1);
  }

  return chunks;
}

export const useFieldAvailability = (fieldId: string) => {
  // Récupérer les créneaux pour une période (paginé par semaine)
  const useFieldAvailabilityForPeriod = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['field-availability-period', fieldId, startDate, endDate],
      queryFn: async () => {
        const chunks = getDateChunks(startDate, endDate);

        const results = await Promise.all(
          chunks.map(async (chunk) => {
            const { data, error } = await supabase
              .from('field_availability')
              .select('*, on_hold_until, hold_cagnotte_id')
              .eq('field_id', fieldId)
              .gte('date', chunk.start)
              .lte('date', chunk.end)
              .order('date', { ascending: true })
              .order('start_time', { ascending: true });

            if (error) throw error;
            return data || [];
          })
        );

        return results.flat();
      },
      enabled: !!fieldId && !!startDate && !!endDate
    });
  };

  return {
    useFieldAvailabilityForPeriod
  };
};
