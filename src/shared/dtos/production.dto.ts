export interface BroadcastSession {
  id: string;
  eventId: string;
  startedAt?: string | null;
  stoppedAt?: string | null;
  status: "scheduled" | "live" | "ended" | "error";
  metadata?: Record<string, unknown> | null;
}

export interface ReplayEntry {
  id: string;
  eventId: string;
  recordedAt: string;
  url?: string | null;
  durationSeconds?: number | null;
}

export interface ObserverInfo {
  id: string;
  name?: string | null;
  connectedAt?: string | null;
  role?: string | null;
}

export interface GraphicPayload {
  id: string;
  name?: string | null;
  layer?: string | null;
  data?: Record<string, unknown> | null;
}

export interface OverlayState {
  id: string;
  eventId: string;
  visible: boolean;
  values?: Record<string, unknown> | null;
}

export interface AudioState {
  masterVolume: number; // 0-100
  muted: boolean;
}

export interface StreamStatus {
  streamId: string;
  isLive: boolean;
  viewers?: number | null;
  ingestUrl?: string | null;
}

export interface MonitoringStatus {
  healthy: boolean;
  details?: Record<string, unknown> | null;
}

export interface OrchestratorResult {
  success: boolean;
  message?: string | null;
  details?: Record<string, unknown> | null;
}
