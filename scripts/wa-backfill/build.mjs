// Menyusun wa-export.js (siap paste) = template + targets.json.
//   node build.mjs [--cutoff 2026-10-13T00:00:00+07:00] [--targets targets.json]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const cutoff = arg("--cutoff", "2026-10-13T00:00:00+07:00");
const targetsFile = join(dir, arg("--targets", "targets.json"));

// Hanya kontak yang terhubung ke lead (kontak pribadi tanpa lead tidak disentuh).
const targets = JSON.parse(readFileSync(targetsFile, "utf8"))
  .filter((t) => t.leadId)
  .map(({ phone, name, leadId, lastRecordedAt }) => ({ phone, name, leadId, lastRecordedAt }));

const tpl = readFileSync(join(dir, "wa-export.template.js"), "utf8")
  .replace("__CUTOFF__", cutoff)
  .replace("/*__TARGETS__*/[]", JSON.stringify(targets));
writeFileSync(join(dir, "wa-export.js"), tpl);
// Versi sekali-paste: langsung menjalankan semua target lalu mengunduh JSON otomatis.
writeFileSync(join(dir, "wa-export-auto.js"), [tpl, ";window.__bf && window.__bf.run();", ""].join("\n"));
console.log(`wa-export.js: ${targets.length} target, cutoff ${cutoff}, ${tpl.length} karakter`);
