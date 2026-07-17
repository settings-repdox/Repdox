// Phase 10: "verify every migrated domain" — confirms every domain service that
// registerDefaults() wires up actually resolves through the DI container.
// This replaces `npm run verify:production-deps`, which fails under Node's ESM
// loader for reasons unrelated to the check itself (see TECHNICAL_DEBT_PHASE10.md).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearServices, resolveService } from "@/core/services/di";
import { registerDefaults } from "@/core/services/registerDefaults";

const MIGRATED_DOMAIN_SERVICES = [
  "AuthService",
  "UserService",
  "PermissionService",
  "NotificationService",
  "AnalyticsService",
  "AssetService",
  "EventService",
  "GamingService",
  "RegistrationService",
  "ProductionService",
  "TicketService",
];

describe("Architecture: migrated domain service registration", () => {
  beforeEach(() => {
    clearServices();
    registerDefaults();
  });

  afterEach(() => {
    clearServices();
  });

  it.each(MIGRATED_DOMAIN_SERVICES)("%s resolves through the DI container", (key) => {
    expect(() => resolveService(key)).not.toThrow();
    expect(resolveService(key)).toBeTruthy();
  });

  it("resolving an unregistered service throws instead of silently returning undefined", () => {
    expect(() => resolveService("NotARealService")).toThrow(
      /Service not registered/,
    );
  });

  it("the Supabase client integration loads without throwing", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    expect(supabase).toBeTruthy();
  });
});
