
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import EditFieldForm from '@/components/forms/EditFieldForm';

const EditField = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Terrain introuvable</h1>
          <p className="text-gray-600">L'identifiant du terrain est manquant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/owner/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modifier le terrain</h1>
            <p className="text-gray-600 mt-1">Mettez à jour les informations de votre terrain</p>
          </div>
        </div>

        <EditFieldForm fieldId={id} />
      </div>
    </div>
  );
};

export default EditField;
