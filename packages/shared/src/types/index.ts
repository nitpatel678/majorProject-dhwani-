// ===== ENUMS =====

export enum Role {
  ADMIN = 'ADMIN',
  RESPONDER = 'RESPONDER',
  SUPERVISOR = 'SUPERVISOR',
}

export enum UserStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ON_DUTY = 'ON_DUTY',
}

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  OFFLINE = 'OFFLINE',
  DISABLED = 'DISABLED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum EventType {
  SCREAM = 'SCREAM',
  GLASS_BREAK = 'GLASS_BREAK',
  IMPACT_CRASH = 'IMPACT_CRASH',
  GUNSHOT_EXPLOSION = 'GUNSHOT_EXPLOSION',
  CROWD_PANIC = 'CROWD_PANIC',
  SIREN = 'SIREN',
  NORMAL = 'NORMAL',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  ONGOING = 'ONGOING',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM',
  ESCALATED = 'ESCALATED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum NotificationType {
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  ASSIGNMENT = 'ASSIGNMENT',
  SYSTEM = 'SYSTEM',
  INCIDENT_UPDATE = 'INCIDENT_UPDATE',
}

// ===== INTERFACES =====

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  badge?: string;
  rank?: string;
  phone?: string;
  area?: string;
  status: UserStatus;
  shiftStart?: string;
  shiftEnd?: string;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: DeviceStatus;
  battery?: number;
  signalStrength?: number;
  firmwareVersion?: string;
  networkType?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  type: EventType;
  confidence: number;
  audioUrl?: string;
  latitude: number;
  longitude: number;
  address?: string;
  rawPredictions?: Record<string, number>;
  inferenceTime?: number;
  deviceId?: string;
  device?: Device;
  incident?: Incident;
  createdAt: string;
}

export interface Incident {
  id: string;
  eventId: string;
  event?: Event;
  status: IncidentStatus;
  priority: Priority;
  description?: string;
  notes?: string;
  responderId?: string;
  responder?: User;
  assignedAt?: string;
  resolvedAt?: string;
  escalatedAt?: string;
  report?: Report;
  timeline?: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  incidentId: string;
  responderId: string;
  responder?: User;
  description: string;
  evidenceNotes?: string;
  imageUrls: string[];
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  incidentId: string;
  action: string;
  description: string;
  actor?: string;
  createdAt: string;
}

export interface DeviceLog {
  id: string;
  deviceId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface AudioAnalysisResult {
  prediction: EventType;
  confidence: number;
  inferenceTime: number;
  probabilities: Record<string, number>;
  top3: Array<{ label: string; probability: number }>;
  modelVersion: string;
  inputDuration: number;
  sampleRate: number;
}

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  todayAlerts: number;
  emergencyAlerts: number;
  falsePositives: number;
  activeResponders: number;
  resolvedIncidents: number;
  pendingIncidents: number;
  avgResponseTime: number;
  aiAccuracy: number;
}

export interface MapMarker {
  id: string;
  type: 'device' | 'responder' | 'incident';
  latitude: number;
  longitude: number;
  label: string;
  status: string;
  data?: Record<string, unknown>;
}

// ===== SOCKET EVENTS =====

export const SOCKET_EVENTS = {
  // Server -> Client
  NEW_EVENT: 'new_event',
  NEW_INCIDENT: 'new_incident',
  INCIDENT_UPDATED: 'incident_updated',
  DEVICE_STATUS_CHANGED: 'device_status_changed',
  RESPONDER_STATUS_CHANGED: 'responder_status_changed',
  STATS_UPDATED: 'stats_updated',
  NEW_NOTIFICATION: 'new_notification',

  // Client -> Server
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  UPDATE_LOCATION: 'update_location',
  ACKNOWLEDGE_ALERT: 'acknowledge_alert',
} as const;

// ===== CONSTANTS =====

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.SCREAM]: 'Scream',
  [EventType.GLASS_BREAK]: 'Glass Break',
  [EventType.IMPACT_CRASH]: 'Impact / Crash',
  [EventType.GUNSHOT_EXPLOSION]: 'Gunshot / Explosion',
  [EventType.CROWD_PANIC]: 'Crowd Panic',
  [EventType.SIREN]: 'Siren',
  [EventType.NORMAL]: 'Normal',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  [EventType.SCREAM]: '#FF5252',
  [EventType.GLASS_BREAK]: '#FFB74D',
  [EventType.IMPACT_CRASH]: '#FF7043',
  [EventType.GUNSHOT_EXPLOSION]: '#F44336',
  [EventType.CROWD_PANIC]: '#E91E63',
  [EventType.SIREN]: '#42A5F5',
  [EventType.NORMAL]: '#66BB6A',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.LOW]: '#66BB6A',
  [Priority.MEDIUM]: '#FFB74D',
  [Priority.HIGH]: '#FF7043',
  [Priority.CRITICAL]: '#F44336',
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: '#42A5F5',
  [IncidentStatus.ASSIGNED]: '#FFB74D',
  [IncidentStatus.ONGOING]: '#AB47BC',
  [IncidentStatus.RESOLVED]: '#66BB6A',
  [IncidentStatus.FALSE_ALARM]: '#78909C',
  [IncidentStatus.ESCALATED]: '#F44336',
};

export const MODEL_CLASSES = [
  'SCREAM',
  'GLASS_BREAK',
  'IMPACT_CRASH',
  'GUNSHOT_EXPLOSION',
  'CROWD_PANIC',
  'SIREN',
  'NORMAL',
] as const;

export const MODEL_CONFIG = {
  sampleRate: 16000,
  clipDuration: 2.5,
  expectedAudioLength: 40000,
  nMelBins: 64,
  frameLength: 512,
  frameStep: 256,
  spectrogramShape: [155, 64, 1] as const,
  numClasses: 7,
  version: 'MobileNetV5-Edge',
};
