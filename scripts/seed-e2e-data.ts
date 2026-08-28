/**
 * Seeds the minimum fixture data the Playwright E2E suite actually needs.
 *
 * Scope is deliberately narrow. RFC 0002
 * (docs/rfc/rfc-0002-ci-and-e2e-seed-environment.md) originally proposed
 * seeding Hackathon + Workshop + Gaming events plus "minimal associated
 * data for registration flows to complete" — but an audit of the actual
 * specs under src/tests/e2e/ (done before writing this script) found that
 * only one spec needs any seed data at all:
 *
 *   - src/tests/e2e/smoke.spec.ts            — needs nothing
 *   - src/tests/e2e/ticketing-smoke.spec.ts  — needs nothing
 *   - src/tests/e2e/gaming-registration-form.spec.ts
 *       — needs exactly one Gaming-type, registration-open event with a
 *         known slug (E2E_GAMING_EVENT_SLUG). It only checks what renders
 *         on the registration page — no team, no registration record, no
 *         other event types required.
 *
 * If a future spec needs more fixture data, extend this script when that
 * spec is written — don't pre-seed data nothing currently exercises.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (not the anon/publishable key) since
 * it needs to bypass RLS to upsert directly. Point this at a project
 * dedicated to E2E testing, never at production — see the warning below.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/seed-e2e-data.ts
 * or, once configured in CI:
 *   npm run seed:e2e
 *
 * Idempotent: safe to run repeatedly (e.g. once per CI job) — upserts on
 * a fixed slug rather than inserting a fresh row every run.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GAMING_EVENT_SLUG = "e2e-gaming-fixture";

async function main() {
  if (!SUPABASE_URL) {
    throw new Error(
      "SUPABASE_URL (or VITE_SUPABASE_URL) is not set. Refusing to run without an explicit target.",
    );
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This script needs the service-role key (not the anon/publishable key) to bypass RLS.",
    );
  }

  // Guardrail: this script always upserts, never deletes or wipes other
  // data, and only ever touches a single fixed-slug row
  // (GAMING_EVENT_SLUG) - so accidentally running it against the wrong
  // project can't corrupt existing data, only add one clearly-labeled
  // fixture event to it. Given that, this intentionally does NOT try to
  // guess "is this really the E2E project" from the URL - a heuristic
  // like that is unreliable (this project's own ref doesn't contain the
  // word "e2e") and gives false confidence. The real safeguard is
  // requiring SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY to be set
  // explicitly by whoever runs this - there's no default target.

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`Seeding E2E fixture data into ${SUPABASE_URL} ...`);

  const now = new Date();
  const startAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const endAt = new Date(startAt.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days after start
  const registrationDeadline = new Date(startAt.getTime() - 24 * 60 * 60 * 1000); // 1 day before start

  const { data, error } = await supabase
    .from("events")
    .upsert(
      [
        {
          slug: GAMING_EVENT_SLUG,
          title: "E2E Gaming Fixture (do not delete)",
          type: "Gaming",
          format: "Online",
          short_blurb: "Fixture event for automated E2E tests. Do not delete.",
          location: "Online",
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          registration_deadline: registrationDeadline.toISOString(),
          is_active: true,
          tags: ["e2e-fixture"],
        },
      ],
      { onConflict: "slug" },
    )
    .select("id, slug, type")
    .single();

  if (error) {
    console.error("Failed to seed the Gaming fixture event:", error);
    process.exit(1);
  }

  console.log(`Seeded event: ${data.slug} (id: ${data.id}, type: ${data.type})`);
  console.log(
    `Set E2E_GAMING_EVENT_SLUG=${data.slug} when running the Playwright suite ` +
      `against this project.`,
  );
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
