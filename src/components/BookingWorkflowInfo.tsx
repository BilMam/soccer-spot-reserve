import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

const BookingWorkflowInfo = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Processus de Réservation Optimisé</h1>
        <p className="text-gray-600">
          Nous avons amélioré notre système pour une expérience plus fluide et équitable pour tous
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>1. Sélection et Paiement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Choisissez votre créneau et procédez au paiement. 
              <strong className="text-blue-600"> Le créneau reste disponible pour d'autres utilisateurs</strong> pendant que votre paiement est traité.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>2. Confirmation du Paiement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Une fois le paiement validé par notre partenaire bancaire, 
              <strong className="text-green-600"> le créneau est immédiatement bloqué</strong> et votre réservation est confirmée.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>3. En cas d'Échec</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Si le paiement échoue ou expire (après 15 minutes), 
              <strong className="text-red-600"> le créneau redevient automatiquement disponible</strong> pour d'autres joueurs.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <AlertCircle className="w-5 h-5" />
              <span>Avantages du Nouveau Système</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800">
                <strong>Plus équitable :</strong> Les créneaux ne sont plus bloqués inutilement en cas de problème de paiement
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800">
                <strong>Plus disponible :</strong> Moins de créneaux "fantômes" bloqués par des paiements non aboutis
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-blue-800">
                <strong>Plus transparent :</strong> Vous savez exactement où en est votre réservation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-900">
              <Clock className="w-5 h-5" />
              <span>Important à Retenir</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-amber-800">
              <li className="flex items-start space-x-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Finalisez votre paiement rapidement pour sécuriser votre créneau</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>Vous avez 15 minutes maximum pour confirmer le paiement</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>En cas d'échec, vous pouvez immédiatement retenter une réservation</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingWorkflowInfo;