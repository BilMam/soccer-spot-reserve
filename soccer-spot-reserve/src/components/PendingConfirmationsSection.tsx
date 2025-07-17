
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import BookingConfirmationCard from './BookingConfirmationCard';

interface PendingConfirmationsSectionProps {
  pendingConfirmations: any[];
  onConfirm: () => void;
}

const PendingConfirmationsSection: React.FC<PendingConfirmationsSectionProps> = ({ 
  pendingConfirmations, 
  onConfirm 
}) => {
  if (pendingConfirmations.length === 0) {
    return null;
  }

  // Trier les confirmations par urgence
  const sortedPendingConfirmations = pendingConfirmations.sort((a, b) => {
    const urgentTypes = ['express', 'short'];
    const aUrgent = urgentTypes.includes(a.confirmation_window_type || '');
    const bUrgent = urgentTypes.includes(b.confirmation_window_type || '');
    
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    
    // Si même urgence, trier par deadline
    const aDeadline = new Date(a.confirmation_deadline || 0);
    const bDeadline = new Date(b.confirmation_deadline || 0);
    return aDeadline.getTime() - bDeadline.getTime();
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <span>Confirmations requises ({sortedPendingConfirmations.length})</span>
      </h3>
      <div className="space-y-4">
        {sortedPendingConfirmations.map((booking) => (
          <BookingConfirmationCard
            key={booking.id}
            booking={booking}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  );
};

export default PendingConfirmationsSection;
