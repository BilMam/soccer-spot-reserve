import { SportType } from '@/constants/sports';

export const getSportIcon = (sport: SportType | string): string => {
  const icons: Record<string, string> = {
    football: '⚽',
    tennis: '🎾',
    paddle: '🏓',
    basketball: '🏀',
  };
  return icons[sport] || '🏟️';
};

export const getSportLabel = (sport: SportType | string): string => {
  const labels: Record<string, string> = {
    football: 'Football',
    tennis: 'Tennis',
    paddle: 'Paddle',
    basketball: 'Basketball',
  };
  return labels[sport] || sport;
};
