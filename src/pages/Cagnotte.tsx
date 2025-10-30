import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Users, MapPin, Copy, Check, CheckCircle2, XCircle, Loader2, HelpCircle } from 'lucide-react';

interface TeamInfo {
  team: 'A' | 'B';
  team_target: number;
  team_collected: number;
  team_remaining: number;
  team_size: number;
  suggested_part: number;
  teama_collected: number;
  teama_target: number;
  teamb_collected: number;
  teamb_target: number;
  total_collected: number;
  total_amount: number;
  status: string;
  expires_at: string;
  hold_expires_at: string | null;
}

export default function Cagnotte() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const team = searchParams.get('team') as 'A' | 'B' | null;
  
  // Detection des query params de retour PSP
  const thanksParam = searchParams.get('thanks');
  const cancelParam = searchParams.get('cancel');
  const txParam = searchParams.get('tx');
  const amountParam = searchParams.get('amount');
  const [contributionConfirmed, setContributionConfirmed] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [holdTimeLeft, setHoldTimeLeft] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [copiedTeam, setCopiedTeam] = useState<'A' | 'B' | null>(null);

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

  // Charger les infos d'équipe si un team est spécifié
  const { data: teamInfo, isLoading: teamInfoLoading } = useQuery<TeamInfo | null>({
    queryKey: ['team-info', id, team],
    queryFn: async () => {
      if (!team) return null;
      
      const { data, error } = await supabase.rpc('get_cagnotte_team_info', {
        p_cagnotte_id: id,
        p_team: team
      });
      
      if (error) throw error;
      return data as unknown as TeamInfo;
    },
    refetchInterval: 5000,
    enabled: !!id && !!team
  });

  // Charger les contributions
  const { data: contributions } = useQuery({
    queryKey: ['contributions', id, team],
    queryFn: async () => {
      const query = supabase
        .from('cagnotte_contribution')
        .select('*')
        .eq('cagnotte_id', id)
        .eq('status', 'SUCCEEDED')
        .order('created_at', { ascending: false });
      
      if (team) {
        query.eq('team', team);
      }

      const { data, error } = await query;
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
    mutationFn: async ({ amount, team }: { amount: number; team: 'A' | 'B' }) => {
      if (!team) {
        throw new Error('Équipe non spécifiée');
      }
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'initiate-cagnotte-payment',
        {
          body: {
            cagnotte_id: id,
            amount,
            team
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

  // Handle copy to clipboard
  const handleCopyLink = (teamToCopy: 'A' | 'B') => {
    const url = `${window.location.origin}/cagnotte/${id}?team=${teamToCopy}`;
    navigator.clipboard.writeText(url);
    setCopiedTeam(teamToCopy);
    toast.success(`Lien équipe ${teamToCopy} copié`);
    setTimeout(() => setCopiedTeam(null), 2000);
  };

  // Initialize custom amount when team info loads
  useEffect(() => {
    if (teamInfo && !customAmount) {
      setCustomAmount(String(teamInfo.suggested_part || 0));
    }
  }, [teamInfo]);

  // Polling pour vérifier la contribution après retour de paiement
  useEffect(() => {
    if (thanksParam === '1' && txParam && !contributionConfirmed) {
      const pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('cagnotte_contribution')
            .select('status')
            .eq('psp_tx_id', txParam)
            .eq('status', 'SUCCEEDED')
            .maybeSingle();
          
          if (data) {
            setContributionConfirmed(true);
            queryClient.invalidateQueries({ queryKey: ['cagnotte', id] });
            queryClient.invalidateQueries({ queryKey: ['team-info', id, team] });
            queryClient.invalidateQueries({ queryKey: ['contributions', id, team] });
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [thanksParam, txParam, contributionConfirmed, id, team, queryClient]);

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
  
  // Team-specific calculations avec breakdown des frais opérateur
  const MIN_CONTRIBUTION = 3000;
  let suggestedPart = 0;
  let teamRemaining = 0;
  let chosenAmount = 0;
  let operatorTopUp = 0;
  let totalToPay = MIN_CONTRIBUTION;
  let isLastPayment = false;
  
  if (team && teamInfo) {
    suggestedPart = teamInfo.suggested_part || 0;
    teamRemaining = teamInfo.team_remaining || 0;
    
    const inputAmount = parseInt(customAmount) || suggestedPart;
    isLastPayment = teamRemaining <= MIN_CONTRIBUTION;
    
    if (isLastPayment) {
      chosenAmount = teamRemaining;
      operatorTopUp = 0;
      totalToPay = teamRemaining;
    } else {
      chosenAmount = Math.min(Math.max(suggestedPart, inputAmount), teamRemaining);
      operatorTopUp = Math.max(0, MIN_CONTRIBUTION - chosenAmount);
      totalToPay = chosenAmount + operatorTopUp;
    }
  }
  
  const payButtonLabel = isLastPayment 
    ? `Payer le reste (${totalToPay.toLocaleString()} XOF)`
    : `Payer ${totalToPay.toLocaleString()} XOF`;
  
  const progressA = teamInfo ? (teamInfo.teama_collected / teamInfo.teama_target * 100) : 0;
  const progressB = teamInfo ? (teamInfo.teamb_collected / teamInfo.teamb_target * 100) : 0;

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

      {/* Bandeau retour paiement */}
      {thanksParam === '1' && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2">
            {contributionConfirmed ? (
              <span className="text-green-800 font-medium">
                ✅ Merci ! Contribution de {amountParam ? `${parseInt(amountParam).toLocaleString()} XOF` : ''} enregistrée. 🎉
                {txParam && <span className="text-xs block mt-1">Référence : {txParam}</span>}
              </span>
            ) : (
              <span className="text-green-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                ⏳ Paiement reçu, en attente de confirmation de l'opérateur…
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {cancelParam === '1' && (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50">
          <XCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="ml-2 text-yellow-800">
            Paiement annulé. Vous pouvez réessayer.
          </AlertDescription>
        </Alert>
      )}

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
          
          {/* Boutons de partage si pas d'équipe sélectionnée */}
          {!team && cagnotte.status === 'IN_PROGRESS' && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => handleCopyLink('A')}
                className="flex items-center gap-2"
              >
                {copiedTeam === 'A' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Partager Équipe A
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCopyLink('B')}
                className="flex items-center gap-2"
              >
                {copiedTeam === 'B' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Partager Équipe B
              </Button>
            </div>
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
                    Reste à collecter : {(cagnotte.total_amount - cagnotte.collected_amount).toLocaleString()} XOF
                  </p>
                </div>
              )}

              {/* CTA Payer */}
              {team && teamInfo ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-lg">
                        Équipe {team}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {teamInfo.team_size} joueurs
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Part suggérée: {suggestedPart.toLocaleString()} XOF</p>
                      <p>Reste équipe: {teamRemaining.toLocaleString()} XOF</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Montant de contribution (XOF)
                    </label>
                    <Input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      min={isLastPayment ? teamRemaining : MIN_CONTRIBUTION}
                      max={teamRemaining}
                      placeholder={String(suggestedPart)}
                      className="text-lg"
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!isLastPayment && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomAmount(String(suggestedPart))}
                        >
                          1 part
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomAmount(String(suggestedPart * 2))}
                          disabled={suggestedPart * 2 > teamRemaining}
                        >
                          +2 parts
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomAmount(String(teamRemaining))}
                    >
                      Tout le reliquat
                    </Button>
                  </div>

                  {/* Breakdown des frais */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Votre part :</span>
                      <span className="font-medium">{chosenAmount.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Ajustement opérateur :
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Le prestataire de paiement impose 3 000 XOF minimum par transaction. 
                                Seul le dernier paiement (pour boucler la cagnotte) peut être inférieur.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <span className="font-medium">{operatorTopUp.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-semibold">Total débité :</span>
                      <span className="font-bold text-lg">{totalToPay.toLocaleString()} XOF</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => contributeMutation.mutate({ amount: totalToPay, team })}
                    disabled={contributeMutation.isPending || teamRemaining <= 0}
                    className="w-full text-lg py-6"
                    size="lg"
                  >
                    {contributeMutation.isPending 
                      ? 'Redirection...' 
                      : payButtonLabel}
                  </Button>
                  {operatorTopUp > 0 && (
                    <p className="text-xs text-center text-muted-foreground">
                      dont ajustement opérateur {operatorTopUp.toLocaleString()} XOF
                    </p>
                  )}
                </div>
              ) : !team && (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    Partage les liens ci-dessus avec tes équipes pour commencer la collecte !
                  </p>
                </div>
              )}

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

              {/* Barres de progression par équipe */}
              {teamInfo && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Équipe A</span>
                      <span className="text-sm font-bold">
                        {progressA.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progressA} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{teamInfo.teama_collected.toLocaleString()} XOF</span>
                      <span>{teamInfo.teama_target.toLocaleString()} XOF</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Équipe B</span>
                      <span className="text-sm font-bold">
                        {progressB.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progressB} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{teamInfo.teamb_collected.toLocaleString()} XOF</span>
                      <span>{teamInfo.teamb_target.toLocaleString()} XOF</span>
                    </div>
                  </div>
                </div>
              )}

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
