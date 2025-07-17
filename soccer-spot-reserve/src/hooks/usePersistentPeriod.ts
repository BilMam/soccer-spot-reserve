
import { useState, useEffect } from 'react';

interface PeriodState {
  startDate: Date;
  endDate: Date;
}

export const usePersistentPeriod = (fieldId: string) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodState | null>(null);
  const storageKey = `availability-period-${fieldId}`;

  useEffect(() => {
    // Récupérer la période sauvegardée au montage du composant
    const savedPeriod = localStorage.getItem(storageKey);
    if (savedPeriod) {
      try {
        const parsed = JSON.parse(savedPeriod);
        const startDate = new Date(parsed.startDate);
        const endDate = new Date(parsed.endDate);
        
        // Vérifier que les dates sont valides et pas trop anciennes (90 jours max)
        const now = new Date();
        const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 jours en millisecondes
        
        if (
          !isNaN(startDate.getTime()) && 
          !isNaN(endDate.getTime()) &&
          (now.getTime() - startDate.getTime()) < maxAge
        ) {
          setSelectedPeriod({ startDate, endDate });
          console.log('🔄 Période restaurée depuis localStorage:', { startDate, endDate });
        } else {
          // Nettoyer les données invalides
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération de la période sauvegardée:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [fieldId, storageKey]);

  const updatePeriod = (startDate: Date, endDate: Date) => {
    const newPeriod = { startDate, endDate };
    setSelectedPeriod(newPeriod);
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }));
      console.log('💾 Période sauvegardée dans localStorage:', newPeriod);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la période:', error);
    }
  };

  const clearPeriod = () => {
    setSelectedPeriod(null);
    localStorage.removeItem(storageKey);
  };

  return {
    selectedPeriod,
    updatePeriod,
    clearPeriod
  };
};
