import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const blocked = [];
const localSecrets = [
  process.env.SECTORS_API_KEY,
  process.env.TRADINGVIEW_SESSION,
  process.env.TRADINGVIEW_SIGNATURE,
].filter((value) => value && value.length >= 8);
for (const file of files) {
  if (
    (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")) ||
    /(^|\/)(node_modules|\.next|\.next-demo|secrets|test-results)\//.test(
      file,
    ) ||
    /\.(pem|key)$/.test(file)
  ) {
    blocked.push(file);
    continue;
  }
  if (!/\.(ts|tsx|js|mjs|json|md|yml)$/.test(file)) continue;
  const content = readFileSync(file, "utf8");
  if (localSecrets.some((secret) => content.includes(secret))) {
    blocked.push(file);
    continue;
  }
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content) ||
    /(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/.test(content)
  )
    blocked.push(file);
}
if (blocked.length) {
  console.error("Blocked public files (contents omitted):", blocked.join(", "));
  process.exit(1);
}
console.log(
  `Checked ${files.length} tracked files. No prohibited secret/build files or common private-key tokens detected. This is not a comprehensive secret audit.`,
);
