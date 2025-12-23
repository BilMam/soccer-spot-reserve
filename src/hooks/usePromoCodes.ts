import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoCode {
  id: string;
  owner_id: string;
  name: string;
  code: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  times_used: number;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'paused' | 'expired' | 'deleted';
  is_automatic: boolean;
  min_booking_amount: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  revenue_generated?: number;
  fields_count?: number;
  time_slots_count?: number;
}

export interface PromoCodeWithDetails extends PromoCode {
  promo_fields: { field_id: string; fields: { name: string } }[];
  promo_time_slots: { day_of_week: number | null; start_time: string; end_time: string }[];
}

type StatusFilter = 'all' | 'active' | 'expired';

export const usePromoCodes = (ownerId: string | undefined, statusFilter: StatusFilter = 'all') => {
  return useQuery({
    queryKey: ['promo-codes', ownerId, statusFilter],
    queryFn: async () => {
      if (!ownerId) return [];

      let query = supabase
        .from('promo_codes')
        .select(`
          *,
          promo_fields(field_id, fields:field_id(name)),
          promo_time_slots(day_of_week, start_time, end_time)
        `)
        .eq('owner_id', ownerId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (statusFilter === 'active') {
        query = query.eq('status', 'active');
      } else if (statusFilter === 'expired') {
        query = query.in('status', ['expired', 'paused']);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch revenue generated for each promo
      const promoIds = data?.map(p => p.id) || [];
      
      if (promoIds.length > 0) {
        const { data: revenueData } = await supabase
          .from('bookings')
          .select('promo_code_id, discount_amount')
          .in('promo_code_id', promoIds)
          .eq('payment_status', 'paid');

        const revenueMap = new Map<string, number>();
        revenueData?.forEach(booking => {
          if (booking.promo_code_id) {
            const current = revenueMap.get(booking.promo_code_id) || 0;
            revenueMap.set(booking.promo_code_id, current + (booking.discount_amount || 0));
          }
        });

        return (data as PromoCodeWithDetails[]).map(promo => ({
          ...promo,
          revenue_generated: revenueMap.get(promo.id) || 0,
          fields_count: promo.promo_fields?.length || 0,
          time_slots_count: promo.promo_time_slots?.length || 0
        }));
      }

      return data as PromoCodeWithDetails[];
    },
    enabled: !!ownerId
  });
};

export const usePromoCodeDetails = (promoId: string | undefined) => {
  return useQuery({
    queryKey: ['promo-code-details', promoId],
    queryFn: async () => {
      if (!promoId) return null;

      const { data, error } = await supabase
        .from('promo_codes')
        .select(`
          *,
          promo_fields(field_id, fields:field_id(name, id)),
          promo_time_slots(id, day_of_week, start_time, end_time)
        `)
        .eq('id', promoId)
        .single();

      if (error) throw error;
      return data as PromoCodeWithDetails;
    },
    enabled: !!promoId
  });
};
