/**
 * Get the base URL for the application
 * Uses environment variable or falls back to window.location.origin
 */
export function getBaseUrl(): string {
  // Toujours privilégier window.location.origin si disponible
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // Si on est en développement/preview (lovable.dev ou localhost), 
    // utiliser l'origin actuel
    if (origin.includes('lovable.dev') || origin.includes('localhost')) {
      return origin;
    }
  }
  
  // En production, utiliser la variable d'environnement si définie
  const envBaseUrl = import.meta.env.VITE_APP_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl;
  }
  
  // Fallback sur l'origin si disponible (cas où VITE_APP_BASE_URL n'est pas définie)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Default fallback (ne devrait jamais arriver en environnement browser)
  return 'https://pisport.app';
}
