
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TimeFilter = 'day' | 'week' | 'month';

export const useOwnerStats = (timeFilter: TimeFilter = 'month') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owner-stats', user?.id, timeFilter],
    queryFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      // Calculer la date de début selon le filtre
      const now = new Date();
      let startDate: Date;
      
      switch (timeFilter) {
        case 'day':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          break;
      }

      // Requête pour récupérer les statistiques avec filtrage temporel
      // On récupère directement depuis les bookings pour avoir un contrôle plus fin
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          owner_amount,
          status,
          payment_status,
          created_at,
          fields!inner(id, name, owner_id)
        `)
        .eq('fields.owner_id', user.id)
        .gte('created_at', startDate.toISOString())
        .in('status', ['confirmed', 'owner_confirmed', 'completed'])
        .eq('payment_status', 'paid');

      if (bookingsError) throw bookingsError;

      // Calculer les statistiques par terrain
      const fieldStats = new Map();
      let totalRevenue = 0;
      let totalBookings = 0;

      bookingsData?.forEach(booking => {
        const fieldId = booking.fields.id;
        const fieldName = booking.fields.name;
        const revenue = Number(booking.owner_amount || 0);
        
        totalRevenue += revenue;
        totalBookings += 1;

        if (!fieldStats.has(fieldId)) {
          fieldStats.set(fieldId, {
            field_id: fieldId,
            field_name: fieldName,
            total_bookings: 0,
            confirmed_bookings: 0,
            pending_bookings: 0, // Toujours 0 maintenant
            total_revenue: 0,
            avg_rating: 0,
            total_reviews: 0
          });
        }

        const stats = fieldStats.get(fieldId);
        stats.total_bookings += 1;
        stats.confirmed_bookings += 1;
        stats.total_revenue += revenue;
      });

      // Récupérer les notes moyennes des terrains
      const { data: ratingsData } = await supabase
        .from('fields')
        .select('id, rating, total_reviews')
        .eq('owner_id', user.id);

      // Mettre à jour les notes
      ratingsData?.forEach(field => {
        if (fieldStats.has(field.id)) {
          const stats = fieldStats.get(field.id);
          stats.avg_rating = Number(field.rating || 0);
          stats.total_reviews = field.total_reviews || 0;
        }
      });

      return Array.from(fieldStats.values());
    },
    enabled: !!user
  });
};
