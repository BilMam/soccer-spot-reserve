
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, BarChart3, Users, FileText, Calendar } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Ajouter un terrain",
      description: "Créer un nouveau terrain",
      icon: PlusCircle,
      color: "bg-green-600 hover:bg-green-700",
      action: () => navigate('/add-field')
    },
    {
      title: "Voir les réservations",
      description: "Gérer les demandes",
      icon: Calendar,
      color: "bg-blue-600 hover:bg-blue-700",
      action: () => window.location.hash = '#bookings'
    },
    {
      title: "Gérer les terrains",
      description: "Modifier vos terrains",
      icon: Settings,
      color: "bg-purple-600 hover:bg-purple-700",
      action: () => window.location.hash = '#fields'
    },
    {
      title: "Voir les statistiques",
      description: "Analyser les performances",
      icon: BarChart3,
      color: "bg-orange-600 hover:bg-orange-700",
      action: () => window.location.hash = '#overview'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Actions rapides</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-20 flex flex-col items-center justify-center space-y-2 ${action.color} text-white border-0`}
              onClick={action.action}
            >
              <action.icon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
