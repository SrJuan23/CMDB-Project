import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || '';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'GESTOR' | 'CONSULTA';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

export function requireRole(...allowedRoles: ('ADMIN' | 'GESTOR' | 'CONSULTA')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Acceso no autenticado.' });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

