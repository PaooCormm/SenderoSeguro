import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';
import { authenticateToken, generateTokens, hashRefreshToken, verifyRefreshToken } from '../middleware/auth.js';

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { boleta, nombreCompleto, correo, password } = req.body;

    if (!boleta || !nombreCompleto || !correo || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (!correo.endsWith('@alumno.ipn.mx')) {
      return res.status(400).json({ error: 'Se requiere correo institucional @alumno.ipn.mx' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (boleta, nombre_completo, correo, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, boleta, nombre_completo, correo, role, created_at`,
      [boleta.trim(), nombreCompleto.trim(), correo.trim().toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    console.log('[AUTH] Usuario registrado exitosamente:', user.boleta);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        boleta: user.boleta,
        nombre: user.nombre_completo,
        correo: user.correo,
      }
    });
  } catch (err) {
    console.error('[AUTH] Error en registro:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    if (err.code === '23505') {
      if (err.constraint?.includes('boleta')) {
        return res.status(409).json({ error: 'La boleta ya esta registrada' });
      }
      return res.status(409).json({ error: 'El correo ya esta registrado' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { credential, password } = req.body;

    if (!credential || !password) {
      return res.status(400).json({ error: 'Credenciales y contrasena son requeridos' });
    }

    const isEmail = credential.includes('@');
    const field = isEmail ? 'correo' : 'boleta';

    const result = await query(
      `SELECT id, boleta, nombre_completo, correo, password_hash, role, is_active
       FROM users WHERE ${field} = $1`,
      [credential.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('[AUTH] Intento de login fallido - usuario no encontrado:', credential);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      console.log('[AUTH] Intento de login - cuenta inactiva:', user.boleta);
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta a un administrador' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log('[AUTH] Intento de login fallido - contrasena incorrecta:', user.boleta);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const refreshTokenHash = await hashRefreshToken(refreshToken);

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '${process.env.JWT_REFRESH_EXPIRES_IN || '7 days'}')`,
      [user.id, refreshTokenHash, req.headers['user-agent'] || 'unknown']
    );

    console.log('[AUTH] Login exitoso:', user.boleta);

    res.json({
      message: 'Login exitoso',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        boleta: user.boleta,
        nombre: user.nombre_completo,
        correo: user.correo,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('[AUTH] Error en login:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error('[AUTH] Refresh token invalido:', err.message);
      return res.status(401).json({ error: 'Refresh token invalido o expirado' });
    }

    const result = await query(
      `SELECT rt.token_hash, u.id, u.boleta, u.nombre_completo, u.correo, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.user_id = $1 AND rt.expires_at > NOW()
       ORDER BY rt.created_at DESC
       LIMIT 1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      console.log('[AUTH] Refresh token no encontrado o expirado para user_id:', decoded.id);
      return res.status(401).json({ error: 'Sesion expirada, inicia sesion nuevamente' });
    }

    const valid = await verifyRefreshToken(result.rows[0].token_hash, refreshToken);
    if (!valid) {
      console.log('[AUTH] Refresh token hash no coincide para user_id:', decoded.id);
      return res.status(401).json({ error: 'Refresh token invalido' });
    }

    const user = result.rows[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    const newRefreshTokenHash = await hashRefreshToken(newRefreshToken);

    await query(
      `UPDATE refresh_tokens SET token_hash = $1, expires_at = NOW() + INTERVAL '${process.env.JWT_REFRESH_EXPIRES_IN || '7 days'}'
       WHERE user_id = $2 AND token_hash = $3`,
      [newRefreshTokenHash, user.id, result.rows[0].token_hash]
    );

    console.log('[AUTH] Token refrescado para:', user.boleta);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('[AUTH] Error en refresh:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = await hashRefreshToken(refreshToken);
      await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
      console.log('[AUTH] Logout con invalidacion de token para user:', req.user.boleta);
    } else {
      await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
      console.log('[AUTH] Logout - todos los tokens eliminados para user:', req.user.boleta);
    }

    res.json({ message: 'Sesion cerrada exitosamente' });
  } catch (err) {
    console.error('[AUTH] Error en logout:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    next(err);
  }
});

// PUT /api/auth/password
router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword y newPassword son requeridos' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    const result = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'La contrasena actual es incorrecta' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newPasswordHash, req.user.id]
    );

    console.log('[AUTH] Contrasena actualizada para user:', req.user.boleta);
    res.json({ message: 'Contrasena actualizada exitosamente' });
  } catch (err) {
    console.error('[AUTH] Error al cambiar contrasena:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, boleta, nombre_completo, correo, role, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      boleta: user.boleta,
      nombre: user.nombre_completo,
      correo: user.correo,
      role: user.role,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    console.error('[AUTH] Error en /me:', err.message);
    console.error('[AUTH] Stack:', err.stack);
    next(err);
  }
});

export default router;
