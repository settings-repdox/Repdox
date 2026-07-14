import type {
  BroadcastSession,
  ReplayEntry,
  ObserverInfo,
  GraphicPayload,
  OverlayState,
  AudioState,
  StreamStatus,
  MonitoringStatus,
  OrchestratorResult,
} from "@/shared/dtos/production.dto";

export interface IProductionService {
  // Broadcast lifecycle
  scheduleBroadcast(
    eventId: string,
    when: string,
    meta?: Record<string, unknown>,
  ): Promise<BroadcastSession>;
  startBroadcast(sessionId: string): Promise<BroadcastSession>;
  stopBroadcast(sessionId: string): Promise<BroadcastSession>;

  // Replay management
  scheduleReplay(eventId: string, at: string): Promise<ReplayEntry>;
  captureReplay(eventId: string): Promise<ReplayEntry>;

  // Observers
  registerObserver(
    eventId: string,
    info: Partial<ObserverInfo>,
  ): Promise<ObserverInfo>;
  listObservers(eventId: string): Promise<ObserverInfo[]>;

  // Graphics & overlays
  renderGraphic(
    eventId: string,
    payload: GraphicPayload,
  ): Promise<GraphicPayload>;
  updateOverlay(
    eventId: string,
    state: Partial<OverlayState>,
  ): Promise<OverlayState>;

  // Audio
  setAudioState(
    eventId: string,
    state: Partial<AudioState>,
  ): Promise<AudioState>;

  // Streaming
  startStream(eventId: string): Promise<StreamStatus>;
  stopStream(streamId: string): Promise<StreamStatus>;
  getStreamStatus(streamId: string): Promise<StreamStatus>;

  // Monitoring
  getMonitoringStatus(eventId: string): Promise<MonitoringStatus>;

  // Orchestration
  orchestrateBroadcast(
    eventId: string,
    opts?: Record<string, unknown>,
  ): Promise<OrchestratorResult>;
}
