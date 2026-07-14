import fs from "fs";
import path from "path";

// Verify that infrastructure adapters do not import business domain files
export function verifyInfrastructureIsolation(root = process.cwd()) {
  const infraDir = path.join(root, "src/infrastructure");
  const violations: string[] = [];

  function walk(dir: string) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(f)) {
        const content = fs.readFileSync(full, "utf8");
        if (/src\/domains|@\/domains|domains\//.test(content)) {
          violations.push(`${full}`);
        }
      }
    }
  }

  walk(infraDir);
  return { ok: violations.length === 0, violations };
}
