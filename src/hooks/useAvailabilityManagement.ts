
import { useFieldAvailability } from './useFieldAvailability';
import { usePeriodTemplates } from './usePeriodTemplates';
import { useSlotOperations } from './useSlotOperations';

export const useAvailabilityManagement = (fieldId: string) => {
  const { useFieldAvailabilityForPeriod } = useFieldAvailability(fieldId);
  const { usePeriodTemplates: usePeriodTemplatesHook, savePeriodTemplate } = usePeriodTemplates(fieldId);
  const { 
    createAvailabilityForPeriod, 
    createAvailabilityWithDaySpecificTimes, 
    setSlotsUnavailable, 
    setSlotsAvailable,
    reserveSlotManually,
    unreserveSlotManually
  } = useSlotOperations(fieldId);

  return {
    useFieldAvailabilityForPeriod,
    usePeriodTemplates: usePeriodTemplatesHook,
    createAvailabilityForPeriod,
    createAvailabilityWithDaySpecificTimes,
    setSlotsUnavailable,
    setSlotsAvailable,
    reserveSlotManually,
    unreserveSlotManually,
    savePeriodTemplate
  };
};
