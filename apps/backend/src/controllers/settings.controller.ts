import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, string> = {};
    configs.forEach(c => { settings[c.key] = c.value; });

    // Merge with defaults
    const defaults: Record<string, string> = {
      'danger_threshold': '0.7',
      'audio_sensitivity': 'medium',
      'model_version': 'MobileNetV5-Edge',
      'notification_enabled': 'true',
      'auto_assign': 'true',
      'max_response_radius_km': '5',
      'theme': 'dark',
    };

    res.json({ ...defaults, ...settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
