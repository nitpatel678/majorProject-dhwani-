import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMapMarkers, getHeatmapData } from '../controllers/map.controller';

const router = Router();

router.use(authenticate);
router.get('/markers', getMapMarkers);
router.get('/heatmap', getHeatmapData);

export default router;
