import { Response } from 'express';
import { getOne, getAll, run } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish } from '../services/vigenciaService';

export async function getClientes(req: AuthenticatedRequest, res: Response) {
  try {
    const clientes = await getAll(`
      SELECT 
        c.id, c.nombre, c.contacto, c.estado, c.created_at,
        COUNT(a.id) AS total_activos,
        SUM(CASE WHEN a.estado = 'ACTIVO' THEN 1 ELSE 0 END) AS activos_count,
        SUM(CASE WHEN a.estado = 'INACTIVO' THEN 1 ELSE 0 END) AS inactivos_count
      FROM clientes c
      LEFT JOIN activos a ON c.id = a.cliente_id
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);

    const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'");
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    const allActivos = await getAll('SELECT cliente_id, fin_gestion, estado FROM activos');

    const enriched = clientes.map(c => {
      let vencidos = 0;
      let proximos = 0;

      allActivos
        .filter(a => a.cliente_id === c.id)
        .forEach(a => {
          const vig = calculateVigencia(a.fin_gestion, threshold);
          if (vig.estado_vigencia === 'VENCIDO') vencidos++;
          if (vig.estado_vigencia === 'PRÓXIMO A VENCER') proximos++;
        });

      return {
        ...c,
        total_activos: c.total_activos || 0,
        activos_count: c.activos_count || 0,
        inactivos_count: c.inactivos_count || 0,
        vencidos_count: vencidos,
        proximos_count: proximos
      };
    });

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getCliente360(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const cliente = await getOne('SELECT * FROM clientes WHERE id = ?', [id]);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'");
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    const activos = await getAll(`
      SELECT 
        a.*,
        p.nombre AS plataforma_nombre,
        l.nombre AS lider_nombre,
        STRING_AGG(DISTINCT adm.nombre) AS administradores_nombres
      FROM activos a
      JOIN plataformas p ON a.plataforma_id = p.id
      LEFT JOIN personas l ON a.lider_id = l.id
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
      LEFT JOIN personas adm ON aa.persona_id = adm.id
      WHERE a.cliente_id = ?
      GROUP BY a.id
      ORDER BY a.estado ASC, a.hostname ASC
    `, [cliente.id]);

    let activosCount = 0;
    let inactivosCount = 0;
    let vencidosCount = 0;
    let proximosCount = 0;
    let vigentesCount = 0;

    const plataformasMap = new Map<string, number>();
    const administradoresMap = new Map<string, number>();

    const enrichedActivos = activos.map(a => {
      const vig = calculateVigencia(a.fin_gestion, threshold);
      if (a.estado === 'ACTIVO') activosCount++;
      if (a.estado === 'INACTIVO') inactivosCount++;

      if (vig.estado_vigencia === 'VENCIDO') vencidosCount++;
      else if (vig.estado_vigencia === 'PRÓXIMO A VENCER') proximosCount++;
      else if (vig.estado_vigencia === 'VIGENTE') vigentesCount++;

      if (a.plataforma_nombre) {
        plataformasMap.set(a.plataforma_nombre, (plataformasMap.get(a.plataforma_nombre) || 0) + 1);
      }

      if (a.administradores_nombres) {
        a.administradores_nombres.split(',').forEach((name: string) => {
          const clean = name.trim();
          administradoresMap.set(clean, (administradoresMap.get(clean) || 0) + 1);
        });
      }

      return {
        ...a,
        vigencia: vig,
        dias_restantes: vig.dias_restantes,
        estado_vigencia: vig.estado_vigencia,
        inicio_gestion_formateada: formatDateSpanish(a.inicio_gestion),
        fin_gestion_formateada: formatDateSpanish(a.fin_gestion)
      };
    });

    const plataformas = Array.from(plataformasMap.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
    const administradores = Array.from(administradoresMap.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));

    return res.json({
      cliente,
      resumen: {
        total_activos: activos.length,
        activos: activosCount,
        inactivos: inactivosCount,
        vigentes: vigentesCount,
        proximos_a_vencer: proximosCount,
        vencidos: vencidosCount
      },
      plataformas_utilizadas: plataformas,
      administradores,
      activos: enrichedActivos
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createCliente(req: AuthenticatedRequest, res: Response) {
  try {
    const { nombre, contacto, estado = 'ACTIVO' } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
    }

    const resDb = await run('INSERT INTO clientes (nombre, contacto, estado) VALUES (?, ?, ?)', [
      nombre.trim(),
      contacto ? contacto.trim() : null,
      estado
    ]);

    return res.status(201).json({ id: resDb.lastInsertRowid, message: 'Cliente creado con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateCliente(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nombre, contacto, estado } = req.body;

    await run(`
      UPDATE clientes SET
        nombre = COALESCE(?, nombre),
        contacto = COALESCE(?, contacto),
        estado = COALESCE(?, estado)
      WHERE id = ?
    `, [nombre ? nombre.trim() : null, contacto ? contacto.trim() : null, estado, id]);

    return res.json({ message: 'Cliente actualizado con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteCliente(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const countRow = await getOne('SELECT COUNT(*) as count FROM activos WHERE cliente_id = ?', [id]);
    if (countRow && countRow.count > 0) {
      return res.status(400).json({ error: `No se puede eliminar el cliente porque tiene ${countRow.count} activos asociados.` });
    }

    await run('DELETE FROM clientes WHERE id = ?', [id]);
    return res.json({ message: 'Cliente eliminado con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function cambiarEstadoCliente(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nuevo_estado } = req.body;
    if (!nuevo_estado || (nuevo_estado !== 'ACTIVO' && nuevo_estado !== 'INACTIVO')) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser ACTIVO o INACTIVO.' });
    }
    const cliente = await getOne('SELECT id, nombre, estado FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    await run('UPDATE clientes SET estado = ? WHERE id = ?', [nuevo_estado, id]);
    return res.json({ message: `Cliente ${cliente.nombre} cambiado a ${nuevo_estado}`, nuevo_estado });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
