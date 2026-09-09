import { Router } from 'express';
import { previewExcel, executeImport, exportActivos, upload } from '../controllers/excelController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/preview', authenticateToken, requireRole('ADMIN', 'GESTOR'), upload.single('file'), previewExcel);
router.post('/import', authenticateToken, requireRole('ADMIN'), upload.single('file'), executeImport);
router.get('/export', authenticateToken, exportActivos);

export default router;
