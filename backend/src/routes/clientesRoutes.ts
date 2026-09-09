import { Router } from 'express';
import {
  getClientes,
  getCliente360,
  createCliente,
  updateCliente,
  deleteCliente
} from '../controllers/clientesController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getClientes);
router.get('/:id/360', authenticateToken, getCliente360);
router.post('/', authenticateToken, requireRole('ADMIN', 'GESTOR'), createCliente);
router.put('/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), updateCliente);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteCliente);

export default router;
