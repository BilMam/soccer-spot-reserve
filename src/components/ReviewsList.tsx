
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, User, ChevronDown } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name: string;
}

interface ReviewsListProps {
  fieldId: string;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ fieldId }) => {
  const [showAll, setShowAll] = useState(false);

  const { data: limitedReviews, isLoading } = useQuery({
    queryKey: ['reviews', fieldId, 'limited'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *
        `)
        .eq('field_id', fieldId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Review[];
    }
  });

  const { data: allReviews } = useQuery({
    queryKey: ['reviews', fieldId, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *
        `)
        .eq('field_id', fieldId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
    enabled: showAll
  });

  const { data: totalCount } = useQuery({
    queryKey: ['reviews-count', fieldId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('field_id', fieldId);

      if (error) throw error;
      return count || 0;
    }
  });

  const reviews = showAll ? allReviews : limitedReviews;
  const remainingCount = (totalCount || 0) - 5;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Avis des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-20 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Avis des utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!reviews || reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun avis pour ce terrain</p>
            <p className="text-sm">Soyez le premier à laisser un avis !</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {review.reviewer_name || 'Utilisateur anonyme'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
            
            {totalCount && totalCount > 5 && (
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full flex items-center justify-center gap-2 text-primary hover:text-primary/80"
                >
                  {showAll ? (
                    <>
                      Afficher moins
                      <ChevronDown className={`w-4 h-4 transition-transform rotate-180`} />
                    </>
                  ) : (
                    <>
                      Afficher tous les avis (+{remainingCount})
                      <ChevronDown className={`w-4 h-4 transition-transform`} />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewsList;
