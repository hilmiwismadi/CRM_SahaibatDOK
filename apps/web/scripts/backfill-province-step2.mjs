import { readFileSync } from "node:fs";

const leads = JSON.parse(readFileSync(process.env.TEMP + "/all_leads.json", "utf8"));
const target = leads.filter((l) => l.province);

let ok = 0, fail = 0;
for (const lead of target) {
  try {
    const res = await fetch(`http://localhost:3000/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ province: lead.province }),
    });
    if (res.ok) ok++;
    else { fail++; console.error("FAIL", lead.id, lead.name, res.status); }
  } catch (err) {
    fail++;
    console.error("ERR", lead.id, lead.name, err.message);
  }
}
console.log(`Done. ok=${ok} fail=${fail} total=${target.length}`);
