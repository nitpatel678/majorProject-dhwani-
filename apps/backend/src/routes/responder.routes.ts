import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getResponders,
  getResponder,
  createResponder,
  updateResponder,
  deleteResponder,
  updateStatus,
  getNearbyResponders,
  getPerformance,
} from '../controllers/responder.controller';

const router = Router();

router.use(authenticate);
router.get('/', getResponders);
router.get('/nearby', getNearbyResponders);
router.get('/:id', getResponder);
router.post('/', createResponder);
router.put('/:id', updateResponder);
router.delete('/:id', deleteResponder);
router.post('/:id/status', updateStatus);
router.get('/:id/performance', getPerformance);

export default router;
