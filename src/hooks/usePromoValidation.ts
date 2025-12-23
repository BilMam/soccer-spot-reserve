import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  promo_id?: string;
  name?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
  is_automatic?: boolean;
}

export interface AppliedPromo {
  promoId: string;
  name: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number; // Montant réel de la réduction
}

export const usePromoValidation = () => {
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: async ({
      code,
      fieldId,
      bookingDate,
      startTime,
      userId,
      bookingAmount
    }: {
      code: string;
      fieldId: string;
      bookingDate: Date;
      startTime: string;
      userId: string;
      bookingAmount: number;
    }): Promise<PromoValidationResult> => {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: code,
        p_field_id: fieldId,
        p_booking_date: bookingDate.toISOString().split('T')[0],
        p_start_time: startTime,
        p_user_id: userId,
        p_booking_amount: bookingAmount
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as unknown as PromoValidationResult;
    },
    onSuccess: (result, variables) => {
      if (result.valid) {
        // Calculer le montant de la réduction
        let discountAmount = 0;
        if (result.discount_type === 'percent') {
          discountAmount = Math.round(variables.bookingAmount * (result.discount_value! / 100));
        } else {
          discountAmount = Math.min(result.discount_value!, variables.bookingAmount);
        }

        setAppliedPromo({
          promoId: result.promo_id!,
          name: result.name!,
          discountType: result.discount_type!,
          discountValue: result.discount_value!,
          discountAmount
        });
        setValidationError(null);
      } else {
        setAppliedPromo(null);
        setValidationError(result.message || 'Code promo invalide');
      }
    },
    onError: (error: Error) => {
      setAppliedPromo(null);
      setValidationError(error.message);
    }
  });

  const validateCode = (
    code: string,
    fieldId: string,
    bookingDate: Date,
    startTime: string,
    userId: string,
    bookingAmount: number
  ) => {
    if (!code.trim()) {
      setValidationError('Veuillez entrer un code promo');
      return;
    }

    setPromoCode(code);
    validateMutation.mutate({
      code: code.trim(),
      fieldId,
      bookingDate,
      startTime,
      userId,
      bookingAmount
    });
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setValidationError(null);
  };

  const calculateDiscountedPrice = (originalPrice: number): {
    publicBeforeDiscount: number;
    discountAmount: number;
    publicAfterDiscount: number;
  } => {
    if (!appliedPromo) {
      return {
        publicBeforeDiscount: originalPrice,
        discountAmount: 0,
        publicAfterDiscount: originalPrice
      };
    }

    let discountAmount = 0;
    if (appliedPromo.discountType === 'percent') {
      discountAmount = Math.round(originalPrice * (appliedPromo.discountValue / 100));
    } else {
      discountAmount = Math.min(appliedPromo.discountValue, originalPrice);
    }

    return {
      publicBeforeDiscount: originalPrice,
      discountAmount,
      publicAfterDiscount: originalPrice - discountAmount
    };
  };

  return {
    promoCode,
    appliedPromo,
    validationError,
    isValidating: validateMutation.isPending,
    validateCode,
    clearPromo,
    calculateDiscountedPrice,
    setPromoCode
  };
};
