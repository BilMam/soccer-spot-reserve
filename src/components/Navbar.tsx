import React from 'react';
import { Search, User, MapPin, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { usePendingReviews } from '@/hooks/usePendingReviews';
import AdminNavigation from '@/components/AdminNavigation';
import NotificationBadge from '@/components/NotificationBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { hasAdminPermissions } = useAdminPermissions();
  const { pendingCount, refreshPendingReviews } = usePendingReviews();

  // Vérifier le type d'utilisateur (owner, etc.)
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isOwner = profile?.user_type === 'owner';

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Soccer Spot</span>
          </div>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-8">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/search')}>
              <Search className="w-4 h-4 mr-2" />
              Découvrir
            </Button>
            {user && (
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                  Mes réservations
                </Button>
                <NotificationBadge count={pendingCount} />
              </div>
            )}
            {/* Hide "Become owner" link if user is already an owner OR has admin permissions */}
            {!isOwner && !hasAdminPermissions && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/become-owner')}>
                Devenir propriétaire
              </Button>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            {/* Admin Navigation - shows admin/super-admin buttons if user has permissions */}
            {hasAdminPermissions && <AdminNavigation />}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span className="hidden md:block">Mon compte</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="relative">
                    <Search className="w-4 h-4 mr-2" />
                    Mes réservations
                    <NotificationBadge count={pendingCount} className="ml-auto" />
                  </DropdownMenuItem>
                  {/* Show "Mes terrains" only for owners */}
                  {isOwner && (
                    <DropdownMenuItem onClick={() => navigate('/owner/dashboard')}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Mes terrains
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => navigate('/auth')}>
                  Connexion
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => navigate('/auth')}>
                  S'inscrire
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
