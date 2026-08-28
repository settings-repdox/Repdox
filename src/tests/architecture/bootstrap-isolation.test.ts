// Runs verifyBootstrapIsolation() as part of the normal test suite,
// following the same pattern as infrastructure-isolation.test.ts (Phase
// 10) - see that file's comment for why this runs through Vitest rather
// than a separate `ts-node --loader` script.
import { describe, it, expect } from "vitest";
import { verifyBootstrapIsolation } from "@/bootstrap/verifyArchitecture";

describe("Architecture: bootstrap isolation", () => {
  it("no file outside src/bootstrap imports a concrete @/domains/*/impl/* class", () => {
    const result = verifyBootstrapIsolation();

    if (!result.ok) {
      // Surface the offending files directly in the failure message so a
      // violation is actionable without re-running the check by hand.
      console.error("Bootstrap isolation violations:", result.violations);
    }

    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
