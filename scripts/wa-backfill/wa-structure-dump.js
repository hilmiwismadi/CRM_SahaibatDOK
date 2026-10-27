/*
 * Dump STRUKTUR HTML WA Web untuk Claude — tanpa isi chat.
 * Paste di Console web.whatsapp.com. Hasilnya otomatis diunduh sebagai wa-structure.json
 * (dan disalin ke clipboard bila bisa). Kirim isi file itu ke Claude.
 *
 * Yang DIKIRIM: nama tag, atribut struktural (role, data-testid, data-icon, data-tab, type,
 * aria-label/placeholder/title yang pendek, class), posisi/ukuran kotak.
 * Yang TIDAK dikirim: teks pesan, nama kontak/klinik (semua teks diganti "#<jumlah huruf>"),
 * nomor telepon (digit di data-id dan label disamarkan jadi 9).
 * Cek sendiri filenya sebelum dikirim kalau ragu.
 *
 * Pakai: buka SATU chat (supaya baris pesan ikut terambil), lalu klik kolom search sekali
 * (supaya kolom search aktif), lalu paste script ini.
 */
(() => {
  const mask = (v) => String(v).replace(/\d/g, "9");
  const short = (v, n = 40) => (v.length > n ? v.slice(0, n) + "…(" + v.length + ")" : v);
  const KEEP = ["role", "data-testid", "data-icon", "data-tab", "data-id", "data-pre-plain-text", "data-scrolltracepolicy", "type",
    "aria-label", "aria-selected", "aria-multiline", "placeholder", "title", "contenteditable", "tabindex", "id", "dir", "href", "download"];

  function attrs(el) {
    const o = {};
    for (const n of KEEP) {
      if (!el.hasAttribute(n)) continue;
      let v = el.getAttribute(n);
      if (n === "data-pre-plain-text") v = v.replace(/\].*$/, "]").replace(/[0-9]/g, "9"); // bentuk tanggal/jam saja
      else if (n === "title" || n === "aria-label" || n === "placeholder") v = /^[A-Za-z ]{1,30}$/.test(v) && !/\d/.test(v) && n !== "title" ? v : short(mask(v), 20);
      else v = short(mask(v));
      o[n] = v;
    }
    if (el.className && typeof el.className === "string") o.class = short(el.className, 80);
    return o;
  }

  let count = 0;
  function outline(el, depth, max) {
    if (count++ > 1500) return { more: "dipotong" };
    const r = el.getBoundingClientRect();
    const node = { t: el.tagName.toLowerCase(), a: attrs(el), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).map((n) => n.nodeValue.trim().length);
    if (own.length) node.text = "#" + own.join("+");
    if (el.tagName === "IMG") node.alt = "#" + (el.getAttribute("alt") || "").length;
    if (depth < max) {
      const kids = [...el.children].map((c) => outline(c, depth + 1, max));
      if (kids.length) node.c = kids;
    } else if (el.children.length) node.c = "…" + el.children.length + " anak";
    return node;
  }

  const out = { when: new Date().toISOString(), ua: navigator.userAgent, lang: navigator.language, w: innerWidth, h: innerHeight };

  // 1. Semua elemen yang bisa diketik (kandidat kolom search / kotak pesan)
  out.inputs = [...document.querySelectorAll('[contenteditable], input, textarea, [role="textbox"], [role="searchbox"]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { t: el.tagName.toLowerCase(), a: attrs(el), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      inMain: !!el.closest("#main"), focused: document.activeElement === el, parents: parentChain(el) };
  });
  function parentChain(el) {
    const ch = []; let p = el.parentElement;
    for (let i = 0; i < 6 && p && p !== document.body; i++, p = p.parentElement) ch.push(p.tagName.toLowerCase() + (p.id ? "#" + p.id : "") + (p.getAttribute("role") ? "[role=" + p.getAttribute("role") + "]" : "") + (p.getAttribute("data-testid") ? "[testid=" + p.getAttribute("data-testid") + "]" : ""));
    return ch;
  }

  // 2. Kerangka halaman (kolom kiri / kanan), kedalaman 5
  out.landmarks = {
    app: !!document.querySelector("#app"), side: !!document.querySelector("#side"), paneSide: !!document.querySelector("#pane-side"), main: !!document.querySelector("#main"),
    ids: [...document.querySelectorAll("[id]")].map((e) => e.id).filter((i) => i.length < 30).slice(0, 40),
  };
  const app = document.querySelector("#app") || document.body;
  count = 0; out.skeleton = outline(app, 0, 6);

  // 3. Elemen yang mirip "daftar chat" (item di panel kiri)
  count = 0;
  const items = [...document.querySelectorAll('[role="listitem"], [role="row"], [role="gridcell"], [data-testid="cell-frame-container"]')].filter((e) => !e.closest("#main")).slice(0, 2);
  out.listItems = items.map((e) => outline(e, 0, 5));

  // 4. Dua baris pesan terakhir di chat yang terbuka
  count = 0;
  const rows = [...document.querySelectorAll("#main [data-id]")].filter((e) => !e.parentElement.closest("[data-id]")).slice(-2);
  out.messageRows = rows.map((e) => outline(e, 0, 9));
  out.messageRowCount = document.querySelectorAll("#main [data-id]").length;

  // 5. Header chat (judul disamarkan)
  count = 0;
  const hdr = document.querySelector("#main header");
  out.header = hdr ? outline(hdr, 0, 5) : null;

  const json = JSON.stringify(out, null, 1);
  try { const b = new Blob([json], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "wa-structure.json"; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { console.warn("download gagal", e); }
  try { (window.copy || ((s) => navigator.clipboard.writeText(s)))(json); } catch (e) { /* abaikan */ }
  console.log("[struct] selesai:", json.length, "karakter; inputs:", out.inputs.length, "; baris pesan:", out.messageRowCount, "— kirim wa-structure.json ke Claude");
  window.__waStructure = out;
})();
