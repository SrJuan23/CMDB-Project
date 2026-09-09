import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish } from '../services/vigenciaService';

export async function getPersonas(req: AuthenticatedRequest, res: Response) {
  try {
    const { tipo } = req.query as { tipo?: string };

    let query = 'SELECT * FROM personas';
    const params: any[] = [];

    if (tipo && tipo !== 'TODOS') {
      query += ' WHERE tipo = ? OR tipo = "AMBOS"';
      params.push(tipo.toUpperCase());
    }

    query += ' ORDER BY nombre ASC';
    const personas = db.prepare(query).all(...params) as any[];

    const configRow = db.prepare("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'").get() as any;
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    const allActivos = db.prepare(`
      SELECT 
        a.id, a.estado, a.fin_gestion, a.lider_id,
        aa.persona_id AS admin_id
      FROM activos a
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
    `).all() as any[];

    const enriched = personas.map(p => {
      let liderTotal = 0;
      let liderActivos = 0;
      let liderInactivos = 0;
      let liderVencidos = 0;
      let liderProximos = 0;

      let adminTotal = 0;
      let adminActivos = 0;
      let adminInactivos = 0;
      let adminVencidos = 0;
      let adminProximos = 0;

      // Group by asset ID to avoid counting duplicates from joins
      const seenLiderAssets = new Set<number>();
      const seenAdminAssets = new Set<number>();

      allActivos.forEach(row => {
        const vig = calculateVigencia(row.fin_gestion, threshold);

        if (row.lider_id === p.id && !seenLiderAssets.has(row.id)) {
          seenLiderAssets.add(row.id);
          liderTotal++;
          if (row.estado === 'ACTIVO') liderActivos++;
          else liderInactivos++;
          if (vig.estado_vigencia === 'VENCIDO') liderVencidos++;
          if (vig.estado_vigencia === 'PRÓXIMO A VENCER') liderProximos++;
        }

        if (row.admin_id === p.id && !seenAdminAssets.has(row.id)) {
          seenAdminAssets.add(row.id);
          adminTotal++;
          if (row.estado === 'ACTIVO') adminActivos++;
          else adminInactivos++;
          if (vig.estado_vigencia === 'VENCIDO') adminVencidos++;
          if (vig.estado_vigencia === 'PRÓXIMO A VENCER') adminProximos++;
        }
      });

      return {
        ...p,
        como_lider: {
          total: liderTotal,
          activos: liderActivos,
          inactivos: liderInactivos,
          vencidos: liderVencidos,
          proximos: liderProximos
        },
        como_administrador: {
          total: adminTotal,
          activos: adminActivos,
          inactivos: adminInactivos,
          vencidos: adminVencidos,
          proximos: adminProximos
        },
        // Combined convenience counts depending on primary role
        total_activos: p.tipo === 'LIDER' ? liderTotal : adminTotal,
        activos_count: p.tipo === 'LIDER' ? liderActivos : adminActivos,
        inactivos_count: p.tipo === 'LIDER' ? liderInactivos : adminInactivos,
        proximos_count: p.tipo === 'LIDER' ? liderProximos : adminProximos,
        vencidos_count: p.tipo === 'LIDER' ? liderVencidos : adminVencidos
      };
    });

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getPersonaActivos(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any;
    if (!persona) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    // Retrieve assets where this person is Leader OR Administrator
    const activos = db.prepare(`
      SELECT 
        a.*,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        l.nombre AS lider_nombre,
        GROUP_CONCAT(DISTINCT adm.nombre) AS administradores_nombres
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN plataformas p ON a.plataforma_id = p.id
      LEFT JOIN personas l ON a.lider_id = l.id
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
      LEFT JOIN personas adm ON aa.persona_id = adm.id
      WHERE a.lider_id = ? OR a.id IN (SELECT activo_id FROM activo_administrador WHERE persona_id = ?)
      GROUP BY a.id
      ORDER BY a.estado ASC, a.hostname ASC
    `).all(id, id) as any[];

    const enriched = activos.map(a => ({
      ...a,
      vigencia: calculateVigencia(a.fin_gestion),
      inicio_gestion_formateada: formatDateSpanish(a.inicio_gestion),
      fin_gestion_formateada: formatDateSpanish(a.fin_gestion)
    }));

    return res.json({ persona, activos: enriched });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createPersona(req: AuthenticatedRequest, res: Response) {
  try {
    const { nombre, email, tipo = 'AMBOS', estado = 'ACTIVO' } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const resDb = db.prepare('INSERT INTO personas (nombre, email, tipo, estado) VALUES (?, ?, ?, ?)').run(
      nombre.trim(),
      email ? email.trim() : null,
      tipo,
      estado
    );

    return res.status(201).json({ id: resDb.lastInsertRowid, message: 'Persona creada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updatePersona(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nombre, email, tipo, estado } = req.body;

    db.prepare(`
      UPDATE personas SET
        nombre = COALESCE(?, nombre),
        email = COALESCE(?, email),
        tipo = COALESCE(?, tipo),
        estado = COALESCE(?, estado)
      WHERE id = ?
    `).run(nombre ? nombre.trim() : null, email ? email.trim() : null, tipo, estado, id);

    return res.json({ message: 'Persona actualizada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deletePersona(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const asLider = (db.prepare('SELECT COUNT(*) as count FROM activos WHERE lider_id = ?').get(id) as any).count;
    const asAdmin = (db.prepare('SELECT COUNT(*) as count FROM activo_administrador WHERE persona_id = ?').get(id) as any).count;

    if (asLider > 0 || asAdmin > 0) {
      return res.status(400).json({
        error: `No se puede eliminar porque está asociado a activos (${asLider} como líder, ${asAdmin} como administrador).`
      });
    }

    db.prepare('DELETE FROM personas WHERE id = ?').run(id);
    return res.json({ message: 'Persona eliminada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
