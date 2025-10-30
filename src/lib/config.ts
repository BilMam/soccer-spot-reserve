/**
 * Get the base URL for the application
 * Uses environment variable or falls back to window.location.origin
 */
export function getBaseUrl(): string {
  // Use env variable if available
  const envBaseUrl = import.meta.env.VITE_APP_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl;
  }
  
  // Fallback to window origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Default fallback (should not happen in browser)
  return 'https://pisport.app';
}
