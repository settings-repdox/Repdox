import type { IFFmpegAdapter } from "@/infrastructure/broadcast/interfaces/IFFmpegAdapter";

export class FFmpegAdapterStub implements IFFmpegAdapter {
  async runCommand(args: string[]) {
    return { pid: undefined, exitCode: 0, stdout: "", stderr: "" };
  }
  buildTranscodeArgs(input: string, output: string) {
    return ["-i", input, "-c:v", "libx264", output];
  }
}
