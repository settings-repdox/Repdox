import type { IProductionService } from "@/domains/production/interfaces/IProductionService";
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
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import { generateRandomString } from "@/lib/utils";

export class ProductionServiceImpl implements IProductionService {
  private eventCore(): IEventService {
    return resolveService<IEventService>("EventService");
  }

  async scheduleBroadcast(
    eventId: string,
    when: string,
    meta?: Record<string, unknown>,
  ): Promise<BroadcastSession> {
    const evt = await this.eventCore().getEvent(eventId);
    return {
      id: `b_${generateRandomString(8)}`,
      eventId,
      startedAt: null,
      stoppedAt: null,
      status: "scheduled",
      metadata: {
        when,
        event: evt?.id ? { id: evt.id, title: evt.title } : null,
        ...meta,
      },
    };
  }

  async startBroadcast(sessionId: string): Promise<BroadcastSession> {
    return {
      id: sessionId,
      eventId: "",
      startedAt: new Date().toISOString(),
      stoppedAt: null,
      status: "live",
      metadata: null,
    };
  }

  async stopBroadcast(sessionId: string): Promise<BroadcastSession> {
    return {
      id: sessionId,
      eventId: "",
      startedAt: new Date().toISOString(),
      stoppedAt: new Date().toISOString(),
      status: "ended",
      metadata: null,
    };
  }

  async scheduleReplay(eventId: string, at: string): Promise<ReplayEntry> {
    return {
      id: `r_${generateRandomString(8)}`,
      eventId,
      recordedAt: at,
      url: null,
      durationSeconds: null,
    };
  }

  async captureReplay(eventId: string): Promise<ReplayEntry> {
    return {
      id: `r_${generateRandomString(8)}`,
      eventId,
      recordedAt: new Date().toISOString(),
      url: null,
      durationSeconds: 0,
    };
  }

  async registerObserver(
    eventId: string,
    info: Partial<ObserverInfo>,
  ): Promise<ObserverInfo> {
    return {
      id: `o_${generateRandomString(8)}`,
      name: info.name ?? null,
      connectedAt: new Date().toISOString(),
      role: info.role ?? null,
    };
  }

  async listObservers(eventId: string): Promise<ObserverInfo[]> {
    return [];
  }

  async renderGraphic(
    eventId: string,
    payload: GraphicPayload,
  ): Promise<GraphicPayload> {
    return { ...payload };
  }

  async updateOverlay(
    eventId: string,
    state: Partial<OverlayState>,
  ): Promise<OverlayState> {
    return {
      id: state.id ?? `ov_${generateRandomString(6)}`,
      eventId,
      visible: state.visible ?? false,
      values: state.values ?? null,
    };
  }

  async setAudioState(
    eventId: string,
    state: Partial<AudioState>,
  ): Promise<AudioState> {
    return {
      masterVolume: state.masterVolume ?? 100,
      muted: state.muted ?? false,
    };
  }

  async startStream(eventId: string): Promise<StreamStatus> {
    return {
      streamId: `s_${generateRandomString(8)}`,
      isLive: true,
      viewers: 0,
      ingestUrl: null,
    };
  }

  async stopStream(streamId: string): Promise<StreamStatus> {
    return {
      streamId,
      isLive: false,
      viewers: 0,
      ingestUrl: null,
    };
  }

  async getStreamStatus(streamId: string): Promise<StreamStatus> {
    return {
      streamId,
      isLive: false,
      viewers: 0,
      ingestUrl: null,
    };
  }

  async getMonitoringStatus(eventId: string): Promise<MonitoringStatus> {
    return {
      healthy: true,
      details: { message: "Production domain healthy (stub)" },
    };
  }

  async orchestrateBroadcast(
    eventId: string,
    opts?: Record<string, unknown>,
  ): Promise<OrchestratorResult> {
    const evt = await this.eventCore().getEvent(eventId);
    if (!evt) {
      return { success: false, message: "Event not found" };
    }
    return {
      success: true,
      message: "Orchestration scheduled",
      details: { event: { id: evt.id, title: evt.title }, opts },
    };
  }
}
