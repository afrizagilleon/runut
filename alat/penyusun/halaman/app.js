// Halaman pintu penyusun (M2d-9). JavaScript polos, tanpa kerangka.
// Semua teks dari server (termasuk tulisan agen) dimasukkan lewat textContent,
// tidak pernah lewat innerHTML.
'use strict';

/* ------------------------------------------------------------------ */
/* bantuan DOM dan API                                                 */
/* ------------------------------------------------------------------ */

function el(tag, attr, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'kelas') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const a of anak.flat()) {
    if (a === null || a === undefined || a === false) continue;
    e.append(a instanceof Node ? a : document.createTextNode(String(a)));
  }
  return e;
}

function kosongkan(e) {
  while (e.firstChild) e.removeChild(e.firstChild);
  return e;
}

const $ = (id) => document.getElementById(id);

async function api(jalur, badan) {
  const opsi = badan === undefined
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(badan) };
  const r = await fetch(jalur, opsi);
  let isi = null;
  try { isi = await r.json(); } catch { isi = null; }
  if (!r.ok) {
    const e = new Error((isi && isi.galat) || `HTTP ${r.status}`);
    e.isi = isi;
    e.status = r.status;
    throw e;
  }
  return isi;
}

function usd(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return 'US$' + n.toFixed(n < 0.1 ? 4 : 2).replace('.', ',');
}

function tanggalId(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return String(iso);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${bulan[m - 1]} ${y}`;
}

function tanda(ok) {
  return el('span', { kelas: ok ? 'ok' : 'tidak' }, ok ? '✓' : '✗');
}

const keadaan = { status: null, kode: null, jendela: 10, jalan: null, sumber: null };

/* ------------------------------------------------------------------ */
/* status kunci dan pagu                                               */
/* ------------------------------------------------------------------ */

async function muatStatus() {
  const s = await api('/api/status');
  keadaan.status = s;
  $('mode').textContent = s.mode === 'palsu'
    ? `MODE PALSU — agen dan Sectors palsu, tanpa jaringan. Hari ini ${tanggalId(s.hari_ini)}.`
    : `Hari ini ${tanggalId(s.hari_ini)}.`;
  const k = s.konfig;
  const b = s.biaya;
  const isi = kosongkan($('status-isi'));
  isi.append(
    el('ul', { kelas: 'status-data' },
      el('li', {}, tanda(k.llm.siap), ' Kunci OpenRouter (agen)'),
      el('li', {}, tanda(k.sectors.siap), ' Kunci Sectors (data baru)'),
    ),
    el('p', {},
      `Biaya LLM tercatat di mesin ini: ${usd(b.terpakai_ledger_usd)}`,
      k.pagu_llm_usd === null ? ' (pagu LLM_PAGU_USD belum diisi)' : ` dari pagu ${usd(k.pagu_llm_usd)}`,
      `. Pintu penyusun: ${usd(b.terpakai_penyusun_usd)} dari pagu ${usd(b.pagu_penyusun_usd)}.`),
    el('p', {}, `Kredit Sectors terpakai: ${b.kredit_terpakai} dari pagu ${s.pagu_kredit}.`),
  );
  const hilang = k.variabel.filter((v) => v.wajib && !v.terisi);
  const catatan = [...k.llm.catatan, ...k.sectors.catatan];
  if (hilang.length > 0 || catatan.length > 0) {
    isi.append(el('div', { kelas: 'kotak-catatan penting' },
      el('p', {}, 'Isi variabel berikut di berkas .env di akar repo (salin dari .env.example), lalu jalankan ulang npm run penyusun:'),
      el('ul', {}, hilang.map((v) => el('li', {}, el('code', {}, v.nama), ` — ${v.arti}`))),
      catatan.map((c) => el('p', {}, c)),
      el('p', { kelas: 'meta' }, 'Tanpa kunci OpenRouter kamu tetap bisa melihat usulan hari, 33 aturan, dan paket fakta; agen tidak bisa dijalankan. Tanpa kunci Sectors hanya emiten yang datanya sudah ada di cache yang bisa dipakai.'),
    ));
  }
}

/* ------------------------------------------------------------------ */
/* aliran tahapan (Server-Sent Events)                                 */
/* ------------------------------------------------------------------ */

function sambungAliran(id, saatPeristiwa, saatSelesai) {
  if (keadaan.sumber) keadaan.sumber.close();
  const s = new EventSource(`/api/jalan/${encodeURIComponent(id)}/aliran`);
  keadaan.sumber = s;
  s.addEventListener('tahap', (e) => saatPeristiwa(JSON.parse(e.data)));
  s.addEventListener('selesai', () => {
    s.close();
    if (keadaan.sumber === s) keadaan.sumber = null;
    if (saatSelesai) saatSelesai();
  });
  return s;
}

/* ------------------------------------------------------------------ */
/* mulai                                                               */
/* ------------------------------------------------------------------ */

window.addEventListener('DOMContentLoaded', () => {
  muatStatus().catch((e) => {
    kosongkan($('status-isi')).append(el('p', { kelas: 'tidak' }, `Status tidak terbaca: ${e.message}`));
  });
});
