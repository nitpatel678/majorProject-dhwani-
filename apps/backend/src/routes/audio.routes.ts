import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';
import { analyzeAudio, analyzeAudioPipeline, uploadAudioFile } from '../controllers/audio.controller';

const router = Router();

// Legacy single-shot classification (backward compatible)
router.post('/analyze', authenticate, uploadAudio.single('audio'), analyzeAudio);

// Full pipeline analysis (windowed inference + threat scoring + decision engine)
router.post('/analyze-pipeline', authenticate, uploadAudio.single('audio'), analyzeAudioPipeline);

// File upload
router.post('/upload', authenticate, uploadAudio.single('audio'), uploadAudioFile);

export default router;
