# Architecture Documentation

This folder contains architecture docs for the Repdox platform. Start
with `overview.md` for current state; the rest is organized below by
whether it's a living reference or a historical record.

## Start here

- `overview.md` — current architecture: what actually got built, and what
  Phase 1 scaffolded but never got used (read this before assuming a
  folder like `src/services/` or `src/modules/` is where new code goes).
- `principles.md` — historical Phase 1 principles (kept for context; see
  its own note for current standards instead).
- `dependency-rules.md` / `dependency-rules-summary.md` — the actual
  layering rules and current compliance status.
- `PHASE11_COMPLIANCE_REPORT.md` — the most recent full audit against
  those rules, including known violations and dead-code findings.

## Subfolders

- `domain-model/` — entities per domain.
- `repository/` — full folder-by-folder map of the repo.
- `service-contracts/` — which interface lives where.
- `standards/` — engineering conventions.
- `broadcast/` — the broadcast infrastructure adapter layer.

## Historical record (not living docs — describe a phase that already happened)

Kept for audit-trail value (they explain *why* things are the way they
are), not as current-state references — if something here conflicts with
`overview.md` or `dependency-rules.md`, those win.

- `phase-2-foundation.md`, `phase9-completion-report.md` — phase
  narratives.
- `migration-phase3-plan.md`, `migration-phase3-report.md`,
  `migration-phase3-verification.md`, `migration-phase4-report.md` —
  domain migration records.
- `changes-summary-v3.md`, `compatibility-report.md`,
  `repdox-architecture-baseline-v3.0.md` — earlier architecture snapshots.

Note: `phase-1-scope.md`, `rollback-strategy.md`,
`verification-checklist.md`, and `technical-debt.md` (all Phase
1/2-specific one-time plans/checklists) were removed in a later cleanup
pass — their content was either superseded by the current docs above or
had zero remaining reference value. See `docs/adr/` for durable decision
records instead of one-time phase checklists going forward.
