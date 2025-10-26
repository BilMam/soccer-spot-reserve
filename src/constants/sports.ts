export type SportType = 'football' | 'tennis' | 'paddle' | 'basketball';

export const SPORTS = [
  { value: 'football', label: 'Football', icon: '⚽' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'paddle', label: 'Paddle', icon: '🏓' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
] as const;

export const SPORT_FIELD_TYPES: Record<SportType, { value: string; label: string }[]> = {
  football: [
    { value: 'synthetic', label: 'Synthétique' },
    { value: 'natural_grass', label: 'Pelouse naturelle' },
    { value: 'street', label: 'Street' },
    { value: 'indoor', label: 'Indoor' },
  ],
  tennis: [
    { value: 'clay', label: 'Terre battue' },
    { value: 'hard', label: 'Surface dure' },
    { value: 'grass', label: 'Gazon' },
    { value: 'indoor', label: 'Indoor' },
  ],
  paddle: [
    { value: 'synthetic_grass', label: 'Gazon synthétique' },
    { value: 'concrete', label: 'Béton' },
    { value: 'indoor', label: 'Indoor' },
  ],
  basketball: [
    { value: 'parquet', label: 'Parquet' },
    { value: 'concrete', label: 'Béton' },
    { value: 'outdoor', label: 'Extérieur' },
    { value: 'indoor', label: 'Indoor' },
  ],
};

export const SPORT_CAPACITIES: Record<SportType, { value: number; label: string }[]> = {
  football: [
    { value: 10, label: '5v5 (10 joueurs)' },
    { value: 12, label: '6v6 (12 joueurs)' },
    { value: 14, label: '7v7 (14 joueurs)' },
    { value: 22, label: '11v11 (22 joueurs)' },
  ],
  tennis: [
    { value: 2, label: 'Simple (2 joueurs)' },
    { value: 4, label: 'Double (4 joueurs)' },
  ],
  paddle: [
    { value: 4, label: 'Double (4 joueurs)' },
  ],
  basketball: [
    { value: 6, label: '3v3 (6 joueurs)' },
    { value: 10, label: '5v5 (10 joueurs)' },
  ],
};
