
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Clock, Wifi, Car } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Field {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  features: string[];
  capacity: number;
  type: string;
}

interface FieldCardProps {
  field: Field;
}

const FieldCard: React.FC<FieldCardProps> = ({ field }) => {
  const navigate = useNavigate();

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'wifi':
        return <Wifi className="w-3 h-3" />;
      case 'parking':
        return <Car className="w-3 h-3" />;
      case 'vestiaires':
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    navigate(`/field/${field.id}`);
  };

  return (
    <Card 
      id={`field-${field.id}`}
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={field.image}
          alt={field.name}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-green-600 hover:bg-green-700">
            {field.type}
          </Badge>
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium">{field.rating}</span>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-green-600 transition-colors">
              {field.name}
            </h3>
            <div className="flex items-center text-gray-500 text-sm mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              {field.location}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-gray-600 text-sm">
              <Users className="w-4 h-4" />
              <span>{field.capacity} joueurs max</span>
            </div>
            <div className="text-sm text-gray-500">
              {field.reviews} avis
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {field.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-1">
                {getFeatureIcon(feature)}
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <span className="text-xl font-bold text-gray-900">{field.price.toLocaleString()} XOF</span>
              <span className="text-gray-500 text-sm">/heure</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FieldCard;
