export interface IFFmpegAdapter {
  runCommand(
    args: string[],
  ): Promise<{
    pid?: number;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  }>;
  buildTranscodeArgs(
    input: string,
    output: string,
    opts?: Record<string, unknown>,
  ): string[];
}
