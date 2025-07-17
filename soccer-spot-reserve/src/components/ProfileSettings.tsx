import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  user_type: string;
}

interface ProfileSettingsProps {
  user: User;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: user.email || ''
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile;
    }
  });

  // Use useEffect to handle data loading instead of onSuccess
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        email: user.email || ''
      });
    }
  }, [profile, user.email]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: data.full_name,
          phone: data.phone,
          email: user.email
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      full_name: formData.full_name,
      phone: formData.phone
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="bg-gray-200 h-10 rounded"></div>
            <div className="bg-gray-200 h-10 rounded"></div>
            <div className="bg-gray-200 h-10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Nom complet</Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-gray-500 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Votre numéro de téléphone"
              />
            </div>

            <div>
              <Label htmlFor="user_type">Type d'utilisateur</Label>
              <Input
                id="user_type"
                type="text"
                value={profile?.user_type === 'owner' ? 'Propriétaire' : 'Joueur'}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateProfileMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Sauvegarder les modifications
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
