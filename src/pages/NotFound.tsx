import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, ArrowLeft, MapPin } from "lucide-react";
import Layout from "@/components/Layout";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-12 h-12 text-muted-foreground" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
              <h2 className="text-xl font-semibold text-foreground mb-2">Page introuvable</h2>
              <p className="text-muted-foreground mb-6">
                Désolé, nous n'avons pas pu trouver la page que vous recherchez. 
                Elle a peut-être été déplacée ou n'existe plus.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
              
              <Button 
                onClick={() => navigate('/search')} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                <Search className="w-4 h-4 mr-2" />
                Rechercher des terrains
              </Button>
              
              <Button 
                onClick={() => navigate(-1)} 
                variant="ghost" 
                className="w-full"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Page précédente
              </Button>
            </div>
            
            <div className="mt-6 text-sm text-muted-foreground">
              <p>Chemin recherché: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NotFound;
 