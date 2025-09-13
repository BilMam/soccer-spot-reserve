import React from 'react';
import { Search, User, MapPin, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { usePendingReviews } from '@/hooks/usePendingReviews';
import AdminNavigation from '@/components/AdminNavigation';
import NotificationBadge from '@/components/NotificationBadge';
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
  const { isOwner } = usePermissions();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/pisport-logo.png" alt="PISport" className="w-8 h-8" />
            <span className="text-xl font-bold text-gray-900">PISport</span>
          </div>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/search" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
              Découvrir
            </a>
            {user && (
              <div className="relative">
                <a href="/profile" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                  Mes réservations
                </a>
                <NotificationBadge count={pendingCount} />
              </div>
            )}
            {/* Hide "Become owner" link if user is already an owner OR has admin permissions */}
            {!isOwner && !hasAdminPermissions && (
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
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="relative">
                    Mes réservations
                    <NotificationBadge count={pendingCount} className="ml-2 relative top-0 right-0" />
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
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
