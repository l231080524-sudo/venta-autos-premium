// URL pública del BACKEND. Configurar VITE_API_URL en .env y en Vercel.
// Nunca colocar credenciales privadas de Mercado Pago en variables VITE_.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export function authHeaders(user) {
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
}
export async function api(path, user, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(user), ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'No se pudo conectar con el servidor.'), { status: response.status });
  return data;
}
export const formatMoney = amount => Number(amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
