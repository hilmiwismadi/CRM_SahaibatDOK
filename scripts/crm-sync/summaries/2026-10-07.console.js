(() => {
  const DATE = "2026-10-07";
  const S = {"2a540786-8388-478a-a649-2d913a2ab179":"Nomor dikonfirmasi benar; pitch riset terkirim. Dibalas: jadwal sedang padat, akan mengabari kembali.","1ca6ad55-4f95-4502-8dd4-3e782b3135ea":"Setelah follow-up, klinik menjadwalkan diskusi Kamis pukul 10.00 (tatap muka atau daring). Kami pilih daring dan akan kirim link GMeet besok pagi pukul 09.30.","ecec52c4-376d-442d-98c9-2be03cf12497":"Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan.","4a122c81-a560-4488-af63-a06132e18db3":"Dijawab admin (menanyakan ada yang bisa dibantu); pitch riset terkirim. Belum ada balasan.","26df8de3-f28c-4f37-8cb0-9df2aa0fb5b2":"Kontak admin klinik menanyakan peruntukan riset; kami jelaskan latar startup SahAIbat dan program kolaborasi FKTP. Belum ada balasan.","5b689a68-00d6-420a-aefa-7d7997572fbc":"Klinik membagikan contoh export data dari aplikasinya (jumlah per jenis penyakit untuk puskesmas, dan data nama+alamat pasien untuk kasus prioritas seperti hipertensi) sebagai gambaran kebutuhan pelaporan.","e7178a0f-0468-4d8e-91ca-261d5a49a2de":"Jadwal bidan Yulia padat; klinik mengusulkan sekitar tanggal 20 dan kami setujui. Kami akan chat ulang tanggal 19 sebagai pengingat.","3b48146f-8c86-4a8d-b86b-9481b2c22256":"Surat dari kampus sudah dikirim; klinik membalas 'ditunggu'. Kami minta dikabari jika ada informasi terbaru.","d3fad0d8-321d-4686-86d3-c1302e75e1cd":"Dijawab humas klinik (auto-reply lalu admin menanyakan ada yang bisa dibantu); pitch riset terkirim. Belum ada balasan.","46f96fcf-89c6-43ed-a229-0c812344c3b6":"Dijawab admin Klinik Utama Asri Medika (pendaftaran dilayani langsung); pitch riset terkirim. Belum ada balasan.","7d3945fb-050d-4bf7-a20d-49f4c1c4f23c":"Admin menanyakan ke owner; klinik meminta surat resmi terlebih dahulu. Kami akan menyiapkan persuratannya.","ba8de637-383a-4461-9879-fcd50d7dac1c":"Dokter bisa ditemui sore ini setelah selesai praktik; kami menanyakan jam pastinya, belum dibalas.","05482f63-2a0d-40d3-8efe-222534c3a245":"Nomor ternyata Rhea Mom Baby Healthcare & Spa (auto-reply reservasi), lalu dikonfirmasi admin. Pitch riset terkirim, belum ada balasan.","d4d35f26-40d4-43e1-b8c3-2b2a659f59fc":"Salam dan pitch riset terkirim. Belum ada balasan.","2a66a1ab-92d4-46f6-9062-f2726d027a39":"Dokter tidak praktik di sana (dr. Faris sedang studi di Jepang). Kami tawarkan wawancara dengan staf administrasi dan menjelaskan latar startup setelah ditanya asal kami. Belum ada jawaban akhir.","b49b90d2-c967-405d-a08e-37bd2258b30e":"Nomor dijawab auto-reply Ellena Skin Care dan dinyatakan bukan nomor dr. Muki. Perlu cari nomor lain."};
  if (!window.__origFetch) window.__origFetch = window.fetch;
  window.fetch = async (...a) => {
    const res = await window.__origFetch(...a);
    const u = typeof a[0] === "string" ? a[0] : a[0]?.url || "";
    if (!u.includes("/api/sync/dailylog") || !u.includes("date=" + DATE)) return res;
    const j = await res.clone().json();
    j.rows.forEach((r) => { if (!r.claudeSummary && S[r.leadId]) r.claudeSummary = S[r.leadId]; });
    return new Response(JSON.stringify(j), { status: res.status, headers: { "content-type": "application/json" } });
  };
  // paksa muat ulang data: pindah tanggal lalu kembali
  const inp = document.querySelector('input[type="date"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const fire = (v) => { set.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); };
  const other = DATE.slice(0, 8) + (DATE.endsWith("01") ? "02" : "01");
  fire(other);
  setTimeout(() => { fire(DATE); console.log("Ringkasan " + DATE + " disuntik ke tampilan (" + Object.keys(S).length + " lead)."); }, 800);
})();
