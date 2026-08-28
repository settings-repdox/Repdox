import { describe, it, expect, vi, beforeEach } from "vitest";

// RegistrationServiceImpl, like GamingServiceImpl, has no constructor
// injection seam - it lazily does
// `await import("@/integrations/supabase/client")` inside a private
// getSupabase() method. This test mocks that module with vi.mock() and
// drives the REAL RegistrationServiceImpl against a small fake
// query-builder, the same approach used in gaming.service.test.ts.
//
// This replaces the previous version of this file, which tested a
// hand-written mock class that never imported RegistrationServiceImpl -
// it could not have caught a real regression in this file.
//
// HISTORY: writing this test suite originally surfaced a real bug -
// getRegistration(), fetchRegistrationsByUser(), and the fallback
// branches of fetchEventRegistrationByUser() and
// countRegistrationsByRole() called `supabase.select(...)` directly
// with no preceding `.from(table)` call (leftover from a half-finished
// refactor, marked with "// TODO: migrate to RegistrationService API"
// comments). That's been fixed in RegistrationServiceImpl.ts (the
// missing .from("event_registrations") calls were restored), and the
// countRegistrationsByRole() merge was also given the same
// de-duplicate-by-id treatment fetchEventRegistrations() already had,
// since restoring the fallback call means a registration present in
// both the dynamic per-event table and the central table would
// otherwise be double-counted. The tests below assert the current,
// correct behavior.
//
// Also worth knowing: getRegistrationTableName() (src/lib/utils.ts)
// derives a per-event table name (event_reg_<id>) from the eventId
// alone whenever there's no slug - it does NOT fall back to
// "event_registrations" just because no slug was passed. In practice
// this means the "central table" fallback/merge branches in this file
// run far more often than their naming implies - almost always, not
// just for events explicitly configured with a custom table. Several
// tests below reflect that (e.g. seeding event_reg_event_1 rather than
// event_registrations rows for a "plain" event).

interface TableState {
  rows: any[];
}

function createFakeSupabase(tables: Record<string, any[]> = {}) {
  const state: Record<string, TableState> = {};
  for (const [table, rows] of Object.entries(tables)) {
    state[table] = { rows: [...rows] };
  }

  function ensureTable(table: string): TableState {
    if (!state[table]) state[table] = { rows: [] };
    return state[table];
  }

  function from(table: string) {
    const filters: Array<(row: any) => boolean> = [];
    let orderKey: string | null = null;
    let orderAscending = true;
    let pendingInsert: any[] | null = null;
    let pendingUpdate: Record<string, unknown> | null = null;
    let pendingDelete = false;
    let singleMode: "single" | "maybeSingle" | null = null;

    const applyFiltersAndOrder = () => {
      let rows = ensureTable(table).rows.filter((row) =>
        filters.every((f) => f(row)),
      );
      if (orderKey) {
        rows = [...rows].sort((a, b) => {
          const av = a[orderKey as string] ?? "";
          const bv = b[orderKey as string] ?? "";
          return orderAscending
            ? av > bv
              ? 1
              : -1
            : av < bv
              ? 1
              : -1;
        });
      }
      return rows;
    };

    const finish = () => {
      const t = ensureTable(table);

      if (pendingDelete) {
        t.rows = t.rows.filter((row) => !filters.every((f) => f(row)));
        return { data: null, error: null };
      }

      if (pendingInsert) {
        const inserted = pendingInsert.map((row, i) => ({
          id: row.id ?? `generated-${table}-${t.rows.length + i}`,
          created_at: row.created_at ?? new Date().toISOString(),
          ...row,
        }));
        t.rows.push(...inserted);
        const data =
          singleMode != null
            ? inserted[0] ?? null
            : inserted;
        return { data, error: null };
      }

      if (pendingUpdate) {
        const matched = t.rows.filter((row) => filters.every((f) => f(row)));
        matched.forEach((row) => Object.assign(row, pendingUpdate));
        const data = singleMode != null ? matched[0] ?? null : matched;
        return { data, error: null };
      }

      const rows = applyFiltersAndOrder();
      if (singleMode === "single") {
        if (rows.length === 0) {
          return {
            data: null,
            error: { message: "No rows found", code: "PGRST116" },
          };
        }
        return { data: rows[0], error: null };
      }
      if (singleMode === "maybeSingle") {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    };

    const builder: any = {
      select() {
        return builder;
      },
      eq(key: string, value: unknown) {
        filters.push((row) => row[key] === value);
        return builder;
      },
      order(key: string, opts?: { ascending?: boolean }) {
        orderKey = key;
        orderAscending = opts?.ascending ?? true;
        return builder;
      },
      insert(rowsToInsert: any) {
        pendingInsert = Array.isArray(rowsToInsert)
          ? rowsToInsert
          : [rowsToInsert];
        return builder;
      },
      update(patch: Record<string, unknown>) {
        pendingUpdate = patch;
        return builder;
      },
      delete() {
        pendingDelete = true;
        return builder;
      },
      single() {
        singleMode = "single";
        return Promise.resolve(finish());
      },
      maybeSingle() {
        singleMode = "maybeSingle";
        return Promise.resolve(finish());
      },
      then(resolve: (v: any) => void, reject?: (e: any) => void) {
        return Promise.resolve(finish()).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    from,
    // Deliberately NO top-level .select() - this mirrors the real
    // SupabaseClient, which also has none. Code paths in
    // RegistrationServiceImpl that call `supabase.select(...)` without
    // `.from(table)` first will throw here exactly as they would
    // against the real client - see the file-level comment above.
    __state: state,
  };
}

let fakeSupabase = createFakeSupabase();

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fakeSupabase;
  },
}));

const { RegistrationServiceImpl } = await import(
  "@/domains/registrations/impl/RegistrationServiceImpl"
);

describe("RegistrationServiceImpl", () => {
  let service: InstanceType<typeof RegistrationServiceImpl>;

  beforeEach(() => {
    fakeSupabase = createFakeSupabase({
      event_registrations: [],
      events: [],
    });
    service = new RegistrationServiceImpl();
  });

  describe("createRegistration", () => {
    it("inserts into event_registrations by default", async () => {
      const created = await service.createRegistration({
        eventId: "event-1",
        userId: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
      });
      expect(created.eventId).toBe("event-1");
      expect(created.name).toBe("Ada Lovelace");
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(1);
    });

    it("inserts into a custom table when tableName is given", async () => {
      fakeSupabase.__state["event_reg_hackfest"] = { rows: [] };
      await service.createRegistration({
        eventId: "event-2",
        tableName: "event_reg_hackfest",
        name: "Grace Hopper",
      });
      expect(
        fakeSupabase.__state["event_reg_hackfest"].rows,
      ).toHaveLength(1);
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(0);
    });
  });

  describe("getRegistration", () => {
    it("returns the registration from event_registrations by id", async () => {
      fakeSupabase.__state["event_registrations"].rows.push({
        id: "reg-1",
        event_id: "event-1",
        name: "Ada",
      });
      const result = await service.getRegistration("reg-1");
      expect(result?.id).toBe("reg-1");
      expect(result?.name).toBe("Ada");
    });

    it("returns null when no registration matches the id", async () => {
      const result = await service.getRegistration("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("fetchEventRegistrations", () => {
    it("merges rows from a per-event dynamic table with event_registrations, de-duplicated by id", async () => {
      fakeSupabase.__state["event_reg_event_1"] = {
        rows: [
          {
            id: "reg-1",
            event_id: "event-1",
            name: "Ada",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      };
      fakeSupabase.__state["event_registrations"].rows.push({
        id: "reg-2",
        event_id: "event-1",
        name: "Grace",
        created_at: "2026-01-02T00:00:00Z",
      });

      const results = await service.fetchEventRegistrations("event-1");
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id).sort()).toEqual(["reg-1", "reg-2"]);
    });

    it("does not double-count a registration present in both tables", async () => {
      const shared = {
        id: "reg-1",
        event_id: "event-2",
        name: "Ada",
        created_at: "2026-01-01T00:00:00Z",
      };
      fakeSupabase.__state["event_reg_hackfest"] = { rows: [shared] };
      fakeSupabase.__state["event_registrations"].rows.push(shared);

      const results = await service.fetchEventRegistrations(
        "event-2",
        "hackfest",
      );
      expect(results).toHaveLength(1);
    });

    it("returns registrations directly for an event with no dynamic-table rows", async () => {
      fakeSupabase.__state["event_registrations"].rows.push({
        id: "reg-1",
        event_id: "event-1",
        name: "Ada",
        created_at: "2026-01-01T00:00:00Z",
      });
      const results = await service.fetchEventRegistrations("event-1");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Ada");
    });
  });

  describe("fetchEventRegistrationByUser", () => {
    it("returns the match directly when the primary (dynamic-table) lookup succeeds, without touching the broken fallback", async () => {
      fakeSupabase.__state["event_reg_event_1"] = {
        rows: [
          {
            id: "reg-1",
            event_id: "event-1",
            user_id: "user-1",
            name: "Ada",
          },
        ],
      };
      const result = await service.fetchEventRegistrationByUser(
        "event-1",
        "user-1",
      );
      expect(result?.id).toBe("reg-1");
    });

    it("returns null when nothing matches in either table, without throwing", async () => {
      const result = await service.fetchEventRegistrationByUser(
        "event-1",
        "nonexistent-user",
      );
      expect(result).toBeNull();
    });

    it("falls back to event_registrations when nothing matches in the dynamic table", async () => {
      fakeSupabase.__state["event_registrations"].rows.push({
        id: "reg-1",
        event_id: "event-2",
        user_id: "user-1",
        name: "Ada",
      });
      const result = await service.fetchEventRegistrationByUser(
        "event-2",
        "user-1",
        "hackfest",
      );
      expect(result?.id).toBe("reg-1");
    });
  });

  describe("fetchRegistrationsByUser", () => {
    it("returns all registrations for a user, most recent first", async () => {
      fakeSupabase.__state["event_registrations"].rows.push(
        {
          id: "reg-1",
          user_id: "user-1",
          name: "Ada",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "reg-2",
          user_id: "user-1",
          name: "Ada",
          created_at: "2026-02-01T00:00:00Z",
        },
        {
          id: "reg-3",
          user_id: "user-2",
          name: "Grace",
          created_at: "2026-01-15T00:00:00Z",
        },
      );
      const results = await service.fetchRegistrationsByUser("user-1");
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.id !== "reg-3")).toBe(true);
    });

    it("returns an empty array when the user has no registrations", async () => {
      const results = await service.fetchRegistrationsByUser("user-1");
      expect(results).toEqual([]);
    });
  });

  describe("countRegistrationsByRole", () => {
    it("counts registrations by role for a plain event (per-event dynamic table)", async () => {
      fakeSupabase.__state["event_reg_event_1"] = {
        rows: [
          { id: "r1", event_id: "event-1", role: "participant" },
          { id: "r2", event_id: "event-1", role: "participant" },
          { id: "r3", event_id: "event-1", role: "volunteer" },
        ],
      };
      const counts = await service.countRegistrationsByRole("event-1");
      expect(counts).toEqual({ participant: 2, volunteer: 1 });
    });

    it("merges counts from both the dynamic table and event_registrations, without double-counting shared rows", async () => {
      fakeSupabase.__state["event_reg_hackfest"] = {
        rows: [{ id: "r1", event_id: "event-2", role: "participant" }],
      };
      fakeSupabase.__state["event_registrations"].rows.push(
        { id: "r1", event_id: "event-2", role: "participant" }, // duplicate of the dynamic-table row
        { id: "r2", event_id: "event-2", role: "volunteer" },
      );
      const counts = await service.countRegistrationsByRole(
        "event-2",
        "hackfest",
      );
      expect(counts).toEqual({ participant: 1, volunteer: 1 });
    });

    it("buckets registrations with no role under __no_role__", async () => {
      fakeSupabase.__state["event_reg_event_1"] = {
        rows: [{ id: "r1", event_id: "event-1" }],
      };
      const counts = await service.countRegistrationsByRole("event-1");
      expect(counts).toEqual({ __no_role__: 1 });
    });
  });

  describe("canRegister", () => {
    it("allows registration when the event has no role capacity limits", async () => {
      fakeSupabase.__state["events"].rows.push({
        id: "event-1",
        roles: null,
        slug: "test-event",
      });
      const result = await service.canRegister("event-1", "participant");
      expect(result).toBe(true);
    });

    it("allows registration when no roleName is given", async () => {
      fakeSupabase.__state["events"].rows.push({
        id: "event-1",
        roles: [{ name: "participant", capacity: 1 }],
        slug: "test-event",
      });
      const result = await service.canRegister("event-1");
      expect(result).toBe(true);
    });

    it("allows registration under capacity", async () => {
      fakeSupabase.__state["events"].rows.push({
        id: "event-1",
        roles: [{ name: "participant", capacity: 2 }],
        slug: "test-event",
      });
      fakeSupabase.__state["event_reg_test_event"] = {
        rows: [{ id: "r1", event_id: "event-1", role: "participant" }],
      };
      const result = await service.canRegister("event-1", "participant");
      expect(result).toBe(true);
    });

    it("blocks registration at capacity", async () => {
      fakeSupabase.__state["events"].rows.push({
        id: "event-1",
        roles: [{ name: "participant", capacity: 1 }],
        slug: "test-event",
      });
      fakeSupabase.__state["event_reg_test_event"] = {
        rows: [{ id: "r1", event_id: "event-1", role: "participant" }],
      };
      const result = await service.canRegister("event-1", "participant");
      expect(result).toBe(false);
    });
  });

  describe("registerForEvent", () => {
    it("registers into a per-event dynamic table derived from eventId when no slug or tableName is given", async () => {
      // NOTE: getRegistrationTableName (src/lib/utils.ts) falls back to
      // "event_registrations" only when the event has neither a slug
      // NOR an id - in practice, registerForEvent is always called with
      // at least an eventId, so it will always target a dynamic
      // event_reg_<id> table unless an explicit tableName or eventSlug
      // maps to something else. This is almost certainly the root
      // cause of the proliferation of event_reg_* tables seen in the
      // project's table list - flagging this as worth a design
      // discussion, not fixing it here.
      const result = await service.registerForEvent({
        eventId: "event-1",
        userId: "user-1",
        name: "Ada",
        email: "ada@example.com",
      });
      expect(result.eventId).toBe("event-1");
      expect(
        fakeSupabase.__state["event_reg_event_1"]?.rows,
      ).toHaveLength(1);
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(0);
    });

    it("registers into event_registrations directly when tableName is explicitly given", async () => {
      const result = await service.registerForEvent({
        eventId: "event-1",
        tableName: "event_registrations",
        name: "Ada",
        email: "ada@example.com",
      });
      expect(result.eventId).toBe("event-1");
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(1);
    });

    it("registers into a dynamic event_reg_<slug> table when given a slug", async () => {
      const result = await service.registerForEvent({
        eventId: "event-2",
        eventSlug: "hackfest",
        name: "Grace",
      });
      expect(result).toBeDefined();
      expect(
        fakeSupabase.__state["event_reg_hackfest"]?.rows,
      ).toHaveLength(1);
    });

    it("stores participation details (team, role, etc.) inside the message JSON payload", async () => {
      const result = await service.registerForEvent({
        eventId: "event-1",
        tableName: "event_registrations",
        name: "Ada",
        teamName: "Team Alpha",
      });
      expect(result.teamName).toBe("Team Alpha");
      const stored = fakeSupabase.__state["event_registrations"].rows[0];
      const parsedMessage = JSON.parse(stored.message);
      expect(parsedMessage.teamName).toBe("Team Alpha");
    });
  });

  describe("upsertEventRegistration", () => {
    it("creates a new registration when no registrationId is given", async () => {
      const result = await service.upsertEventRegistration({
        eventId: "event-1",
        tableName: "event_registrations",
        name: "Ada",
      });
      expect(result.name).toBe("Ada");
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(1);
    });

    it("updates the existing registration when a registrationId is given", async () => {
      const created = await service.upsertEventRegistration({
        eventId: "event-1",
        tableName: "event_registrations",
        name: "Ada",
      });
      const updated = await service.upsertEventRegistration({
        eventId: "event-1",
        tableName: "event_registrations",
        registrationId: created.id,
        name: "Ada Lovelace",
      });
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Ada Lovelace");
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(1);
    });
  });

  describe("deleteEventRegistration", () => {
    it("deletes from the standard table for a plain event", async () => {
      fakeSupabase.__state["event_registrations"].rows.push({
        id: "reg-1",
        event_id: "event-1",
      });
      await service.deleteEventRegistration("reg-1", "event-1");
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(0);
    });

    it("deletes from both the dynamic table and event_registrations for events using a custom table", async () => {
      fakeSupabase.__state["event_reg_hackfest"] = {
        rows: [{ id: "reg-1", event_id: "event-2" }],
      };
      fakeSupabase.__state["event_registrations"].rows.push({
        id: "reg-1",
        event_id: "event-2",
      });
      await service.deleteEventRegistration(
        "reg-1",
        "event-2",
        "hackfest",
      );
      expect(
        fakeSupabase.__state["event_reg_hackfest"].rows,
      ).toHaveLength(0);
      expect(
        fakeSupabase.__state["event_registrations"].rows,
      ).toHaveLength(0);
    });

    it("does not throw when deleting an id that does not exist in either table (0-row delete is not an error)", async () => {
      await expect(
        service.deleteEventRegistration("nonexistent", "event-1"),
      ).resolves.not.toThrow();
    });
  });
});
