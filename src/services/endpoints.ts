export const API_BASE_URL = (process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://backend-nhac.cloud.run/api/v1' : 'http://localhost:8080/api/v1')).replace(/\/$/, '');
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || API_BASE_URL.replace(/\/api\/v1$/, '') + '/ws';

export function chaveConta(): string {
  try { return String(JSON.parse(localStorage.getItem('@nhac:usuario') || '{}').id || 'sessao'); }
  catch { return 'sessao'; }
}

// A Vercel encaminha HTTP ao Cloud Run, mas não mantém upgrades WebSocket.
// SockJS preserva os eventos STOMP usando o transporte HTTP configurado.
export const WS_OPTIONS = process.env.REACT_APP_WS_TRANSPORTS
  ? { transports: process.env.REACT_APP_WS_TRANSPORTS.split(',').map(t => t.trim()).filter(Boolean) }
  : undefined;
