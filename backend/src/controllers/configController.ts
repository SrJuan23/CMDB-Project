import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all() as { clave: string; valor: string }[];
    const config: Record<string, string> = {};
    rows.forEach(r => { config[r.clave] = r.valor; });
    return res.json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { dias_proximo_vencer, bloquear_duplicados_serial } = req.body;

    const upsertStmt = db.prepare(`
      INSERT INTO configuracion (clave, valor) VALUES (?, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `);

    if (dias_proximo_vencer !== undefined) {
      upsertStmt.run('dias_proximo_vencer', String(dias_proximo_vencer));
    }

    if (bloquear_duplicados_serial !== undefined) {
      upsertStmt.run('bloquear_duplicados_serial', String(bloquear_duplicados_serial));
    }

    return res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
