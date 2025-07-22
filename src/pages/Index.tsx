
import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedFields from '@/components/FeaturedFields';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import { ConfirmBookingButton } from '@/components/ConfirmBookingButton';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* Bouton temporaire pour confirmer la réservation */}
      <div className="fixed top-20 right-4 z-50">
        <ConfirmBookingButton />
      </div>
      <Hero />
      <FeaturedFields />
      <Features />
      <Footer />
    </div>
  );
};

export default Index;
