export interface INotificationService {
  sendEventNotification(eventId: string, status: string): Promise<void>;
  sendUserNotification(
    userId: string,
    payload: { title: string; body: string },
  ): Promise<void>;
}
