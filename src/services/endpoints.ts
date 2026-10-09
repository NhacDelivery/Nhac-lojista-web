export const API_BASE_URL = (process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://backend-nhac.onrender.com/api/v1' : 'http://localhost:8080/api/v1')).replace(/\/$/, '');
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || API_BASE_URL.replace(/\/api\/v1$/, '') + '/ws';

export function chaveConta(): string {
  try { return String(JSON.parse(localStorage.getItem('@nhac:usuario') || '{}').id || 'sessao'); }
  catch { return 'sessao'; }
}
