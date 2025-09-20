
import React from 'react';
import { MapPin, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/pisport-logo.png" alt="PISport" className="w-8 h-8" />
              <span className="text-2xl font-bold">PISport</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              La première plateforme de réservation de terrains de football en Côte d'Ivoire. 
              Trouvez et réservez le terrain parfait près de chez vous.
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
            <ul className="space-y-3">
              <li><a href="/search" className="text-gray-400 hover:text-white transition-colors">Découvrir</a></li>
              <li><a href="/auth" className="text-gray-400 hover:text-white transition-colors">Se connecter</a></li>
              <li><a href="/become-owner" className="text-gray-400 hover:text-white transition-colors">Devenir propriétaire</a></li>
              <li><a href="/profile" className="text-gray-400 hover:text-white transition-colors">Mon profil</a></li>
              <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Accueil</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Conditions d'utilisation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Signaler un problème</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Nous contacter</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-green-600" />
                <span className="text-gray-400">mysportci.off@gmail.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-green-600" />
                <span className="text-gray-400">+225 0700071778</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-green-600 mt-1" />
                <span className="text-gray-400">
                  Boulevard Lagunaire<br />
                  Cocody, Abidjan, Côte d'Ivoire
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 PISport. Tous droits réservés. Fait avec ❤️ pour les passionnés de football.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
