// The composition root. This is the one file in the codebase allowed to
// import concrete `*Impl` classes directly from every domain in order to
// wire them into the DI registry (see registerService in
// @/core/services/di). Everywhere else in the app resolves services
// through resolveService() instead of importing an implementation class
// directly.
//
// It lives here, in src/bootstrap/, rather than under src/core/, because
// core is not allowed to depend on domains (see
// docs/architecture/dependency-rules.md) - this file is the deliberate,
// sanctioned exception to that rule, and giving it its own top-level
// layer means the exception is structural (enforceable by
// verifyBootstrapIsolation(), see src/bootstrap/verifyArchitecture.ts)
// rather than just a comment someone has to know about. See
// docs/rfc/rfc-0001-composition-root-location.md for the full reasoning,
// now converted to docs/adr/0008-composition-root-location.md.
import { registerService } from "@/core/services/di";
import { AuthService } from "@/core/services/impl/AuthService";
import { UserServiceImpl } from "@/core/services/impl/UserServiceImpl";
import { PermissionServiceImpl } from "@/core/services/impl/PermissionServiceImpl";
import { NotificationServiceImpl } from "@/core/services/impl/NotificationServiceImpl";
import { AnalyticsServiceImpl } from "@/core/services/impl/AnalyticsServiceImpl";
import { AssetServiceImpl } from "@/core/services/impl/AssetServiceImpl";
import { EventServiceImpl } from "@/domains/events/impl/EventServiceImpl";
import { GamingServiceImpl } from "@/domains/gaming/impl/GamingServiceImpl";
import { RegistrationServiceImpl } from "@/domains/registrations/impl/RegistrationServiceImpl";
import { ProductionServiceImpl } from "@/domains/production/impl/ProductionServiceImpl";
import { TicketServiceImpl } from "@/domains/tickets/impl/TicketServiceImpl";
import { SupabaseTicketRepository } from "@/domains/tickets/impl/SupabaseTicketRepository";
import { VolunteerServiceImpl } from "@/domains/volunteers/impl/VolunteerServiceImpl";

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
    registerService("TicketService", new TicketServiceImpl(new SupabaseTicketRepository()));
    registerService("VolunteerService", new VolunteerServiceImpl());
  } catch (e) {
    // ignore if already registered
  }
}
