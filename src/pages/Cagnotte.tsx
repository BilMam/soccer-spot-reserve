import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Users, MapPin } from 'lucide-react';

export default function Cagnotte() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [holdTimeLeft, setHoldTimeLeft] = useState<string>('');

  // Charger la cagnotte
  const { data: cagnotte, isLoading } = useQuery({
    queryKey: ['cagnotte', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cagnotte')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Charger les données liées séparément
      const [fieldData, creatorData] = await Promise.all([
        supabase.from('fields').select('name, location, address, city, images').eq('id', data.field_id).single(),
        supabase.from('profiles').select('full_name').eq('id', data.created_by_user_id).single()
      ]);

      return {
        ...data,
        field: fieldData.data,
        creator: creatorData.data
      };
    },
    refetchInterval: 5000,
    enabled: !!id
  });

  // Charger les contributions
  const { data: contributions } = useQuery({
    queryKey: ['contributions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cagnotte_contribution')
        .select('*')
        .eq('cagnotte_id', id)
        .eq('status', 'SUCCEEDED')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
    enabled: !!id
  });

  // Calculer les timers
  useEffect(() => {
    if (!cagnotte) return;

    const interval = setInterval(() => {
      // Timer global
      const expiresAt = new Date(cagnotte.expires_at);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('Expiré');
      }

      // Timer HOLD si actif
      if (cagnotte.status === 'HOLD' && cagnotte.hold_expires_at) {
        const holdExpiresAt = new Date(cagnotte.hold_expires_at);
        const holdDiff = holdExpiresAt.getTime() - now.getTime();

        if (holdDiff > 0) {
          const holdMinutes = Math.floor(holdDiff / 60000);
          const holdSeconds = Math.floor((holdDiff % 60000) / 1000);
          setHoldTimeLeft(`${holdMinutes}:${holdSeconds.toString().padStart(2, '0')}`);
        } else {
          setHoldTimeLeft('Expiré');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cagnotte]);

  // Mutation pour contribuer
  const contributeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'initiate-cagnotte-payment',
        {
          body: {
            cagnotte_id: id,
            amount,
            team: null
          }
        }
      );

      if (paymentError) throw paymentError;
      
      // Rediriger vers la page de paiement PSP
      if (paymentData?.payment_url) {
        window.location.href = paymentData.payment_url;
      }
    },
    onError: (error: any) => {
      toast.error('Erreur lors du paiement', {
        description: error.message
      });
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!cagnotte) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Cagnotte introuvable</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = (cagnotte.collected_amount / cagnotte.total_amount) * 100;
  const remainingAmount = cagnotte.total_amount - cagnotte.collected_amount;
  
  // Calcul du montant de contribution suggéré
  const MIN_CONTRIBUTION = 3000;
  const isLastPayment = remainingAmount < MIN_CONTRIBUTION;
  const payAmount = isLastPayment 
    ? remainingAmount 
    : Math.min(Math.max(MIN_CONTRIBUTION, Math.ceil(remainingAmount / 2)), remainingAmount);
  const payButtonLabel = isLastPayment 
    ? `Payer le reste (${payAmount.toLocaleString()} XOF)`
    : `Payer ma part (${payAmount.toLocaleString()} XOF)`;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="h-6 w-6" />
            Cagnotte Équipe
          </CardTitle>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="font-semibold">{cagnotte.field?.name}</span>
              {cagnotte.field?.city && <span>• {cagnotte.field.city}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(cagnotte.slot_date), 'EEEE dd MMMM yyyy', { locale: fr })} · {' '}
                {cagnotte.slot_start_time.slice(0, 5)} - {cagnotte.slot_end_time.slice(0, 5)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Image du terrain */}
          {cagnotte.field?.images?.[0] && (
            <img
              src={cagnotte.field.images[0]}
              alt={cagnotte.field.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          {/* Statut de la cagnotte */}
          {cagnotte.status === 'CONFIRMED' ? (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-bold text-green-800 mb-2">
                Réservation confirmée !
              </h3>
              <p className="text-green-700 mb-4">
                Réservé au nom de : <span className="font-semibold">{cagnotte.creator?.full_name}</span>
              </p>
              <div className="text-sm text-green-600 space-y-1">
                <p>{format(new Date(cagnotte.slot_date), 'EEEE dd MMMM', { locale: fr })}</p>
                <p>
                  {cagnotte.slot_start_time.slice(0, 5)} - {cagnotte.slot_end_time.slice(0, 5)}
                </p>
                <p className="font-semibold">{cagnotte.field?.name}</p>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Présentez-vous directement au centre, c'est enregistré.
              </p>
            </div>
          ) : cagnotte.status === 'EXPIRED' || cagnotte.status === 'REFUNDING' || cagnotte.status === 'REFUNDED' ? (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">😔</div>
              <h3 className="text-xl font-bold text-red-800 mb-2">
                Cagnotte échouée
              </h3>
              <p className="text-red-700 mb-2">
                {cagnotte.status === 'REFUNDED' 
                  ? 'Tous les paiements ont été remboursés.'
                  : 'Remboursement en cours…'}
              </p>
              <p className="text-sm text-red-600">
                Vous serez recrédité sur votre moyen de paiement (1–5 jours ouvrés selon l'opérateur).
              </p>
            </div>
          ) : (
            <>
              {/* Barre de progression */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Progression
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <Progress value={progress} className="h-4 mb-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{cagnotte.collected_amount.toLocaleString()} XOF</span>
                  <span>{cagnotte.total_amount.toLocaleString()} XOF</span>
                </div>
              </div>

              {/* Timer global */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 mb-1">
                  Temps restant pour atteindre 100%
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {timeLeft}
                </p>
              </div>

              {/* Badge HOLD si actif */}
              {cagnotte.status === 'HOLD' && (
                <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⏳</span>
                    <h4 className="font-bold text-yellow-900">
                      Exclusivité activée !
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-700 mb-2">
                    Vous avez sécurisé le terrain temporairement. Finalisez la collecte avant :
                  </p>
                  <p className="text-xl font-bold text-yellow-900">
                    {holdTimeLeft}
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    Reste à collecter : {remainingAmount.toLocaleString()} XOF
                  </p>
                </div>
              )}

              {/* CTA Payer */}
              <Button
                onClick={() => contributeMutation.mutate(payAmount)}
                disabled={contributeMutation.isPending}
                className="w-full text-lg py-6"
                size="lg"
              >
                {contributeMutation.isPending 
                  ? 'Redirection...' 
                  : payButtonLabel}
              </Button>

              {/* Infos importantes */}
              <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  ℹ️ Le créneau se bloque définitivement quand la cagnotte atteint 100%. 
                  Avant, il reste public.
                </p>
                <p>
                  💰 Si la cagnotte échoue, le remboursement est lancé automatiquement. 
                  Délai 1–5 jours ouvrés selon l'opérateur.
                </p>
              </div>

              {/* Liste des contributions */}
              {contributions && contributions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Contributions ({contributions.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {contributions.map(contrib => (
                      <div
                        key={contrib.id}
                        className="flex justify-between items-center bg-card border rounded p-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {new Date(contrib.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="font-semibold text-primary">
                          +{contrib.amount.toLocaleString()} XOF
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
