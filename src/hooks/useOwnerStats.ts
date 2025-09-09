
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TimeFilter = 'today' | 'last30days' | 'alltime' | 'currentYear' | 'lastYear' | 'currentMonth' | 'specificMonth' | 'specificYear';

export interface TimeFilterConfig {
  type: TimeFilter;
  value?: string; // For specific month (YYYY-MM) or year (YYYY)
  label: string;
}

// Fonction utilitaire pour calculer les dates selon le filtre
const getDateRange = (filter: TimeFilterConfig): { startDate: Date; endDate: Date } => {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  switch (filter.type) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'last30days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    
    case 'alltime':
      startDate = new Date('2020-01-01'); // Date suffisamment ancienne
      break;
    
    case 'currentYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    
    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    
    case 'currentMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    
    case 'specificMonth':
      if (filter.value) {
        const [year, month] = filter.value.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999); // Dernier jour du mois
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      break;
    
    case 'specificYear':
      if (filter.value) {
        const year = Number(filter.value);
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      break;
    
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

export const useOwnerStats = (filter: TimeFilterConfig, fieldId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owner-stats', user?.id, filter, fieldId],
    queryFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      // Calculer la plage de dates selon le filtre
      const { startDate, endDate } = getDateRange(filter);

      // Requête pour récupérer les statistiques avec filtrage temporel et par terrain
      let query = supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          owner_amount,
          status,
          payment_status,
          created_at,
          booking_date,
          start_time,
          end_time,
          fields!inner(id, name, owner_id)
        `)
        .eq('fields.owner_id', user.id)
        .gte('booking_date', startDate.toISOString().split('T')[0])
        .lte('booking_date', endDate.toISOString().split('T')[0])
        .in('status', ['confirmed', 'owner_confirmed', 'completed'])
        .eq('payment_status', 'paid');

      // Filtrer par terrain spécifique si demandé
      if (fieldId) {
        query = query.eq('field_id', fieldId);
      }

      const { data: bookingsData, error: bookingsError } = await query;

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
      let ratingsQuery = supabase
        .from('fields')
        .select('id, rating, total_reviews')
        .eq('owner_id', user.id);

      // Filtrer par terrain spécifique si demandé
      if (fieldId) {
        ratingsQuery = ratingsQuery.eq('id', fieldId);
      }

      const { data: ratingsData } = await ratingsQuery;

      // Mettre à jour les notes
      ratingsData?.forEach(field => {
        if (fieldStats.has(field.id)) {
          const stats = fieldStats.get(field.id);
          stats.avg_rating = Number(field.rating || 0);
          stats.total_reviews = field.total_reviews || 0;
        }
      });

      const statsArray = Array.from(fieldStats.values());
      
      // Si on filtre par terrain, récupérer aussi les détails des réservations
      if (fieldId && bookingsData) {
        const bookingDetails = bookingsData.map(booking => ({
          id: booking.id,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          total_price: Number(booking.total_price || 0),
          owner_amount: Number(booking.owner_amount || 0),
          status: booking.status,
          created_at: booking.created_at
        }));

        return {
          stats: statsArray,
          bookingDetails
        };
      }

      return { stats: statsArray, bookingDetails: null };
    },
    enabled: !!user
  });
};
