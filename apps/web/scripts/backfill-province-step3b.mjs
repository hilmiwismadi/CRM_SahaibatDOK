const updates = [
  ["d370f35b-8b29-4fcd-8fbd-8f073b68948a", "Jawa Timur"], // Faskes 1 BPJS OPTIMA 2, Surabaya
  ["95183988-30a7-483e-b88a-4e7664edd802", "DKI Jakarta"], // Superindo Cahaya Mandiri PT
  ["cf8676d4-d625-4fee-aa95-69c515ea1531", "Jawa Tengah"], // dr. Erika Dian Puspitasari, Semarang
  ["5a72350f-b8b4-43f0-868c-d99050c5bd91", "Daerah Istimewa Yogyakarta"], // Darma Bakti Medika, Bantul
  ["07a78bd0-7b29-4ede-8c47-fa663e5926af", "Daerah Istimewa Yogyakarta"], // Pulowatu Sisma Medikal, Sleman
  ["fe61e187-9010-4a18-a017-21e9dc4c580a", "Daerah Istimewa Yogyakarta"], // Pulowatu Sisma Medikal (dup)
  ["46d9ff2d-a32a-4f48-b8b3-71bcd86c0b07", "Daerah Istimewa Yogyakarta"], // Eny, Bantul
  ["2ff0c655-6ff7-49d6-aedd-064e9f6b4ffd", "Jawa Tengah"], // Sandjojo Sehat, Semarang
  ["a57b26e0-8063-46b0-bad7-ceca114b4426", "Jawa Tengah"], // Sandjojo Sehat (dup)
  ["b17b0c08-01bd-4625-82c0-434095d3c5ba", "Daerah Istimewa Yogyakarta"], // Laras Hati, Bantul
  ["24d38d94-1012-4237-a463-008787fd2b13", "Jawa Tengah"], // Diponegoro I, Semarang
  ["e28c3e8c-7dd4-4df5-9aa6-f1f1af5c2c93", "Jawa Tengah"], // Puri Saras, Semarang
  ["8ed65929-32d7-4287-a33b-c14c7bf69b02", "Banten"], // Makmur Jaya 1, Tangerang Selatan
  ["c02458f6-f9c8-41bc-83d6-05e63fbab3db", "Banten"], // Makmur Jaya 3, Tangerang Selatan
  ["661da2a2-458c-4a6f-8188-a94dc696ae93", "Daerah Istimewa Yogyakarta"], // SWA, Sleman
];

let ok = 0, fail = 0;
for (const [id, province] of updates) {
  try {
    const res = await fetch(`http://localhost:3000/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ province }),
    });
    if (res.ok) ok++;
    else { fail++; console.error("FAIL", id, res.status); }
  } catch (err) {
    fail++;
    console.error("ERR", id, err.message);
  }
}
console.log(`Done. ok=${ok} fail=${fail} total=${updates.length}`);
