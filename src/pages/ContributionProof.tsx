import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, MapPin, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ContributionProof() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const { data: proof, isLoading, error } = useQuery({
    queryKey: ['proof', code],
    queryFn: async () => {
      const response = await fetch(
        `https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/get-contribution-proof/${code}`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Preuve introuvable');
      }
      
      return response.json();
    },
    enabled: !!code
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Preuve introuvable</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badgeEmoji = proof.badge === 'VERIFIED' 
    ? '✅' 
    : proof.badge === 'LINKED' 
      ? '🔗' 
      : '';

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            Preuve de paiement validée
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Contributeur */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-bold">
                {proof.display_name}
              </h3>
              {badgeEmoji && (
                <span className="text-2xl" title={
                  proof.badge === 'VERIFIED' 
                    ? 'Numéro vérifié' 
                    : 'Contribution réclamée'
                }>
                  {badgeEmoji}
                </span>
              )}
            </div>
            {proof.team && (
              <Badge variant="outline" className="text-lg px-4 py-1">
                Équipe {proof.team}
              </Badge>
            )}
          </div>

          {/* Montant */}
          <div className="bg-primary/5 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Montant payé</p>
            <p className="text-4xl font-bold text-primary">
              {proof.amount.toLocaleString()} XOF
            </p>
          </div>

          {/* Détails cagnotte */}
          {proof.cagnotte && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                Match
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{proof.cagnotte.field?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {proof.cagnotte.field?.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm">
                    {format(new Date(proof.cagnotte.slot_date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm">
                    {proof.cagnotte.slot_start_time?.substring(0, 5)} - {proof.cagnotte.slot_end_time?.substring(0, 5)}
                  </p>
                </div>
              </div>

              {proof.cagnotte.status && (
                <Badge variant={
                  proof.cagnotte.status === 'CONFIRMED' ? 'default' :
                  proof.cagnotte.status === 'IN_PROGRESS' ? 'outline' :
                  'secondary'
                } className="mt-2">
                  {proof.cagnotte.status === 'CONFIRMED' ? '✅ Match confirmé' :
                   proof.cagnotte.status === 'IN_PROGRESS' ? '⏳ Collecte en cours' :
                   proof.cagnotte.status === 'HOLD' ? '🔒 Terrain réservé' :
                   proof.cagnotte.status}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Code de preuve : <span className="font-mono font-semibold">{proof.proof_code}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Payé le {format(new Date(proof.paid_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
