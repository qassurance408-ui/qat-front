/**
 * API configuration for the QA Tracker backend.
 */
export const apiConfig = {
  // Default to localhost:3000 for development, override in production
  baseUrl: (window as any).__API_BASE_URL__ || 'https://qat.app.aletcloud.com/back/',
};
