import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getHistorial(req: AuthenticatedRequest, res: Response) {
  try {
    const { activo_id, page = '1', limit = '50', q = '' } = req.query as Record<string, string>;

    let query = `
      SELECT 
        h.*,
        a.codigo AS activo_codigo,
        a.hostname AS activo_hostname
      FROM historial_activo h
      JOIN activos a ON h.activo_id = a.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (activo_id) {
      whereClauses.push('h.activo_id = ?');
      params.push(parseInt(activo_id, 10));
    }

    if (q && q.trim().length > 0) {
      const term = `%${q.trim()}%`;
      whereClauses.push(`(
        h.usuario_nombre LIKE ? OR
        h.campo LIKE ? OR
        h.valor_anterior LIKE ? OR
        h.valor_nuevo LIKE ? OR
        a.codigo LIKE ? OR
        a.hostname LIKE ?
      )`);
      params.push(term, term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY h.id DESC`;

    const all = db.prepare(query).all(...params) as any[];
    const total = all.length;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const start = (pageNum - 1) * limitNum;
    const paginated = all.slice(start, start + limitNum);

    return res.json({
      data: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / (limitNum || 1))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
