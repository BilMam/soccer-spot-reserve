
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  description: string;
  earned_at: string;
  is_visible: boolean;
}

export const useUserBadges = () => {
  const { user } = useAuth();

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_visible', true)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data as UserBadge[];
    },
    enabled: !!user
  });

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'reviewer':
        return '⭐';
      case 'expert_reviewer':
        return '🏆';
      case 'frequent_player':
        return '🎾';
      case 'early_adopter':
        return '🚀';
      default:
        return '🏅';
    }
  };

  return {
    badges,
    isLoading,
    getBadgeIcon
  };
};
