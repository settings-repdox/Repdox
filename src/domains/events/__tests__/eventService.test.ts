import { describe, it, expect } from "vitest";
import { EventServiceImpl } from "@/domains/events/impl/EventServiceImpl";

class MockRepo {
  private store: Record<string, any> = {};
  async getById(id: string) {
    return this.store[id] ?? null;
  }
  async create(dto: any) {
    const id = "evt_" + Math.random().toString(36).slice(2, 9);
    const created = { ...dto, id };
    this.store[id] = created;
    return created;
  }
  async update(id: string, dto: any) {
    const existing = this.store[id] || {};
    const updated = { ...existing, ...dto, id };
    this.store[id] = updated;
    return updated;
  }
  async delete(id: string) {
    delete this.store[id];
  }
  async list() {
    return Object.values(this.store);
  }
}

describe("EventServiceImpl lifecycle", () => {
  it("allows valid transitions", async () => {
    const repo = new (MockRepo as any)();
    const svc = new EventServiceImpl(repo as any);
    const created = await svc.createEvent({
      title: "Test Event",
      status: "draft",
    } as any);
    expect(created).toHaveProperty("id");
    const published = await svc.transitionLifecycle(created.id, "published");
    expect(published.status).toBe("published");
    const regOpen = await svc.transitionLifecycle(
      created.id,
      "registration_open",
    );
    expect(regOpen.status).toBe("registration_open");
  });

  it("rejects invalid transitions", async () => {
    const repo = new (MockRepo as any)();
    const svc = new EventServiceImpl(repo as any);
    const created = await svc.createEvent({
      title: "Test Event 2",
      status: "completed",
    } as any);
    await expect(
      svc.transitionLifecycle(created.id, "draft" as any),
    ).rejects.toThrow();
  });
});
