// Phase 10: runs the existing verifyInfrastructureIsolation() check as part of
// the normal test suite. The `npm run verify:infra` script uses a `ts-node --loader`
// one-liner that fails to resolve the relative import under Node's ESM loader
// (unrelated to the check's own logic) — see TECHNICAL_DEBT_PHASE10.md. Running the
// same function through Vitest sidesteps that loader bug and gives us a result on
// every test run instead of a separate, easy-to-forget manual step.
import { describe, it, expect } from "vitest";
import { verifyInfrastructureIsolation } from "@/infrastructure/verifyArchitecture";

describe("Architecture: infrastructure isolation", () => {
  it("no file under src/infrastructure imports from src/domains", () => {
    const result = verifyInfrastructureIsolation();

    if (!result.ok) {
      // Surface the offending files directly in the failure message so a
      // violation is actionable without re-running the check by hand.
      console.error("Infrastructure isolation violations:", result.violations);
    }

    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
