import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, run } from '../db/database';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

const JWT_SECRET: string = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await getOne('SELECT * FROM usuarios WHERE puede_iniciar_sesion = TRUE AND email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(?)', [email.trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const isMatch = Boolean(user.password_hash) && bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload: AuthUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        password_change_required: Boolean(user.password_change_required)
      },
      password_change_required: Boolean(user.password_change_required)
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const user = await getOne('SELECT id, nombre, email, rol, estado, password_change_required, created_at FROM usuarios WHERE id = ?', [req.user.id]);
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres.' });
      }

      const user = await getOne('SELECT id, password_hash FROM usuarios WHERE id = ?', [req.user.id]);
      if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
      }

      const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
      await run('UPDATE usuarios SET password_hash = ?, password_change_required = FALSE WHERE id = ?', [hash, req.user.id]);
      return res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
