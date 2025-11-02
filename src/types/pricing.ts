/**
 * Interface centralisée pour la tarification des terrains
 * Permet de gérer à la fois les prix nets (propriétaire) et publics (client)
 */
export interface FieldPricing {
  // Prix NETS (ce que le propriétaire touche)
  net_price_1h?: number;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  
  // Prix PUBLICS (ce que le client paie, incluant commission 3%)
  public_price_1h?: number;
  public_price_1h30?: number | null;
  public_price_2h?: number | null;
  
  // Colonnes legacy (pour rétrocompatibilité)
  price_per_hour?: number;
  price_1h30?: number | null;
  price_2h?: number | null;
}
