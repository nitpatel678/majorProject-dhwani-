import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEvents,
  getEvent,
  createEvent,
} from '../controllers/event.controller';

const router = Router();

router.get('/', authenticate, getEvents);
router.get('/:id', authenticate, getEvent);
router.post('/', createEvent); // No auth — IoT devices post directly

export default router;
