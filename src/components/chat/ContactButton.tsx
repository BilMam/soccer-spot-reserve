import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ContactButtonProps {
  bookingId: string;
  fieldId: string;
  ownerId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function ContactButton({
  bookingId,
  fieldId,
  ownerId,
  variant = 'outline',
  size = 'sm',
  className,
}: ContactButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleContact = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour contacter le propriétaire',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Vérifier si une conversation existe déjà pour cette réservation
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingConv) {
        // Conversation existante, rediriger
        navigate(`/conversation/${existingConv.id}`);
        return;
      }

      // Créer une nouvelle conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          field_id: fieldId,
          booking_id: bookingId,
          created_by_user_id: user.id,
          status: 'open',
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Ajouter les participants (utilisateur + propriétaire)
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: newConv.id,
            user_id: user.id,
            role: 'user',
          },
          {
            conversation_id: newConv.id,
            user_id: ownerId,
            role: 'owner',
          },
        ]);

      if (participantsError) throw participantsError;

      // Rediriger vers la conversation
      navigate(`/conversation/${newConv.id}`);
    } catch (error) {
      console.error('Erreur création conversation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de démarrer la conversation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleContact}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <MessageCircle className="w-4 h-4 mr-2" />
          Contacter
        </>
      )}
    </Button>
  );
}
