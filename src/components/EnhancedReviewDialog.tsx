
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Sparkles, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Booking {
  id: string;
  fields: {
    id: string;
    name: string;
  };
}

interface EnhancedReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onReviewSubmitted: () => void;
}

interface ReviewCategory {
  id: string;
  name: string;
  label: string;
  icon: string;
  rating: number;
}

const EnhancedReviewDialog: React.FC<EnhancedReviewDialogProps> = ({
  open,
  onOpenChange,
  booking,
  onReviewSubmitted
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [step, setStep] = useState(1); // 1: categories, 2: comment, 3: preview
  
  const [categories, setCategories] = useState<ReviewCategory[]>([
    { id: 'cleanliness', name: 'cleanliness', label: 'Propreté', icon: '🧹', rating: 0 },
    { id: 'equipment', name: 'equipment', label: 'Équipement', icon: '⚽', rating: 0 },
    { id: 'location', name: 'location', label: 'Emplacement', icon: '📍', rating: 0 },
    { id: 'service', name: 'service', label: 'Service', icon: '👥', rating: 0 },
    { id: 'value', name: 'value', label: 'Rapport qualité-prix', icon: '💰', rating: 0 }
  ]);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!booking || overallRating === 0) throw new Error('Données manquantes');
      
      // Créer l'avis principal
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          field_id: booking.fields.id,
          booking_id: booking.id,
          rating: overallRating,
          comment: comment.trim() || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Créer les catégories d'évaluation
      const categoryInserts = categories
        .filter(cat => cat.rating > 0)
        .map(cat => ({
          review_id: reviewData.id,
          category: cat.name,
          rating: cat.rating
        }));

      if (categoryInserts.length > 0) {
        const { error: categoryError } = await supabase
          .from('review_categories')
          .insert(categoryInserts);

        if (categoryError) throw categoryError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Avis publié avec succès ! ⭐",
        description: "Merci pour votre contribution à la communauté !",
      });
      resetForm();
      onReviewSubmitted();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de publier l'avis.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setOverallRating(0);
    setComment('');
    setStep(1);
    setCategories(prev => prev.map(cat => ({ ...cat, rating: 0 })));
  };

  const updateCategoryRating = (categoryId: string, rating: number) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId ? { ...cat, rating } : cat
      )
    );
  };

  const calculateOverallRating = () => {
    const ratedCategories = categories.filter(cat => cat.rating > 0);
    if (ratedCategories.length === 0) return 0;
    
    const total = ratedCategories.reduce((sum, cat) => sum + cat.rating, 0);
    return Math.round(total / ratedCategories.length);
  };

  const getCommentSuggestions = (rating: number) => {
    const suggestions = {
      5: ["Excellente expérience !", "Parfait, je recommande vivement", "Rien à redire, c'était parfait"],
      4: ["Très bonne expérience", "Quelques petits détails à améliorer", "Dans l'ensemble très satisfait"],
      3: ["Expérience correcte", "Quelques points à améliorer", "Pas mal mais peut mieux faire"],
      2: ["Expérience décevante", "Plusieurs problèmes rencontrés", "Attentes non satisfaites"],
      1: ["Très décevant", "Nombreux problèmes", "Ne recommande pas"]
    };
    return suggestions[rating as keyof typeof suggestions] || [];
  };

  const renderStars = (rating: number, onRate?: (rating: number) => void, hovered?: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-6 h-6 cursor-pointer transition-colors ${
          i < (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
        onClick={() => onRate?.(i + 1)}
        onMouseEnter={() => onRate && setHoveredRating(i + 1)}
        onMouseLeave={() => onRate && setHoveredRating(0)}
      />
    ));
  };

  const nextStep = () => {
    if (step === 1) {
      const newOverallRating = calculateOverallRating();
      setOverallRating(newOverallRating);
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
            Évaluer votre expérience
          </DialogTitle>
          <DialogDescription>
            {booking?.fields.name} - Étape {step} sur 3
          </DialogDescription>
        </DialogHeader>

        {/* Étape 1: Évaluation par catégories */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-medium">{category.label}</span>
                    </div>
                    {category.rating > 0 && (
                      <Badge variant="secondary">{category.rating}/5</Badge>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    {renderStars(category.rating, (rating) => updateCategoryRating(category.id, rating))}
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={nextStep}
                disabled={categories.every(cat => cat.rating === 0)}
                className="bg-green-600 hover:bg-green-700"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2: Commentaire */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-2 p-4 bg-green-50 rounded-lg">
              <span className="text-lg font-medium">Note globale:</span>
              <div className="flex space-x-1">
                {renderStars(overallRating)}
              </div>
              <span className="text-lg font-bold text-green-600">{overallRating}/5</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Commentaire (optionnel)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience en détail..."
                rows={4}
                className="resize-none"
              />
            </div>

            {overallRating > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Suggestions de commentaires :</p>
                <div className="space-y-2">
                  {getCommentSuggestions(overallRating).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setComment(suggestion)}
                      className="mr-2 mb-2"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Retour
              </Button>
              <Button onClick={nextStep} className="bg-green-600 hover:bg-green-700">
                Aperçu
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3: Aperçu et confirmation */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Aperçu de votre avis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Note globale:</span>
                    <div className="flex items-center space-x-2">
                      {renderStars(overallRating)}
                      <span className="font-bold">{overallRating}/5</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {categories.filter(cat => cat.rating > 0).map((category) => (
                      <div key={category.id} className="flex items-center justify-between text-sm">
                        <span>{category.icon} {category.label}</span>
                        <span>{category.rating}/5</span>
                      </div>
                    ))}
                  </div>

                  {comment && (
                    <div>
                      <span className="font-medium">Commentaire:</span>
                      <p className="text-gray-700 italic mt-1">"{comment}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Modifier
              </Button>
              <Button
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitReviewMutation.isPending ? 'Publication...' : 'Publier l\'avis'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedReviewDialog;
