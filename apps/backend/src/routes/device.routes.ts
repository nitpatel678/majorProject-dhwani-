import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
  restartDevice,
  getDeviceLogs,
} from '../controllers/device.controller';

const router = Router();

router.use(authenticate);
router.get('/', getDevices);
router.get('/:id', getDevice);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);
router.post('/:id/toggle', toggleDevice);
router.post('/:id/restart', restartDevice);
router.get('/:id/logs', getDeviceLogs);

export default router;
