import { readFileSync } from "node:fs";

const API = "http://localhost:3000/api/leads";
const IG_MAP = {
  "Intibios Lab, Klinik & Farmasi Semarang": "https://www.instagram.com/intibioslab_semarang/",
  "Klinik Pratama Diponegoro I": "https://www.instagram.com/klinikpratamadiponegoro1/",
  "Klinik Satmoko": "https://www.instagram.com/klinikdanlabsatmoko/",
  "Klinik Pratama UPN Veteran Yogyakarta": "https://www.instagram.com/klinikupnvy/",
  "Klinik Pratama Cita Sehat Yogyakarta": "https://www.instagram.com/klinik.citasehat/",
  "Praktik Mandiri dr. Erika Dian Puspitasari": "https://www.instagram.com/erikadp_dr/",
  "Klinik Pratama Delima": "https://www.instagram.com/klinikpratama_delima/",
  "Klinik Aisya": "https://www.instagram.com/klinikaisya/",
  "Klinik Pratama Derwati": "https://www.instagram.com/klinikpratama.derwati/",
  "Klinik Cita Sehat Semarang": "https://www.instagram.com/klinikcitasehatsemarang/",
  "Faskes 1 BPJS Klinik Pratama OPTIMA 2": "https://www.instagram.com/klinikoptima/",
};

async function main() {
  const results = JSON.parse(readFileSync(new URL("./manual-batch-results.json", import.meta.url), "utf-8"));
  let count = 0;
  for (const r of results) {
    if (!r.leadId || !r.hasIG) continue;
    const url = IG_MAP[r.name];
    if (!url) continue;
    const res = await fetch(`${API}/${r.leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramUrl: url }),
    });
    console.log(res.ok ? `OK   ${r.name} -> ${url}` : `FAIL ${r.name}`);
    if (res.ok) count++;
  }
  console.log(`\nApplied Instagram links to ${count} leads.`);
}

main();
