
// Utility functions for time calculations and formatting
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 8; hour <= 22; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return times;
};

export const calculateDuration = (startTime: string, endTime: string): {
  hours: number;
  minutes: number;
  display: string;
} => {
  if (!startTime || !endTime) return { hours: 0, minutes: 0, display: '0h' };
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const totalMinutes = endMinutes - startMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let display = '';
  if (hours > 0) display += `${hours}h`;
  if (minutes > 0) display += `${minutes}min`;
  if (display === '') display = '0h';
  
  return { hours, minutes, display };
};

// Fonction utilitaire pour normaliser les formats d'heures (retirer les secondes)
export const normalizeTime = (time: string): string => {
  if (!time) return '';
  return time.slice(0, 5); // Garde seulement HH:MM
};

// Fonction pour formater une date pour Supabase (format YYYY-MM-DD sans décalage timezone)
export const formatDateForSupabase = (dateInput: string | Date): string => {
  if (typeof dateInput === 'string') {
    // Si c'est déjà "2025-11-02" ou "2025-11-02T00:00:00.000Z"
    return dateInput.split('T')[0];
  }

  const y = dateInput.getFullYear();
  const m = String(dateInput.getMonth() + 1).padStart(2, '0');
  const d = String(dateInput.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
