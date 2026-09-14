import { Response } from 'express';
import { getOne, getAll, run } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish, parseExcelDate } from '../services/vigenciaService';

export async function getPersonas(req: AuthenticatedRequest, res: Response) {
  try {
    const { tipo } = req.query as Record<string, string>;

    let query = `
      SELECT
        p.id, p.nombre, p.email, p.tipo, p.estado, p.created_at,
        COUNT(DISTINCT aa.activo_id) as total_activos,
        SUM(CASE WHEN a.estado = 'ACTIVO' THEN 1 ELSE 0 END) as activos_count,
        SUM(CASE WHEN a.estado = 'INACTIVO' THEN 1 ELSE 0 END) as inactivos_count
      FROM personas p
      LEFT JOIN activo_administrador aa ON aa.persona_id = p.id
      LEFT JOIN activos a ON a.id = aa.activo_id
    `;

    const params: any[] = [];
    const whereClauses: string[] = [];

    if (tipo && tipo.trim()) {
      whereClauses.push('p.tipo = ?');
      params.push(tipo.trim().toUpperCase());
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` GROUP BY p.id, p.nombre, p.email, p.tipo, p.estado, p.created_at ORDER BY p.nombre ASC`;

    const personas = await getAll(query, params);

    const adminActivos = await getAll(`
      SELECT
        aa.persona_id, a.id AS activo_id, a.estado, a.fin_gestion
      FROM activo_administrador aa
      JOIN activos a ON a.id = aa.activo_id
    `);

    const result = personas.map(p => {
      const personActivos = adminActivos.filter(a => a.persona_id === p.id);

      let vencidos = 0;
      let proximos = 0;
      let vigentes = 0;

      const threshold = 30;

      personActivos.forEach(a => {
        if (!a.fin_gestion) return;
        const vig = calculateVigencia(a.fin_gestion, threshold);
        if (vig.estado_vigencia === 'VIGENTE') vigentes++;
        else if (vig.estado_vigencia === 'PRÓXIMO A VENCER') proximos++;
        else if (vig.estado_vigencia === 'VENCIDO') vencidos++;
      });

      return {
        ...p,
        total_activos: Number(p.total_activos) || 0,
        activos_count: Number(p.activos_count) || 0,
        inactivos_count: Number(p.inactivos_count) || 0,
        proximos_count: proximos,
        vencidos_count: vencidos
      };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error en getPersonas:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getPersonaById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const persona = await getOne('SELECT * FROM personas WHERE id = ?', [id]);
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const activos = await getAll(`
      SELECT
        a.id, a.codigo, a.cliente_id, a.hostname, a.serial_number, a.plataforma_id,
        a.ip_url_gestion, a.generacion_actas, a.pet, a.nombre_proyecto,
        a.cogestion, a.inicio_gestion, a.fin_gestion,
        a.correo_soporte, a.soporte_n1, a.pep, a.estado, a.created_at, a.updated_at,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        p.sku AS plataforma_sku,
        p.descripcion AS plataforma_descripcion
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN plataformas p ON a.plataforma_id = p.id
      JOIN activo_administrador aa ON a.id = aa.activo_id
      WHERE aa.persona_id = ?
      ORDER BY a.id DESC
    `, [parseInt(id, 10)]);

    const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'");
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    const enriched = activos.map(a => {
      const vig = calculateVigencia(a.fin_gestion, threshold);
      return {
        ...a,
        vigencia: vig,
        dias_restantes: vig.dias_restantes,
        estado_vigencia: vig.estado_vigencia,
        inicio_gestion_formateada: formatDateSpanish(a.inicio_gestion),
        fin_gestion_formateada: formatDateSpanish(a.fin_gestion),
        generacion_actas_formateada: formatDateSpanish(a.generacion_actas)
      };
    });

    return res.json({
      persona: {
        ...persona,
        created_at: persona.created_at instanceof Date
          ? persona.created_at.toISOString()
          : String(persona.created_at)
      },
      activos: enriched
    });
  } catch (error: any) {
    console.error('Error en getPersonaById:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function createPersona(req: AuthenticatedRequest, res: Response) {
  try {
    const { nombre, email, tipo = 'ADMINISTRADOR', estado = 'ACTIVO' } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }

    const result = await run(
      'INSERT INTO personas (nombre, email, tipo, estado) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email ? email.trim() : null, tipo.trim().toUpperCase(), estado.trim().toUpperCase()]
    );

    return res.status(201).json({ id: result.lastInsertRowid, message: 'Persona creada con éxito' });
  } catch (error: any) {
    console.error('Error al crear persona:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function updatePersona(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nombre, email, tipo, estado } = req.body;

    const existing = await getOne('SELECT id FROM personas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const params: any[] = [];
    const updates: string[] = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre.trim());
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email ? email.trim() : null);
    }
    if (tipo !== undefined) {
      updates.push('tipo = ?');
      params.push(tipo.trim().toUpperCase());
    }
    if (estado !== undefined) {
      updates.push('estado = ?');
      params.push(estado.trim().toUpperCase());
    }

    if (updates.length === 0) {
      return res.json({ message: 'No hay cambios para aplicar.' });
    }

    params.push(parseInt(id, 10));
    await run(`UPDATE personas SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.json({ message: 'Persona actualizada con éxito' });
  } catch (error: any) {
    console.error('Error al actualizar persona:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function deletePersona(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const persona = await getOne('SELECT id, nombre FROM personas WHERE id = ?', [id]);
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    const activos = await getAll('SELECT id, codigo FROM activos WHERE EXISTS (SELECT 1 FROM activo_administrador aa WHERE aa.activo_id = activos.id AND aa.persona_id = ?)', [parseInt(id, 10)]);
    if (activos.length > 0) {
      return res.status(400).json({
        error: `Esta persona tiene ${activos.length} activo(s) asignado(s) como administrador. Elimínalos primero.`,
        activos
      });
    }

    await run('DELETE FROM activo_administrador WHERE persona_id = ?', [parseInt(id, 10)]);
    await run('DELETE FROM personas WHERE id = ?', [parseInt(id, 10)]);

    return res.json({ message: `Persona ${persona.nombre} eliminada correctamente` });
  } catch (error: any) {
    console.error('Error al eliminar persona:', error);
    return res.status(500).json({ error: error.message });
  }
}
