import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dhwaniai_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dhwaniai_refresh',
    expiresIn: '7d',
    refreshExpiresIn: '30d',
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  model: {
    path: process.env.MODEL_PATH || './models/dhwaniai_mobilenetv5.tflite',
    classes: [
      'SCREAM',
      'GLASS_BREAK',
      'IMPACT_CRASH',
      'GUNSHOT_EXPLOSION',
      'CROWD_PANIC',
      'SIREN',
      'NORMAL',
    ],
    sampleRate: 16000,
    clipDuration: 2.5,
    nMelBins: 64,
    version: 'MobileNetV5-Edge',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
