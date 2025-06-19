
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
