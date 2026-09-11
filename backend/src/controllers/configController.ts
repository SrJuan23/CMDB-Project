import { Response } from 'express';
import { getOne, getAll, run } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const rows = await getAll('SELECT clave, valor FROM configuracion');
    const config: Record<string, string> = {};
    rows.forEach((r: any) => { config[r.clave] = r.valor; });
    return res.json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { dias_proximo_vencer, bloquear_duplicados_serial } = req.body;

    if (dias_proximo_vencer !== undefined) {
      await run(`
        INSERT INTO configuracion (clave, valor) VALUES (?, ?)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
      `, ['dias_proximo_vencer', String(dias_proximo_vencer)]);
    }

    if (bloquear_duplicados_serial !== undefined) {
      await run(`
        INSERT INTO configuracion (clave, valor) VALUES (?, ?)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
      `, ['bloquear_duplicados_serial', String(bloquear_duplicados_serial)]);
    }

    return res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
