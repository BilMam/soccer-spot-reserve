import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface PromoStats {
  activePromos: number;
  usagesThisMonth: number;
  revenueFromPromos: number;
  conversionRate: number; // % de réservations avec promo
}

export const usePromoStats = (ownerId: string | undefined) => {
  return useQuery({
    queryKey: ['promo-stats', ownerId],
    queryFn: async (): Promise<PromoStats> => {
      if (!ownerId) {
        return { activePromos: 0, usagesThisMonth: 0, revenueFromPromos: 0, conversionRate: 0 };
      }

      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      // 1. Nombre de promos actives
      const { count: activePromos } = await supabase
        .from('promo_codes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'active');

      // 2. Récupérer les IDs des promos du propriétaire
      const { data: ownerPromos } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('owner_id', ownerId);

      const promoIds = ownerPromos?.map(p => p.id) || [];

      let usagesThisMonth = 0;
      let revenueFromPromos = 0;
      let bookingsWithPromo = 0;

      if (promoIds.length > 0) {
        // 3. Usages ce mois-ci
        const { count: usageCount } = await supabase
          .from('promo_usage')
          .select('*', { count: 'exact', head: true })
          .in('promo_code_id', promoIds)
          .gte('used_at', monthStart)
          .lte('used_at', monthEnd + 'T23:59:59');

        usagesThisMonth = usageCount || 0;

        // 4. Revenus générés (somme des discount_amount)
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('discount_amount, promo_code_id')
          .in('promo_code_id', promoIds)
          .eq('payment_status', 'paid');

        revenueFromPromos = bookingsData?.reduce((sum, b) => sum + (b.discount_amount || 0), 0) || 0;
        bookingsWithPromo = bookingsData?.length || 0;
      }

      // 5. Taux de conversion (réservations avec promo / total réservations du propriétaire)
      // Récupérer les terrains du propriétaire
      const { data: ownerFields } = await supabase
        .from('fields')
        .select('id')
        .eq('owner_id', ownerId);

      const fieldIds = ownerFields?.map(f => f.id) || [];
      
      let conversionRate = 0;
      if (fieldIds.length > 0) {
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('field_id', fieldIds)
          .eq('payment_status', 'paid')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd + 'T23:59:59');

        if (totalBookings && totalBookings > 0) {
          conversionRate = Math.round((bookingsWithPromo / totalBookings) * 100);
        }
      }

      return {
        activePromos: activePromos || 0,
        usagesThisMonth,
        revenueFromPromos,
        conversionRate
      };
    },
    enabled: !!ownerId
  });
};
