
import React from 'react';
import { Search, User, Menu, MapPin, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import AdminNavigation from '@/components/AdminNavigation';
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
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">FieldBook</span>
          </div>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/search" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
              Découvrir
            </a>
            {user && (
              <a href="/profile" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Mes réservations
              </a>
            )}
            {/* Hide "Become owner" link if user is already an owner */}
            {!isOwner && (
              <a href="/become-owner" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Devenir propriétaire
              </a>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    Mes réservations
                  </DropdownMenuItem>
                  {/* Show "Mes terrains" only for owners */}
                  {isOwner && (
                    <DropdownMenuItem onClick={() => navigate('/owner/dashboard')}>
                      Mes terrains
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => navigate('/auth')}>
                  Connexion
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => navigate('/auth')}>
                  S'inscrire
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
