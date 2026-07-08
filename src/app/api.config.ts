/**
 * API configuration for the QA Tracker backend.
 */
function getBaseUrl(): string {
  // In production, __API_BASE_URL__ can be set via the deployment environment
  if ((window as any).__API_BASE_URL__) {
    return (window as any).__API_BASE_URL__;
  }
  // When running locally via `ng serve`, use the Angular proxy (no CORS)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  // Production fallback — direct CORS request to the deployed backend
  return 'https://qat.app.aletcloud.com/back';
}

export const apiConfig = {
  // IMPORTANT: no trailing slash
  baseUrl: getBaseUrl(),
};

export const apiCon
