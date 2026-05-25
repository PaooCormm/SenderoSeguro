/**
 * src/context/AuthContext.js
 *
 * Autenticación 100% contra la API REST.
 * https://api.interactiveagents.lat/api
 *
 * - Al arrancar restaura la sesión desde AsyncStorage
 * - Login/Registro guardan access + refresh token
 * - Logout invalida el token en el servidor
 * - Si el token expira a mitad de sesión, api.js llama a _onSessionExpired
 *   que fuerza el logout aquí
 */
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import api, { storage, setSessionExpiredHandler } from '../services/api';

// ─── Normalizar usuario desde la API ─────────────────────────────────────────
// El servidor devuelve nombreCompleto, pero los componentes usan user.nombre
function normalizeUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    nombre: raw.nombre ?? raw.nombre_completo ?? raw.nombreCompleto ?? '',
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser     ] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading,   setLoading  ] = useState(true);  // verificando sesión inicial

  // ─── Registrar callback de sesión expirada ────────────────────────────────
  // Cuando api.js no puede refrescar el token, llama a esto → logout silencioso
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setGuestMode(false);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  // ─── Restaurar sesión al arrancar ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Intentar cargar usuario guardado localmente
        const cachedUser = await storage.getUser();
        const token      = await storage.getAccess();

        if (cachedUser && token) {
          // Verificar que el token sigue siendo válido en el servidor
          try {
            const fresh = await api.me();
            setUser(normalizeUser(fresh.user ?? fresh));
          } catch {
            // Si falla, usar el caché local (puede ser offline)
            setUser(normalizeUser(cachedUser));
          }
        }
      } catch {
        // Sin sesión guardada
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────
  // Ahora recibe 'credential' directo desde LoginScreen
  const login = useCallback(async ({ credential, password }) => {
    // Ya no necesitamos transformar la boleta a correo, el backend acepta 'credential'
    const data = await api.login({ credential, password });
    setUser(normalizeUser(data.user));
    setGuestMode(false);
    return data;
  }, []);

  // ─── Registro ──────────────────────────────────────────────────────────────
  // Ahora recibe las propiedades exactas que manda LoginScreen
  const register = useCallback(async ({ nombreCompleto, boleta, correo, password }) => {
    const data = await api.register({ nombreCompleto, boleta, correo, password });
    setUser(normalizeUser(data.user));
    setGuestMode(false);
    return data;
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setGuestMode(false);
  }, []);

  // ─── Modo invitado ─────────────────────────────────────────────────────────
  const enterGuestMode = useCallback(() => {
    setGuestMode(true);
    setUser(null);
  }, []);

  // ─── Recuperar contraseña (si el servidor tiene este endpoint) ─────────────
  const resetPassword = useCallback(async (correoOrBoleta) => {
    const isBoleta = /^\d{10}$/.test(correoOrBoleta.trim());
    const correo   = isBoleta
      ? `${correoOrBoleta.trim()}@alumno.ipn.mx`
      : correoOrBoleta.trim().toLowerCase();

    // El endpoint puede no existir aún — envuelto en try para no romper la UI
    await api.post?.('/auth/forgot-password', { correo })
      ?? Promise.resolve();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      guestMode,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      enterGuestMode,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}