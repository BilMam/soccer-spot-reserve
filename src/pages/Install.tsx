import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share, Plus, MoreVertical, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Application installée !</CardTitle>
            <CardDescription>
              PISport est maintenant disponible sur votre écran d'accueil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
            <img src="/pisport-logo.png" alt="PISport" className="w-16 h-16 rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold">Installer PISport</h1>
          <p className="text-muted-foreground">
            Installez l'application pour un accès rapide depuis votre écran d'accueil
          </p>
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Avantages de l'installation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Accès rapide depuis l'écran d'accueil</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Fonctionne même hors connexion</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Expérience plein écran sans barre d'adresse</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-0.5" />
              <span>Chargement ultra-rapide</span>
            </div>
          </CardContent>
        </Card>

        {/* Install Instructions */}
        {deferredPrompt ? (
          <Button onClick={handleInstallClick} className="w-full h-12 text-lg" size="lg">
            <Download className="w-5 h-5 mr-2" />
            Installer l'application
          </Button>
        ) : isIOS ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions pour iPhone/iPad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Appuyez sur le bouton Partager</p>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Share className="w-5 h-5" />
                    <span>en bas de l'écran Safari</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Faites défiler et appuyez sur</p>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Plus className="w-5 h-5" />
                    <span>"Sur l'écran d'accueil"</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirmez en appuyant sur "Ajouter"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isAndroid ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions pour Android</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Appuyez sur le menu</p>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <MoreVertical className="w-5 h-5" />
                    <span>en haut à droite du navigateur</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Sélectionnez "Installer l'application"</p>
                  <p className="text-muted-foreground mt-1">ou "Ajouter à l'écran d'accueil"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirmez l'installation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Installation sur ordinateur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cherchez l'icône d'installation{" "}
                <Download className="w-4 h-4 inline" /> dans la barre d'adresse de votre
                navigateur, ou utilisez le menu pour "Installer PISport".
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
};

export default Install;
