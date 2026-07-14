import type { IRunPodAdapter } from "@/infrastructure/broadcast/interfaces/IRunPodAdapter";

export class RunPodAdapterStub implements IRunPodAdapter {
  async deployPod(image: string, config?: Record<string, unknown>) {
    return {
      podId: `pod_${Math.random().toString(36).slice(2, 10)}`,
      endpoint: null,
    };
  }
  async deletePod(podId: string) {
    return;
  }
  async getPodStatus(podId: string) {
    return { podId, status: "unknown" };
  }
}
