
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Calendar } from 'lucide-react';
import { useUserBadges } from '@/hooks/useUserBadges';

const UserBadges: React.FC = () => {
  const { badges, isLoading, getBadgeIcon } = useUserBadges();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Mes badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-16 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="w-5 h-5 mr-2" />
          Mes badges ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun badge gagné pour le moment</p>
            <p className="text-sm">Laissez des avis pour gagner vos premiers badges !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {badges.map((badge) => (
              <div key={badge.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="text-3xl">
                  {getBadgeIcon(badge.badge_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{badge.badge_name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {badge.badge_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    Obtenu le {new Date(badge.earned_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserBadges;
