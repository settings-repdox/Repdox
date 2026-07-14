export interface IOBSAdapter {
  connect(address: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  startRecording(path?: string): Promise<void>;
  stopRecording(): Promise<void>;
  setScene(sceneName: string): Promise<void>;
}
