// Guards against passing a function from a Server Component to a Client
// Component.
//
// React can't put a function in the RSC payload, so this throws at render
// with an opaque digest — and it passes typecheck, lint and build without
// complaint. That combination cost a production outage on Browse, hence a
// dedicated check.
//
// The heuristic: an inline arrow function as a JSX prop, in a file that
// isn't "use client". Server-to-server props are legal and would be false
// positives here, but this codebase has none — add an allowlist entry if
// that changes.

import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const ALLOWLIST = new Set([]);

const files = globSync("src/**/*.tsx");
const findings = [];

for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const source = readFileSync(file, "utf8");
  if (/^\s*["']use client["']/m.test(source)) continue;

  source.split("\n").forEach((line, index) => {
    // e.g. `onSelect={(x) => ...}` or `render={() => ...}`
    if (/^\s+[a-zA-Z][\w]*=\{\(?[\w,{}\[\]: ]*\)? *=>/.test(line)) {
      findings.push(`${file}:${index + 1}  ${line.trim()}`);
    }
  });
}

if (findings.length > 0) {
  console.error(
    "Function passed as a prop from a Server Component.\n" +
      "React cannot serialize it into the RSC payload; this throws at render.\n" +
      "Move the logic into the client component, or mark the file \"use client\".\n",
  );
  for (const finding of findings) console.error("  " + finding);
  process.exit(1);
}

console.log(`No server-to-client function props (${files.length} files checked).`);
