import { Router } from 'express';
import { getHistorial } from '../controllers/historialController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getHistorial);

export default router;
