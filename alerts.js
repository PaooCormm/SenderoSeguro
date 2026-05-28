import express from 'express';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/alerts - Listar alertas
router.get('/', async (req, res, next) => {
  try {
    const { estado } = req.query;
    let whereSQL = '';
    let params = [];

    if (estado) {
      whereSQL = 'WHERE estado = $1';
      params.push(estado);
    }

    const result = await query(
      `SELECT e.id, e.user_id, e.titulo, e.estado, e.created_at, e.updated_at,
              ST_Y(e.geom) AS latitude, ST_X(e.geom) AS longitude
       FROM emergency_alerts e
       ${whereSQL}
       ORDER BY e.created_at DESC
       LIMIT 50`,
      params
    );

    console.log(`[ALERTS] GET /api/alerts - ${result.rows.length} alertas`);
    if (result.rows.length > 0) {
      console.log('[ALERTS] Primera alerta:', JSON.stringify(result.rows[0]));
    }

    res.json({
      alerts: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        titulo: row.titulo,
        latitud: parseFloat(row.latitude),
        longitud: parseFloat(row.longitude),
        estado: row.estado,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    });
  } catch (err) {
    console.error('[ALERTS] Error al listar alertas:', err.message);
    console.error('[ALERTS] Stack:', err.stack);
    next(err);
  }
});

// POST /api/alerts - Crear alerta de emergencia (SOS)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { titulo, latitud, longitud } = req.body;

    if (!titulo || latitud == null || longitud == null) {
      return res.status(400).json({ error: 'titulo, latitud y longitud son requeridos' });
    }

    const result = await query(
      `INSERT INTO emergency_alerts (user_id, titulo, geom)
       VALUES ($1, $2, ST_Point($3, $4))
       RETURNING id, titulo, ST_Y(geom) AS latitude, ST_X(geom) AS longitude, estado, created_at`,
      [req.user.id, titulo.trim(), parseFloat(longitud), parseFloat(latitud)]
    );

    const alert = result.rows[0];
    console.error('[ALERT] ALERTA DE EMERGENCIA CREADA - user:', req.user.boleta, '- coords:', latitud, longitud);
    console.log('[ALERTS] Alerta creada:', alert.id);

    res.status(201).json({
      message: 'Alerta de emergencia creada',
      alert: {
        id: alert.id,
        titulo: alert.titulo,
        latitud: alert.latitude,
        longitud: alert.longitude,
        estado: alert.estado,
        createdAt: alert.created_at,
      }
    });
  } catch (err) {
    console.error('[ALERTS] Error al crear alerta:', err.message);
    console.error('[ALERTS] Stack:', err.stack);
    next(err);
  }
});

// PATCH /api/alerts/:id - Actualizar estado
router.patch('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'estado es requerido' });
    }

    const result = await query(
      `UPDATE emergency_alerts SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    console.log('[ALERTS] Alerta actualizada:', req.params.id, 'nuevo estado:', estado);
    res.json({ message: 'Alerta actualizada', alert: result.rows[0] });
  } catch (err) {
    console.error('[ALERTS] Error al actualizar alerta:', err.message);
    console.error('[ALERTS] Stack:', err.stack);
    next(err);
  }
});

export default router;
