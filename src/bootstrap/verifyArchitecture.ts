import fs from "fs";
import path from "path";

// Verify that no file outside src/bootstrap imports a concrete domain
// implementation class (@/domains/*/impl/*). src/bootstrap/registerDefaults.ts
// is the composition root and the one sanctioned exception to the
// core-must-not-depend-on-domains rule (see
// docs/architecture/dependency-rules.md and
// docs/adr/0008-composition-root-location.md) - this check turns that
// documented exception into something enforceable, rather than relying on
// code review alone to catch a stray direct *Impl import.
//
// Mirrors verifyInfrastructureIsolation() (src/infrastructure/verifyArchitecture.ts)
// in shape and intent.
export function verifyBootstrapIsolation(root = process.cwd()) {
  const srcDir = path.join(root, "src");
  const bootstrapDir = path.join(root, "src/bootstrap");
  const testsDir = path.join(root, "src/tests");
  const violations: string[] = [];

  // Matches an actual import/require of a concrete implementation class
  // from any domain's impl/ folder, e.g.
  // `import { EventServiceImpl } from "@/domains/events/impl/EventServiceImpl"`.
  // Requires the path to appear inside quotes immediately after `from`,
  // `import(`, or `require(` so a file merely mentioning the pattern in a
  // comment or string (as this check's own test file's description
  // does) doesn't trip a false positive. Interfaces/DTOs
  // (@/domains/*/interfaces/*, @/domains/*/dtos/*) are unaffected - only
  // impl/ imports are the concern here, matching the same rule
  // verifyInfrastructureIsolation() enforces for infrastructure.
  const implImportPattern =
    /(?:from\s+|import\(|require\()["']@\/domains\/[^"'/]+\/impl\/[^"']*["']/;

  function walk(dir: string) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        // Skip the bootstrap directory itself - it's the sanctioned
        // exception, not a violation to find. Skip src/tests too: unit
        // tests for a domain's *ServiceImpl (e.g.
        // src/tests/domains/gaming.service.test.ts) legitimately import
        // the concrete class on purpose, to test it directly - that's
        // not the same thing as application code bypassing the DI
        // container, which is what this check exists to catch.
        if (full === bootstrapDir || full === testsDir) continue;
        walk(full);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(f)) {
        const content = fs.readFileSync(full, "utf8");
        if (implImportPattern.test(content)) {
          violations.push(full);
        }
      }
    }
  }

  walk(srcDir);
  return { ok: violations.length === 0, violations };
}
