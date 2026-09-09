import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { AuthenticatedRequest, AuthUser } from '../middleware/auth';

const JWT_SECRET: string = process.env.JWT_SECRET || 'ttech_cmdb_secure_jwt_secret_token_2026_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = db.prepare('SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(?)').get(email.trim()) as any;

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
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
        rol: user.rol
      }
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
    const user = db.prepare('SELECT id, nombre, email, rol, estado, created_at FROM usuarios WHERE id = ?').get(req.user.id);
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
