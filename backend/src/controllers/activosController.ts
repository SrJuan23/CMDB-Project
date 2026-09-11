import { Response } from 'express';
import { getOne, getAll, run, transaction } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish, parseExcelDate } from '../services/vigenciaService';

export async function getActivos(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      page = '1',
      limit = '25',
      estado = 'TODOS',
      q = '',
      cliente_id,
      plataforma_id,
      lider_id,
      administrador_id,
      cogestion,
      soporte_n1,
      vigencia,
      dias_rango,
      sort_by = 'id',
      sort_order = 'desc'
    } = req.query as Record<string, string>;

    const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'");
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    let query = `
      SELECT 
        a.id, a.codigo, a.cliente_id, a.hostname, a.serial_number, a.plataforma_id,
        a.ip_url_gestion, a.lider_id, a.cogestion, a.inicio_gestion, a.fin_gestion,
        a.correo_soporte, a.soporte_n1, a.pep, a.estado, a.created_at, a.updated_at,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        l.nombre AS lider_nombre,
        STRING_AGG(DISTINCT adm.nombre) AS administradores_nombres,
        STRING_AGG(DISTINCT adm.id) AS administradores_ids
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN plataformas p ON a.plataforma_id = p.id
      LEFT JOIN personas l ON a.lider_id = l.id
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
      LEFT JOIN personas adm ON aa.persona_id = adm.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (estado && estado !== 'TODOS') {
      whereClauses.push('a.estado = ?');
      params.push(estado.toUpperCase());
    }

    if (cliente_id) {
      whereClauses.push('a.cliente_id = ?');
      params.push(parseInt(cliente_id, 10));
    }

    if (plataforma_id) {
      whereClauses.push('a.plataforma_id = ?');
      params.push(parseInt(plataforma_id, 10));
    }

    if (lider_id) {
      whereClauses.push('a.lider_id = ?');
      params.push(parseInt(lider_id, 10));
    }

    if (cogestion) {
      whereClauses.push('a.cogestion = ?');
      params.push(cogestion.toUpperCase());
    }

    if (soporte_n1) {
      whereClauses.push('a.soporte_n1 = ?');
      params.push(soporte_n1.toUpperCase());
    }

    if (q && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      whereClauses.push(`(
        a.codigo LIKE ? OR
        a.hostname LIKE ? OR
        a.serial_number LIKE ? OR
        a.ip_url_gestion LIKE ? OR
        a.correo_soporte LIKE ? OR
        c.nombre LIKE ? OR
        p.nombre LIKE ? OR
        l.nombre LIKE ? OR
        adm.nombre LIKE ?
      )`);
      params.push(
        searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
        searchTerm, searchTerm, searchTerm, searchTerm
      );
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` GROUP BY a.id`;

    if (administrador_id) {
      query += ` HAVING ',' || administradores_ids || ',' LIKE ?`;
      params.push(`%,${administrador_id},%`);
    }

    const rawRows = await getAll(query, params);

    let enriched = rawRows.map(row => {
      const vig = calculateVigencia(row.fin_gestion, threshold);
      const adminNames = row.administradores_nombres ? row.administradores_nombres.split(',') : [];
      const adminIds = row.administradores_ids ? row.administradores_ids.split(',').map((x: string) => parseInt(x, 10)) : [];
      const administradores = adminNames.map((name: string, idx: number) => ({
        id: adminIds[idx],
        nombre: name
      }));

      return {
        ...row,
        administradores,
        administradores_str: adminNames.join(', ') || 'Sin asignar',
        vigencia: vig,
        dias_restantes: vig.dias_restantes,
        estado_vigencia: vig.estado_vigencia,
        inicio_gestion_formateada: formatDateSpanish(row.inicio_gestion),
        fin_gestion_formateada: formatDateSpanish(row.fin_gestion)
      };
    });

    if (vigencia) {
      const vigKey = vigencia.toUpperCase();
      enriched = enriched.filter(item => {
        if (vigKey === 'VIGENTE') return item.estado_vigencia === 'VIGENTE';
        if (vigKey === 'PROXIMO' || vigKey === 'PRÓXIMO A VENCER') return item.estado_vigencia === 'PRÓXIMO A VENCER';
        if (vigKey === 'VENCIDO') return item.estado_vigencia === 'VENCIDO';
        return true;
      });
    }

    if (dias_rango) {
      const maxDays = parseInt(dias_rango, 10);
      enriched = enriched.filter(item => {
        if (item.dias_restantes === null) return false;
        return item.dias_restantes >= 0 && item.dias_restantes <= maxDays;
      });
    }

    const allForCounts = await getAll('SELECT a.estado, a.fin_gestion FROM activos a');

    let counts = {
      todos: allForCounts.length,
      activos: allForCounts.filter(a => a.estado === 'ACTIVO').length,
      inactivos: allForCounts.filter(a => a.estado === 'INACTIVO').length,
      vigentes: 0,
      proximos: 0,
      vencidos: 0
    };

    allForCounts.forEach(a => {
      const v = calculateVigencia(a.fin_gestion, threshold);
      if (v.estado_vigencia === 'VIGENTE') counts.vigentes++;
      if (v.estado_vigencia === 'PRÓXIMO A VENCER') counts.proximos++;
      if (v.estado_vigencia === 'VENCIDO') counts.vencidos++;
    });

    const isAsc = sort_order.toLowerCase() === 'asc';
    enriched.sort((a, b) => {
      let valA: any = a[sort_by];
      let valB: any = b[sort_by];

      if (sort_by === 'cliente') {
        valA = a.cliente_nombre;
        valB = b.cliente_nombre;
      } else if (sort_by === 'plataforma') {
        valA = a.plataforma_nombre;
        valB = b.plataforma_nombre;
      } else if (sort_by === 'lider') {
        valA = a.lider_nombre || '';
        valB = b.lider_nombre || '';
      } else if (sort_by === 'dias_restantes') {
        valA = a.dias_restantes !== null ? a.dias_restantes : 999999;
        valB = b.dias_restantes !== null ? b.dias_restantes : 999999;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return isAsc ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    const total = enriched.length;
    let paginated = enriched;
    const pageNum = parseInt(page, 10);
    const limitNum = limit === 'all' ? total : parseInt(limit, 10);

    if (limit !== 'all') {
      const start = (pageNum - 1) * limitNum;
      paginated = enriched.slice(start, start + limitNum);
    }

    return res.json({
      data: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / (limitNum || 1)),
      counts
    });
  } catch (error: any) {
    console.error('Error en getActivos:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getActivoById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const activo = await getOne(`
      SELECT 
        a.*,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        p.descripcion AS plataforma_descripcion,
        l.nombre AS lider_nombre,
        l.email AS lider_email
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN plataformas p ON a.plataforma_id = p.id
      LEFT JOIN personas l ON a.lider_id = l.id
      WHERE a.id = ? OR a.codigo = ?
    `, [id, id]);

    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    const admins = await getAll(`
      SELECT p.id, p.nombre, p.email, p.tipo
      FROM activo_administrador aa
      JOIN personas p ON aa.persona_id = p.id
      WHERE aa.activo_id = ?
    `, [activo.id]);

    const tickets = await getAll(`
      SELECT * FROM tickets_relacionados WHERE activo_id = ? ORDER BY id DESC
    `, [activo.id]);

    const historial = await getAll(`
      SELECT * FROM historial_activo WHERE activo_id = ? ORDER BY id DESC
    `, [activo.id]);

    const vigencia = calculateVigencia(activo.fin_gestion);

    return res.json({
      ...activo,
      administradores: admins,
      administradores_str: admins.map(a => a.nombre).join(', ') || 'Sin asignar',
      tickets_relacionados: tickets,
      historial,
      vigencia,
      dias_restantes: vigencia.dias_restantes,
      estado_vigencia: vigencia.estado_vigencia,
      inicio_gestion_formateada: formatDateSpanish(activo.inicio_gestion),
      fin_gestion_formateada: formatDateSpanish(activo.fin_gestion)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function checkSerial(req: AuthenticatedRequest, res: Response) {
  try {
    const { serial_number, exclude_id } = req.query as { serial_number?: string; exclude_id?: string };
    if (!serial_number) {
      return res.json({ exists: false });
    }

    let query = 'SELECT id, codigo, hostname, cliente_id, estado FROM activos WHERE LOWER(TRIM(serial_number)) = LOWER(?)';
    const params: any[] = [serial_number.trim()];

    if (exclude_id) {
      query += ' AND id != ?';
      params.push(parseInt(exclude_id, 10));
    }

    const match = await getOne(query, params);
    if (match) {
      return res.json({
        exists: true,
        match: {
          id: match.id,
          codigo: match.codigo,
          hostname: match.hostname,
          estado: match.estado
        }
      });
    }

    return res.json({ exists: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createActivo(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      cliente_id,
      hostname,
      serial_number,
      plataforma_id,
      ip_url_gestion,
      lider_id,
      administradores_ids = [],
      cogestion = 'NO',
      inicio_gestion,
      fin_gestion,
      correo_soporte,
      soporte_n1 = 'NO',
      pep,
      estado = 'ACTIVO',
      force_duplicate = false
    } = req.body;

    if (!cliente_id || !hostname || !serial_number || !plataforma_id) {
      return res.status(400).json({ error: 'Cliente, Hostname, Serial Number y Plataforma son obligatorios.' });
    }

    const existing = await getOne('SELECT id, codigo, hostname FROM activos WHERE LOWER(TRIM(serial_number)) = LOWER(?)', [serial_number.trim()]);
    if (existing && !force_duplicate) {
      const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'bloquear_duplicados_serial'");
      const isBlocked = configRow && configRow.valor === '1';

      if (isBlocked) {
        return res.status(409).json({
          error: `Ya existe un activo con este Serial Number (${existing.codigo} - ${existing.hostname}). Bloqueado por configuración.`,
          isDuplicate: true,
          match: existing
        });
      }
    }

    const lastNumRow = await getOne("SELECT MAX(CAST(SUBSTRING(codigo, 5) AS INTEGER)) as max_num FROM activos WHERE codigo LIKE 'ACT-%'");
    const nextNum = (lastNumRow?.max_num || 0) + 1;
    const codigo = `ACT-${String(nextNum).padStart(6, '0')}`;

    const inicioParsed = parseExcelDate(inicio_gestion);
    const finParsed = parseExcelDate(fin_gestion);

    const userName = req.user?.nombre || 'Usuario';

    const newId = await transaction(async () => {
      const insertResult = await run(`
        INSERT INTO activos (
          codigo, cliente_id, hostname, serial_number, plataforma_id, ip_url_gestion,
          lider_id, cogestion, inicio_gestion, fin_gestion, correo_soporte, soporte_n1,
          pep, estado, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        codigo,
        parseInt(cliente_id, 10),
        hostname.trim(),
        serial_number.trim(),
        parseInt(plataforma_id, 10),
        (ip_url_gestion || 'N/A').trim(),
        lider_id ? parseInt(lider_id, 10) : null,
        cogestion === 'SI' ? 'SI' : 'NO',
        inicioParsed,
        finParsed,
        correo_soporte ? correo_soporte.trim() : null,
        soporte_n1 === 'SI' ? 'SI' : 'NO',
        pep ? pep.trim() : null,
        estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'
      ]);

      const insertedId = insertResult.lastInsertRowid;

      if (Array.isArray(administradores_ids)) {
        for (const adminId of administradores_ids) {
          await run('INSERT INTO activo_administrador (activo_id, persona_id) VALUES (?, ?)', [insertedId, parseInt(adminId, 10)]);
        }
      }

      await run(`
        INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [insertedId, req.user?.id || null, userName, 'Creación', null, `Activo creado exitosamente (${codigo})`]);

      return insertedId;
    });

    return res.status(201).json({ id: newId, codigo, message: 'Activo creado con éxito' });
  } catch (error: any) {
    console.error('Error al crear activo:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function updateActivo(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      cliente_id,
      hostname,
      serial_number,
      plataforma_id,
      ip_url_gestion,
      lider_id,
      administradores_ids,
      cogestion,
      inicio_gestion,
      fin_gestion,
      correo_soporte,
      soporte_n1,
      pep,
      estado
    } = req.body;

    const old = await getOne('SELECT * FROM activos WHERE id = ?', [id]);
    if (!old) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    const userName = req.user?.nombre || 'Usuario';
    const userId = req.user?.id || null;

    const inicioParsed = inicio_gestion ? parseExcelDate(inicio_gestion) : old.inicio_gestion;
    const finParsed = fin_gestion ? parseExcelDate(fin_gestion) : old.fin_gestion;

    await transaction(async () => {
      const checkDiff = async (field: string, oldVal: any, newVal: any) => {
        if (newVal !== undefined && String(oldVal || '') !== String(newVal || '')) {
          await run(`
            INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [old.id, userId, userName, field, String(oldVal || 'N/A'), String(newVal || 'N/A')]);
        }
      };

      await checkDiff('Hostname', old.hostname, hostname);
      await checkDiff('Serial Number', old.serial_number, serial_number);
      await checkDiff('IP/URL Gestión', old.ip_url_gestion, ip_url_gestion);
      await checkDiff('Cogestión', old.cogestion, cogestion);
      await checkDiff('Soporte N1', old.soporte_n1, soporte_n1);
      await checkDiff('Correo Soporte', old.correo_soporte, correo_soporte);
      await checkDiff('Inicio Gestión', old.inicio_gestion, inicioParsed);
      await checkDiff('Fin Gestión', old.fin_gestion, finParsed);
      await checkDiff('Estado', old.estado, estado);

      await run(`
        UPDATE activos SET
          cliente_id = COALESCE(?, cliente_id),
          hostname = COALESCE(?, hostname),
          serial_number = COALESCE(?, serial_number),
          plataforma_id = COALESCE(?, plataforma_id),
          ip_url_gestion = COALESCE(?, ip_url_gestion),
          lider_id = ?,
          cogestion = COALESCE(?, cogestion),
          inicio_gestion = ?,
          fin_gestion = ?,
          correo_soporte = ?,
          soporte_n1 = COALESCE(?, soporte_n1),
          pep = COALESCE(?, pep),
          estado = COALESCE(?, estado),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        cliente_id ? parseInt(cliente_id, 10) : null,
        hostname ? hostname.trim() : null,
        serial_number ? serial_number.trim() : null,
        plataforma_id ? parseInt(plataforma_id, 10) : null,
        ip_url_gestion ? ip_url_gestion.trim() : null,
        lider_id !== undefined ? (lider_id ? parseInt(lider_id, 10) : null) : old.lider_id,
        cogestion,
        inicioParsed,
        finParsed,
        correo_soporte !== undefined ? (correo_soporte ? correo_soporte.trim() : null) : old.correo_soporte,
        soporte_n1,
        pep,
        estado,
        old.id
      ]);

      if (Array.isArray(administradores_ids)) {
        await run('DELETE FROM activo_administrador WHERE activo_id = ?', [old.id]);
        for (const adminId of administradores_ids) {
          await run('INSERT INTO activo_administrador (activo_id, persona_id) VALUES (?, ?)', [old.id, parseInt(adminId, 10)]);
        }
        await run(`
          INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [old.id, userId, userName, 'Administradores', 'Modificados', 'Lista actualizada']);
      }
    });

    return res.json({ message: 'Activo actualizado con éxito' });
  } catch (error: any) {
    console.error('Error al actualizar activo:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function cambiarEstado(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { nuevo_estado } = req.body;

    if (!nuevo_estado || (nuevo_estado !== 'ACTIVO' && nuevo_estado !== 'INACTIVO')) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser ACTIVO o INACTIVO.' });
    }

    const activo = await getOne('SELECT id, codigo, estado FROM activos WHERE id = ?', [id]);
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    const estadoAnterior = activo.estado;
    const userName = req.user?.nombre || 'Usuario';
    const userId = req.user?.id || null;

    await run(`
      UPDATE activos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [nuevo_estado, activo.id]);

    await run(`
      INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [activo.id, userId, userName, 'Estado', estadoAnterior, nuevo_estado]);

    return res.json({
      message: `Activo ${activo.codigo} cambiado a ${nuevo_estado} exitosamente`,
      nuevo_estado
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteActivo(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const activo = await getOne('SELECT id, codigo FROM activos WHERE id = ?', [id]);
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    await run('DELETE FROM activos WHERE id = ?', [activo.id]);

    return res.json({ message: `Activo ${activo.codigo} eliminado correctamente` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
