const updates = [
  ["aeac8aee-fc71-4204-a26c-c8b2458b3636", "DKI Jakarta"],
  ["28ac53b1-f604-4acb-aa00-05754d650261", "Jawa Tengah"],
  ["a8c50c89-e6ac-4f95-a695-41bb7d134c57", "Daerah Istimewa Yogyakarta"],
  ["fe3ad520-cd99-4e14-9250-dcef8a6d0fd3", "Daerah Istimewa Yogyakarta"],
  ["5cbf4b69-716e-43c0-bece-3de91bb193e9", "Jawa Tengah"],
  ["1d709557-576f-4a6c-a34e-2192512f4bc2", "Jawa Tengah"],
  ["9a681752-019d-40c3-bfa3-3539d84b3b57", "Daerah Istimewa Yogyakarta"],
  ["491114a6-86bb-4e60-be28-c9caf0cca539", "Daerah Istimewa Yogyakarta"],
  ["a50000c0-a066-469e-bb19-ae912e73eeed", "Daerah Istimewa Yogyakarta"],
  ["c71a7f09-ebea-4575-aff8-05bfb2535ec4", "Daerah Istimewa Yogyakarta"],
  ["ddaa2a0e-cc1f-443e-9296-45d78f10e3d2", "Jawa Tengah"],
  ["ad90c721-cc5f-4007-8388-d30f22dd8c64", "Jawa Tengah"],
  ["1ce82cc7-14db-4a7d-aa32-3144e4024bb7", "Daerah Istimewa Yogyakarta"],
  ["17783b70-c56a-4f2e-8389-dfe6b7277d6c", "Daerah Istimewa Yogyakarta"],
  ["384d06d7-43eb-4729-b899-f63edbe9ac34", "Jawa Tengah"],
  ["71a84e5e-1dbf-402d-950f-ddd1652445c7", "Jawa Tengah"],
  ["f1ed1b1f-84ac-4566-8210-0ad9e7b93a45", "Jawa Tengah"],
  ["e145c28b-8439-42cf-a4d5-dc9e32f0fd3c", "Jawa Tengah"],
  ["6972fb3b-3fd5-4a11-979a-d1fd18997e29", "Jawa Tengah"],
  ["5d9a0414-186f-4b28-9d7c-3a917bfa9a98", "Jawa Tengah"],
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
