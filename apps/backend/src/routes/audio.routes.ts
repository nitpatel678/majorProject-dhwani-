import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';
import { analyzeAudio, uploadAudioFile } from '../controllers/audio.controller';

const router = Router();

router.post('/analyze', authenticate, uploadAudio.single('audio'), analyzeAudio);
router.post('/upload', authenticate, uploadAudio.single('audio'), uploadAudioFile);

export default router;
