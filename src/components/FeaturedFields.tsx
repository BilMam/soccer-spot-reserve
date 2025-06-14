
import React from 'react';
import { useNavigate } from 'react-router-dom';
import FieldCard from './FieldCard';

const FeaturedFields = () => {
  const navigate = useNavigate();

  const featuredFields = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Stade Municipal Jean Bouin',
      location: 'Paris 16ème',
      price: 45,
      rating: 4.8,
      reviews: 124,
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      features: ['Parking', 'Vestiaires', 'Éclairage'],
      capacity: 22,
      type: 'Gazon naturel'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Terrain Synthétique Dupleix',
      location: 'Paris 15ème',
      price: 35,
      rating: 4.6,
      reviews: 89,
      image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      features: ['Wifi', 'Parking', 'Vestiaires'],
      capacity: 14,
      type: 'Synthétique'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'City Stade Belleville',
      location: 'Paris 20ème',
      price: 25,
      rating: 4.4,
      reviews: 67,
      image: 'https://images.unsplash.com/photo-1589952283406-b53a7d1347e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      features: ['Éclairage', 'Accès libre'],
      capacity: 10,
      type: 'Bitume'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Complex Sportif Reuilly',
      location: 'Paris 12ème',
      price: 55,
      rating: 4.9,
      reviews: 156,
      image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      features: ['Parking', 'Vestiaires', 'Wifi', 'Douches'],
      capacity: 22,
      type: 'Gazon naturel'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Five Montparnasse',
      location: 'Paris 14ème',
      price: 40,
      rating: 4.7,
      reviews: 98,
      image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      features: ['Vestiaires', 'Éclairage', 'Climatisation'],
      capacity: 10,
      type: 'Indoor'
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Terrain Bastille Sports',
      location: 'Paris 11ème',
      price: 30,
      rating: 4.3,
      reviews: 75,
      image: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      features: ['Parking', 'Éclairage'],
      capacity: 14,
      type: 'Synthétique'
    }
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Terrains populaires à Paris
          </h2>
          <p className="text-xl text-gray-600">
            Découvrez les terrains les mieux notés par notre communauté
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredFields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button 
            onClick={() => navigate('/search')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Voir tous les terrains
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFields;
