# Runbooks

Step-by-step guides for specific operational situations — incidents that
already happened (so the next occurrence is faster to resolve), and
routine procedures that are easy to get wrong from memory. For general
day-to-day operations (deploying, monitoring, running migrations), see
`docs/operations/handbook.md` instead — runbooks here are for a
particular *situation*, not a routine task.

## Incidents

- [`incident-bracket-url-save-failure.md`](incident-bracket-url-save-failure.md) —
  "Save bracket link" on the Tournament page throws a Supabase error.
- [`incident-registration-form-wrong-fields.md`](incident-registration-form-wrong-fields.md) —
  A Gaming event's registration form shows Hackathon-only fields (or vice
  versa).

## Procedures

- [`test-suite-failures.md`](test-suite-failures.md) — `npm test` fails;
  how to tell a real regression from an environment/config issue.
- [`rollback.md`](rollback.md) — rolling back a bad deploy or migration.

## Writing a new runbook

Use the two incident runbooks as the template: **Symptom** (what the user
or monitoring actually reported/showed), **Root cause** (what was actually
wrong, not just where), **Fix applied** (what changed, with file
references), **How to recognize this again** (the fast path next time),
**Prevention** (what would stop this class of bug, if anything was done).
Not every runbook will have all five sections filled in usefully — that's
fine, but a runbook that's only "here's what we did" without "how do you
recognize this fast next time" isn't pulling its weight.
