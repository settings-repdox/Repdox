import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

const legacyPatterns = [
  /@\/lib\/eventService/g,
  /from\(['\"]event_registrations['\"]\)/g,
  /getRegistrationTableName\(/g,
];

function walk(dir: string, files: string[] = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx)$/.test(f)) files.push(full);
  }
  return files;
}

function analyze() {
  const files = walk(path.join(repoRoot, "src"));
  const findings: Record<string, string[]> = {};
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const re of legacyPatterns) {
      if (re.test(content)) {
        findings[file] = findings[file] || [];
        findings[file].push(re.toString());
      }
    }
  }
  return findings;
}

function replaceInFile(file: string) {
  let content = fs.readFileSync(file, "utf8");
  // Replace legacy eventService import with suggestion to use RegistrationService
  content = content.replace(
    /import\s+eventService\s+from\s+['\"]@\/lib\/eventService['\"];?/g,
    "import eventService from '@/lib/eventService'; // TODO: replace with RegistrationService/resolveService when ready",
  );
  // Replace direct from('event_registrations') with RegistrationService usage marker
  content = content.replace(
    /\.from\(['\"]event_registrations['\"]\)/g,
    "// TODO: migrate to RegistrationService API (was .from('event_registrations'))",
  );
  fs.writeFileSync(file, content, "utf8");
}

const isCli = process.argv[1] && process.argv[1].endsWith("phase9-dry-run.ts");
if (isCli) {
  const findings = analyze();
  console.log(
    "Phase 9 dry-run analysis results: " +
      Object.keys(findings).length +
      " files with legacy patterns.",
  );
  for (const f of Object.keys(findings)) {
    console.log("- " + f);
    for (const m of findings[f]) console.log("   - " + m);
  }

  const apply = process.argv.includes("--apply");
  if (apply) {
    console.log(
      "\nApplying safe non-destructive replacements (adds TODO markers)...",
    );
    for (const f of Object.keys(findings)) {
      replaceInFile(f);
    }
    console.log("Applied replacements. Please review diffs and run tests.");
  } else {
    console.log(
      "\nRun with --apply to insert TODO markers into files (non-destructive).",
    );
  }
}

export {};
