/**
 * Utilitaires de calcul de prix pour la politique de commission 3%
 * 
 * Règles:
 * - Le propriétaire définit son prix net (ce qu'il veut toucher)
 * - La plateforme calcule le prix public (avec commission 3%)
 * - L'arrondi commercial est obligatoire (.000 ou .500)
 * - La plateforme garde TOUTE la différence (même si > 3%)
 */

const COMMISSION_RATE = 0.03; // 3%

/**
 * Calcule le prix brut avant arrondi
 */
function calculateRawPrice(netPriceOwner: number): number {
  return netPriceOwner / (1 - COMMISSION_RATE); // P / 0.97
}

/**
 * Arrondit selon la règle commerciale (.500 ou .000)
 */
function roundToCommercialPrice(amount: number): number {
  const rounded = Math.ceil(amount);
  const base = Math.floor(rounded / 1000);
  const remainder = rounded - base * 1000;

  if (remainder === 0) {
    return base * 1000;
  }

  if (remainder <= 500) {
    return base * 1000 + 500;
  } else {
    return (base + 1) * 1000;
  }
}

/**
 * Prix public à partir du prix net propriétaire (net → public)
 */
export function calculatePublicPrice(netPriceOwner: number): number {
  if (!netPriceOwner || netPriceOwner <= 0) return 0;
  const rawPrice = calculateRawPrice(netPriceOwner);
  return roundToCommercialPrice(rawPrice);
}

/**
 * Prix net à partir du prix public (public → net)
 * ⚠️ IMPORTANT : On floor pour garantir le montant au propriétaire
 */
export function calculateNetFromPublic(publicPrice: number): number {
  if (!publicPrice || publicPrice <= 0) return 0;
  const approxNet = publicPrice * (1 - COMMISSION_RATE); // 97%
  return Math.floor(approxNet);
}

/**
 * Commission plateforme en FCFA
 * C'est TOUTE la différence entre public et net (peut être > 3%)
 */
export function calculatePlatformCommission(publicPrice: number, netPriceOwner: number): number {
  return publicPrice - netPriceOwner;
}

/**
 * Formatte un montant en XOF
 */
export function formatXOF(amount: number): string {
  if (!amount || isNaN(amount)) return '0 XOF';
  return `${Math.round(amount).toLocaleString()} XOF`;
}

/**
 * Taux de commission affiché (3%)
 */
export function getCommissionRate(): number {
  return COMMISSION_RATE;
}

/**
 * Taux de commission en pourcentage (3%)
 */
export function getCommissionRatePercent(): string {
  return `${(COMMISSION_RATE * 100).toFixed(0)}%`;
}
