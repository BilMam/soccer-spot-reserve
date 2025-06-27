
import React from 'react';
import { Shield, Clock, CreditCard, Star, MapPin, Users } from 'lucide-react';
const Features = () => {
  const features = [{
    icon: <Shield className="w-8 h-8" />,
    title: 'Réservation sécurisée',
    description: 'Tous vos paiements sont protégés et vos données sécurisées.'
  }, {
    icon: <Clock className="w-8 h-8" />,
    title: 'Disponible 24/7',
    description: 'Réservez votre terrain à tout moment, même la nuit.'
  }, {
    icon: <CreditCard className="w-8 h-8" />,
    title: 'Annulation gratuite',
    description: 'Annulez votre réservation jusqu\'à 2h avant sans frais.'
  }, {
    icon: <Star className="w-8 h-8" />,
    title: 'Terrains vérifiés',
    description: 'Tous nos terrains sont inspectés et notés par nos équipes.'
  }, {
    icon: <MapPin className="w-8 h-8" />,
    title: 'Partout en Côte d\'Ivoire',
    description: 'Plus de 500 villes couvertes dans toute la Côte d\'Ivoire.'
  }, {
    icon: <Users className="w-8 h-8" />,
    title: 'Communauté active',
    description: 'Rejoignez plus de 50 000 joueurs actifs sur la plateforme.'
  }];
  return <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi choisir MySport ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">La première plateforme de réservation de terrains de football à Abidjan, conçue par des passionnés pour des passionnés.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => <div key={index} className="text-center p-8 rounded-2xl hover:shadow-lg transition-all duration-300 hover:bg-green-50 group">
              <div className="text-green-600 mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>)}
        </div>
      </div>
    </section>;
};
export default Features;
