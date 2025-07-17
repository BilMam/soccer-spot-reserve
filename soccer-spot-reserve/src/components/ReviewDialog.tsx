
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  fields: {
    id: string;
    name: string;
  };
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onReviewSubmitted: () => void;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onOpenChange,
  booking,
  onReviewSubmitted
}) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!booking || rating === 0) throw new Error('Données manquantes');
      
      const { error } = await supabase
        .from('reviews')
        .insert({
          field_id: booking.fields.id,
          booking_id: booking.id,
          rating,
          comment: comment.trim() || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Avis publié",
        description: "Merci pour votre avis !",
      });
      setRating(0);
      setComment('');
      onReviewSubmitted();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de publier l'avis.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une note.",
        variant: "destructive",
      });
      return;
    }
    submitReviewMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Laisser un avis</DialogTitle>
        </DialogHeader>
        
        {booking && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">{booking.fields.name}</h3>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Note</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Commentaire (optionnel)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={rating === 0 || submitReviewMutation.isPending}
              >
                Publier l'avis
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
