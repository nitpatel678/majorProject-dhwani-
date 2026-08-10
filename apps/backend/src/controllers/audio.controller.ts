import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

const MODEL_CLASSES = config.model.classes;

// =============================================================================
// Helper: Run Python inference pipeline
// =============================================================================

/**
 * Executes the predict.py script and returns parsed JSON output.
 * 
 * Key design decisions:
 * - Uses spawnSync to properly separate stdout from stderr
 * - Sets TF_CPP_MIN_LOG_LEVEL=3 to suppress TensorFlow C++ warnings
 * - Sets PYTHONUNBUFFERED=1 to ensure output is flushed
 * - Extracts only the last non-empty line from stdout (the JSON output)
 *   because Python/TF may emit non-JSON warnings to stdout despite our env vars
 * - Throws descriptive errors instead of silently falling back to mock data
 */
function runPythonPipeline(filePath: string, timeoutMs: number = 120000): any {
  const { spawnSync } = require('child_process');
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'predict.py');
  const modelPath = path.resolve(config.model.path);

  const result = spawnSync('python', [scriptPath, filePath, modelPath], {
    encoding: 'utf-8',
    timeout: timeoutMs,
    // Suppress TensorFlow C++ logging and Python warnings so they don't
    // contaminate stdout. stderr is captured separately anyway.
    env: {
      ...process.env,
      TF_CPP_MIN_LOG_LEVEL: '3',       // Suppress TF C++ logs
      TF_ENABLE_ONEDNN_OPTS: '0',      // Suppress oneDNN messages
      PYTHONWARNINGS: 'ignore',         // Suppress Python UserWarnings
      PYTHONUNBUFFERED: '1',            // Ensure output flushes
    },
  });

  if (result.error) {
    throw new Error(`Python process error: ${result.error.message}`);
  }

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();

  if (result.status !== 0) {
    console.error('[Pipeline] Python stderr:', stderr);
    console.error('[Pipeline] Python stdout:', stdout);
    throw new Error(`Python exited with code ${result.status}: ${stderr || stdout}`);
  }

  if (!stdout) {
    throw new Error('Python produced no output');
  }

  // The JSON is always the LAST line of stdout.
  // TensorFlow/librosa may print warnings to stdout despite our suppressions.
  const lines = stdout.split('\n');
  let jsonLine = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) {
      jsonLine = line;
      break;
    }
  }

  if (!jsonLine) {
    console.error('[Pipeline] Could not find JSON in stdout:', stdout);
    throw new Error('Python output did not contain valid JSON');
  }

  try {
    return JSON.parse(jsonLine);
  } catch (parseError) {
    console.error('[Pipeline] JSON parse failed. Raw line:', jsonLine);
    throw new Error(`Failed to parse Python output as JSON: ${(parseError as Error).message}`);
  }
}

// =============================================================================
// Legacy single-shot analysis (backward compatible)
// =============================================================================

export const analyzeAudio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const startTime = Date.now();
    const filePath = req.file.path;

    try {
      const parsed = runPythonPipeline(filePath, 120000);
      const inferenceTime = Date.now() - startTime;

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // Extract first window prediction for backward compatibility
      if (parsed.timeline && parsed.timeline.length > 0) {
        const first = parsed.timeline[0];
        const probabilities: Record<string, number> = {};
        MODEL_CLASSES.forEach((cls, i) => {
          probabilities[cls] = first.probabilities[i] || 0;
        });

        const sorted = MODEL_CLASSES.map((cls, i) => ({
          label: cls,
          probability: first.probabilities[i] || 0,
        })).sort((a, b) => b.probability - a.probability);

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({
          prediction: sorted[0].label,
          confidence: sorted[0].probability,
          inferenceTime,
          probabilities,
          top3: sorted.slice(0, 3),
          modelVersion: config.model.version,
          inputDuration: config.model.clipDuration,
          sampleRate: config.model.sampleRate,
        });
        return;
      }

      throw new Error('Pipeline returned no timeline data');
    } catch (pythonError: any) {
      console.error('[Legacy] Pipeline failed:', pythonError.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(500).json({ 
        error: 'Audio analysis failed', 
        detail: pythonError.message 
      });
    }
  } catch (error) {
    console.error('Audio analysis error:', error);
    res.status(500).json({ error: 'Audio analysis failed' });
  }
};

// =============================================================================
// Full Pipeline Analysis (windowed inference + threat scoring)
// =============================================================================

export const analyzeAudioPipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const filePath = req.file.path;
    console.log('\n========================================');
    console.log('[Pipeline] NEW ANALYSIS REQUEST');
    console.log('[Pipeline] File:', req.file.originalname);
    console.log('[Pipeline] Size:', (req.file.size / 1024).toFixed(1), 'KB');
    console.log('[Pipeline] Saved to:', filePath);
    console.log('[Pipeline] Running Python inference...');
    console.log('========================================');

    try {
      const pipelineResult = runPythonPipeline(filePath, 120000);

      // Clean up uploaded file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      if (pipelineResult.error) {
        console.error('[Pipeline] Python returned error:', pipelineResult.error);
        res.status(500).json({ error: pipelineResult.error });
        return;
      }

      console.log('[Pipeline] ✅ SUCCESS');
      console.log('[Pipeline] Duration:', pipelineResult.audioDuration, 's');
      console.log('[Pipeline] Windows:', pipelineResult.totalWindows);
      console.log('[Pipeline] Threat Score:', pipelineResult.threatScore);
      console.log('[Pipeline] Situation:', pipelineResult.situationLevel);
      console.log('[Pipeline] Processing Time:', pipelineResult.processingTime, 'ms');
      console.log('========================================\n');

      res.json(pipelineResult);
      return;
    } catch (pythonError: any) {
      console.error('[Pipeline] ❌ FAILED:', pythonError.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(500).json({ 
        error: 'Pipeline analysis failed',
        detail: pythonError.message 
      });
    }
  } catch (error) {
    console.error('Pipeline analysis error:', error);
    res.status(500).json({ error: 'Pipeline analysis failed' });
  }
};

// =============================================================================
// Upload endpoint
// =============================================================================

export const uploadAudioFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};
