import { getBaseUrl } from '@/lib/config';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Users, MapPin, Copy, Check, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
  const [amountHint, setAmountHint] = useState<string>('');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

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
        .select('id, amount, team, status, created_at, handle_snapshot, identity_badge, payer_phone_masked, proof_code')
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

      // Vérifier à la fois paymentError ET paymentData.error
      if (paymentError) throw paymentError;
      if (paymentData?.error) {
        throw new Error(paymentData.error);
      }

      // Vérifier que payment_url existe avant de retourner
      if (!paymentData?.payment_url) {
        throw new Error('URL de paiement manquante dans la réponse');
      }

      return paymentData;
    },
    onError: (error: any) => {
      toast.error('Erreur lors du paiement', {
        description: error.message
      });
      setIsPaymentProcessing(false);
    }
  });

  // Handler pour contribuer avec arrondi et cap
  const handleContribute = async (amountInput: number) => {
    setIsPaymentProcessing(true);
    
    // Vérifier que teamInfo existe
    if (!teamInfo) {
      toast.error("Impossible de charger les informations d'équipe");
      setIsPaymentProcessing(false);
      return;
    }

    // Vérifier que la cagnotte est active
    if (cagnotte?.status === 'EXPIRED' || cagnotte?.status === 'CANCELED') {
      toast.error("Cette cagnotte n'est plus active");
      setIsPaymentProcessing(false);
      return;
    }
    
    // Arrondir au supérieur et caper au reliquat
    const amountInt = Math.ceil(amountInput);
    const teamRemainingInt = Math.floor(teamInfo.team_remaining);
    const cappedAmount = Math.min(amountInt, teamRemainingInt);
    
    if (cappedAmount <= 0) {
      toast.error("Montant invalide ou équipe déjà complète");
      setIsPaymentProcessing(false);
      return;
    }
    
    console.log(`💰 Paiement: demandé ${amountInt}, cappé à ${cappedAmount} XOF`);
    
    contributeMutation.mutate({ amount: cappedAmount, team: team! }, {
      onSuccess: (data) => {
        console.log("✅ Redirection vers PayDunya:", data.payment_url);
        window.location.href = data.payment_url;
      },
      onError: (error: any) => {
        console.error("❌ Erreur initiate-payment:", error);
        toast.error(error.message || "Erreur lors de l'initiation du paiement");
        setIsPaymentProcessing(false);
      }
    });
  };

  // Handle copy to clipboard
  const handleCopyLink = (teamToCopy: 'A' | 'B') => {
    const url = `${getBaseUrl()}/cagnotte/${id}?team=${teamToCopy}`;
    navigator.clipboard.writeText(url);
    setCopiedTeam(teamToCopy);
    toast.success(`Lien équipe ${teamToCopy} copié`);
    setTimeout(() => setCopiedTeam(null), 2000);
  };

  // Initialiser avec le montant suggéré (entier)
  useEffect(() => {
    if (teamInfo?.suggested_part) {
      const suggestedInt = Math.ceil(teamInfo.suggested_part);
      setCustomAmount(String(suggestedInt));
    }
  }, [teamInfo?.suggested_part]);

  // Gérer l'arrondi en live lors de la saisie
  const handleAmountChange = (value: string) => {
    // Autoriser la saisie avec virgule ou point
    const numValue = parseFloat(value.replace(',', '.'));
    
    if (isNaN(numValue) || numValue <= 0) {
      setCustomAmount(value);
      setAmountHint('');
      return;
    }
    
    // Si décimal, afficher le hint et arrondir
    if (!Number.isInteger(numValue)) {
      const rounded = Math.ceil(numValue);
      setAmountHint(`Le XOF n'a pas de décimales : ${value} → ${rounded}`);
      setCustomAmount(String(rounded));
    } else {
      setAmountHint('');
      setCustomAmount(value);
    }
  };

  // Polling pour vérifier la contribution après retour de paiement
  useEffect(() => {
    if (thanksParam === '1' && txParam && !contributionConfirmed) {
      let pollCount = 0;
      const maxPolls = 20; // 20 * 3s = 60s max
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
          const { data, error } = await supabase
            .from('cagnotte_contribution')
            .select('status, proof_code, proof_token, amount, team, identity_badge, handle_snapshot, payer_phone_masked')
            .eq('psp_tx_id', txParam)
            .eq('status', 'SUCCEEDED')
            .maybeSingle();
          
          if (data) {
            setContributionConfirmed(true);
            clearInterval(pollInterval);
            
            // Build contributor label
            let contributorLabel = 'Joueur';
            let badgeEmoji = '';
            
            if (data.identity_badge === 'VERIFIED') {
              contributorLabel = data.handle_snapshot || data.payer_phone_masked || 'Joueur';
              badgeEmoji = ' ✅';
            } else if (data.identity_badge === 'LINKED') {
              contributorLabel = data.handle_snapshot || data.payer_phone_masked || 'Joueur';
              badgeEmoji = ' 🔗';
            } else if (data.payer_phone_masked) {
              contributorLabel = data.payer_phone_masked;
            }
            
            // Show success toast with proof and receipt links
            const proofUrl = `${getBaseUrl()}/p/${data.proof_code}`;
            const receiptUrl = `${getBaseUrl()}/receipt/${data.proof_token}`;
            
            toast.success(`Contribution enregistrée ! 🎉`, {
              description: (
                <div className="space-y-2 mt-2">
                  <p className="font-semibold">{contributorLabel}{badgeEmoji}</p>
                  <p>{data.amount.toLocaleString()} XOF - Équipe {data.team}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(proofUrl);
                        toast.success('Lien de preuve copié !');
                      }}
                      className="text-xs underline"
                    >
                      📋 Copier ma preuve
                    </button>
                    <button
                      onClick={() => {
                        window.open(receiptUrl, '_blank');
                      }}
                      className="text-xs underline"
                    >
                      🧾 Voir mon reçu
                    </button>
                  </div>
                </div>
              ),
              duration: 10000
            });
            
            queryClient.invalidateQueries({ queryKey: ['cagnotte', id] });
            queryClient.invalidateQueries({ queryKey: ['team-info', id, team] });
            queryClient.invalidateQueries({ queryKey: ['contributions', id, team] });
          } else if (pollCount >= maxPolls) {
            // Timeout - show fallback message
            clearInterval(pollInterval);
            toast.error('Paiement reçu — confirmation en cours', {
              description: 'Rechargez dans 1–2 minutes pour voir votre contribution.'
            });
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 3000); // Poll every 3 seconds

      return () => {
        clearInterval(pollInterval);
      };
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
  
  // Team-specific calculations - exact amounts, capped to team remaining
  let suggestedPart = 0;
  let teamRemaining = 0;
  let payAmount = 0;
  
  if (team && teamInfo) {
    suggestedPart = teamInfo.suggested_part || 0;
    teamRemaining = teamInfo.team_remaining || 0;
    
    const inputAmount = parseInt(customAmount) || suggestedPart;
    // Cap automatically to team remaining
    payAmount = Math.min(Math.max(0, inputAmount), teamRemaining);
  }
  
  const payButtonLabel = `Payer ${payAmount.toLocaleString()} XOF`;
  
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
          
          {/* Sélection d'équipe si pas spécifiée */}
          {!team && cagnotte.status === 'IN_PROGRESS' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <h4 className="font-bold text-blue-900 mb-3 text-lg">
                  Choisis ton équipe pour contribuer
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => navigate(`/cagnotte/${id}?team=A`)}
                    className="h-20 text-lg"
                    variant="default"
                  >
                    Je suis Équipe A
                  </Button>
                  <Button
                    onClick={() => navigate(`/cagnotte/${id}?team=B`)}
                    className="h-20 text-lg"
                    variant="default"
                  >
                    Je suis Équipe B
                  </Button>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-2">Ou partage ces liens avec tes équipes :</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink('A')}
                    className="flex items-center gap-2"
                  >
                    {copiedTeam === 'A' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Lien Équipe A
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink('B')}
                    className="flex items-center gap-2"
                  >
                    {copiedTeam === 'B' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Lien Équipe B
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Statut de la cagnotte */}
          {cagnotte.status === 'CONFIRMED' ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-8 text-center shadow-lg">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-900 mb-3">
                Match confirmé !
              </h3>
              <div className="bg-white/80 rounded-lg p-4 mb-4 space-y-2">
                <p className="text-green-700 font-medium">
                  Réservé au nom de : <span className="font-bold">{cagnotte.creator?.full_name}</span>
                </p>
                <div className="text-sm text-green-700 space-y-1 pt-2 border-t border-green-200">
                  <p className="font-semibold text-base">
                    {format(new Date(cagnotte.slot_date), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    {cagnotte.slot_start_time.slice(0, 5)} - {cagnotte.slot_end_time.slice(0, 5)}
                  </p>
                  <p className="font-semibold text-base">{cagnotte.field?.name}</p>
                  {cagnotte.field?.address && (
                    <p className="text-xs text-muted-foreground">{cagnotte.field.address}</p>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => navigate('/mes-reservations')}
                className="w-full max-w-xs"
                size="lg"
              >
                Voir ma réservation
              </Button>
              <p className="text-xs text-green-600 mt-4">
                Présentez-vous directement au centre avec votre confirmation.
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
                      <p>Part suggérée: {Math.ceil(teamInfo.suggested_part).toLocaleString()} XOF</p>
                      <p>Reste équipe: {Math.floor(teamInfo.team_remaining).toLocaleString()} XOF</p>
                    </div>
                  </div>

                   <div>
                    <label className="text-sm font-medium mb-2 block">
                      Montant de contribution (XOF)
                    </label>
                    <Input
                      type="text"
                      value={customAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder={String(Math.ceil(teamInfo.suggested_part))}
                      className="text-lg"
                    />
                    {amountHint && (
                      <p className="text-xs text-muted-foreground mt-1">{amountHint}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Montant exact débité (en XOF entiers).
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      const suggestedInt = Math.ceil(teamInfo.suggested_part);
                      const twoPartsInt = Math.ceil(teamInfo.suggested_part * 2);
                      const remainingInt = Math.floor(teamInfo.team_remaining);
                      
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomAmount(String(suggestedInt))}
                          >
                            1 part ({suggestedInt.toLocaleString()} XOF)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomAmount(String(twoPartsInt))}
                            disabled={twoPartsInt > remainingInt}
                          >
                            +2 parts ({twoPartsInt.toLocaleString()} XOF)
                          </Button>
                          {remainingInt > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCustomAmount(String(remainingInt))}
                            >
                              Tout le reliquat ({remainingInt.toLocaleString()} XOF)
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <Button
                    onClick={() => handleContribute(Number(customAmount))}
                    disabled={isPaymentProcessing || !customAmount || Number(customAmount) <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {isPaymentProcessing ? (
                      <>⏳ Redirection...</>
                    ) : (() => {
                      const amountInt = Math.ceil(Number(customAmount));
                      const teamRemainingInt = Math.floor(teamInfo.team_remaining);
                      const cappedAmount = Math.min(amountInt, teamRemainingInt);
                      return <>💳 Payer {cappedAmount.toLocaleString()} XOF</>;
                    })()}
                  </Button>
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

              {/* Liste des contributions avec badges */}
              {contributions && contributions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    Contributions ({contributions.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {contributions.map(contrib => {
                      const displayName = contrib.handle_snapshot 
                        ? `@${contrib.handle_snapshot}`
                        : contrib.payer_phone_masked 
                          ? `Joueur ${contrib.payer_phone_masked}`
                          : 'Joueur anonyme';
                      
                      const badgeEmoji = contrib.identity_badge === 'VERIFIED' 
                        ? '✅' 
                        : contrib.identity_badge === 'LINKED' 
                          ? '🔗' 
                          : '';
                      
                      const badgeTooltip = contrib.identity_badge === 'VERIFIED'
                        ? 'Numéro du compte = numéro de paiement'
                        : contrib.identity_badge === 'LINKED'
                          ? 'Contribution réclamée (numéro différent)'
                          : '';

                      return (
                        <div
                          key={contrib.id}
                          className="flex justify-between items-center bg-card border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {displayName}
                              </span>
                              {badgeEmoji && (
                                <span title={badgeTooltip} className="cursor-help">
                                  {badgeEmoji}
                                </span>
                              )}
                              {contrib.team && (
                                <Badge variant="outline" className="text-xs">
                                  Équipe {contrib.team}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>
                                {new Date(contrib.created_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {contrib.proof_code && (
                                <button
                                  onClick={() => {
                                    const proofUrl = `${getBaseUrl()}/p/${contrib.proof_code}`;
                                    navigator.clipboard.writeText(proofUrl);
                                    toast.success('Lien de preuve copié !');
                                  }}
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" />
                                  Partager preuve
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-primary text-lg">
                            +{contrib.amount.toLocaleString()} XOF
                          </span>
                        </div>
                      );
                    })}
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
