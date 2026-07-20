import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAnalytics } from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate);
router.get('/:type', getAnalytics);

export default router;
