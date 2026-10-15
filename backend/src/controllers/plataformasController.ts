import { Response } from 'express';
import { getOne, getAll, run } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish } from '../services/vigenciaService';

export async function getPlataformas(req: AuthenticatedRequest, res: Response) {
  try {
    const plataformas = await getAll(`
      SELECT 
        p.id, p.nombre, p.sku, p.pet, p.descripcion, p.estado, p.created_at,
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

    const allActivos = await getAll('SELECT plataforma_id, fin_servicio FROM activos');

    const enriched = plataformas.map(p => {
      let vencidos = 0;
      allActivos
        .filter(a => a.plataforma_id === p.id)
        .forEach(a => {
          const vig = calculateVigencia(a.fin_servicio, threshold);
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
        a.id, a.codigo, a.hostname, a.serial_number, a.ip_url_gestion, a.generacion_actas,
        a.nombre_proyecto, a.cogestion, a.inicio_servicio, a.fin_servicio,
        a."Fecha_finalización_licencias" AS fecha_finalizacion_licencias,
        a."Fecha_activacion_licencias" AS fecha_activacion_licencias,
        a.correo_soporte, a.soporte_n1, a.pep, a.estado, a.created_at, a.updated_at,
        c.nombre AS cliente_nombre
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.plataforma_id = ?
      ORDER BY a.estado ASC, a.hostname ASC
    `, [id]);

    const enriched = activos.map(a => ({
      ...a,
      vigencia: calculateVigencia(a.fin_servicio),
      dias_restantes: calculateVigencia(a.fin_servicio).dias_restantes,
      estado_vigencia: calculateVigencia(a.fin_servicio).estado_vigencia,
      inicio_servicio_formateada: formatDateSpanish(a.inicio_servicio),
      fin_servicio_formateada: formatDateSpanish(a.fin_servicio),
      generacion_actas_formateada: formatDateSpanish(a.generacion_actas),
      fecha_finalizacion_licencias_formateada: formatDateSpanish(a.fecha_finalizacion_licencias),
      fecha_activacion_licencias_formateada: formatDateSpanish(a.fecha_activacion_licencias)
    }));

    return res.json({ plataforma, activos: enriched });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPlataforma(req: AuthenticatedRequest, res: Response) {
  try {
    const { nombre, sku, pet, descripcion, estado = 'ACTIVO' } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la plataforma es obligatorio' });
    }

    const resDb = await run('INSERT INTO plataformas (nombre, sku, pet, descripcion, estado) VALUES (?, ?, ?, ?, ?)', [
      nombre.trim(),
      sku ? sku.trim() : null,
      pet ? pet.trim() : null,
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
    const { nombre, sku, pet, descripcion, estado } = req.body;

    await run(`
      UPDATE plataformas SET
        nombre = COALESCE(?, nombre),
        sku = COALESCE(?, sku),
        pet = COALESCE(?, pet),
        descripcion = COALESCE(?, descripcion),
        estado = COALESCE(?, estado)
      WHERE id = ?
    `, [nombre ? nombre.trim() : null, sku ? sku.trim() : null, pet ? pet.trim() : null, descripcion ? descripcion.trim() : null, estado, id]);

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
