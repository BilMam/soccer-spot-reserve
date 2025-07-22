import { Button } from "@/components/ui/button";
import { forceConfirmBooking } from "@/utils/confirmBooking";
import { toast } from "sonner";

export const ConfirmBookingButton = () => {
  const handleConfirm = async () => {
    try {
      console.log('🔧 Manual confirmation started...');
      await forceConfirmBooking('19fa98db-497d-4167-829c-9b94fccb0e59');
      toast.success('Réservation confirmée manuellement !');
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la confirmation');
    }
  };

  return (
    <Button 
      onClick={handleConfirm}
      className="bg-red-500 hover:bg-red-600 text-white"
    >
      🔧 Confirmer ma réservation MySport 23/07 8h-9h
    </Button>
  );
};