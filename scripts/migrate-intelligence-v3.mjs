import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(".flowphase"),
  target = path.join(root, "intelligence-v3");
const collections = [
  "brokers",
  "broker_affiliations",
  "broker_classifications",
  "broker_phase_snapshots",
  "broker_daily_flows",
  "broker_inventory_ledger",
  "broker_cost_basis_snapshots",
  "broker_activity_alerts",
  "issuers",
  "listed_securities",
  "share_classes",
  "shareholders",
  "ownership_snapshots",
  "ownership_relations",
  "corporate_groups",
  "entity_relations",
  "management_relations",
  "relationship_sources",
  "sector_snapshots",
  "sector_rotation_snapshots",
  "watchlists",
  "watchlist_items",
  "alert_rules",
];
for (const name of collections)
  await mkdir(path.join(target, name), { recursive: true });
const legacy = [];
for (const version of ["analysis-v1", "analysis-v2"]) {
  let files = [];
  try {
    files = await readdir(path.join(root, version));
  } catch {}
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const body = await readFile(path.join(root, version, file));
    legacy.push({
      file: version + "/" + file,
      sha256: createHash("sha256").update(body).digest("hex"),
    });
  }
}
const manifest = {
  schemaVersion: 3,
  storage: "local append-only JSON snapshots; not SQL",
  collections,
  legacy,
};
try {
  await writeFile(
    path.join(target, "migration.json"),
    JSON.stringify(manifest, null, 2),
    { flag: "wx" },
  );
} catch (e) {
  if (e.code !== "EEXIST") throw e;
}
console.log(
  "Intelligence v3 collections prepared. Legacy data preserved; " +
    legacy.length +
    " records inventoried.",
);
