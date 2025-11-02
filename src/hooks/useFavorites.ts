
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { calculatePublicPrice } from '@/utils/publicPricing';

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les favoris de l'utilisateur
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          field_id,
          fields (
            id,
            name,
            location,
            price_per_hour,
            net_price_1h,
            public_price_1h,
            rating,
            total_reviews,
            images,
            field_type
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Transformer les données pour calculer le prix public
      const favoritesWithPublicPrice = data?.map((fav) => {
        const field = fav.fields;
        const publicPrice = field.public_price_1h
          ?? (field.net_price_1h ? calculatePublicPrice(field.net_price_1h) : null)
          ?? (field.price_per_hour ? calculatePublicPrice(field.price_per_hour) : null);
        return {
          ...fav,
          fields: {
            ...field,
            price_per_hour: publicPrice,
          },
        };
      }) || [];
      
      return favoritesWithPublicPrice;
    },
    enabled: !!user
  });

  // Ajouter aux favoris
  const addToFavoritesMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, field_id: fieldId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast({
        title: "Ajouté aux favoris",
        description: "Ce terrain a été ajouté à vos favoris.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter ce terrain aux favoris.",
        variant: "destructive"
      });
    }
  });

  // Retirer des favoris
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('field_id', fieldId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast({
        title: "Retiré des favoris",
        description: "Ce terrain a été retiré de vos favoris.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Impossible de retirer ce terrain des favoris.",
        variant: "destructive"
      });
    }
  });

  // Vérifier si un terrain est en favori
  const isFavorite = (fieldId: string) => {
    return favorites.some(fav => fav.field_id === fieldId);
  };

  // Toggle favori
  const toggleFavorite = (fieldId: string) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour ajouter des favoris.",
        variant: "destructive"
      });
      return;
    }

    if (isFavorite(fieldId)) {
      removeFromFavoritesMutation.mutate(fieldId);
    } else {
      addToFavoritesMutation.mutate(fieldId);
    }
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    isToggling: addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending
  };
};
