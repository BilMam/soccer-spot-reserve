
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const NotificationPreferences: React.FC = () => {
  const { toast } = useToast();
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();
  
  const [formData, setFormData] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    review_reminders: true,
    booking_confirmations: true,
    marketing_notifications: false
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        push_enabled: preferences.push_enabled,
        review_reminders: preferences.review_reminders,
        booking_confirmations: preferences.booking_confirmations,
        marketing_notifications: preferences.marketing_notifications
      });
    }
  }, [preferences]);

  const handleSwitchChange = (field: keyof typeof formData, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePreferences.mutateAsync(formData);
      toast({
        title: "Préférences mises à jour",
        description: "Vos préférences de notifications ont été sauvegardées.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les préférences.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Préférences de notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-16 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Préférences de notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Canaux de notification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Canaux de notification</h3>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <Label htmlFor="email_enabled" className="text-base font-medium">
                    Email
                  </Label>
                  <p className="text-sm text-gray-600">Recevoir les notifications par email</p>
                </div>
              </div>
              <Switch
                id="email_enabled"
                checked={formData.email_enabled}
                onCheckedChange={(checked) => handleSwitchChange('email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-green-500" />
                <div>
                  <Label htmlFor="sms_enabled" className="text-base font-medium">
                    SMS
                  </Label>
                  <p className="text-sm text-gray-600">Recevoir les notifications par SMS</p>
                </div>
              </div>
              <Switch
                id="sms_enabled"
                checked={formData.sms_enabled}
                onCheckedChange={(checked) => handleSwitchChange('sms_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-purple-500" />
                <div>
                  <Label htmlFor="push_enabled" className="text-base font-medium">
                    Push (Navigateur)
                  </Label>
                  <p className="text-sm text-gray-600">Recevoir les notifications push</p>
                </div>
              </div>
              <Switch
                id="push_enabled"
                checked={formData.push_enabled}
                onCheckedChange={(checked) => handleSwitchChange('push_enabled', checked)}
              />
            </div>
          </div>

          {/* Types de notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Types de notifications</h3>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="review_reminders" className="text-base font-medium">
                  Rappels d'avis
                </Label>
                <p className="text-sm text-gray-600">Recevoir des rappels pour laisser des avis</p>
              </div>
              <Switch
                id="review_reminders"
                checked={formData.review_reminders}
                onCheckedChange={(checked) => handleSwitchChange('review_reminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="booking_confirmations" className="text-base font-medium">
                  Confirmations de réservation
                </Label>
                <p className="text-sm text-gray-600">Recevoir les confirmations de réservation</p>
              </div>
              <Switch
                id="booking_confirmations"
                checked={formData.booking_confirmations}
                onCheckedChange={(checked) => handleSwitchChange('booking_confirmations', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="marketing_notifications" className="text-base font-medium">
                  Notifications marketing
                </Label>
                <p className="text-sm text-gray-600">Recevoir des offres et promotions</p>
              </div>
              <Switch
                id="marketing_notifications"
                checked={formData.marketing_notifications}
                onCheckedChange={(checked) => handleSwitchChange('marketing_notifications', checked)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updatePreferences.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updatePreferences.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
