// Public integration preparation only. No HTTP client or backend exists in S12.
export const environment = { apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api' };
