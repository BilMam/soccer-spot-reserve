import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function confirmEmail() {
      try {
        setLoading(true);
        
        // Vérifier d'abord si il y a des erreurs dans les paramètres
        const errorParam = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        
        if (errorParam || errorCode) {
          console.error('Erreur dans les paramètres:', { errorParam, errorCode });
          
          // Cas spécifique : token déjà utilisé (lien déjà cliqué)
          if (errorParam === 'access_denied' || errorCode === 'otp_expired') {
            setError('Ce lien a déjà été utilisé ou a expiré. Veuillez vous connecter.');
          } else {
            setError('Lien invalide');
          }
          
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }

        // Essayer de récupérer la session depuis l'URL
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erreur récupération session:', sessionError.message);
          setError('Erreur de confirmation');
          setTimeout(() => navigate('/auth?confirm=error'), 2000);
          return;
        }

        // Si on a une session, l'utilisateur est confirmé
        if (data.session) {
          console.log('Session confirmée avec succès');
          setTimeout(() => navigate('/?confirmed=true'), 1000);
        } else {
          // Essayer de traiter les tokens depuis l'URL hash
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && type === 'signup') {
            // Définir la session manuellement
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            if (setSessionError) {
              console.error('Erreur définition session:', setSessionError.message);
              setError('Erreur de confirmation');
              setTimeout(() => navigate('/auth?confirm=error'), 2000);
            } else {
              console.log('Session définie avec succès');
              setTimeout(() => navigate('/?confirmed=true'), 1000);
            }
          } else {
            setError('Paramètres de confirmation manquants');
            setTimeout(() => navigate('/auth?confirm=error'), 2000);
          }
        }
      } catch (e) {
        console.error('Erreur confirmation:', e);
        setError('Erreur de confirmation');
        setTimeout(() => navigate('/auth?confirm=error'), 2000);
      } finally {
        setLoading(false);
      }
    }

    confirmEmail();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-2xl">⚠️</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Erreur de confirmation</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Confirmation en cours</h2>
        <p className="text-muted-foreground">Veuillez patienter pendant que nous confirmons votre email...</p>
      </div>
    </div>
  );
};

export default AuthConfirm;