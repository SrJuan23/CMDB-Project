import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/configController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getConfig);
router.put('/', authenticateToken, requireRole('ADMIN'), updateConfig);

export default router;
