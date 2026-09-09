import { Router } from 'express';
import {
  getPersonas,
  getPersonaActivos,
  createPersona,
  updatePersona,
  deletePersona
} from '../controllers/personasController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getPersonas);
router.get('/:id/activos', authenticateToken, getPersonaActivos);
router.post('/', authenticateToken, requireRole('ADMIN', 'GESTOR'), createPersona);
router.put('/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), updatePersona);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deletePersona);

export default router;
