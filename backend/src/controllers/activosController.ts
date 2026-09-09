import { Response } from 'express';
import { db } from '../db/database';
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

    // Config threshold
    const configRow = db.prepare("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'").get() as { valor: string } | undefined;
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    // Build base query
    let query = `
      SELECT 
        a.id, a.codigo, a.cliente_id, a.hostname, a.serial_number, a.plataforma_id,
        a.ip_url_gestion, a.lider_id, a.cogestion, a.inicio_gestion, a.fin_gestion,
        a.correo_soporte, a.soporte_n1, a.pep, a.estado, a.created_at, a.updated_at,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        l.nombre AS lider_nombre,
        GROUP_CONCAT(DISTINCT adm.nombre) AS administradores_nombres,
        GROUP_CONCAT(DISTINCT adm.id) AS administradores_ids
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN plataformas p ON a.plataforma_id = p.id
      LEFT JOIN personas l ON a.lider_id = l.id
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
      LEFT JOIN personas adm ON aa.persona_id = adm.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Filter by estado
    if (estado && estado !== 'TODOS') {
      whereClauses.push('a.estado = ?');
      params.push(estado.toUpperCase());
    }

    // Filter by client
    if (cliente_id) {
      whereClauses.push('a.cliente_id = ?');
      params.push(parseInt(cliente_id, 10));
    }

    // Filter by platform
    if (plataforma_id) {
      whereClauses.push('a.plataforma_id = ?');
      params.push(parseInt(plataforma_id, 10));
    }

    // Filter by leader
    if (lider_id) {
      whereClauses.push('a.lider_id = ?');
      params.push(parseInt(lider_id, 10));
    }

    // Filter by cogestion
    if (cogestion) {
      whereClauses.push('a.cogestion = ?');
      params.push(cogestion.toUpperCase());
    }

    // Filter by soporte_n1
    if (soporte_n1) {
      whereClauses.push('a.soporte_n1 = ?');
      params.push(soporte_n1.toUpperCase());
    }

    // Global text search
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

    // Filter by administrator (needs HAVING because of GROUP_CONCAT or join)
    if (administrador_id) {
      query += ` HAVING ',' || administradores_ids || ',' LIKE ?`;
      params.push(`%,${administrador_id},%`);
    }

    // Execute query to get raw results before in-memory vigencia filtering and sorting
    const rawRows = db.prepare(query).all(...params) as any[];

    // Enrich rows with real-time vigencia calculations
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

    // Filter by vigencia status
    if (vigencia) {
      const vigKey = vigencia.toUpperCase();
      enriched = enriched.filter(item => {
        if (vigKey === 'VIGENTE') return item.estado_vigencia === 'VIGENTE';
        if (vigKey === 'PROXIMO' || vigKey === 'PRÓXIMO A VENCER') return item.estado_vigencia === 'PRÓXIMO A VENCER';
        if (vigKey === 'VENCIDO') return item.estado_vigencia === 'VENCIDO';
        return true;
      });
    }

    // Filter by dias_rango (e.g. 7, 30, 60, 90)
    if (dias_rango) {
      const maxDays = parseInt(dias_rango, 10);
      enriched = enriched.filter(item => {
        if (item.dias_restantes === null) return false;
        return item.dias_restantes >= 0 && item.dias_restantes <= maxDays;
      });
    }

    // Calculate global counts for the tabs
    const allForCounts = db.prepare(`
      SELECT a.estado, a.fin_gestion FROM activos a
    `).all() as { estado: string; fin_gestion: string | null }[];

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

    // Sorting
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

    // Pagination
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

    const activo = db.prepare(`
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
    `).get(id, id) as any;

    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    // Get administrators
    const admins = db.prepare(`
      SELECT p.id, p.nombre, p.email, p.tipo
      FROM activo_administrador aa
      JOIN personas p ON aa.persona_id = p.id
      WHERE aa.activo_id = ?
    `).all(activo.id) as any[];

    // Get related tickets
    const tickets = db.prepare(`
      SELECT * FROM tickets_relacionados WHERE activo_id = ? ORDER BY id DESC
    `).all(activo.id) as any[];

    // Get audit history
    const historial = db.prepare(`
      SELECT * FROM historial_activo WHERE activo_id = ? ORDER BY id DESC
    `).all(activo.id) as any[];

    const vigencia = calculateVigencia(activo.fin_gestion);

    return res.json({
      ...activo,
      administradores: admins,
      administradores_str: admins.map(a => a.nombre).join(', ') || 'Sin asignar',
      tickets_relacionados: tickets,
      historial,
      vigencia,
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

    const match = db.prepare(query).get(...params) as any;
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

    // Check duplicate serial
    const existing = db.prepare('SELECT id, codigo, hostname FROM activos WHERE LOWER(TRIM(serial_number)) = LOWER(?)').get(serial_number.trim()) as any;
    if (existing && !force_duplicate) {
      // Check if duplicate blocking is enabled in configuration
      const configRow = db.prepare("SELECT valor FROM configuracion WHERE clave = 'bloquear_duplicados_serial'").get() as any;
      const isBlocked = configRow && configRow.valor === '1';

      if (isBlocked) {
        return res.status(409).json({
          error: `Ya existe un activo con este Serial Number (${existing.codigo} - ${existing.hostname}). Bloqueado por configuración.`,
          isDuplicate: true,
          match: existing
        });
      }
    }

    // Generate unique code ACT-XXXXXX
    const lastNumRow = db.prepare("SELECT MAX(CAST(SUBSTR(codigo, 5) AS INTEGER)) as max_num FROM activos WHERE codigo LIKE 'ACT-%'").get() as { max_num: number | null };
    const nextNum = (lastNumRow?.max_num || 0) + 1;
    const codigo = `ACT-${String(nextNum).padStart(6, '0')}`;

    const inicioParsed = parseExcelDate(inicio_gestion);
    const finParsed = parseExcelDate(fin_gestion);

    const userName = req.user?.nombre || 'Usuario';

    const insertStmt = db.prepare(`
      INSERT INTO activos (
        codigo, cliente_id, hostname, serial_number, plataforma_id, ip_url_gestion,
        lider_id, cogestion, inicio_gestion, fin_gestion, correo_soporte, soporte_n1,
        pep, estado, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const insertAdminStmt = db.prepare(`
      INSERT OR IGNORE INTO activo_administrador (activo_id, persona_id) VALUES (?, ?)
    `);

    const insertHistorialStmt = db.prepare(`
      INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let newId = 0;
    const tx = db.transaction(() => {
      const res = insertStmt.run(
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
      );
      newId = Number(res.lastInsertRowid);

      if (Array.isArray(administradores_ids)) {
        for (const adminId of administradores_ids) {
          insertAdminStmt.run(newId, parseInt(adminId, 10));
        }
      }

      insertHistorialStmt.run(
        newId,
        req.user?.id || null,
        userName,
        'Creación',
        null,
        `Activo creado exitosamente (${codigo})`
      );
    });

    tx();

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

    const old = db.prepare('SELECT * FROM activos WHERE id = ?').get(id) as any;
    if (!old) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    const userName = req.user?.nombre || 'Usuario';
    const userId = req.user?.id || null;

    const inicioParsed = inicio_gestion ? parseExcelDate(inicio_gestion) : old.inicio_gestion;
    const finParsed = fin_gestion ? parseExcelDate(fin_gestion) : old.fin_gestion;

    const insertHistorialStmt = db.prepare(`
      INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      // Record changes in audit history
      const checkDiff = (field: string, oldVal: any, newVal: any) => {
        if (newVal !== undefined && String(oldVal || '') !== String(newVal || '')) {
          insertHistorialStmt.run(old.id, userId, userName, field, String(oldVal || 'N/A'), String(newVal || 'N/A'));
        }
      };

      checkDiff('Hostname', old.hostname, hostname);
      checkDiff('Serial Number', old.serial_number, serial_number);
      checkDiff('IP/URL Gestión', old.ip_url_gestion, ip_url_gestion);
      checkDiff('Cogestión', old.cogestion, cogestion);
      checkDiff('Soporte N1', old.soporte_n1, soporte_n1);
      checkDiff('Correo Soporte', old.correo_soporte, correo_soporte);
      checkDiff('Inicio Gestión', old.inicio_gestion, inicioParsed);
      checkDiff('Fin Gestión', old.fin_gestion, finParsed);
      checkDiff('Estado', old.estado, estado);

      db.prepare(`
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
      `).run(
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
      );

      // Update administrators if provided
      if (Array.isArray(administradores_ids)) {
        db.prepare('DELETE FROM activo_administrador WHERE activo_id = ?').run(old.id);
        const insertAdminStmt = db.prepare('INSERT INTO activo_administrador (activo_id, persona_id) VALUES (?, ?)');
        for (const adminId of administradores_ids) {
          insertAdminStmt.run(old.id, parseInt(adminId, 10));
        }
        insertHistorialStmt.run(old.id, userId, userName, 'Administradores', 'Modificados', 'Lista actualizada');
      }
    });

    tx();

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

    const activo = db.prepare('SELECT id, codigo, estado FROM activos WHERE id = ?').get(id) as any;
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    const estadoAnterior = activo.estado;
    const userName = req.user?.nombre || 'Usuario';
    const userId = req.user?.id || null;

    db.prepare(`
      UPDATE activos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(nuevo_estado, activo.id);

    db.prepare(`
      INSERT INTO historial_activo (activo_id, usuario_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
      VALUES (?, ?, ?, 'Estado', ?, ?)
    `).run(activo.id, userId, userName, estadoAnterior, nuevo_estado);

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
    const activo = db.prepare('SELECT id, codigo FROM activos WHERE id = ?').get(id) as any;
    if (!activo) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }

    db.prepare('DELETE FROM activos WHERE id = ?').run(activo.id);

    return res.json({ message: `Activo ${activo.codigo} eliminado correctamente` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
