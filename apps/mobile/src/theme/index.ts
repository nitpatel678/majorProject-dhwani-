// DhwaniAI Mobile Design System — High-Tech Monochrome Aesthetic
export const theme = {
  colors: {
    bg: '#050505',
    surface: '#0a0a0a',
    elevated: '#171717',
    hover: '#262626',
    
    primary: '#ffffff',
    primaryDark: '#e5e5e5',
    accent: '#a3a3a3',
    
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',

    // Event type badge colors (subtle monochrome accents)
    SCREAM: '#ef4444',
    GLASS_BREAK: '#f59e0b',
    IMPACT_CRASH: '#f97316',
    GUNSHOT_EXPLOSION: '#dc2626',
    CROWD_PANIC: '#ec4899',
    SIREN: '#3b82f6',
    NORMAL: '#22c55e',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 34,
  },
  
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
    },
    glow: {
      shadowColor: '#ffffff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    dangerGlow: {
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    },
  },
};

export const EVENT_LABELS: Record<string, string> = {
  SCREAM: 'Scream Detected',
  GLASS_BREAK: 'Glass Break Impact',
  IMPACT_CRASH: 'Vehicle Crash Impact',
  GUNSHOT_EXPLOSION: 'Gunshot / Explosion',
  CROWD_PANIC: 'Crowd Panic / Commotion',
  SIREN: 'Emergency Siren',
  NORMAL: 'Normal Acoustic Ambient',
};

// Vector icon mappings (Ionicons icon names) - No emojis used anywhere
export const EVENT_ICONS: Record<string, string> = {
  SCREAM: 'alert-circle-outline',
  GLASS_BREAK: 'shield-alert-outline',
  IMPACT_CRASH: 'car-sport-outline',
  GUNSHOT_EXPLOSION: 'warning-outline',
  CROWD_PANIC: 'people-outline',
  SIREN: 'notifications-outline',
  NORMAL: 'checkmark-circle-outline',
};

export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e',
  BUSY: '#f59e0b',
  OFFLINE: '#737373',
  ON_DUTY: '#ffffff',
};
