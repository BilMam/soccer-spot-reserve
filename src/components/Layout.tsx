import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children?: React.ReactNode;
  className?: string;
  showNavbar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  className,
  showNavbar = true 
}) => {
  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      <main className={cn("flex-1", className)}>
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
