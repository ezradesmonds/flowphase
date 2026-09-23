import env from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const secrets = ["SECTORS_API_KEY", "TRADINGVIEW_SESSION", "TRADINGVIEW_SIGNATURE"]
  .map((key) => process.env[key])
  .filter((value) => typeof value === "string" && value.length >= 8);
const needles = [...new Set(secrets.flatMap((value) => [value, encodeURIComponent(value)]))];
let checked = 0;
let exposed = false;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(target);
    else if (/\.(js|json|map|css)$/.test(entry.name)) {
      const content = await readFile(target, "utf8");
      checked++;
      if (needles.some((value) => content.includes(value))) exposed = true;
    }
  }
}
await scan(path.join(process.cwd(), ".next", "static"));
if (exposed) {
  console.error("Credential material detected in client assets. Values withheld.");
  process.exitCode = 1;
} else {
  console.log(`Checked ${checked} client assets against ${secrets.length} configured credentials; no literal or URI-encoded values found. This is not a comprehensive security audit.`);
}
