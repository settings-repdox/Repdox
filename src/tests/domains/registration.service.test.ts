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
// IMPORTANT - this file documents two real bugs found while writing it,
// rather than silently working around them:
//
// 1. getRegistration(), fetchRegistrationsByUser(), and the fallback
//    branches of fetchEventRegistrationByUser() and
//    countRegistrationsByRole() all call `supabase.select(...)`
//    directly with NO preceding `.from(table)` call (see the
//    "// TODO: migrate to RegistrationService API" comments in
//    RegistrationServiceImpl.ts). supabase.select is not a function on
//    a SupabaseClient instance - only .from(table).select() is valid.
//    These code paths will throw `TypeError: supabase.select is not a
//    function` at runtime, not return data.
//    - fetchRegistrationsByUser() is called unconditionally from
//      src/pages/Profile.tsx and will fail on every call.
//    - countRegistrationsByRole()'s fallback branch is called from
//      src/pages/EventDetail.tsx and only breaks for events using a
//      non-standard (event_reg_<slug>) registration table.
//    - getRegistration() currently has no real callers anywhere in the
//      codebase, so this bug has not yet caused a user-facing incident.
//    This was NOT introduced by this test suite and is NOT fixed here -
//    it's flagged to the team separately as a bug needing its own
//    decision on how to fix (most likely: these methods need a
//    .from("event_registrations") call restored).
//
// The tests below for these three methods intentionally assert the
// CURRENT throwing/broken behavior rather than the behavior the method
// name implies, so a future fix will need to update these tests
// alongside the fix - that's the point: right now, this suite proves
// the bug exists and will fail loudly (in a different, correct way) once
// someone fixes it.

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

  describe("getRegistration (BUG: no .from() call)", () => {
    it("throws because supabase.select is not a function on the raw client", async () => {
      // Documents the real bug described in the file-level comment.
      // If this test starts failing because getRegistration() no
      // longer throws, the bug has been fixed - update this test to
      // assert the correct behavior instead of removing it silently.
      await expect(service.getRegistration("reg-1")).rejects.toThrow(
        /select is not a function/,
      );
    });
  });

  describe("fetchEventRegistrations", () => {
    it("BUG: throws for a plain event with no slug, because getRegistrationTableName derives event_reg_<id>, and that always triggers the unguarded fallback .select() call", async () => {
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
      await expect(
        service.fetchEventRegistrations("event-1"),
      ).rejects.toThrow(/select is not a function/);
    });

    it("BUG: also throws for events explicitly using a dynamic table via a slug", async () => {
      fakeSupabase.__state["event_reg_hackfest"] = {
        rows: [
          {
            id: "reg-1",
            event_id: "event-2",
            name: "Ada",
            created_at: "2026-01-02T00:00:00Z",
          },
        ],
      };
      await expect(
        service.fetchEventRegistrations("event-2", "hackfest"),
      ).rejects.toThrow(/select is not a function/);
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

    it("BUG: throws when nothing matches in the dynamic table, since the not-found case falls through to the broken fallback", async () => {
      await expect(
        service.fetchEventRegistrationByUser("event-1", "nonexistent-user"),
      ).rejects.toThrow(/select is not a function/);
    });
  });

  describe("fetchRegistrationsByUser (BUG: no .from() call)", () => {
    it("throws because supabase.select is not a function on the raw client", async () => {
      // Called unconditionally from src/pages/Profile.tsx - this bug
      // means that call currently fails every time for every user.
      await expect(
        service.fetchRegistrationsByUser("user-1"),
      ).rejects.toThrow(/select is not a function/);
    });
  });

  describe("countRegistrationsByRole", () => {
    it("BUG: throws even for a nominally 'plain' event, because getRegistrationTableName always derives a per-event table from eventId when there's no slug", async () => {
      // See the registerForEvent note above: with no slug, the derived
      // table is event_reg_<id>, which is never "event_registrations" -
      // so the (broken) fallback branch always runs. The only way to
      // reach the standard-table-only code path is to pass
      // eventSlug === undefined AND have getRegistrationTableName treat
      // it as the bare "event_registrations" name, which in practice
      // never happens once an eventId is present.
      fakeSupabase.__state["event_reg_event_1"] = {
        rows: [
          { id: "r1", event_id: "event-1", role: "participant" },
          { id: "r2", event_id: "event-1", role: "participant" },
        ],
      };
      await expect(
        service.countRegistrationsByRole("event-1"),
      ).rejects.toThrow(/select is not a function/);
    });

    it("BUG: also throws for events explicitly using a dynamic table via a slug", async () => {
      fakeSupabase.__state["event_reg_hackfest"] = {
        rows: [{ id: "r1", event_id: "event-2", role: "participant" }],
      };
      await expect(
        service.countRegistrationsByRole("event-2", "hackfest"),
      ).rejects.toThrow(/select is not a function/);
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

    it("BUG: throws instead of enforcing capacity, because it calls the broken countRegistrationsByRole whenever a role has a capacity limit", async () => {
      // This is the practical, user-facing consequence of the
      // countRegistrationsByRole bug documented above: ANY event with
      // a capacity-limited role will throw here instead of correctly
      // allowing or blocking registration - canRegister can currently
      // never return a real capacity decision for a capacity-limited
      // role, regardless of whether capacity has actually been reached.
      fakeSupabase.__state["events"].rows.push({
        id: "event-1",
        roles: [{ name: "participant", capacity: 2 }],
        slug: null,
      });
      await expect(
        service.canRegister("event-1", "participant"),
      ).rejects.toThrow(/select is not a function/);
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
