import type { INotificationService } from "../interfaces/INotificationService";
import { supabase } from "@/integrations/supabase/client";

export class NotificationServiceImpl implements INotificationService {
  async sendEventNotification(eventId: string, status: string): Promise<void> {
    try {
      await supabase.functions.invoke("event-notification", {
        body: { eventId, status },
      });
    } catch (e) {
      console.error("[NotificationService] event notification failed", e);
    }
  }

  async sendUserNotification(
    userId: string,
    payload: { title: string; body: string },
  ): Promise<void> {
    try {
      await supabase.functions.invoke("user-notification", {
        body: { userId, payload },
      });
    } catch (e) {
      console.error("[NotificationService] user notification failed", e);
    }
  }
}
