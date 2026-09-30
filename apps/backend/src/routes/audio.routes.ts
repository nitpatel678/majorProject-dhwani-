import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';
import { 
  analyzeAudio, 
  analyzeAudioPipeline, 
  uploadAudioFile, 
  analyzeLiveChunk, 
  resetLiveState, 
  syncMobileSettings, 
  buildMobileApk 
} from '../controllers/audio.controller';

const router = Router();

// Legacy single-shot classification (backward compatible)
router.post('/analyze', authenticate, uploadAudio.single('audio'), analyzeAudio);

// Full pipeline analysis (windowed inference + threat scoring + decision engine)
router.post('/analyze-pipeline', authenticate, uploadAudio.single('audio'), analyzeAudioPipeline);

// Real-time live audio chunk streaming inference
router.post('/live-chunk', authenticate, uploadAudio.single('audio'), analyzeLiveChunk);

// Reset stream threat score & state
router.post('/reset-stream', authenticate, resetLiveState);

// Sync calibrated parameters to Android app source code
router.post('/sync-mobile', authenticate, syncMobileSettings);

// Trigger on-demand APK compilation with calibrated parameters
router.post('/build-apk', authenticate, buildMobileApk);

// File upload
router.post('/upload', authenticate, uploadAudio.single('audio'), uploadAudioFile);

export default router;
