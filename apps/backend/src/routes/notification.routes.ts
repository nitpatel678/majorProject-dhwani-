import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);
router.get('/', getNotifications);
router.post('/read/:id', markAsRead);
router.post('/read-all', markAllAsRead);

export default router;
