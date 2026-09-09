import { Router } from 'express';
import {
  getPlataformas,
  getPlataformaActivos,
  createPlataforma,
  updatePlataforma,
  deletePlataforma
} from '../controllers/plataformasController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getPlataformas);
router.get('/:id/activos', authenticateToken, getPlataformaActivos);
router.post('/', authenticateToken, requireRole('ADMIN', 'GESTOR'), createPlataforma);
router.put('/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), updatePlataforma);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deletePlataforma);

export default router;
