export interface IRunPodAdapter {
  deployPod(
    image: string,
    config?: Record<string, unknown>,
  ): Promise<{ podId: string; endpoint?: string }>;
  deletePod(podId: string): Promise<void>;
  getPodStatus(
    podId: string,
  ): Promise<{ podId: string; status: string; details?: any }>;
}
