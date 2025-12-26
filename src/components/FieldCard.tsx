import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Users, MessageCircle, Wifi, Car, Droplets, Sun, Wind, Shield, Home, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatXOF } from '@/utils/publicPricing';

export interface FieldPromo {
  discountType: 'percent' | 'fixed';
  discountValue: number;
  endDate?: string | null;
  isAutomatic?: boolean;
}

export interface Field {
  id: string;
  name: string;
  location: string;
  price: number; // Prix public
  rating: number;
  reviews: number;
  image: string;
  features: string[];
  capacity: number;
  type: string;
  sportType?: string;
}

interface FieldCardProps {
  field: Field;
  promos?: FieldPromo[];
}

const FieldCard: React.FC<FieldCardProps> = ({ field, promos = [] }) => {
  const navigate = useNavigate();
  
  const getFeatureIcon = (feature: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Éclairage': <Sun className="w-3 h-3" />,
      'Parking': <Car className="w-3 h-3" />,
      'Vestiaires': <Home className="w-3 h-3" />,
      'Douches': <Droplets className="w-3 h-3" />,
      'Wifi': <Wifi className="w-3 h-3" />,
      'Sécurité': <Shield className="w-3 h-3" />,
      'Climatisation': <Wind className="w-3 h-3" />,
    };
    return iconMap[feature] || null;
  };

  const handleClick = () => {
    navigate(`/field/${field.id}`);
  };

  // Calcul du prix avec la meilleure promo
  const bestPromo = promos.length > 0 ? promos[0] : null; // Déjà trié par valeur
  
  let displayPrice = field.price;
  if (bestPromo) {
    if (bestPromo.discountType === 'percent') {
      displayPrice = Math.round(field.price * (1 - bestPromo.discountValue / 100));
    } else {
      displayPrice = Math.max(0, field.price - bestPromo.discountValue);
    }
  }

  // Limiter à 2 badges + compteur si plus
  const displayPromos = promos.slice(0, 2);
  const extraPromosCount = promos.length - 2;

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
      onClick={handleClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={field.image || '/placeholder.svg'}
          alt={field.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Badge type de terrain */}
        <Badge 
          className="absolute top-3 left-3 bg-green-500 hover:bg-green-500 text-white"
        >
          {field.type}
        </Badge>
        
        {/* Rating + Promo badges (droite) */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {/* Rating */}
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {field.rating.toFixed(1)}
          </Badge>
          
          {/* Promo badges */}
          {displayPromos.map((promo, index) => (
            <Badge 
              key={index}
              className={`text-xs ${
                promo.isAutomatic 
                  ? 'bg-purple-500/90 hover:bg-purple-500/90' 
                  : 'bg-orange-500/90 hover:bg-orange-500/90'
              } backdrop-blur-sm text-white`}
            >
              {promo.isAutomatic && <Zap className="w-3 h-3 mr-0.5" />}
              {promo.discountType === 'percent' 
                ? `-${promo.discountValue}%` 
                : `-${formatXOF(promo.discountValue)}`
              }
            </Badge>
          ))}
          
          {/* Badge compteur si plus de 2 promos */}
          {extraPromosCount > 0 && (
            <Badge 
              variant="outline" 
              className="text-xs bg-background/90 backdrop-blur-sm border-primary text-primary"
            >
              +{extraPromosCount}
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{field.name}</h3>
        
        <div className="flex items-center text-muted-foreground text-sm mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{field.location}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {field.capacity} joueurs
          </span>
          <span className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-1" />
            {field.reviews} avis
          </span>
        </div>
        
        {field.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {field.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {getFeatureIcon(feature)}
                <span className="ml-1">{feature}</span>
              </Badge>
            ))}
            {field.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{field.features.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-baseline gap-2">
            {bestPromo ? (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  {formatXOF(field.price)}
                </span>
                <span className="text-lg font-bold text-green-600">
                  {formatXOF(displayPrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">
                {formatXOF(field.price)}
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">/heure</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FieldCard;
