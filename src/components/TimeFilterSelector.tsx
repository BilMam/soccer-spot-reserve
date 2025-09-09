import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimeFilterConfig } from '@/hooks/useOwnerStats';

interface TimeFilterSelectorProps {
  currentFilter: TimeFilterConfig;
  onFilterChange: (filter: TimeFilterConfig) => void;
}

const TimeFilterSelector: React.FC<TimeFilterSelectorProps> = ({
  currentFilter,
  onFilterChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Boutons rapides
  const quickFilters: TimeFilterConfig[] = [
    { type: 'today', label: 'Aujourd\'hui' },
    { type: 'last30days', label: '30 derniers jours' },
    { type: 'alltime', label: 'Tout le temps' }
  ];

  // Générer les options pour les mois récents (12 derniers mois)
  const generateMonthOptions = () => {
    const options: TimeFilterConfig[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMMM yyyy', { locale: fr });
      
      options.push({
        type: 'specificMonth',
        value: monthKey,
        label: monthLabel
      });
    }
    
    return options;
  };

  // Générer les options pour les années (5 dernières années)
  const generateYearOptions = () => {
    const options: TimeFilterConfig[] = [];
    const currentYear = new Date().getFullYear();
    
    // Année en cours
    options.push({
      type: 'currentYear',
      label: `${currentYear} (année en cours)`
    });
    
    // Années précédentes
    for (let i = 1; i <= 5; i++) {
      const year = currentYear - i;
      options.push({
        type: 'specificYear',
        value: year.toString(),
        label: year.toString()
      });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();
  const yearOptions = generateYearOptions();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Boutons rapides */}
      <div className="flex gap-2">
        {quickFilters.map((filter) => (
          <Button
            key={filter.type}
            variant={currentFilter.type === filter.type ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Sélecteur avancé */}
      <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4" />
            Plus d'options
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-white" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Mois spécifiques</h4>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {monthOptions.map((filter) => (
                  <Button
                    key={`${filter.type}-${filter.value}`}
                    variant={
                      currentFilter.type === filter.type && 
                      currentFilter.value === filter.value 
                        ? "default" : "outline"
                    }
                    size="sm"
                    className="text-xs capitalize"
                    onClick={() => {
                      onFilterChange(filter);
                      setShowAdvanced(false);
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Années</h4>
              <div className="grid grid-cols-2 gap-2">
                {yearOptions.map((filter) => (
                  <Button
                    key={`${filter.type}-${filter.value || 'current'}`}
                    variant={
                      (currentFilter.type === filter.type && 
                       currentFilter.value === filter.value) ||
                      (currentFilter.type === 'currentYear' && filter.type === 'currentYear')
                        ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      onFilterChange(filter);
                      setShowAdvanced(false);
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Mois en cours</h4>
              <Button
                variant={currentFilter.type === 'currentMonth' ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => {
                  onFilterChange({ type: 'currentMonth', label: 'Mois en cours' });
                  setShowAdvanced(false);
                }}
              >
                {format(new Date(), 'MMMM yyyy', { locale: fr })} (en cours)
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Badge indiquant le filtre actuel */}
      {!quickFilters.some(f => f.type === currentFilter.type) && (
        <Badge variant="secondary" className="text-xs">
          {currentFilter.label}
        </Badge>
      )}
    </div>
  );
};

export default TimeFilterSelector;