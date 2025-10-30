import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Receipt, MapPin, Calendar, Clock, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function ContributionReceipt() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  // Check auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ['receipt', token],
    queryFn: async () => {
      const response = await fetch(
        `https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/get-contribution-receipt/${token}`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Reçu introuvable');
      }
      
      return response.json();
    },
    enabled: !!token
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const response = await fetch(
        'https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/link-contribution',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ proof_token: token })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la liaison');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['receipt', token] });
    },
    onError: (error: any) => {
      toast.error('Erreur', { description: error.message });
    }
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

  if (error || !receipt) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Reçu introuvable</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const proofUrl = `${window.location.origin}/p/${receipt.proof_code}`;

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

      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Receipt className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            Reçu de contribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alert si pas encore lié */}
          {!receipt.is_linked && user && (
            <Alert className="border-blue-200 bg-blue-50">
              <LinkIcon className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Cette contribution n'est pas encore liée à un compte. Associe-la pour la retrouver facilement !
              </AlertDescription>
            </Alert>
          )}

          {/* Contributeur */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">
              {receipt.display_name}
            </h3>
            {receipt.badge && (
              <Badge variant={
                receipt.badge === 'VERIFIED' ? 'default' :
                receipt.badge === 'LINKED' ? 'outline' :
                'secondary'
              }>
                {receipt.badge === 'VERIFIED' ? '✅ Vérifié' :
                 receipt.badge === 'LINKED' ? '🔗 Lié' :
                 'Anonyme'}
              </Badge>
            )}
            {receipt.team && (
              <Badge variant="outline">Équipe {receipt.team}</Badge>
            )}
          </div>

          {/* Montant */}
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Montant payé</p>
            <p className="text-3xl font-bold text-primary">
              {receipt.amount.toLocaleString()} XOF
            </p>
          </div>

          {/* Détails */}
          {receipt.cagnotte && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                Détails du match
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{receipt.cagnotte.field?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {receipt.cagnotte.field?.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm">
                    {format(new Date(receipt.cagnotte.slot_date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm">
                    {receipt.cagnotte.slot_start_time?.substring(0, 5)} - {receipt.cagnotte.slot_end_time?.substring(0, 5)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t">
            {!receipt.is_linked && user && (
              <Button
                onClick={() => linkMutation.mutate()}
                disabled={linkMutation.isPending}
                className="w-full"
                size="lg"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {linkMutation.isPending ? 'Association...' : 'Associer à mon compte'}
              </Button>
            )}

            {!user && !receipt.is_linked && (
              <Button
                onClick={() => navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname))}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Se connecter pour associer
              </Button>
            )}

            <Button
              onClick={() => {
                navigator.clipboard.writeText(proofUrl);
                toast.success('Lien de preuve copié !');
              }}
              variant="outline"
              className="w-full"
            >
              Copier le lien de preuve publique
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Transaction : <span className="font-mono">{receipt.psp_tx_id}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Payé le {format(new Date(receipt.paid_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
