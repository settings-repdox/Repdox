# Dependency Rules Summary

See `dependency-rules.md` for the full rules and current compliance
status. This is a short reference for developers.

- `pages`/`components` → `domains` → `core` → `shared` (never the reverse)
- `infrastructure` reachable from `core`/`domains` only via
  `resolveAdapter()`, never a direct import of an implementation
- Cross-domain calls go through the other domain's `interfaces/` only,
  resolved via `resolveService()` — never another domain's `impl/`
- Production consumes domain contracts (`IEventService`); it does not
  mutate domain data directly
- **Known open violation**: `pages`/`components` importing
  `@/integrations/supabase` directly (25 files, as of Phase 11) — see
  `PHASE11_COMPLIANCE_REPORT.md`. Don't add new instances of this while
  fixing others.
