export interface IAnalyticsService {
  trackEvent(name: string, props?: Record<string, unknown>): void;
}
