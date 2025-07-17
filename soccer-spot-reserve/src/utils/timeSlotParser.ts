
// Utility functions for parsing time slots in search
export interface ParsedTimeSlot {
  startTime: string;
  endTime: string;
  isValid: boolean;
}

export const parseTimeSlot = (timeSlot: string): ParsedTimeSlot => {
  if (!timeSlot || !timeSlot.includes('-')) {
    return { startTime: '', endTime: '', isValid: false };
  }

  const [start, end] = timeSlot.split('-').map(time => time.trim());
  
  if (!start || !end) {
    return { startTime: '', endTime: '', isValid: false };
  }

  // Convert various formats to HH:MM
  const normalizeTime = (time: string): string => {
    // Handle "14h00", "14h", "14:00" formats
    if (time.includes('h')) {
      const [hours, minutes = '00'] = time.split('h');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    // Handle "14:00" format
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    // Handle "14" format (assume full hour)
    return `${time.padStart(2, '0')}:00`;
  };

  try {
    const startTime = normalizeTime(start);
    const endTime = normalizeTime(end);
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return { startTime: '', endTime: '', isValid: false };
    }
    
    // Validate that end time is after start time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      return { startTime: '', endTime: '', isValid: false };
    }
    
    return { startTime, endTime, isValid: true };
  } catch (error) {
    return { startTime: '', endTime: '', isValid: false };
  }
};

export const formatTimeSlot = (startTime: string, endTime: string): string => {
  const formatTime = (time: string) => time.replace(':', 'h');
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
};
