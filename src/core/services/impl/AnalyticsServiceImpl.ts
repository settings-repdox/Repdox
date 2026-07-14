import type { IAnalyticsService } from "../interfaces/IAnalyticsService";

export class AnalyticsServiceImpl implements IAnalyticsService {
  trackEvent(name: string, props?: Record<string, unknown>): void {
    try {
      if (typeof window === "undefined") return;
      const w = window as unknown as Record<string, unknown> & {
        __VERCEL_ANALYTICS_INTERNAL?: unknown;
        analytics?: {
          track?: (n: string, p?: Record<string, unknown>) => void;
        };
      };
      if (typeof w.__VERCEL_ANALYTICS_INTERNAL !== "undefined") {
        w.analytics?.track?.(name, props);
      }
    } catch (e) {
      console.warn("[AnalyticsService] trackEvent failed", e);
    }
  }
}
