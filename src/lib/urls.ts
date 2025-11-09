/**
 * Construit une URL absolue basée sur l'origin actuel
 * En preview: utilise l'URL de preview
 * En production: utilise pisport.app
 */
export function buildUrl(path: string, params?: Record<string, string>): string {
  // window.location.origin détecte automatiquement l'environnement
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://pisport.app';
  
  const url = new URL(path, baseUrl);
  
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  
  return url.toString();
}
