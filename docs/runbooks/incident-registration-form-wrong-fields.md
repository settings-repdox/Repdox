# Runbook: Registration form shows the wrong event type's fields

## Symptom

A Gaming event's registration page (`/events/<slug>/register`) shows
Hackathon-specific fields — a "Team Composition" section with a Solo/Team
picker, team name, and initial team size — that don't make sense for a
gaming event (esports teams are managed separately via the Tournament
page's own team flow, `src/pages/EventTeams.tsx`). This was reported by a
user in July 2026, who noted a prior AI-assisted attempt to fix it hadn't
actually worked.

## Root cause

`src/pages/EventRegister.tsx` detects event type via `isGaming` (backed by
`isGamingEvent()` in `src/lib/tournamentService.ts`) and correctly gated
*some* sections behind it — labels in "Section 1," and GitHub/LinkedIn
fields in "Section 3." But the entire "Section 2: Team Info" block (the
hackathon-style Solo/Team picker) had no `isGaming` check at all — it
rendered unconditionally for every event type. The earlier fix attempt
evidently touched Sections 1 and 3 and missed Section 2 entirely, which is
consistent with the user's report that "copilot said it changed but it
doesn't work" — something *was* changed, just not the section causing the
visible symptom.

## Fix applied

`src/pages/EventRegister.tsx` — wrapped the entire "Section 2: Team Info"
block in `{!isGaming && (...)}`, so it doesn't render at all for Gaming
events. No new gaming-specific team UI was added on this page — gaming
team formation already has its own flow via `EventTeams.tsx`.

## How to recognize this again

If a report says "field/section X shows for event type Y when it
shouldn't," don't assume a partial fix (labels changed, one field hidden)
means the whole section is handled. Grep the page for the relevant
conditional and confirm the *entire* visually-distinct block is inside it,
not just some fields within it:

```bash
grep -n "isGaming" src/pages/EventRegister.tsx
```

Every hackathon-only section/field should show up gated behind `!isGaming`
(or the inverse for gaming-only content); anything rendering
unconditionally between two gated blocks is a candidate for the same bug.

## Prevention

- `src/tests/e2e/gaming-registration-form.spec.ts` (Phase 10) is a
  regression test for exactly this scenario — it asserts the "Team
  Composition" text and GitHub/LinkedIn labels do **not** appear on a
  Gaming event's registration page. It requires `E2E_GAMING_EVENT_SLUG`
  pointed at a real seeded Gaming event to actually run (see RFC 0002) —
  until that seed environment exists, this test self-skips and provides
  no actual protection against a regression. Standing up the seeded E2E
  environment (RFC 0002) is the single highest-value fix for preventing a
  repeat of this specific bug class.
- `RegistrationDTO` (`src/shared/dtos/registration.dto.ts`) is one flat
  shape covering every event type's fields (Hackathon-specific `school`/
  `github`/`teamName` alongside generic ones) — see
  `docs/architecture/domain-model/README.md`'s "Registrations" section.
  Nothing in the type system prevents a future page from rendering a field
  that shouldn't apply to the current event type; this was true before the
  bug and remains true after the fix. A per-event-type DTO variant (or at
  minimum, grouping hackathon-only fields under a nested optional object)
  would make "does this field apply to this event type" a type-level
  question instead of something only caught by manually checking every
  conditional in a 1000+ line page component.
