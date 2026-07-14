import { registerAdapter } from "@/infrastructure/di";
import { RunPodAdapterStub } from "@/infrastructure/broadcast/impl/RunPodAdapterStub";
import { MediaMTXAdapterStub } from "@/infrastructure/broadcast/impl/MediaMTXAdapterStub";
import { OBSAdapterStub } from "@/infrastructure/broadcast/impl/OBSAdapterStub";
import { WebSocketAdapterStub } from "@/infrastructure/broadcast/impl/WebSocketAdapterStub";
import { SRTAdapterStub } from "@/infrastructure/broadcast/impl/SRTAdapterStub";
import { WhepAdapterStub } from "@/infrastructure/broadcast/impl/WhepAdapterStub";
import { FFmpegAdapterStub } from "@/infrastructure/broadcast/impl/FFmpegAdapterStub";

export function registerDefaultInfrastructureAdapters() {
  registerAdapter("RunPodAdapter", new RunPodAdapterStub());
  registerAdapter("MediaMTXAdapter", new MediaMTXAdapterStub());
  registerAdapter("OBSAdapter", new OBSAdapterStub());
  registerAdapter("WebSocketAdapter", new WebSocketAdapterStub());
  registerAdapter("SRTAdapter", new SRTAdapterStub());
  registerAdapter("WhepAdapter", new WhepAdapterStub());
  registerAdapter("FFmpegAdapter", new FFmpegAdapterStub());
}
