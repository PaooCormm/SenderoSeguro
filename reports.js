import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const getUserIdFromToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || null;
  } catch (err) {
    return null;
  }
};

// GET /api/reports - Listar reportes con paginacion
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 5, estado, categoria, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (estado) {
      whereClauses.push(`r.estado = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    if (categoria) {
      whereClauses.push(`r.categoria = $${paramIndex}`);
      params.push(categoria);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`r.titulo ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const userId = getUserIdFromToken(req);

    const countResult = await query(`SELECT COUNT(*) FROM reports r ${whereSQL}`, params);
    const total = parseInt(countResult.rows[0].count);

    const userParamIndex = paramIndex;
    params.push(userId);
    paramIndex++;

    const result = await query(
      `SELECT r.id, r.user_id, r.titulo, r.descripcion, r.categoria, r.ubicacion_txt,
              r.es_anonimo, r.evidencia_url, r.estado, r.utiles, r.created_at, r.updated_at,
              ST_Y(r.geom) AS latitude, ST_X(r.geom) AS longitude,
              u.nombre_completo AS autor_nombre,
              (ru.id IS NOT NULL) AS liked_by_me
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN report_utiles ru ON ru.report_id = r.id AND ru.user_id = $${userParamIndex}
       ${whereSQL}
       ORDER BY r.updated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    const reports = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      titulo: row.titulo,
      descripcion: row.descripcion,
      categoria: row.categoria,
      latitud: parseFloat(row.latitude),
      longitud: parseFloat(row.longitude),
      ubicacionTexto: row.ubicacion_txt,
      esAnonimo: row.es_anonimo,
      evidenciaUrl: row.evidencia_url,
      estado: row.estado,
      utiles: row.utiles,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      autorNombre: row.autor_nombre,
      likedByMe: row.liked_by_me || false,
    }));

    console.log(`[REPORTS] GET /api/reports - ${reports.length} reportes, pagina ${page}`);
    if (reports.length > 0) {
      console.log('[REPORTS] Primer reporte:', JSON.stringify(reports[0]));
    }

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: offset + reports.length < total,
      }
    });
  } catch (err) {
    console.error('[REPORTS] Error al listar reportes:', err.message);
    console.error('[REPORTS] Stack:', err.stack);
    next(err);
  }
});

// GET /api/reports/nearby - Reportes cercanos a una coordenada
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat y lng son requeridos' });
    }

    const result = await query(
      `SELECT r.*, ST_Y(r.geom) AS latitude, ST_X(r.geom) AS longitude,
              ST_Distance(r.geom::geography, ST_Point($1, $2)::geography) AS distance_m
       FROM reports r
       WHERE ST_DWithin(r.geom, ST_Point($1, $2), $3)
       ORDER BY distance_m ASC
       LIMIT 20`,
      [parseFloat(lng), parseFloat(lat), parseFloat(radius)]
    );

    console.log(`[REPORTS] GET /api/reports/nearby - ${result.rows.length} reportes en radio de ${radius}m`);

    res.json({ reports: result.rows });
  } catch (err) {
    console.error('[REPORTS] Error al buscar reportes cercanos:', err.message);
    console.error('[REPORTS] Stack:', err.stack);
    next(err);
  }
});

// POST /api/reports - Crear reporte
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { titulo, descripcion, categoria, latitud, longitud, ubicacionTexto, esAnonimo, evidenciaUrl } = req.body;

    if (!titulo || !categoria || latitud == null || longitud == null) {
      return res.status(400).json({ error: 'titulo, categoria, latitud y longitud son requeridos' });
    }

    const userId = esAnonimo ? null : req.user.id;

    const result = await query(
      `INSERT INTO reports (user_id, titulo, descripcion, categoria, geom, ubicacion_txt, es_anonimo, evidencia_url)
       VALUES ($1, $2, $3, $4, ST_Point($5, $6), $7, $8, $9)
       RETURNING id, titulo, categoria, ST_Y(geom) AS latitude, ST_X(geom) AS longitude, estado, created_at`,
      [userId, titulo.trim(), descripcion?.trim() || null, categoria, parseFloat(longitud), parseFloat(latitud), ubicacionTexto?.trim() || null, esAnonimo || false, evidenciaUrl || null]
    );

    const report = result.rows[0];
    console.log('[REPORTS] Reporte creado:', report.id, 'por user:', req.user.boleta);

    res.status(201).json({
      message: 'Reporte creado exitosamente',
      report: {
        id: report.id,
        titulo: report.titulo,
        categoria: report.categoria,
        latitud: report.latitude,
        longitud: report.longitude,
        estado: report.estado,
        createdAt: report.created_at,
      }
    });
  } catch (err) {
    console.error('[REPORTS] Error al crear reporte:', err.message);
    console.error('[REPORTS] Stack:', err.stack);
    next(err);
  }
});

// PATCH /api/reports/:id - Actualizar estado
router.patch('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'estado es requerido' });
    }

    const result = await query(
      `UPDATE reports SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    console.log('[REPORTS] Reporte actualizado:', req.params.id, 'nuevo estado:', estado);

    res.json({ message: 'Reporte actualizado', report: result.rows[0] });
  } catch (err) {
    console.error('[REPORTS] Error al actualizar reporte:', err.message);
    console.error('[REPORTS] Stack:', err.stack);
    next(err);
  }
});

// POST /api/reports/:id/util - Marcar reporte como util
router.post('/:id/util', authenticateToken, async (req, res, next) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;

    const insertResult = await query(
      `INSERT INTO report_utiles (report_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (report_id, user_id) DO NOTHING
       RETURNING id`,
      [reportId, userId]
    );

    if (insertResult.rowCount > 0) {
      const updateResult = await query(
        'UPDATE reports SET utiles = COALESCE(utiles, 0) + 1 WHERE id = $1 RETURNING utiles',
        [reportId]
      );

      return res.json({ utiles: updateResult.rows[0].utiles, liked: true });
    }

    const currentResult = await query('SELECT COALESCE(utiles, 0) AS utiles FROM reports WHERE id = $1', [reportId]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    return res.json({ utiles: currentResult.rows[0].utiles, liked: true });
  } catch (err) {
    console.error('[REPORTS] Error al marcar util:', err.message);
    console.error('[REPORTS] Stack:', err.stack);
    next(err);
  }
});

// DELETE /api/reports/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM reports WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    console.log('[REPORTS] Reporte eliminado:', req.params.id);
    res.json({ message: 'Reporte eliminado' });
  } catch (err) {
    console.error('[REPORTS] Error al eliminar reporte:', err.message);
    console.error('[REPORTS] Stack:', err.stack);
    next(err);
  }
});

export default router;
