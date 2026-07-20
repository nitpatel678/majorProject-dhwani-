import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getStats,
  getRecentActivity,
  getSystemHealth,
  getChartData,
} from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/stats', getStats);
router.get('/recent-activity', getRecentActivity);
router.get('/system-health', getSystemHealth);
router.get('/charts/:type', getChartData);

export default router;
