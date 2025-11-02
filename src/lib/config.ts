/**
 * Get the base URL for the application
 * Uses window.location.origin in browser for correct preview/prod URLs
 */
export function getBaseUrl(): string {
  // En environnement browser, toujours retourner l'origin courant
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // En SSR : utiliser la variable d'env. VITE_APP_BASE_URL si définie
  const envBaseUrl = import.meta.env.VITE_APP_BASE_URL;
  return envBaseUrl || 'https://pisport.app';
}
