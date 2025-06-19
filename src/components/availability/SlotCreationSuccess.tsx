
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Eye } from 'lucide-react';

interface SlotCreationSuccessProps {
  slotsCreated: number;
  startDate: Date;
  endDate: Date;
  onViewCalendar: () => void;
  onCreateNew: () => void;
}

const SlotCreationSuccess: React.FC<SlotCreationSuccessProps> = ({
  slotsCreated,
  startDate,
  endDate,
  onViewCalendar,
  onCreateNew
}) => {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-6 h-6" />
          Créneaux créés avec succès !
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">
            {slotsCreated}
          </div>
          <p className="text-green-700">
            créneaux ont été créés pour la période sélectionnée
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-600 text-center">
            Les créneaux sont maintenant disponibles à la réservation
            et peuvent être consultés dans le calendrier.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={onViewCalendar}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir le calendrier
          </Button>
          <Button
            onClick={onCreateNew}
            variant="outline"
            className="flex-1"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Créer une nouvelle période
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlotCreationSuccess;
