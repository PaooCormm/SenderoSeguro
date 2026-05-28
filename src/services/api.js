/**
 * src/services/api.js
 *
 * Cliente HTTP para la API de Sendero Seguro.
 * Base URL: https://api.interactiveagents.lat/api
 *
 * - Guarda access_token y refresh_token en AsyncStorage
 * - Si un request devuelve 401, intenta refrescar el token automáticamente
 * - Si el refresh falla, limpia la sesión y el AuthContext reacciona
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'https://api.interactiveagents.lat/api';

const KEYS = {
  access:  'sendero_access_token',
  refresh: 'sendero_refresh_token',
  user:    'sendero_user',
};

// ─── Helpers de almacenamiento ────────────────────────────────────────────────
export const storage = {
  getAccess:     () => AsyncStorage.getItem(KEYS.access),
  getRefresh:    () => AsyncStorage.getItem(KEYS.refresh),
  getUser:       async () => {
    const raw = await AsyncStorage.getItem(KEYS.user);
    return raw ? JSON.parse(raw) : null;
  },
  setTokens: async (access, refresh) => {
    const ops = [];
    // Solo guardar si los valores existen — el servidor puede no devolverlos en register
    if (access  != null) ops.push(AsyncStorage.setItem(KEYS.access,  access));
    if (refresh != null) ops.push(AsyncStorage.setItem(KEYS.refresh, refresh));
    if (ops.length) await Promise.all(ops);
  },
  setUser:       (user) => AsyncStorage.setItem(KEYS.user, JSON.stringify(user)),
  clearSession:  () => AsyncStorage.multiRemove([KEYS.access, KEYS.refresh, KEYS.user]),
};

// ─── Construir headers ────────────────────────────────────────────────────────
async function getHeaders(includeAuth = true) {
  const headers = { 
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8' 
  };
  if (includeAuth) {
    const token = await storage.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function tiempoRelativo(iso) {
  // 1. Si no viene fecha, evitamos que truene
  if (!iso) return 'Fecha desconocida'; 
  
  const date = new Date(iso);
  // 2. Si la fecha viene en un formato raro que JS no entiende, evitamos el NaN
  if (isNaN(date.getTime())) return 'Hace un momento';

  const diff = Date.now() - date.getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs} hr${hrs > 1 ? 's' : ''}`;
  const dias = Math.floor(hrs / 24);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

// ─── Refresh token ────────────────────────────────────────────────────────────
async function doRefresh() {
  const rt = await storage.getRefresh();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await storage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch (err) {
    console.error('[API] Error refrescando token:', err.message);
    return false;
  }
}

// ─── Callback para logout global (lo setea AuthContext al montar) ─────────────
let _onSessionExpired = null;
export function setSessionExpiredHandler(fn) {
  _onSessionExpired = fn;
}

// ─── Core request ─────────────────────────────────────────────────────────────
async function apiCall(path, options = {}) {
  const { includeAuth = true, body, ...rest } = options;

  const config = {
    headers: await getHeaders(includeAuth),
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  try {
    let res = await fetch(`${API_BASE}${path}`, config);

    // Intento de refresh si 401
    if (res.status === 401 && includeAuth) {
      const refreshed = await doRefresh();
      if (refreshed) {
        config.headers = await getHeaders(true);
        res = await fetch(`${API_BASE}${path}`, config);
      } else {
        await storage.clearSession();
        _onSessionExpired?.();
        throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      }
    }

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      // El servidor puede devolver { error } o { errors: { campo: msg } }
      if (data.errors) {
        const err = new Error('Errores de validación.');
        err.fieldErrors = data.errors;
        throw err;
      }
      throw new Error(data.error || data.message || `Error ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err.message !== 'Sesión expirada. Inicia sesión de nuevo.') {
      console.error(`[API] ${options.method ?? 'GET'} ${path}:`, err.message);
    }
    throw err;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────
const api = {

  // ── Auth ────────────────────────────────────────────────────────────────────

  /** Registro — igual que el web: { nombreCompleto, boleta, correo, password } */
  async register({ nombreCompleto, boleta, correo, password }) {
    const data = await apiCall('/auth/register', {
      method:      'POST',
      includeAuth: false,
      body:        { nombreCompleto, boleta, correo, password },
    });

    // Servidor devuelve { message, user } sin tokens → login automático
    if (data.token ?? data.accessToken) {
      const accessToken = data.token ?? data.accessToken;
      await storage.setTokens(accessToken, data.refreshToken ?? null);
      await storage.setUser(data.user ?? data);
      return { ...data, accessToken, user: data.user ?? data };
    }

    const loginData = await this.login({ credential: correo, password });
    return loginData;
  },

  /** Login — { credential, password } → devuelve { token, user } */
  async login({ credential, password }) {
    const data = await apiCall('/auth/login', {
      method:      'POST',
      includeAuth: false,
      body:        { credential, password }, //
    });
    const accessToken  = data.token ?? data.accessToken;
    const refreshToken = data.refreshToken ?? null;
    await storage.setTokens(accessToken, refreshToken);
    await storage.setUser(data.user ?? data);
    return { ...data, accessToken, user: data.user ?? data };
  },

  /** Logout — invalida el refresh token en el servidor */
  async logout() {
    try {
      const rt = await storage.getRefresh();
      if (rt) {
        await apiCall('/auth/logout', {
          method: 'POST',
          body:   { refreshToken: rt },
        });
      }
    } catch { /* ignorar si ya expiró */ }
    await storage.clearSession();
  },

  /** Perfil del usuario autenticado */
  me() {
    return apiCall('/auth/me', { method: 'GET' });
  },

  /** Cambiar contraseña */
  cambiarPassword(currentPassword, newPassword) {
    return apiCall('/auth/password', {
      method: 'PUT',
      body:   { currentPassword, newPassword },
    });
  },

  // ── Reportes ────────────────────────────────────────────────────────────────

  /**
   * Listar reportes
   * params: { categoria?, estado?, page?, limit? }
   */
  getReportes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiCall(`/reports${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Crear reporte
   * body: { titulo, descripcion, categoria, latitude, longitude,
   *         ubicacion_txt?, es_anonimo?, evidencia_url? }
   */
  crearReporte(body) {
    return apiCall('/reports', { method: 'POST', body });
  },

  /** Obtener un reporte por ID */
  getReporte(id) {
    return apiCall(`/reports/${id}`, { method: 'GET' });
  },

  /** Marcar reporte como útil */
  votarReporte(id) {
    return apiCall(`/reports/${id}/util`, { method: 'POST' });
  },

  // ── Alertas de emergencia ───────────────────────────────────────────────────

  /**
   * Emitir alerta SOS
   * body: { titulo, latitude, longitude }
   */
  emitirAlerta(titulo, latitude, longitude) {
    return apiCall('/alerts', {
      method: 'POST',
      body:   { titulo, latitude, longitude },
    });
  },

  /** Alertas activas (para el mapa) */
  getAlertas(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiCall(`/alerts${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  // ── Contactos de apoyo ───────────────────────────────────────────────────────

  getContactos() {
    // Debe coincidir exactamente con el servidor: /api/contacts
    return apiCall('/contacts', { method: 'GET' }); 
  },
  agregarContacto(body) {
    return apiCall('/contacts', { method: 'POST', body });
  },
  eliminarContacto(id) {
    return apiCall(`/contacts/${id}`, { method: 'DELETE' });
  },

  // ── Zonas de riesgo ──────────────────────────────────────────────────────────

  getZonas() {
    return apiCall('/zones', { method: 'GET' });
  },

  // ── Rutas seguras ────────────────────────────────────────────────────────────

  getRutas() {
    return apiCall('/routes', { method: 'GET' });
  },

  // ── Health check ─────────────────────────────────────────────────────────────

  health() {
    return apiCall('/health', { method: 'GET', includeAuth: false });
  },

  actualizarPerfil(body) {
    return apiCall('/auth/me', { method: 'PATCH', body });
  },
};

export default api;
