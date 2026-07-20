import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getIncidents,
  getIncident,
  assignIncident,
  resolveIncident,
  escalateIncident,
  updateIncident,
  getTimeline,
} from '../controllers/incident.controller';

const router = Router();

router.use(authenticate);
router.get('/', getIncidents);
router.get('/:id', getIncident);
router.put('/:id', updateIncident);
router.post('/:id/assign', assignIncident);
router.post('/:id/resolve', resolveIncident);
router.post('/:id/escalate', escalateIncident);
router.get('/:id/timeline', getTimeline);

export default router;
