
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Field {
  id: string;
  name: string;
  price_per_hour: number;
  capacity: number;
  availability_start: string;
  availability_end: string;
}

interface BookingFormProps {
  field: Field;
  onCancel: () => void;
  onSuccess: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ field, onCancel, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bookingDate: '',
    startTime: '',
    endTime: '',
    playerCount: '',
    specialRequests: ''
  });

  const calculateTotalPrice = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    
    const start = new Date(`2000-01-01 ${formData.startTime}`);
    const end = new Date(`2000-01-01 ${formData.endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return hours > 0 ? hours * field.price_per_hour : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour réserver",
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!formData.bookingDate || !formData.startTime || !formData.endTime) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const totalPrice = calculateTotalPrice();
    if (totalPrice <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner des heures valides",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          field_id: field.id,
          user_id: user.id,
          booking_date: formData.bookingDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          total_price: totalPrice,
          player_count: formData.playerCount ? parseInt(formData.playerCount) : null,
          special_requests: formData.specialRequests || null,
          status: 'pending'
        });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Erreur de réservation",
        description: "Une erreur s'est produite lors de la réservation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const totalPrice = calculateTotalPrice();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Réserver {field.name}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bookingDate" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Date de réservation *</span>
            </Label>
            <Input
              id="bookingDate"
              name="bookingDate"
              type="date"
              value={formData.bookingDate}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Début *</span>
              </Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleInputChange}
                min={field.availability_start}
                max={field.availability_end}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Fin *</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleInputChange}
                min={formData.startTime}
                max={field.availability_end}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerCount" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Nombre de joueurs (max {field.capacity})</span>
            </Label>
            <Input
              id="playerCount"
              name="playerCount"
              type="number"
              value={formData.playerCount}
              onChange={handleInputChange}
              min="1"
              max={field.capacity.toString()}
              placeholder="Optionnel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Demandes spéciales</Label>
            <Textarea
              id="specialRequests"
              name="specialRequests"
              value={formData.specialRequests}
              onChange={handleInputChange}
              placeholder="Équipements supplémentaires, instructions..."
              rows={3}
            />
          </div>

          {totalPrice > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span className="text-green-600">{totalPrice.toFixed(2)}€</span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Réservation..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
