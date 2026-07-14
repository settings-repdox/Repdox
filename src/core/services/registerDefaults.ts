import { registerService } from "./di";
import { AuthService } from "./impl/AuthService";
import { UserServiceImpl } from "./impl/UserServiceImpl";
import { PermissionServiceImpl } from "./impl/PermissionServiceImpl";
import { NotificationServiceImpl } from "./impl/NotificationServiceImpl";
import { AnalyticsServiceImpl } from "./impl/AnalyticsServiceImpl";
import { AssetServiceImpl } from "./impl/AssetServiceImpl";
import { EventServiceImpl } from "@/domains/events/impl/EventServiceImpl";
import { GamingServiceImpl } from "@/domains/gaming/impl/GamingServiceImpl";
import { RegistrationServiceImpl } from "@/domains/registrations/impl/RegistrationServiceImpl";
import { ProductionServiceImpl } from "@/domains/production/impl/ProductionServiceImpl";

export function registerDefaults() {
  try {
    registerService("AuthService", new AuthService());
    registerService("UserService", new UserServiceImpl());
    registerService("PermissionService", new PermissionServiceImpl());
    registerService("NotificationService", new NotificationServiceImpl());
    registerService("AnalyticsService", new AnalyticsServiceImpl());
    registerService("AssetService", new AssetServiceImpl());
    registerService("EventService", new EventServiceImpl());
    registerService("GamingService", new GamingServiceImpl());
    registerService("RegistrationService", new RegistrationServiceImpl());
    registerService("ProductionService", new ProductionServiceImpl());
  } catch (e) {
    // ignore if already registered
  }
}
