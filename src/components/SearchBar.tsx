
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import TimeSlotSelector from './TimeSlotSelector';

const SearchBar = () => {
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [players, setPlayers] = useState('');
  const navigate = useNavigate();

  // Set today's date as default on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (date) params.append('date', date);
    if (timeSlot) params.append('timeSlot', timeSlot);
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

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-gray-200 focus:border-green-500"
          />
        </div>

        {/* Time Slot */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Horaire
          </label>
          <TimeSlotSelector
            value={timeSlot}
            onChange={setTimeSlot}
            placeholder="Choisir un horaire"
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

      <div className="flex justify-end items-center mt-6">
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
