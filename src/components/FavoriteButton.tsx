
import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  fieldId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  fieldId, 
  variant = 'ghost', 
  size = 'icon',
  className 
}) => {
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(fieldId);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isToggling}
      className={cn(
        "transition-colors",
        className
      )}
      aria-label={isFavorite(fieldId) ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart 
        className={cn(
          "w-4 h-4 transition-colors",
          isFavorite(fieldId) 
            ? "fill-red-500 text-red-500" 
            : "text-gray-400 hover:text-red-500"
        )} 
      />
    </Button>
  );
};

export default FavoriteButton;
