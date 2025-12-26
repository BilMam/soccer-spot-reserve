import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivePromo {
  id: string;
  name: string;
  code: string | null;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  isAutomatic: boolean;
  startDate: string;
  endDate: string | null;
  minBookingAmount?: number;
  // Créneaux ciblés (si applicable)
  timeSlots?: Array<{
    dayOfWeek: number | null;
    startTime: string;
    endTime: string;
  }>;
}

interface PromoCodeRow {
  id: string;
  name: string;
  code: string | null;
  discount_type: string;
  discount_value: number;
  is_automatic: boolean | null;
  start_date: string;
  end_date: string | null;
  min_booking_amount: number | null;
  times_used: number | null;
  usage_limit_total: number | null;
  promo_time_slots: Array<{
    day_of_week: number | null;
    start_time: string;
    end_time: string;
  }>;
}

/**
 * Hook pour récupérer les promotions actives ciblant un terrain donné
 */
export function useActivePromosForField(fieldId: string | undefined) {
  return useQuery({
    queryKey: ['active-promos-field', fieldId],
    queryFn: async (): Promise<ActivePromo[]> => {
      if (!fieldId) return [];

      const today = new Date().toISOString().split('T')[0];

      // Récupérer les promos actives ciblant ce terrain
      const { data: promoFields, error: pfError } = await supabase
        .from('promo_fields')
        .select('promo_code_id')
        .eq('field_id', fieldId);

      if (pfError) {
        console.error('Erreur récupération promo_fields:', pfError);
        return [];
      }

      if (!promoFields || promoFields.length === 0) {
        return [];
      }

      const promoIds = promoFields.map(pf => pf.promo_code_id);

      // Récupérer les promos actives avec leurs créneaux ciblés
      const { data: promos, error: promoError } = await supabase
        .from('promo_codes')
        .select(`
          id,
          name,
          code,
          discount_type,
          discount_value,
          is_automatic,
          start_date,
          end_date,
          min_booking_amount,
          times_used,
          usage_limit_total,
          promo_time_slots (
            day_of_week,
            start_time,
            end_time
          )
        `)
        .in('id', promoIds)
        .eq('status', 'active')
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (promoError) {
        console.error('Erreur récupération promo_codes:', promoError);
        return [];
      }

      // Filtrer les promos qui n'ont pas atteint leur limite d'utilisation
      const activePromos = (promos as PromoCodeRow[] || []).filter(promo => {
        if (promo.usage_limit_total === null) return true;
        return (promo.times_used || 0) < promo.usage_limit_total;
      });

      return activePromos.map(promo => ({
        id: promo.id,
        name: promo.name,
        code: promo.code,
        discountType: promo.discount_type as 'percent' | 'fixed',
        discountValue: promo.discount_value,
        isAutomatic: promo.is_automatic || false,
        startDate: promo.start_date,
        endDate: promo.end_date,
        minBookingAmount: promo.min_booking_amount || 0,
        timeSlots: (promo.promo_time_slots || []).map(ts => ({
          dayOfWeek: ts.day_of_week,
          startTime: ts.start_time,
          endTime: ts.end_time
        }))
      }));
    },
    enabled: !!fieldId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour récupérer les promos actives pour plusieurs terrains (batch)
 */
/**
 * Hook pour récupérer TOUTES les promos actives pour plusieurs terrains (batch)
 * Retourne un mapping terrain -> tableau de promos (pas seulement la meilleure)
 */
export function useActivePromosForFields(fieldIds: string[]) {
  return useQuery({
    queryKey: ['active-promos-fields', fieldIds],
    queryFn: async (): Promise<Record<string, ActivePromo[]>> => {
      if (!fieldIds || fieldIds.length === 0) return {};

      const today = new Date().toISOString().split('T')[0];

      // Récupérer les associations terrain -> promo
      const { data: promoFields, error: pfError } = await supabase
        .from('promo_fields')
        .select('field_id, promo_code_id')
        .in('field_id', fieldIds);

      if (pfError || !promoFields || promoFields.length === 0) {
        // Initialiser avec des tableaux vides
        return fieldIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {} as Record<string, ActivePromo[]>);
      }

      const promoIds = [...new Set(promoFields.map(pf => pf.promo_code_id))];

      // Récupérer toutes les promos actives
      const { data: promos, error: promoError } = await supabase
        .from('promo_codes')
        .select(`
          id,
          name,
          code,
          discount_type,
          discount_value,
          is_automatic,
          start_date,
          end_date,
          min_booking_amount,
          times_used,
          usage_limit_total,
          promo_time_slots (
            day_of_week,
            start_time,
            end_time
          )
        `)
        .in('id', promoIds)
        .eq('status', 'active')
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (promoError || !promos) {
        return fieldIds.reduce((acc, id) => ({ ...acc, [id]: [] }), {} as Record<string, ActivePromo[]>);
      }

      // Filtrer et mapper les promos valides
      const validPromos = (promos as PromoCodeRow[]).filter(promo => {
        if (promo.usage_limit_total === null) return true;
        return (promo.times_used || 0) < promo.usage_limit_total;
      });

      const promosById: Record<string, ActivePromo> = {};
      validPromos.forEach(promo => {
        promosById[promo.id] = {
          id: promo.id,
          name: promo.name,
          code: promo.code,
          discountType: promo.discount_type as 'percent' | 'fixed',
          discountValue: promo.discount_value,
          isAutomatic: promo.is_automatic || false,
          startDate: promo.start_date,
          endDate: promo.end_date,
          minBookingAmount: promo.min_booking_amount || 0,
          timeSlots: (promo.promo_time_slots || []).map(ts => ({
            dayOfWeek: ts.day_of_week,
            startTime: ts.start_time,
            endTime: ts.end_time
          }))
        };
      });

      // Créer le mapping terrain -> TOUTES les promos (pas seulement la meilleure)
      const result: Record<string, ActivePromo[]> = {};
      fieldIds.forEach(fid => {
        result[fid] = [];
      });

      promoFields.forEach(pf => {
        const promo = promosById[pf.promo_code_id];
        if (promo) {
          // Éviter les doublons
          if (!result[pf.field_id].find(p => p.id === promo.id)) {
            result[pf.field_id].push(promo);
          }
        }
      });

      // Trier par valeur de réduction décroissante
      Object.keys(result).forEach(fieldId => {
        result[fieldId].sort((a, b) => b.discountValue - a.discountValue);
      });

      return result;
    },
    enabled: fieldIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
