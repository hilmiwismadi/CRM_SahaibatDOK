// One-off script: import the pasted manual lead batch (clinics/doctors,
// Yogyakarta/Semarang region) into the CRM via POST /api/leads.
// Run: node scripts/import-manual-batch.mjs

const API = "http://localhost:3000/api/leads";

function classifyPhones(rawList) {
  // Indonesian mobile prefixes: 81,82,83,85,87,88,89 (after the 0/62).
  // Landline/office: everything else (area codes like 021/024/0274/031,
  // or short codes like 1500115/150442).
  const mobilePrefixes = ["81", "82", "83", "85", "87", "88", "89"];
  let mobile = null;
  let office = null;
  const extra = [];
  for (const raw of rawList) {
    const digits = raw.replace(/\D/g, "");
    let national = digits;
    if (national.startsWith("620")) national = national.slice(3);
    else if (national.startsWith("62")) national = national.slice(2);
    else if (national.startsWith("0")) national = national.slice(1);
    const isMobile = mobilePrefixes.some((p) => national.startsWith(p));
    if (isMobile && !mobile) mobile = raw;
    else if (!isMobile && !office) office = raw;
    else extra.push(raw);
  }
  return { mobile, office, extra };
}

function buildNotes(extraBits) {
  return extraBits.filter(Boolean).join("; ") || undefined;
}

// [name, businessType, phones[], extraNotesBits[], hasIG]
const RAW = [
  ["Klinik Pratama Rahmatika", "klinik_pratama", [], [], false],
  ["Klinik Pratama Hutama Medika", "solo_doctor", [], [], false],
  ["Klinik Pratama Parma", "solo_doctor", ["(024) 76745076", "(024) 6712773"], [], false],
  ["Klinik SAT Brimob Semarang", "solo_doctor", [], [], false],
  ["Klinik Pratama UIN Walisongo Semarang", "klinik_pratama", [], [], false],
  ["Klinik Pratama Makmur Jaya", "solo_doctor", [], [], false],
  ["Klinik Pratama Sandjojo Sehat", "solo_doctor", [], [], false],
  ["Klinik Pratama SWA", "solo_doctor", [], ["Contacts: Dr. Sindy; Drg. Galih; Drg. Dicky"], false],
  ["Klinik Pratama Soegijopranoto Bongsari", "solo_doctor", [], [], false],
  ["Klinik Pratama Makmur Jaya 3", "klinik_pratama", [], [], false],
  ["Klinik Pratama Mardi Santoso", "solo_doctor", [], [], false],
  ["Klinik Makmur Jaya", "klinik_pratama", [], [], false],
  ["Puslakes UNNES", "solo_doctor", [], [], false],
  ["Klinik Pratama Makmur Jaya 1", "klinik_pratama", [], [], false],
  ["Klinik Pratama Makmur Jaya 2", "klinik_pratama", [], [], false],
  ["Klinik Pratama PMI Kota Yogyakarta", "klinik_pratama", ["(0274) 372176", "379212"], ["Email: sekretariat@pmi-yogya.org"], false],
  ["Klinik Pratama Gombel", "solo_doctor", ["(024) 76407376"], ["Contact: dr. Elhamangto Zuhdan"], false],
  ["Klinik Pratama Pertamina", "solo_doctor", ["0243545341"], [], false],
  ["Intibios Lab, Klinik & Farmasi Semarang", "solo_doctor", ["0821 2000 6869"], [], true],
  ["Klinik Pratama Chandra Brata 24 Jam", "solo_doctor", ["0858-4813-4956"], [], true],
  ["Klinik Pratama Puri Saras", "solo_doctor", ["0822-2347-3435"], [], false],
  ["Klinik Pratama UIN Walisongo", "solo_doctor", ["+6281382257020"], [], false],
  ["Klinik Pratama Diponegoro I", "solo_doctor", [], [], true],
  ["Klinik Pratama Nadi Medika Gunungpati", "solo_doctor", ["081326148255"], ["Email: suryawirawan33@yahoo.com"], false],
  ["Klinik Satmoko", "solo_doctor", [], [], true],
  ["Klinik Pratama Rawat Inap Unimus", "solo_doctor", [], ["Contact: dr. Rochman Basuki"], false],
  ["Klinik Pratama Sentosa", "solo_doctor", ["0812-8578-6467"], [], false],
  ["Klinik Pratama Rawat Inap Unimus", "solo_doctor", [], ["Contact: dr. Rochman Basuki"], false],
  ["Klinik Pratama UPN Veteran Yogyakarta", "klinik_pratama", [], [], true],
  ["Klinik Istiazah", "klinik_pratama", ["02747182338"], [], false],
  ["Klinik Pratama Kartika Husada", "klinik_pratama", ["02744353476"], [], false],
  ["Klinik Pratama Jamii Husada", "klinik_pratama", ["02744353284"], [], false],
  ["Klinik Patalan", "klinik_pratama", ["02747133099"], [], false],
  ["Klinik Polres Bantul", "klinik_pratama", ["085643034560"], [], false],
  ["Klinik Pratama Laras Hati", "klinik_pratama", ["02748359333"], [], false],
  ["Klinik Pratama Bina Sehat", "klinik_pratama", ["02746461205"], [], false],
  ["Klinik Pratama Mitra Sehat", "solo_doctor", ["02749103190"], ["Contact: dr. Raditya"], false],
  ["Klinik Pratama Anugerah", "klinik_pratama", ["081904154839"], [], false],
  ["Klinik Madukismo", "klinik_pratama", ["0274377049"], [], false],
  ["Klinik Pratama Pelita Hati", "klinik_pratama", ["0274452275"], [], false],
  ["Klinik Pratama Basuki Amalia", "klinik_pratama", ["02748355008"], [], false],
  ["Klinik Pratama Bunga Arsari", "klinik_pratama", ["085100824965"], [], false],
  ["Klinik Pratama As Syifa", "klinik_pratama", ["0274367578"], [], false],
  ["Klinik Pratama Kedaton", "klinik_pratama", ["085100932710"], [], false],
  ["Klinik Pratama Ibnu Abbas", "klinik_pratama", ["02742810384"], [], false],
  ["Klinik Pratama Nur Hidayah", "klinik_pratama", ["082137832123"], [], false],
  ["Klinik Pratama Avicena", "klinik_pratama", ["081328486315"], [], false],
  ["Klinik Pratama Cita Sehat Yogyakarta", "solo_doctor", ["+62 813 1221 6946"], ["Email: klinikjogja.rz@citasehat.org"], true],
  ["Klinik Pratama Rahmat Medika", "klinik_pratama", ["+6285107195644"], ["Email: medikarahmat@gmail.com"], false],
  ["Klinik Pertamina IHC Semarang", "solo_doctor", ["150442"], [], false],
  ["Klinik Pratama Karunia Husada", "klinik_pratama", ["0274584670"], [], false],
  ["Klinik Bina Sehat Semarang", "klinik_pratama", ["(024) 354-5000", "(024) 354-9000", "0896 0395 9680"], ["Email: info@binasehat.com"], false],
  ["Klinik Pratama Cahaya Husada", "klinik_pratama", ["02746460986"], [], false],
  ["Klinik Pratama & Apotek TelkoMedika Yogyakarta", "solo_doctor", ["1500115"], ["Contact: dr. Hanum Maftukha A., MARS", "Email: cs@telkomedika.co.id"], false],
  ["Klinik Pratama Pulowatu Sisma Medikal", "klinik_pratama", ["(0274) 896 014", "0813 2993 4055"], [], false],
  ["Klinik Pratama Sandjojo Sehat", "solo_doctor", ["02476439776", "081225450496"], [], false],
  ["Klinik Pratama UPN Veteran Yogyakarta", "solo_doctor", ["0821 3629 2973"], [], true],
  ["Klinik Pratama PMI Daerah Istimewa Yogyakarta", "solo_doctor", ["(0274) 6499649"], [], false],
  ["Klinik Pratama PMI DIY", "solo_doctor", ["0274 6499649", "0823-3219-3396"], [], false],
  ["Klinik Pratama PKU Muhammadiyah Pakem", "solo_doctor", [], [], false],
  ["Klinik Pratama Eny", "solo_doctor", ["081328712274"], ["Contact: dr. Eny Iskawati"], false],
  ["Klinik Pratama Pulowatu Sisma Medikal", "solo_doctor", ["0813 2993 4055"], [], true],
  ["Klinik Pratama Poltekkes Kemenkes Semarang", "klinik_pratama", ["(024) 7460274", "0895328806800", "082135418095"], ["Contact: Joko Budi Santoso", "Email: info@poltekkes-smg.ac.id"], false],
  ["Klinik Pratama Cahya Medika", "klinik_pratama", ["085643773220"], [], false],
  ["Praktik Mandiri Dokter Fuad Habibi", "solo_doctor", ["0878-4812-5156"], ["Contact: dr. FUAD HABIBI", "Email: praktikdokterumumdrfuadhabibi@gmail.com"], false],
  ["Klinik Pratama FIA", "solo_doctor", ["081392317577"], ["Email: klinikfia@gmail.com"], false],
  ["Klinik Gadjah Mada Medical Center", "solo_doctor", ["081328786991"], ["Email: gmc.hc@ugm.ac.id"], false],
  ["Klinik Pratama Darma Bakti Medika", "solo_doctor", [], ["Contact: dr. Anda Darmayanti"], false],
  ["Klinik Pratama At-Turots Al-Islamy", "solo_doctor", ["0851-6354-8100"], ["Contacts: dr. Ibnu Arda'im; dr. Amelia Nur Khasanah; dr. Munzir Makarrim", "Email: klinikatturots@gmail.com"], false],
  ["Klinik Pratama Mutiara Bunda Ngaliyan", "solo_doctor", ["0247625067", "085642475063"], ["Email: info@mutiarabundasemarang.com"], false],
  ["Klinik & Apotek Bina Sehat Semarang", "solo_doctor", ["(024) 354-5000", "(024) 354-9000"], [], false],
  ["Klinik Pratama UPN Veteran Yogyakarta", "solo_doctor", ["0274 485705", "0813 1591 0287"], ["Email: grad.soilsci@upnyk.ac.id"], true],
  ["Praktik Mandiri dr. Erika Dian Puspitasari", "solo_doctor", ["085742900140"], [], true],
  ["Klinik Pratama Parama Satwika Polres Sleman", "solo_doctor", [], ["Contacts: Rini Wuryani; dr. M. Duski Fillo S"], false],
  ["Klinik Pratama Delima", "solo_doctor", ["0858-6853-6437"], [], true],
  ["Klinik Aisya", "solo_doctor", ["0821 3000 0399"], [], true],
  ["Jisdan Bambang Y HM Dr", "klinik_pratama", ["(0274) 885624"], ["Was waiting 17d in source export"], false],
  ["UIN Sunan Kalijaga Health Center", "klinik_pratama", ["(0274) 519675"], [], false],
  ["dr. Fajar Waskito, Sp.KK (K), M.Kes", "klinik_pratama", ["0851-0017-6095"], [], false],
  ["Superindo Cahaya Mandiri PT", "klinik_pratama", ["021 6338867"], [], false],
  ["Mitrakita Clinic Semarang", "klinik_pratama", ["0812-1523-4547"], [], false],
  ["Klinik Pratama Sehat Mandiri (Dokter Umum, Dokter Gigi, Apotek)", "klinik_pratama", ["0811-1012-6909"], [], false],
  ["Klinik Pratama Derwati", "klinik_pratama", ["0858-6186-8000"], [], true],
  ["Klinik Cita Sehat Semarang", "klinik_pratama", ["0857-8655-5595"], [], true],
  ["Faskes 1 BPJS Klinik Pratama OPTIMA 2", "klinik_pratama", ["(031) 8711203"], [], true],
  ["Klinik Mutiara Bunda", "klinik_pratama", ["0813-3252-7527"], [], true],
  ["Klinik Pandawa Jakarta Barat", "solo_doctor", [], ["Contact: dr. Lucky Sandjaja Ongko"], false],
  ["Klinik Pratama Amalia", "solo_doctor", [], [], true],
  ["Dokter Umum Teddy Karli", "solo_doctor", ["(021) 5491876"], [], false],
  ["Praktik Dokter Umum Al-Jairy", "solo_doctor", ["0852-1065-8100"], [], false],
  ["Klinik Pratama Bina Sehat", "klinik_pratama", ["(024) 3545000"], [], false],
  ["Rumah Sakit YPK Mandiri", "solo_doctor", ["(021) 3909725"], ["Contact: dr. Muhammad Hafizh Muttaqin"], false],
  ["Klinik Pratama Rahmat Medika", "klinik_pratama", ["+62 851-0719-5644"], ["Email: medikarahmat@gmail.com"], false],
  ["Cita Sehat Foundation", "solo_doctor", ["0813-2017-7170"], ["AKA Klinik Pratama Cita Sehat", "Email: welcome@citasehat.org"], true],
  ["Klinik Pratama Semanan", "klinik_pratama", ["+62 21 54382401"], [], false],
  ["Klinik Pratama Veteran", "klinik_pratama", [], [], false],
  ["Klinik Pratama Bakti Sejahtera", "klinik_pratama", ["+62 882-0002-36402"], [], false],
];

async function main() {
  const results = [];
  for (const [name, businessType, phones, notesBits, hasIG] of RAW) {
    const { mobile, office, extra } = classifyPhones(phones);
    const notes = buildNotes([...notesBits, ...extra.map((e) => `Also: ${e}`)]);
    const payload = {
      name,
      businessType,
      phoneRaw: mobile || undefined,
      phoneOffice: office || undefined,
      notes,
    };
    let leadId = null;
    let error = null;
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) leadId = data.lead.id;
      else error = JSON.stringify(data.error);
    } catch (e) {
      error = String(e);
    }
    results.push({ name, leadId, error, hasIG });
    console.log(leadId ? `OK   ${name} -> ${leadId}` : `FAIL ${name}: ${error}`);
  }

  const fs = await import("node:fs");
  fs.writeFileSync(
    new URL("./manual-batch-results.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  const ok = results.filter((r) => r.leadId).length;
  console.log(`\nDone: ${ok}/${results.length} inserted. Results saved to scripts/manual-batch-results.json`);
}

main();
