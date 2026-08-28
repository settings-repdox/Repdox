# RFCs

Repdox RFC process: propose a change as an RFC, discuss, get approval, convert to ADR, then implement.

See `rfc-process.md` for workflow details.

## Open RFCs

| # | Title | Status |
|---|---|---|
| 0001 | [Composition root location](rfc-0001-composition-root-location.md) | Implemented — see ADR 0008 |
| 0002 | [CI pipeline and seeded E2E environment](rfc-0002-ci-and-e2e-seed-environment.md) | Resolved — CI shipped in `.github/workflows/ci.yml`; E2E seeding shipped in `scripts/seed-e2e-data.ts`, needs a real run + repo secrets before it's fully verified (see RFC) |

Once an RFC is approved, convert it to an ADR under `docs/adr/`, link the
ADR number back into this table's Status column, and move the RFC file's
own Status line to "Approved — see ADR NNNN."
