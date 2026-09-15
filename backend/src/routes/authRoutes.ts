import { Router } from 'express';
import { login, me, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.get('/me', authenticateToken, me);

export default router;
