import { Router } from 'express';
import {
  getActivos,
  getActivoById,
  createActivo,
  updateActivo,
  cambiarEstado,
  deleteActivo,
  checkSerial
} from '../controllers/activosController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Publicly authenticated endpoints
router.get('/', authenticateToken, getActivos);
router.get('/check-serial', authenticateToken, checkSerial);
router.get('/:id', authenticateToken, getActivoById);

// Creation and modification (Admin and Gestor)
router.post('/', authenticateToken, requireRole('ADMIN', 'GESTOR'), createActivo);
router.put('/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), updateActivo);
router.patch('/:id/estado', authenticateToken, requireRole('ADMIN', 'GESTOR'), cambiarEstado);

// Deletion (Admin only)
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteActivo);

export default router;
