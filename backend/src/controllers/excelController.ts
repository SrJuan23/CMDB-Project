import { Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth';
import { parseExcelBuffer, commitExcelImport, exportActivosToExcel, exportActivosToCSV } from '../services/excelService';
import { getAll } from '../db/database';
import { calculateVigencia } from '../services/vigenciaService';

export const upload = multer({ storage: multer.memoryStorage() });

export async function previewExcel(req: AuthenticatedRequest, res: Response) {
  try {
    let buffer: Buffer | null = null;

    if (req.file) {
      buffer = req.file.buffer;
    } else {
      const defaultPath = path.resolve(__dirname, '../../../data/CMDB_Soporte.xlsx');
      const altPath = path.resolve(__dirname, '../../data/CMDB_Soporte.xlsx');
      const chosenPath = fs.existsSync(defaultPath) ? defaultPath : (fs.existsSync(altPath) ? altPath : null);

      if (chosenPath) {
        buffer = fs.readFileSync(chosenPath);
      }
    }

    if (!buffer) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo Excel ni se encontró el archivo base.' });
    }

    const preview = await parseExcelBuffer(buffer);

    return res.json({
      total_encontrados: preview.total_encontrados,
      activos_hoja: preview.activos_hoja,
      inactivos_hoja: preview.inactivos_hoja,
      nuevos: preview.nuevos,
      posibles_duplicados: preview.posibles_duplicados,
      errores_count: preview.errores_count,
      detalles: preview.detalles.slice(0, 50),
      errores: preview.errores.slice(0, 20)
    });
  } catch (error: any) {
    console.error('Error en previewExcel:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function executeImport(req: AuthenticatedRequest, res: Response) {
  try {
    let buffer: Buffer | null = null;

    if (req.file) {
      buffer = req.file.buffer;
    } else {
      const defaultPath = path.resolve(__dirname, '../../../data/CMDB_Soporte.xlsx');
      const altPath = path.resolve(__dirname, '../../data/CMDB_Soporte.xlsx');
      const chosenPath = fs.existsSync(defaultPath) ? defaultPath : (fs.existsSync(altPath) ? altPath : null);
      if (chosenPath) {
        buffer = fs.readFileSync(chosenPath);
      }
    }

    if (!buffer) {
      return res.status(400).json({ error: 'No se encontró el archivo a importar.' });
    }

    const preview = await parseExcelBuffer(buffer);
    const userName = req.user?.nombre || 'Usuario';
    const result = await commitExcelImport(preview.detalles, userName);

    return res.json({
      message: 'Importación procesada con éxito',
      total_encontrados: preview.total_encontrados,
      importados: result.importados,
      actualizados: result.actualizados,
      errores: result.errores
    });
  } catch (error: any) {
    console.error('Error en executeImport:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function exportActivos(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      format = 'excel',
      estado = 'TODOS',
      q = '',
      cliente_id,
      plataforma_id,
      lider_id,
      administrador_id,
      cogestion,
      soporte_n1,
      vigencia,
      dias_rango
    } = req.query as Record<string, string>;

    let query = `
      SELECT 
        a.id, a.codigo, a.cliente_id, a.hostname, a.serial_number, a.plataforma_id,
        a.ip_url_gestion, a.lider_id, a.cogestion, a.inicio_gestion, a.fin_gestion,
        a.correo_soporte, a.soporte_n1, a.pep, a.estado,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        l.nombre AS lider_nombre,
        STRING_AGG(DISTINCT adm.nombre) AS administradores
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
        c.nombre LIKE ? OR
        p.nombre LIKE ? OR
        l.nombre LIKE ? OR
        adm.nombre LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` GROUP BY a.id`;

    if (administrador_id) {
      query += ` HAVING ',' || STRING_AGG(DISTINCT adm.id) || ',' LIKE ?`;
      params.push(`%,${administrador_id},%`);
    }

    const rawRows = await getAll(query, params);

    let filtered = rawRows;
    if (vigencia || dias_rango) {
      filtered = rawRows.filter(row => {
        const vig = calculateVigencia(row.fin_gestion);
        if (vigencia) {
          const v = vigencia.toUpperCase();
          if (v === 'VIGENTE' && vig.estado_vigencia !== 'VIGENTE') return false;
          if ((v === 'PROXIMO' || v === 'PRÓXIMO A VENCER') && vig.estado_vigencia !== 'PRÓXIMO A VENCER') return false;
          if (v === 'VENCIDO' && vig.estado_vigencia !== 'VENCIDO') return false;
        }
        if (dias_rango && vig.dias_restantes !== null) {
          const max = parseInt(dias_rango, 10);
          if (vig.dias_restantes < 0 || vig.dias_restantes > max) return false;
        }
        return true;
      });
    }

    const dateStr = new Date().toISOString().split('T')[0];

    if (format.toLowerCase() === 'csv') {
      const csv = exportActivosToCSV(filtered);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="CMDB_Activos_${dateStr}.csv"`);
      return res.send(csv);
    } else {
      const buffer = exportActivosToExcel(filtered);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="CMDB_Activos_${dateStr}.xlsx"`);
      return res.send(buffer);
    }
  } catch (error: any) {
    console.error('Error en exportActivos:', error);
    return res.status(500).json({ error: error.message });
  }
}
