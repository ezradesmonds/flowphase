import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Non-destructive migration: preserve raw v1 evidence and do not translate
// ambiguous combined labels into confident v2 classifications.
const root = path.join(process.cwd(), ".flowphase");
const source = path.join(root, "analysis-v1");
const destination = path.join(root, "analysis-v2");
await mkdir(destination, { recursive: true });
let files = [];
try { files = await readdir(source); } catch (error) { if(error.code !== "ENOENT") throw error; }
const entries = [];
for (const file of files.filter(f => /^[A-Z]{4}\.json$/.test(f)).sort()) {
  const raw = await readFile(path.join(source,file));
  entries.push({ticker:file.slice(0,4),source:"analysis-v1/"+file,sha256:createHash("sha256").update(raw).digest("hex"),action:"PRESERVED_RECOMPUTE_REQUIRED"});
}
const manifest = {migration:"phase-model-v1-to-v2",strategy:"Preserve legacy cache verbatim; recompute v2 on demand from source data. No automatic relabeling.",entries};
await writeFile(path.join(root,"phase-migration-v2.json"), JSON.stringify(manifest,null,2)+"\n");
console.log(`Preserved ${entries.length} legacy analyses. v2 cache isolated; no market data or credentials printed.`);
