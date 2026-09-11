import { Response } from 'express';
import { getOne, getAll, run } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish } from '../services/vigenciaService';

export async function getPlataformas(req: AuthenticatedRequest, res: Response) {
  try {
    const plataformas = await getAll(`
      SELECT 
        p.id, p.nombre, p.sku, p.descripcion, p.estado, p.created_at,
        COUNT(a.id) AS total_activos,
        SUM(CASE WHEN a.estado = 'ACTIVO' THEN 1 ELSE 0 END) AS activos_count,
        SUM(CASE WHEN a.estado = 'INACTIVO' THEN 1 ELSE 0 END) AS inactivos_count
      FROM plataformas p
      LEFT JOIN activos a ON p.id = a.plataforma_id
      GROUP BY p.id
      ORDER BY total_activos DESC, p.nombre ASC
    `);

    const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'");
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    const allActivos = await getAll('SELECT plataforma_id, fin_gestion FROM activos');

    const enriched = plataformas.map(p => {
      let vencidos = 0;
      allActivos
        .filter(a => a.plataforma_id === p.id)
        .forEach(a => {
          const vig = calculateVigencia(a.fin_gestion, threshold);
          if (vig.estado_vigencia === 'VENCIDO') vencidos++;
        });

      return {
        ...p,
        total_activos: p.total_activos || 0,
        activos_count: p.activos_count || 0,
        inactivos_count: p.inactivos_count || 0,
        vencidos_count: vencidos
      };
    });

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getPlataformaActivos(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const plataforma = await getOne('SELECT * FROM plataformas WHERE id = ?', [id]);
    if (!plataforma) {
      return res.status(404).json({ error: 'Plataforma no encontrada' });
    }

    const activos = await getAll(`
      SELECT 
        a.*,
        c.nombre AS cliente_nombre,
        l.nombre AS lider_nombre,
        STRING_AGG(DISTINCT adm.nombre) AS administradores_nombres
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN personas l ON a.lider_id = l.id
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
      LEFT JOIN personas adm ON aa.persona_id = adm.id
      WHERE a.plataforma_id = ?
      GROUP BY a.id
      ORDER BY a.estado ASC, a.hostname ASC
    `, [id]);

    const enriched = activos.map(a => ({
      ...a,
      vigencia: calculateVigencia(a.fin_gestion),
      dias_restantes: calculateVigencia(a.fin_gestion).dias_restantes,
      estado_vigencia: calculateVigencia(a.fin_gestion).estado_vigencia,
      inicio_gestion_formateada: formatDateSpanish(a.inicio_gestion),
      fin_gestion_formateada: formatDateSpanish(a.fin_gestion)
    }));

    return res.json({ plataforma, activos: enriched });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPlataforma(req: AuthenticatedRequest, res: Response) {
  try {
    const { nombre, sku, descripcion, estado = 'ACTIVO' } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la plataforma es obligatorio' });
    }

    const resDb = await run('INSERT INTO plataformas (nombre, sku, descripcion, estado) VALUES (?, ?, ?, ?)', [
      nombre.trim(),
      sku ? sku.trim() : null,
      descripcion ? descripcion.trim() : null,
      estado
    ]);

    return res.status(201).json({ id: resDb.lastInsertRowid, message: 'Plataforma creada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updatePlataforma(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nombre, sku, descripcion, estado } = req.body;

    await run(`
      UPDATE plataformas SET
        nombre = COALESCE(?, nombre),
        sku = COALESCE(?, sku),
        descripcion = COALESCE(?, descripcion),
        estado = COALESCE(?, estado)
      WHERE id = ?
    `, [nombre ? nombre.trim() : null, sku ? sku.trim() : null, descripcion ? descripcion.trim() : null, estado, id]);

    return res.json({ message: 'Plataforma actualizada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deletePlataforma(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const countRow = await getOne('SELECT COUNT(*) as count FROM activos WHERE plataforma_id = ?', [id]);
    if (countRow && countRow.count > 0) {
      return res.status(400).json({ error: `No se puede eliminar la plataforma porque tiene ${countRow.count} activos asociados.` });
    }

    await run('DELETE FROM plataformas WHERE id = ?', [id]);
    return res.json({ message: 'Plataforma eliminada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function cambiarEstadoPlataforma(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nuevo_estado } = req.body;
    if (!nuevo_estado || (nuevo_estado !== 'ACTIVO' && nuevo_estado !== 'INACTIVO')) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser ACTIVO o INACTIVO.' });
    }
    const plataforma = await getOne('SELECT id, nombre, estado FROM plataformas WHERE id = ?', [id]);
    if (!plataforma) {
      return res.status(404).json({ error: 'Plataforma no encontrada' });
    }
    await run('UPDATE plataformas SET estado = ? WHERE id = ?', [nuevo_estado, id]);
    return res.json({ message: `Plataforma ${plataforma.nombre} cambiada a ${nuevo_estado}`, nuevo_estado });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
