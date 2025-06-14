
import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const [location, setLocation] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [players, setPlayers] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (dateStart) params.append('dateStart', dateStart);
    if (dateEnd) params.append('dateEnd', dateEnd);
    if (players) params.append('players', players);
    
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Où ?
          </label>
          <Input
            placeholder="Ville, quartier..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border-gray-200 focus:border-green-500"
          />
        </div>

        {/* Date Start */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Début
          </label>
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="border-gray-200 focus:border-green-500"
          />
        </div>

        {/* Date End */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Fin
          </label>
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="border-gray-200 focus:border-green-500"
          />
        </div>

        {/* Players */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Joueurs
          </label>
          <Input
            placeholder="Nb joueurs"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            className="border-gray-200 focus:border-green-500"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <Button variant="outline" className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
        </Button>
        
        <Button 
          className="bg-green-600 hover:bg-green-700 px-8 flex items-center space-x-2"
          onClick={handleSearch}
        >
          <Search className="w-4 h-4" />
          <span>Rechercher</span>
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
