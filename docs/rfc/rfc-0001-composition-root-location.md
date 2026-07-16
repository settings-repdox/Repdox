# RFC 0001: Give the Composition Root a Home That Isn't `src/core`

Status: **Open — proposed, not yet approved or scheduled**
Author: Phase 11 documentation pass
Related: ADR 0002 (Domain-Driven Layering), ADR 0003 (Service Locator DI)

## Problem

`src/core/services/registerDefaults.ts` imports concrete implementation
classes from all four domains:

```ts
import { EventServiceImpl } from "@/domains/events/impl/EventServiceImpl";
import { GamingServiceImpl } from "@/domains/gaming/impl/GamingServiceImpl";
import { RegistrationServiceImpl } from "@/domains/registrations/impl/RegistrationServiceImpl";
import { ProductionServiceImpl } from "@/domains/production/impl/ProductionServiceImpl";
```

`docs/architecture/dependency-rules.md` (per ADR 0002) states `core` must
not depend on `domains`. This file is the one deliberate exception — it's
the composition root, the one place that has to know about concrete
implementations in order to wire them into the DI registry. But because it
physically lives inside `src/core/services/`, it reads as a plain rule
violation to anyone auditing imports (which is exactly how Phase 11's
compliance audit flagged it), and there's no automated check that
distinguishes "the sanctioned composition root" from "someone else adding
another domain import to core by mistake."

## Proposal

Move `registerDefaults.ts` out of `src/core` into a new top-level location
that the dependency rules explicitly exempt, e.g. `src/bootstrap/` or
`src/composition-root/`:

```
src/bootstrap/registerDefaults.ts   (moved, unchanged content)
```

Update `docs/architecture/dependency-rules.md` to add a fifth layer:

> **`bootstrap`** — may import from every layer (`domains`, `core`,
> `infrastructure`, `shared`). Nothing else may import `bootstrap`. This is
> the only layer allowed to reference concrete `*Impl` classes directly;
> everywhere else resolves through `resolveService()`/`resolveAdapter()`.

Update the two call sites that import `registerDefaults` (chiefly the app
entry point and `src/tests/architecture/domain-service-registration.test.ts`)
to the new path.

Optionally, extend `verifyInfrastructureIsolation()`-style checks (or a new
sibling function) to assert: no file outside `src/bootstrap/` imports
anything matching `@/domains/*/impl/*`. That turns this from a documented
convention into an automated, Phase-10-style test — closing the gap noted
in ADR 0002's Consequences section ("no automated check yet").

## Alternatives considered

1. **Leave it where it is, just document the exception.** Cheapest option
   (this is close to where things stand today, now that ADR 0002 documents
   it). Downside: nothing stops the exception from becoming precedent —
   the next contributor who needs to wire something might reasonably copy
   the pattern into another `core` file rather than realizing this one file
   is special.
2. **Move it into `src/infrastructure`** instead of a new top-level folder.
   Rejected — `infrastructure` has its own isolation rule (no `domains`
   imports, enforced by `verifyInfrastructureIsolation()`) and moving the
   violation there would just break that check instead.
3. **Split registration per-domain**, each domain registering itself via a
   side-effect import, removing the need for a central file that imports
   everything. Appealing in the abstract but would make registration order
   implicit and harder to reason about for a codebase this size; not
   recommended.

## Recommendation

Option in "Proposal" above (new `src/bootstrap/` layer). Small, mechanical
change; mostly a file move plus a doc update plus (optionally) one new
automated check.

## Open questions

- Should `src/infrastructure/broadcast/registerAdapters.ts` move to
  `src/bootstrap/` too, for consistency? It has the same shape (imports
  concrete `*Stub` implementations to register them) but doesn't currently
  violate any documented rule, since `infrastructure` is allowed to
  contain its own `impl/` classes.

## Next step if approved

Convert to an ADR once approved, per `docs/rfc/rfc-process.md`, and file as
a Phase 12 implementation task.
