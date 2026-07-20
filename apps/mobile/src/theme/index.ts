// DhwaniAI Mobile Design System
export const theme = {
  colors: {
    bg: '#0A0A0F',
    surface: '#12121A',
    elevated: '#1A1A25',
    hover: '#22222F',
    
    primary: '#6C5CE7',
    primaryLight: '#A78BFA',
    accent: '#00D9FF',
    
    success: '#00E676',
    warning: '#FFB74D',
    danger: '#FF5252',
    info: '#42A5F5',
    
    text: '#F0F0F5',
    textSecondary: '#8B8BA3',
    textMuted: '#5A5A72',
    
    border: 'rgba(255, 255, 255, 0.06)',
    borderHover: 'rgba(255, 255, 255, 0.12)',

    // Event type colors
    SCREAM: '#FF5252',
    GLASS_BREAK: '#FFB74D',
    IMPACT_CRASH: '#FF7043',
    GUNSHOT_EXPLOSION: '#F44336',
    CROWD_PANIC: '#E91E63',
    SIREN: '#42A5F5',
    NORMAL: '#66BB6A',
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
    full: 100,
  },
  
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 36,
  },
  
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: '#6C5CE7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
    },
  },
};

export const EVENT_LABELS: Record<string, string> = {
  SCREAM: 'Scream',
  GLASS_BREAK: 'Glass Break',
  IMPACT_CRASH: 'Impact / Crash',
  GUNSHOT_EXPLOSION: 'Gunshot / Explosion',
  CROWD_PANIC: 'Crowd Panic',
  SIREN: 'Siren',
  NORMAL: 'Normal',
};

export const EVENT_ICONS: Record<string, string> = {
  SCREAM: '😱',
  GLASS_BREAK: '🪟',
  IMPACT_CRASH: '💥',
  GUNSHOT_EXPLOSION: '🔫',
  CROWD_PANIC: '👥',
  SIREN: '🚨',
  NORMAL: '🔊',
};

export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#00E676',
  BUSY: '#FFB74D',
  OFFLINE: '#78909C',
  ON_DUTY: '#42A5F5',
};
