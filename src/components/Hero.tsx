import React from 'react';
import SearchBar from './SearchBar';
const Hero = () => {
  return <div className="relative bg-gradient-to-br from-green-50 via-white to-green-50 py-16 px-4">
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
      
      <div className="relative max-w-7xl mx-auto text-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Trouvez le terrain
              <span className="text-green-600 block">parfait pour jouer</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Réservez des terrains de football exceptionnels près de chez vous. Plus de 30 terrains disponibles dans toute la ville d'Abidjan </p>
          </div>

          <div className="flex justify-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span>Réservation instantanée</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span>Annulation gratuite</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span>Support 24/7</span>
            </div>
          </div>

          <div className="pt-8">
            <SearchBar />
          </div>
        </div>
      </div>
    </div>;
};
export default Hero;