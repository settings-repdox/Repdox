import type { IOBSAdapter } from "@/infrastructure/broadcast/interfaces/IOBSAdapter";

export class OBSAdapterStub implements IOBSAdapter {
  async connect(address: string, password?: string) {
    return;
  }
  async disconnect() {
    return;
  }
  async startRecording(path?: string) {
    return;
  }
  async stopRecording() {
    return;
  }
  async setScene(sceneName: string) {
    return;
  }
}
