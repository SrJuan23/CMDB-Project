import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getOne, getAll, run, transaction } from '../db/database';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish } from '../services/vigenciaService';
import { parseExcelDate } from '../services/vigenciaService';

const router = Router();
router.use(authenticateToken);

router.post('/', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  const { nombre, email, password, rol = 'GESTOR', estado = 'ACTIVO' } = req.body;

  if (!nombre || !email || !password || !['ADMIN', 'GESTOR', 'CONSULTA'].includes(rol)) {
    return res.status(400).json({ error: 'Nombre, email y password son obligatorios.' });
  }

  try {
    const existing = await getOne('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un usuario con este email.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await run(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, estado, password_change_required, puede_ser_asignado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre.trim(), email.trim().toLowerCase(), hash, rol, estado, true, rol === 'ADMIN']
    );

    return res.status(201).json({ id: result.lastInsertRowid, message: 'Usuario creado con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const usuarios = await getAll('SELECT id, nombre, email, rol, estado, password_change_required, created_at FROM usuarios ORDER BY nombre ASC');
    return res.json(usuarios);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/asignables', async (req: AuthenticatedRequest, res) => {
  try {
    const usuarios = await getAll(`
      SELECT id, nombre, email, rol, estado, puede_iniciar_sesion
      FROM usuarios
      WHERE rol = 'ADMIN' AND estado = 'ACTIVO' AND puede_ser_asignado = TRUE
      ORDER BY nombre ASC
    `);
    return res.json(usuarios);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = await getOne('SELECT id, nombre, email, rol, estado, password_change_required, created_at FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol, estado } = req.body;

    const user = await getOne('SELECT id, nombre, email, rol, estado FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const params: any[] = [];
    const updates: string[] = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre.trim());
    }
    if (email !== undefined) {
      const existing = await getOne('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) AND id != ?', [email, id]);
      if (existing) {
        return res.status(409).json({ error: 'Ya existe un usuario con este email.' });
      }
      updates.push('email = ?');
      params.push(email.trim().toLowerCase());
    }
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      updates.push('password_hash = ?', 'password_change_required = ?');
      params.push(hash);
      params.push(true);
    }
    if (rol !== undefined) {
      updates.push('rol = ?');
      params.push(rol);
      updates.push('puede_ser_asignado = ?');
      params.push(rol === 'ADMIN');
    }
    if (estado !== undefined) {
      updates.push('estado = ?');
      params.push(estado);
    }

    if (updates.length === 0) {
      return res.json({ message: 'No hay cambios para aplicar.' });
    }

    params.push(id);
    await run(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.json({ message: 'Usuario actualizado con éxito' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = await getOne('SELECT id, nombre, email FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const selfDelete = req.user?.id === parseInt(id, 10);
    if (selfDelete) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
    }

    await run('DELETE FROM usuarios WHERE id = ?', [id]);

    return res.json({ message: `Usuario ${user.nombre} (${user.email}) eliminado correctamente` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/change-password/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await getOne('SELECT id, password_hash, nombre FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (req.user?.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro usuario.' });
    }

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    await run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);

    return res.json({ message: `Contraseña actualizada para ${user.nombre}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
