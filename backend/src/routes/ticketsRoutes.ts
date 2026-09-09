import { Router } from 'express';
import { getTicketsByActivo, createTicket, updateTicket, deleteTicket } from '../controllers/ticketsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/activo/:activo_id', authenticateToken, getTicketsByActivo);
router.post('/', authenticateToken, requireRole('ADMIN', 'GESTOR'), createTicket);
router.put('/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), updateTicket);
router.delete('/:id', authenticateToken, requireRole('ADMIN', 'GESTOR'), deleteTicket);

export default router;
