/*
 * WA Web chat exporter — dipaste di DevTools Console web.whatsapp.com.
 * HANYA MEMBACA layar (tidak mengirim pesan apa pun). Hasil: file JSON yang
 * nanti diimpor ke CRM lewat scripts/wa-backfill/import-wa-export.mjs.
 *
 * Cara pakai singkat (lihat README.md):
 *   1. Buka web.whatsapp.com (sudah login), F12 -> Console. Chrome meminta
 *      mengetik "allow pasting" sebelum bisa paste.
 *   2. Paste seluruh script ini, Enter. Lalu jalankan:  await __bf.run()
 *      (otomatis: cari tiap nomor di kolom search, buka chat, scroll ke atas
 *      sampai CUTOFF, kumpulkan pesan). Berhenti kapan saja: __bf.stop()
 *   3. Selesai -> __bf.download()  (file wa-export-*.json). Kalau download
 *      diblokir: __bf.copy() lalu simpan dari clipboard.
 *   Chat yang gagal dibuka otomatis: buka manual lalu  await __bf.grab("+62812...")
 *   Kalau ada yang aneh: __bf.diagnose() dan kirim hasilnya ke Claude.
 */
(() => {
  "use strict";
  if (window.__bf && window.__bf.running) { console.warn("[bf] masih berjalan — __bf.stop() dulu"); return; }

  const CONFIG = {
    // Hanya pesan dengan waktu >= CUTOFF yang disimpan. Sengaja mundur ke 13 Okt
    // 00:00 WIB (CRM berhenti mencatat 13 Okt ~14:25 WIB) supaya ada tumpang
    // tindih dengan pesan yang sudah ada -> importer bisa memverifikasi ID cocok.
    CUTOFF_ISO: "2026-10-13T00:00:00+07:00",
    SCROLL_WAIT_MS: 1400,    // jeda setelah scroll ke atas (tunggu WA memuat)
    MAX_SCROLLS: 120,        // batas aman per chat
    OPEN_WAIT_MS: 2200,      // tunggu chat terbuka
    BETWEEN_CHATS_MS: [1800, 3500], // jeda acak antar chat (jangan secepat bot)
    TARGETS: [{"phone":"+628113507020","name":"KLINIK DIAN KUSUMA WIJAYA","leadId":"a2b5eace-6024-4083-b93c-7ab15386e2fb","lastRecordedAt":"2026-10-13T07:25:40Z"},{"phone":"+62811360923","name":"Apotek dan Klinik Madyopuro Medical Center (MMC)","leadId":"ecd05451-970a-4f70-a056-2ead4ba18910","lastRecordedAt":"2026-10-13T07:23:52Z"},{"phone":"+6285784305377","name":"Safa Homecare","leadId":"87f69f71-b53a-4fb8-94a5-13590f46ca82","lastRecordedAt":"2026-10-13T07:23:52Z"},{"phone":"+628179663770","name":"Dokter Arif Yahya","leadId":"aaf24ca9-3972-44d6-9b5a-fd90f72e266d","lastRecordedAt":"2026-10-13T07:23:43Z"},{"phone":"+6285257575834","name":"Praktik Mandiri dr. Sulistyorini","leadId":"7db9faa8-e29f-4c3f-866f-248aac9ba7db","lastRecordedAt":"2026-10-13T07:23:37Z"},{"phone":"+6285179797922","name":"KLINIK ARRAYAN MEDIKA PAKISAJI","leadId":"e06daa9d-9428-4a8f-a558-b10212dec26e","lastRecordedAt":"2026-10-13T07:23:19Z"},{"phone":"+628113509602","name":"Klinik Nayaka Husada 02 Pakis","leadId":"fa1f86f1-c221-4aca-a959-65f02a21cb88","lastRecordedAt":"2026-10-13T07:23:16Z"},{"phone":"+6285692796199","name":"Klinik Hari Husada","leadId":"e62c7695-c74a-4d21-875d-e9e3b30a239b","lastRecordedAt":"2026-10-13T07:23:02Z"},{"phone":"+6282128953388","name":"Praktek dokter Yenny Ardiani","leadId":"4a7d5071-3aeb-4028-804e-d4eefe468920","lastRecordedAt":"2026-10-13T07:22:56Z"},{"phone":"+6281222448836","name":"Praktik Dokter Abirama Care","leadId":"67bcf51a-3269-4d7b-9a84-0363217d88ba","lastRecordedAt":"2026-10-13T07:22:36Z"},{"phone":"+6282232929617","name":"Bidan Praktek Mandiri Veronika Dewi","leadId":"83c42400-f9f8-4ec7-8b03-d8947f280a30","lastRecordedAt":"2026-10-13T07:22:02Z"},{"phone":"+6285649214695","name":"Wonder Kidz Therapy Center (Terapi wicara, Okupasi & Fisioterapi Malang)","leadId":"582130e3-3f90-4da6-96d8-7471e72b85ac","lastRecordedAt":"2026-10-13T07:21:59Z"},{"phone":"+628113132292","name":"JERU MEDIS","leadId":"9a8dded2-5c4b-491d-8b01-588af73ec5f2","lastRecordedAt":"2026-10-13T07:21:48Z"},{"phone":"+6281546093283","name":"Klinik Mediska Malang","leadId":"ddf157bd-6ae4-4d61-b81d-c9173ef784f7","lastRecordedAt":"2026-10-13T07:21:46Z"},{"phone":"+628113642421","name":"Kedungboto Medis","leadId":"32800d7f-f1b4-4da1-9e76-8a070e9e61ef","lastRecordedAt":"2026-10-13T07:20:00Z"},{"phone":"+6282323986844","name":"Praktek Dokter Mandiri Bayung Lapangan","leadId":"72f67196-f6de-4dbc-9633-3891e6b0b9e0","lastRecordedAt":"2026-10-13T07:19:50Z"},{"phone":"+6281358190704","name":"Bidan delima sidemiarti","leadId":"d39ff117-d7cc-440a-a624-0e27f7d8b178","lastRecordedAt":"2026-10-13T07:19:18Z"},{"phone":"+6285850633424","name":"KLINIK PRATAMA RAWAT JALAN BANI RACHMAN","leadId":"8c2a8780-74f6-4255-b4f2-046fd025adef","lastRecordedAt":"2026-10-13T07:18:47Z"},{"phone":"+6285731339148","name":"Klinik Pratama Rawat Jalan Albasrah","leadId":"3f52c79f-f4bc-4893-b14d-dae8fc340227","lastRecordedAt":"2026-10-13T07:18:14Z"},{"phone":"+6282232673051","name":"DOKTER PRAKTEK MANDIRI 'dr HESTY ROSALINA'","leadId":"362c2799-fa26-40c7-b89a-f816d4ff5d29","lastRecordedAt":"2026-10-13T07:17:19Z"},{"phone":"+6282232292366","name":"Klinik Pratama Kidal Medis","leadId":"802f0ee5-8b55-4518-92a8-6b9ccd45f4ee","lastRecordedAt":"2026-10-13T07:13:55Z"},{"phone":"+6282141991545","name":"Klinik Pratama Rawat Inap Ronggo Husada","leadId":"d83bfb18-5a2c-4696-8044-aa8364fc9b71","lastRecordedAt":"2026-10-13T07:13:39Z"},{"phone":"+6282142971007","name":"Klinik Amiruddin","leadId":"9ffc7be5-45e5-4f82-b037-3fcfa5373ce1","lastRecordedAt":"2026-10-13T07:13:16Z"},{"phone":"+6282232994248","name":"Rumah Bidan/ Bidan Hepi","leadId":"8b1d8bcb-e7be-4c92-8c61-8ab82dd6331e","lastRecordedAt":"2026-10-13T07:12:51Z"},{"phone":"+6281313060650","name":"Klinik Rawat Inap Sahabat Sehat (Bu Lina)","leadId":"f7cf5d75-5706-48ab-9afa-d89174ad976f","lastRecordedAt":"2026-10-13T07:12:20Z"},{"phone":"+6285859131921","name":"Praktek Mandiri Bidan Suhartatik","leadId":"75e74407-e805-4967-919e-bbb3e086f0e9","lastRecordedAt":"2026-10-13T07:11:40Z"},{"phone":"+6281325668796","name":"Klinik Pratama Asy-Syifa","leadId":"5b689a68-00d6-420a-aefa-7d7997572fbc","lastRecordedAt":"2026-10-13T07:09:30Z"},{"phone":"+6282142006400","name":"Klinik Shabira Husada","leadId":"b4ff35d0-e4bb-4db1-9368-eef9eec92db9","lastRecordedAt":"2026-10-13T07:08:54Z"},{"phone":"+6287758564743","name":"dr.Fery Medika","leadId":"99219dcc-159d-4dc8-a65b-3ce49866b3c4","lastRecordedAt":"2026-10-13T07:08:31Z"},{"phone":"+628113130061","name":"Klinik PMI Curungrejo Kepanjen","leadId":"ca248139-3291-4016-ab22-6f8b8e238abe","lastRecordedAt":"2026-10-13T07:06:38Z"},{"phone":"+6282333373233","name":"Dr.Marwoto Health Center (Bisa melayani HOMECARE)","leadId":"9c2f8a96-5aa9-422e-92f9-d876ffa8e9dc","lastRecordedAt":"2026-10-13T07:06:13Z"},{"phone":"+6285755496575","name":"Klinik Jaya Kusuma Husada","leadId":"96bbe099-b337-452e-930c-56cf818ccc7d","lastRecordedAt":"2026-10-13T07:05:07Z"},{"phone":"+6282321666060","name":"Praktek Dokter Dinar (dr. Nur Alfi Dinari)","leadId":"790cd473-614d-44a4-9868-d7e6f59cc0c9","lastRecordedAt":"2026-10-13T07:04:14Z"},{"phone":"+6285100051952","name":"Dokter Umum Malang - Dr. Harjono","leadId":"14674093-c40d-4251-9320-a60afa53a9e2","lastRecordedAt":"2026-10-13T06:52:03Z"},{"phone":"+6281330052934","name":"Klinik Yudhistira Medika Malang","leadId":"1e8095bc-1f04-4de4-bd53-a7b76c7c4c77","lastRecordedAt":"2026-10-13T06:51:28Z"},{"phone":"+6282220505009","name":"KLINIK SYIFA HUSADA UNGGUL","leadId":"125947e2-1817-44c5-ad11-60b52be153e1","lastRecordedAt":"2026-10-13T06:51:15Z"},{"phone":"+6282131032148","name":"Praktek Dokter Umum Klayatan","leadId":"a111ff55-0408-4449-95ac-ebf6d65eb407","lastRecordedAt":"2026-10-13T06:50:34Z"},{"phone":"+62881036858686","name":"Klinik Pratama Rawat Inap Astagina Medika","leadId":"0261f398-8474-4929-8608-9cea1b5c1fb9","lastRecordedAt":"2026-10-13T06:50:00Z"},{"phone":"+6289675873994","name":"Klinik Pratama UNIMUS","leadId":"d3fad0d8-321d-4686-86d3-c1302e75e1cd","lastRecordedAt":"2026-10-13T06:49:07Z"},{"phone":"+6285333339950","name":"KLINIK PRATAMA RAWAT INAP YASSA HUSADA","leadId":"23334b6a-0e44-4a5d-afa5-62b1770b834f","lastRecordedAt":"2026-10-13T06:48:01Z"},{"phone":"+628113636977","name":"KETAWANG MEDIS","leadId":"617aaa5e-23fe-406c-96a2-b923221652fa","lastRecordedAt":"2026-10-13T06:47:44Z"},{"phone":"+6281233923999","name":"Klinik Dr Dian Agung Anggraeny","leadId":"c60ac3c5-60bf-4284-9788-3ae0bbaf9468","lastRecordedAt":"2026-10-13T06:44:19Z"},{"phone":"+6281222677717","name":"Ghania Farm & clinic (dr. Samsul) Permanu","leadId":"75098af3-c349-4990-8cb1-7d0628893609","lastRecordedAt":"2026-10-13T06:42:28Z"},{"phone":"+6282257755991","name":"Praktek Keperawatan Mandiri Andri Suhartono, S.Kep.,Ners","leadId":"c7949812-3f49-493e-8f0b-8935c82c4dc5","lastRecordedAt":"2026-10-13T06:41:52Z"},{"phone":"+628113111492","name":"Praktek Umum dr. Daniel Candrianto","leadId":"11aeee81-5d06-4f32-88fe-ee4f59511bfa","lastRecordedAt":"2026-10-13T06:25:53Z"},{"phone":"+6287882832538","name":"Testing ","leadId":"04b0930c-8cbb-41b7-ba98-fd835ad1c04c","lastRecordedAt":"2026-10-13T04:31:32Z"},{"phone":"+628815883288","name":"Praktik Mandiri Dokter dr. Mulia Suryandari","leadId":"ee3a268f-deba-4e68-a482-0358e65f2399","lastRecordedAt":"2026-10-13T03:45:07Z"},{"phone":"+6285655718382","name":"KLINIK H. KARIATIN","leadId":"701bc5fa-3c0c-4e51-9afe-0b9f547e39cb","lastRecordedAt":"2026-10-13T03:44:08Z"},{"phone":"+6281329304257","name":"Praktik Dokter (dr. Dea Pristy Amanda, M.M., M.A.R.S.)","leadId":"cdac41e5-b899-4984-9fa7-466a267713cb","lastRecordedAt":"2026-10-13T03:37:29Z"},{"phone":"+6285138585992","name":"Klinik pratama gita husada","leadId":"f30f6a59-cb81-4553-b3a6-7f365151c2cb","lastRecordedAt":"2026-10-13T02:51:35Z"}],
  };

  const STORE_KEY = "crm-bf-v1";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = ([a, b]) => a + Math.random() * (b - a);
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const CUTOFF = new Date(CONFIG.CUTOFF_ISO).getTime();
  const log = (...a) => console.log("%c[bf]", "color:#0a7", ...a);

  const state = {
    running: false, stopFlag: false,
    chats: {},           // phone -> chat result
    // "dmy" | "mdy": tebakan awal dari bahasa browser, dikoreksi oleh data (hari > 12).
    dateOrder: /^en-US|^en$/.test(navigator.language || "") ? "mdy" : "dmy",
    dateEvidence: { dmy: 0, mdy: 0 },
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.chats) { state.chats = saved.chats; log("memulihkan", Object.keys(saved.chats).length, "chat dari localStorage"); }
  } catch (_) { /* abaikan */ }
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ chats: state.chats })); } catch (_) { /* penuh */ } };

  // ---------------------------------------------------------------- parsing
  function extractText(root) {
    // innerText melewatkan emoji (<img alt>), jadi jalan manual.
    let out = "";
    const walk = (n) => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName;
      if (tag === "IMG") { out += n.getAttribute("alt") || ""; return; }
      if (tag === "BR") { out += "\n"; return; }
      n.childNodes.forEach(walk);
    };
    walk(root);
    return out.replace(/‎|‏/g, "").trim();
  }

  function parseTime(s) {
    const m = /(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?\s*([AaPp])?\.?\s*[Mm]?\.?/.exec(s || "");
    if (!m) return null;
    let h = +m[1]; const mi = +m[2];
    if (m[4]) { const pm = /p/i.test(m[4]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return { h, mi };
  }

  function parseDate(s) {
    const m = /(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})/.exec(s || "");
    if (!m) return null;
    const a = +m[1], b = +m[2], c = +m[3];
    if (a > 31) return { y: a, mo: b, d: c };               // y-m-d
    if (a > 12) state.dateEvidence.dmy++;
    else if (b > 12) state.dateEvidence.mdy++;
    if (state.dateEvidence.mdy !== state.dateEvidence.dmy) state.dateOrder = state.dateEvidence.mdy > state.dateEvidence.dmy ? "mdy" : "dmy";
    const y = c < 100 ? 2000 + c : c;
    return (state.dateOrder === "mdy") ? { y, mo: a, d: b } : { y, mo: b, d: a };
  }

  // [14.32, 14/10/2026] Nama:   -> {date, time}
  function parsePrePlain(attr) {
    const m = /^\[([^\]]+)\]/.exec(attr || "");
    if (!m) return null;
    const idx = m[1].indexOf(",");
    if (idx < 0) return null;
    const t = parseTime(m[1].slice(0, idx)), d = parseDate(m[1].slice(idx + 1));
    return t && d ? { t, d } : null;
  }

  const toMs = (d, t) => new Date(d.y, d.mo - 1, d.d, t.h, t.mi, 0, 0).getTime(); // zona waktu browser

  // Format lama: true_<jid>_<id>[_<peserta>]. Format baru (WA Web 2026): data-id = ID pesan saja.
  const ID_RE = /^(true|false)_([^_]+)_([^_]+)(?:_(.+))?$/;
  const PLAIN_ID_RE = /^[A-Za-z0-9]{10,}$/;
  function parseRowId(row) {
    const raw = row.getAttribute("data-id") || "";
    const m = ID_RE.exec(raw);
    if (m) return { id: m[3], fromMe: m[1] === "true", jid: m[2], participant: m[4] || null };
    if (PLAIN_ID_RE.test(raw)) return { id: raw, fromMe: null, jid: null, participant: null };
    return null;
  }
  // Arah pesan: ikon ekor -> label aksesibilitas "You:/Anda:" -> posisi gelembung.
  function rowFromMe(row) {
    if (row.querySelector('[data-icon="tail-out"]')) return true;
    if (row.querySelector('[data-icon="tail-in"]')) return false;
    const lab = row.querySelector('[data-testid="msg-container"] span[aria-label$=":"]');
    if (lab && /^(you|anda|kamu)\s*:$/i.test(lab.getAttribute("aria-label").trim())) return true;
    if (lab) return false;
    const box = row.querySelector('[data-testid="msg-container"]'), main = document.querySelector("#main");
    if (box && main) { const a = box.getBoundingClientRect(), b = main.getBoundingClientRect(); return a.left + a.width / 2 > b.left + b.width / 2; }
    return false;
  }

  function detectType(row) {
    if (row.querySelector('[data-icon="recalled"], [data-icon*="recalled"]')) return "deleted";
    if (row.querySelector('audio, [data-icon="audio-play"], [data-icon*="ptt"], [data-icon="audio-download"]')) return "audio";
    if (row.querySelector('[data-icon="document"], [data-icon*="document-"], [data-icon*="doc-"], a[download]')) return "document";
    if (row.querySelector('[data-icon="media-play"], video, [data-icon="video-pip"]')) return "video";
    if (row.querySelector('img[src^="blob:"], [data-icon="media-download"]')) return "image";
    return "text";
  }

  function chatRows() {
    const main = document.querySelector("#main");
    if (!main) return [];
    return [...main.querySelectorAll("[data-id]")].filter((el) => !el.parentElement.closest("[data-id]") && parseRowId(el));
  }

  // Satu snapshot dari baris yang sedang dirender -> objek mentah (urut DOM).
  function snapshot() {
    return chatRows().map((row) => {
      const rid = parseRowId(row);
      const pre = row.querySelector("[data-pre-plain-text]");
      const pp = pre ? parsePrePlain(pre.getAttribute("data-pre-plain-text")) : null;
      let textEl = pre ? pre.querySelector("span.selectable-text, [data-testid='selectable-text']") : null;
      if (!textEl) textEl = row.querySelector(".copyable-text span.selectable-text, span.selectable-text");
      if (!textEl && pre && extractText(pre)) textEl = pre; // struktur baru: teks langsung di div data-pre-plain-text
      let text = textEl ? extractText(textEl) : "";
      let type = detectType(row);
      if (!text && type === "text") {
        // Bubble tanpa teks & tanpa ikon dikenal -> mungkin stiker/sistem.
        type = row.querySelector("img") ? "sticker" : "other";
      }
      let timeOnly = null;
      if (!pp) { // media tanpa caption: ambil jam dari baris terakhir innerText
        const lines = (row.innerText || "").split("\n").map((x) => x.trim()).filter(Boolean);
        for (let i = lines.length - 1; i >= 0 && i >= lines.length - 3; i--) { const t = parseTime(lines[i]); if (t && /^\d{1,2}[.:]\d{2}(\s?[AaPp]\.?[Mm]\.?)?$/.test(lines[i])) { timeOnly = t; break; } }
      }
      return {
        id: rid.id, fromMe: rid.fromMe === null ? rowFromMe(row) : rid.fromMe, jid: rid.jid, participant: rid.participant,
        text, type, pp, timeOnly, ppAttr: pre ? pre.getAttribute("data-pre-plain-text") : null,
        sender: pre ? ((/^\[[^\]]+\]\s*(.*?):\s*$/s.exec(pre.getAttribute("data-pre-plain-text")) || [])[1] || null) : null,
      };
    });
  }

  // ---------------------------------------------------------------- scrolling
  function findScroller() {
    const rows = chatRows();
    let el = rows[0] ? rows[0].parentElement : document.querySelector("#main");
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return document.querySelector("#main [data-scrolltracepolicy], #main [role='application']");
  }

  // Menggabungkan snapshot ke daftar `order` (kronologis) tanpa kehilangan urutan.
  function mergeIntoChat(chat, snap) {
    const ids = snap.map((s) => s.id);
    const known = new Set(chat.order);
    for (let i = snap.length - 1; i >= 0; i--) {
      const s = snap[i];
      if (known.has(s.id)) {
        // lengkapi data yang sebelumnya kosong (mis. teks baru termuat)
        const old = chat.map[s.id];
        if (!old.pp && s.pp) old.pp = s.pp;
        if (!old.text && s.text) old.text = s.text;
        continue;
      }
      chat.map[s.id] = s;
      let nxt = null;
      for (let j = i + 1; j < ids.length; j++) if (known.has(ids[j])) { nxt = ids[j]; break; }
      if (nxt) chat.order.splice(chat.order.indexOf(nxt), 0, s.id); else chat.order.push(s.id);
      known.add(s.id);
    }
  }

  // Beri timestamp: pesan bertanggal-penuh dulu, sisanya (media) dari tetangga.
  function resolveTimes(chat) {
    const list = chat.order.map((id) => chat.map[id]);
    // Parse ulang: urutan tanggal (d/m vs m/d) baru pasti setelah semua bukti terkumpul.
    list.forEach((m) => { if (m.ppAttr) m.pp = parsePrePlain(m.ppAttr); m.ts = m.pp ? toMs(m.pp.d, m.pp.t) : null; m.approx = false; });
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m.ts !== null || !m.timeOnly) continue;
      let prev = null, next = null;
      for (let j = i - 1; j >= 0; j--) if (list[j].pp) { prev = list[j]; break; }
      for (let j = i + 1; j < list.length; j++) if (list[j].pp) { next = list[j]; break; }
      const base = prev || next;
      if (!base) continue;
      let ts = toMs(base.pp.d, m.timeOnly);
      if (prev && ts < prev.ts - 60000 && next) ts = toMs(next.pp.d, m.timeOnly); // lewat tengah malam
      else if (prev && ts < prev.ts - 60000) ts += 86400000;
      m.ts = ts; m.approx = true;
    }
    // detik sintetis agar urutan dalam menit yang sama terjaga (DB menyimpan detik)
    const perMinute = {};
    list.forEach((m) => {
      if (m.ts === null) return;
      const k = Math.floor(m.ts / 60000);
      perMinute[k] = (perMinute[k] || 0);
      m.ts += Math.min(perMinute[k], 59) * 1000;
      perMinute[k]++;
    });
    return list;
  }

  async function loadHistory(chat) {
    let stall = 0, reachedCutoff = false, scrolls = 0;
    const oldestTs = () => {
      let min = Infinity;
      for (const id of chat.order) { const m = chat.map[id]; if (m.pp) min = Math.min(min, toMs(m.pp.d, m.pp.t)); }
      return min;
    };
    mergeIntoChat(chat, snapshot());
    const sc = findScroller();
    if (!sc) { chat.warnings.push("scroller tidak ditemukan — hanya pesan yang terlihat"); return { reachedCutoff: false, scrolls: 0 }; }
    while (scrolls < CONFIG.MAX_SCROLLS && !state.stopFlag) {
      if (oldestTs() < CUTOFF) { reachedCutoff = true; break; }
      const before = chat.order.length, h = sc.scrollHeight;
      sc.scrollTop = 0; scrolls++;
      const t0 = Date.now();
      while (Date.now() - t0 < 7000) { await sleep(300); if (sc.scrollHeight !== h || Date.now() - t0 >= CONFIG.SCROLL_WAIT_MS) { if (sc.scrollHeight !== h) await sleep(500); break; } }
      mergeIntoChat(chat, snapshot());
      if (chat.order.length === before && sc.scrollHeight === h) { if (++stall >= 3) { reachedCutoff = true; chat.reachedTop = true; break; } } else stall = 0;
    }
    // kembali ke bawah & ambil snapshot terakhir (pesan terbaru)
    sc.scrollTop = sc.scrollHeight; await sleep(700);
    mergeIntoChat(chat, snapshot());
    return { reachedCutoff, scrolls };
  }

  // ---------------------------------------------------------------- membuka chat
  function setNativeInput(box, text) {
    box.focus();
    if (box.tagName === "INPUT" || box.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), "value").set;
      setter.call(box, text);
      box.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    if (text) document.execCommand("insertText", false, text);
  }
  // Kandidat kolom search: elemen input/contenteditable di luar #main.
  function searchCandidates() {
    return [...document.querySelectorAll('[contenteditable="true"], [role="textbox"], [role="searchbox"], input[type="text"], input[type="search"], input:not([type])')]
      .filter((el) => !el.closest("#main") && el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const label = [el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("title"), el.getAttribute("data-tab"), el.closest("[aria-label]")?.getAttribute("aria-label")].filter(Boolean).join(" | ");
        const score = (/search|cari|telusuri/i.test(label) ? 10 : 0) + (el.getAttribute("data-tab") === "3" ? 5 : 0) + (r.left < innerWidth / 2 ? 2 : 0) + (r.top < 250 ? 2 : 0) - (r.width < 60 ? 20 : 0);
        return { el, score, label, tag: el.tagName, left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width) };
      })
      .sort((x, y) => y.score - x.score);
  }
  const searchBox = () => {
    const c = searchCandidates();
    return c.length && c[0].score > 0 ? c[0].el : null;
  };
  const clickEl = (el) => { ["mousedown", "mouseup", "click"].forEach((t) => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))); };
  const resultItems = () =>
    [...document.querySelectorAll('[role="listitem"], [role="row"], [role="gridcell"], [data-testid="cell-frame-container"]')].filter((el) => {
      if (el.closest("#main") || el.querySelector("[data-id]")) return false;
      const r = el.getBoundingClientRect();
      return r.height > 40 && r.left < innerWidth / 2 && r.top > 80;
    });
  const headerTitle = () => {
    const named = document.querySelector('#main [data-testid="conversation-info-header-chat-title-name"], #main [data-testid="conversation-info-header"] span[dir]');
    if (named && named.textContent.trim()) return named.textContent.trim();
    const h = document.querySelector("#main header");
    if (!h) return "";
    const s = h.querySelector("span[title], span[dir='auto']");
    return (s && (s.getAttribute("title") || s.textContent)) || h.innerText.split("\n")[0] || "";
  };
  const nameTokens = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["dr", "drg", "klinik", "dokter", "praktek", "praktik"].includes(w));

  function verifyOpenChat(target) {
    const want = digits(target.phone);
    const rows = chatRows();
    const rid = rows[0] ? parseRowId(rows[0]) : null;
    const jid = rid ? rid.jid : null;
    const title = headerTitle();
    // Kotak ketik berlabel "Type a message to +62 811-…" memuat nomor lawan bicara (chat nomor tak tersimpan).
    const comp = document.querySelector('#main [aria-label^="Type a message"], #main [aria-label^="Ketik pesan"], #main [placeholder^="Type a message"]');
    const compDigits = comp ? digits(comp.getAttribute("aria-label") || comp.getAttribute("placeholder")) : "";
    if (compDigits.length >= 9) return { ok: compDigits === want, how: "composer", jid, title };
    if (jid && /@c\.us$|@s\.whatsapp\.net$/.test(jid)) return { ok: digits(jid) === want, how: "jid", jid, title };
    if (digits(title) && digits(title).length >= 9) return { ok: digits(title) === want, how: "title-digits", jid, title };
    const tk = nameTokens(target.name), tt = title.toLowerCase();
    if (tk.length && tk.filter((w) => tt.includes(w)).length >= Math.min(2, tk.length)) return { ok: true, how: "title-name", jid, title };
    return { ok: false, how: "none", jid, title };
  }

  async function openChat(target) {
    const box = searchBox();
    if (!box) throw new Error("kolom search tidak ketemu (selector berubah?) — jalankan __bf.diagnose() atau buka chat manual lalu __bf.grab(phone)");
    const d = digits(target.phone);
    const local = d.startsWith("62") ? "0" + d.slice(2) : d;
    const intl = d.length > 5 ? `+${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5, 9)}-${d.slice(9)}` : d;
    // Urutan: nomor internasional, format tampilan WA, format lokal, lalu nama lead.
    const queries = [...new Set([d, intl, local, target.name])].filter(Boolean);
    const diag = [];
    for (const q of queries) {
      setNativeInput(box, q);
      await sleep(CONFIG.OPEN_WAIT_MS);
      const items = resultItems().slice(0, 4);
      diag.push({ q, results: items.length });
      for (const it of items) {
        clickEl(it); await sleep(CONFIG.OPEN_WAIT_MS);
        for (let i = 0; i < 6 && chatRows().length === 0; i++) await sleep(500);
        const v = verifyOpenChat(target);
        diag[diag.length - 1].lastCheck = { how: v.how, ok: v.ok, title: v.title, jid: v.jid };
        if (v.ok) return v;
      }
    }
    const e = new Error("chat tidak ketemu/tidak terverifikasi: " + JSON.stringify(diag));
    e.diag = diag;
    throw e;
  }

  // ---------------------------------------------------------------- satu chat
  async function collectOpenChat(target, verify) {
    const chat = { phone: target.phone, name: target.name, leadId: target.leadId || null, order: [], map: {}, warnings: [], verify };
    const info = await loadHistory(chat);
    const list = resolveTimes(chat);
    const msgs = list.filter((m) => m.ts !== null && m.ts >= CUTOFF).map((m) => ({
      id: m.id, fromMe: m.fromMe, ts: new Date(m.ts).toISOString(), text: m.text || null, type: m.type, approxTime: m.approx || undefined, sender: m.sender || undefined,
    }));
    const dropped = list.filter((m) => m.ts === null).length;
    const out = {
      phone: target.phone, name: target.name, leadId: target.leadId || null,
      status: "ok", reachedTop: chat.reachedTop || false, verified: verify.how, headerTitle: verify.title, jidSeen: verify.jid,
      reachedCutoff: info.reachedCutoff, scrolls: info.scrolls, totalLoaded: list.length, noTimestamp: dropped,
      warnings: chat.warnings, scrapedAt: new Date().toISOString(), messages: msgs,
    };
    if (!info.reachedCutoff) out.warnings.push("belum mencapai CUTOFF — kemungkinan masih ada pesan lebih lama yang belum termuat");
    return out;
  }

  async function runOne(target) {
    try {
      const v = await openChat(target);
      if (!v) { state.chats[target.phone] = { phone: target.phone, name: target.name, leadId: target.leadId || null, status: "not_found", messages: [] }; persist(); return "not_found"; }
      state.chats[target.phone] = await collectOpenChat(target, v);
      persist(); return "ok";
    } catch (e) {
      state.chats[target.phone] = { phone: target.phone, name: target.name, leadId: target.leadId || null, status: "error", error: String(e && e.message || e), messages: [] };
      persist(); return "error";
    }
  }

  // ---------------------------------------------------------------- API publik
  const api = {
    config: CONFIG, state, _t: { parsePrePlain, mergeIntoChat, resolveTimes, toMs, parseTime },
    get running() { return state.running; },
    stop() { state.stopFlag = true; log("berhenti setelah chat ini selesai…"); },
    reset() { state.chats = {}; persist(); log("data dikosongkan"); },
    add(phone, name) { CONFIG.TARGETS.push({ phone, name: name || phone }); },
    async run(opts = {}) {
      state.running = true; state.stopFlag = false;
      const todo = CONFIG.TARGETS.filter((t) => opts.redo || !state.chats[t.phone] || state.chats[t.phone].status !== "ok");
      log(`mulai: ${todo.length} chat (cutoff ${CONFIG.CUTOFF_ISO})`);
      let i = 0;
      for (const t of todo) {
        if (state.stopFlag) break;
        i++;
        const res = await runOne(t);
        const c = state.chats[t.phone];
        log(`[${i}/${todo.length}] ${t.name} (${t.phone}) -> ${res}` + (c.messages ? ` — ${c.messages.length} pesan` : "") + (c.error ? "  ✗ " + c.error : "") + (c.warnings && c.warnings.length ? "  ⚠ " + c.warnings.join("; ") : ""));
        await sleep(rnd(CONFIG.BETWEEN_CHATS_MS));
      }
      state.running = false;
      api.summary();
      if (opts.autoDownload !== false) { try { api.download(); } catch (e) { log("auto-download gagal, jalankan __bf.download() atau __bf.copy():", e); } }
      log("Selesai" + (state.stopFlag ? " (dihentikan)" : "") + ". File JSON sudah diunduh otomatis (cek folder Downloads); kalau tidak ada: __bf.download()");
    },
    // Chat sudah dibuka manual: ambil dari layar.
    async grab(phone, name) {
      const target = CONFIG.TARGETS.find((t) => digits(t.phone) === digits(phone)) || { phone, name: name || phone };
      const v = verifyOpenChat(target);
      if (!v.ok) log("⚠ verifikasi chat tidak cocok/tidak pasti:", v, "— tetap diambil, ditandai verified:" + v.how);
      state.chats[target.phone] = await collectOpenChat(target, v.ok ? v : { ...v, how: "manual" });
      persist(); log(`${target.phone}: ${state.chats[target.phone].messages.length} pesan`);
    },
    summary() {
      const cs = Object.values(state.chats);
      const by = (s) => cs.filter((c) => c.status === s);
      const nm = cs.reduce((n, c) => n + (c.messages ? c.messages.length : 0), 0);
      console.table(cs.map((c) => ({ phone: c.phone, name: (c.name || "").slice(0, 30), status: c.status, verified: c.verified || "", msgs: c.messages ? c.messages.length : 0, cutoff: c.reachedCutoff, warn: (c.warnings || []).length })));
      log(`ok=${by("ok").length} not_found=${by("not_found").length} error=${by("error").length} total_pesan=${nm}`);
      const nf = by("not_found").concat(by("error")).map((c) => c.phone);
      if (nf.length) log("Perlu manual (buka chat lalu await __bf.grab(phone)):", nf.join(", "));
    },
    payload() {
      return {
        meta: { source: "wa-web", version: 1, exportedAt: new Date().toISOString(), browserTz: Intl.DateTimeFormat().resolvedOptions().timeZone, cutoff: CONFIG.CUTOFF_ISO, dateOrder: state.dateOrder },
        chats: Object.values(state.chats),
      };
    },
    download() {
      const blob = new Blob([JSON.stringify(api.payload(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wa-export-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "") + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      log("diunduh:", a.download);
    },
    copy() { const s = JSON.stringify(api.payload()); try { window.copy ? window.copy(s) : navigator.clipboard.writeText(s); log("disalin ke clipboard,", s.length, "karakter"); } catch (e) { log("gagal copy:", e); } },
    // Bantu saya (Claude) memperbaiki selector kalau WA mengubah DOM.
    diagnose() {
      const rows = chatRows();
      const d = {
        url: location.href, hasMain: !!document.querySelector("#main"), hasSide: !!document.querySelector("#side"), hasPaneSide: !!document.querySelector("#pane-side"), resultItems: resultItems().length,
        searchBox: !!searchBox(), searchCandidates: searchCandidates().slice(0, 5).map(({ el, ...r }) => r), rows: rows.length, scroller: !!findScroller(), header: headerTitle(),
        sampleDataIds: rows.slice(0, 3).map((r) => String(r.getAttribute("data-id")).replace(/\d/g, "9")),
        samplePrePlain: rows.slice(0, 3).map((r) => { const p = r.querySelector("[data-pre-plain-text]"); return p && p.getAttribute("data-pre-plain-text"); }),
        parsed: snapshot().slice(-3), dateOrder: state.dateOrder, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      console.log(JSON.stringify(d, null, 2)); return d;
    },
  };
  window.__bf = api;
  log(`siap. ${CONFIG.TARGETS.length} target. Mulai dengan:  await __bf.run()   (cek dulu: __bf.diagnose() setelah membuka 1 chat)`);
})();

;window.__bf && window.__bf.run();
