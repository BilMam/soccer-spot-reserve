
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TimeSlotSelector from './TimeSlotSelector';
import { SPORTS } from '@/constants/sports';

const SearchBar = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [players, setPlayers] = useState('');
  const [sport, setSport] = useState('all');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const handleSearch = () => {
    const searchParams = new URLSearchParams({
      location: location || '',
      date: date || '',
      timeSlot: timeSlot || '',
      players: players || '',
      sport: sport || 'all',
    });
    navigate(`/search?${searchParams.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-5xl mx-auto border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Sport */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            🏆 Sport
          </label>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="border-gray-200 focus:border-green-500">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sports</SelectItem>
              {SPORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.icon} {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-green-600" />
            Lieu
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Cocody, Plateau..."
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Calendar className="w-4 h-4 mr-1 text-green-600" />
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
          />
        </div>

        {/* Time Slot */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Clock className="w-4 h-4 mr-1 text-green-600" />
            Créneau
          </label>
          <TimeSlotSelector 
            value={timeSlot}
            onChange={setTimeSlot}
          />
        </div>

        {/* Players */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Users className="w-4 h-4 mr-1 text-green-600" />
            Participants
          </label>
          <input
            type="number"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
            placeholder="Ex: 10"
            min="2"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
          />
        </div>

        {/* Search Button */}
        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            Rechercher
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
