import "server-only";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.join(process.cwd(), ".flowphase", "intelligence-v3");
/** Content-addressed, append-only snapshots retain revisions; no legacy overwrite. */
export async function persist(
  collection:
    "broker_phase_snapshots" | "ownership_snapshots" | "sector_snapshots",
  key: string,
  data: unknown,
) {
  if (!/^[A-Za-z0-9_-]+$/.test(key)) throw new Error("Invalid snapshot key");
  const body = JSON.stringify(data),
    hash = createHash("sha256").update(body).digest("hex"),
    dir = path.join(root, collection, key);
  await mkdir(dir, { recursive: true });
  try {
    await writeFile(path.join(dir, hash + ".json"), body, { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
}
export async function storedSnapshots(
  collection:
    "ownership_snapshots" | "sector_snapshots" = "ownership_snapshots",
) {
  const dir = path.join(root, collection);
  const result: unknown[] = [];
  try {
    for (const key of await readdir(dir)) {
      if (!/^[A-Za-z0-9_-]+$/.test(key)) continue;
      for (const file of await readdir(path.join(dir, key))) {
        if (/^[a-f0-9]{64}\.json$/.test(file))
          result.push(
            JSON.parse(await readFile(path.join(dir, key, file), "utf8")),
          );
      }
    }
  } catch {
    return result;
  }
  return result;
}

export const storedOwnership = () => storedSnapshots("ownership_snapshots");
