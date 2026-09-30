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
/* 1 · kode saham → usulan hari (atau perkiraan kredit)                */
/* ------------------------------------------------------------------ */

const NAMA_JENIS = {
  suspensi: 'Penghentian sementara',
  lonjakan: 'Harga naik beruntun',
  'ex-dividen': 'Tanggal ex dividen',
  'laporan-orang-dalam': 'Laporan orang dalam',
};

function barisStatusData(st, jendela) {
  return el('ul', { kelas: 'status-data' },
    el('li', {}, tanda(st.harga_t), ' harga hari itu'),
    el('li', {}, tanda(st.sesudah_cukup), ` ${st.sesudah} hari bursa sesudahnya (perlu ≥ ${jendela})`),
    el('li', {}, tanda(st.sebelum >= 10), ` ${st.sebelum} hari harga dalam 60 hari sebelumnya`),
    el('li', {}, tanda(st.laporan > 0), ` ${st.laporan} laporan kepemilikan ≤ T (setahun)`),
    el('li', {}, tanda(st.aksi > 0), ` ${st.aksi} dividen/RUPS ≤ T (setahun)`),
    el('li', {}, tanda(st.suspensi_lalu > 0), ` ${st.suspensi_lalu} penghentian lain ≤ T (setahun)`),
  );
}

function tampilkanUsulan(j) {
  const wadah = kosongkan($('usulan'));
  $('langkah-hari').hidden = false;
  wadah.append(el('p', { kelas: 'meta' },
    `${j.kode}${j.nama ? ' · ' + j.nama : ''} · harga ${j.data.harga.hari} hari (${tanggalId(j.data.harga.dari)}–${tanggalId(j.data.harga.sampai)}), ` +
    `${j.data.suspensi} penghentian, ${j.data.laporan} laporan kepemilikan, ${j.data.dividen} dividen, ${j.data.rups} RUPS di cache.`));
  if (j.usulan.length === 0) {
    wadah.append(el('div', { kelas: 'kotak-catatan tolak' },
      el('p', {}, 'Agen tidak menemukan hari yang layak dibekukan untuk emiten ini dengan jendela ' + j.jendela + ' hari bursa.'),
      el('p', { kelas: 'meta' }, 'Alasan tiap kandidat ada di daftar "dilewati" di bawah. Kamu tetap boleh mengetik tanggal sendiri.')));
  }
  j.usulan.forEach((u, i) => {
    wadah.append(el('article', { kelas: 'kartu-usulan', 'data-tanggal': u.tanggal },
      el('h3', {}, `Usulan ${i + 1}: ${tanggalId(u.tanggal)} — ${u.jenis.map((x) => NAMA_JENIS[x] || x).join(' + ')}`),
      u.alasan.map((a) => el('p', {}, a)),
      u.salah_kaprah.map((a) => el('p', { kelas: 'meta' }, 'Kenapa biasa disalahpahami: ' + a)),
      barisStatusData(u.status, j.jendela),
      el('button', { kelas: 'tombol tombol-utama', type: 'button', onclick: () => pilihHari(u.tanggal) }, `Bekukan ${tanggalId(u.tanggal)}`),
    ));
  });
  wadah.append(
    el('p', { kelas: 'kotak-catatan' }, j.catatan_kebocoran),
    el('details', {},
      el('summary', {}, `Aturan urut (${j.aturan_urut.length}) dan ${j.dilewati.length} kandidat yang dilewati`),
      el('ol', {}, j.aturan_urut.map((a) => el('li', {}, a))),
      el('ul', {}, j.dilewati.map((d) => el('li', {}, `${tanggalId(d.tanggal)} (${d.jenis.map((x) => NAMA_JENIS[x] || x).join(' + ')}): ${d.alasan}`))),
    ),
  );
}

function tampilkanPerkiraanKredit(j) {
  const pk = j.perkiraan_kredit;
  const isi = kosongkan($('kode-isi'));
  isi.append(el('div', { kelas: 'kotak-catatan penting' },
    el('p', {}, `Data ${j.kode} belum ada di cache. Mengambilnya dari Sectors memakai kredit milik kunci di .env:`),
    el('ul', {},
      pk.tetap.map((x) => el('li', {}, `${x.peran}: ${x.biaya} kredit`)),
      el('li', {}, `halaman kedua laporan kepemilikan (bila ada) dan ≤ 4 jendela harga harian 90 hari: ≤ ${pk.kredit_tambahan_maks} kredit`),
    ),
    el('p', {}, `Perkiraan: ${pk.kredit_tetap} kredit pasti, paling banyak ${pk.kredit_maks} kredit (pagu per emiten, ditegakkan kode). ` +
      `Rentang data ${tanggalId(pk.rentang.awal)}–${tanggalId(pk.rentang.akhir)}. Kredit terpakai ${pk.kredit_terpakai} dari pagu ${pk.pagu_kredit}.`),
    j.sectors_siap
      ? el('button', { kelas: 'tombol tombol-utama', type: 'button', onclick: () => ambilData(j.kode) }, `Setujui dan ambil data (≤ ${pk.kredit_maks} kredit)`)
      : el('p', { kelas: 'tidak' }, 'Kunci Sectors belum diisi di .env (SECTORS_API_KEY).'),
  ));
}

async function ambilData(kode) {
  const isi = kosongkan($('kode-isi'));
  isi.append(el('p', { kelas: 'meta' }, `Mengambil data ${kode} dari Sectors…`));
  try {
    const r = await api('/api/ambil-data', { kode, setuju: true });
    kosongkan(isi).append(el('div', { kelas: 'kotak-catatan ' + (r.ada_data ? 'lolos' : 'tolak') },
      el('p', {}, r.tidak_dikenal
        ? `Sectors tidak mengenal kode ${kode} (404); sisa paket tidak dikirim.`
        : r.berhenti ? `Pengambilan berhenti: ${r.berhenti}` : `Data ${kode} diambil.`),
      el('p', { kelas: 'meta' }, `Kredit dipakai ${r.kredit_dipakai}; terpakai ${r.kredit_terpakai} dari pagu ${r.pagu_kredit}.`),
      el('ul', { kelas: 'meta' }, r.catatan.map((c) => el('li', {}, `${c.peran}: ${c.akhir}${c.status ? ' (' + c.status + ')' : ''}, ${c.biaya} kredit`))),
    ));
    await muatStatus();
    if (r.ada_data) await cariHari(kode, keadaan.jendela);
  } catch (e) {
    kosongkan(isi).append(el('p', { kelas: 'tidak' }, e.message));
  }
}

async function cariHari(kode, jendela) {
  keadaan.kode = kode;
  keadaan.jendela = jendela;
  $('langkah-hari').hidden = true;
  const isi = kosongkan($('kode-isi'));
  isi.append(el('p', { kelas: 'meta' }, 'Mencari hari…'));
  try {
    const j = await api(`/api/emiten?kode=${encodeURIComponent(kode)}&jendela=${encodeURIComponent(jendela)}`);
    kosongkan(isi);
    if (!j.ada_data) tampilkanPerkiraanKredit(j);
    else tampilkanUsulan(j);
  } catch (e) {
    kosongkan(isi).append(el('p', { kelas: 'tidak' }, e.message));
  }
}

function pilihHari(tanggal) {
  $('tanggal').value = tanggal;
  periksaTanggal(tanggal, true);
}

/* ------------------------------------------------------------------ */
/* 2 · validasi tanggal                                                */
/* ------------------------------------------------------------------ */

async function periksaTanggal(tanggal, lanjutBilaSah) {
  const isi = kosongkan($('tanggal-isi'));
  try {
    const r = await api('/api/periksa-tanggal', { kode: keadaan.kode, tanggal, jendela: keadaan.jendela });
    if (!r.sah) {
      isi.append(el('div', { kelas: 'kotak-catatan tolak', 'data-kode': r.kode },
        el('p', {}, r.alasan),
        r.tawaran.length > 0
          ? el('p', {}, 'Hari bursa terdekat: ', r.tawaran.map((t) => el('button', {
              kelas: 'tombol', type: 'button', onclick: () => { $('tanggal').value = t.tanggal; periksaTanggal(t.tanggal, false); },
            }, `${t.arah} · ${tanggalId(t.tanggal)}${t.sah ? '' : ' (juga tidak sah)'}`)))
          : null,
      ));
      return;
    }
    isi.append(el('div', { kelas: 'kotak-catatan lolos' },
      el('p', {}, r.alasan),
      r.peristiwa.map((p) => el('p', { kelas: 'meta' }, p)),
      el('button', { kelas: 'tombol tombol-utama', type: 'button', onclick: () => siapkanJalan(r.tanggal) }, `Bekukan ${tanggalId(r.tanggal)}: siapkan paket fakta (gratis)`),
    ));
    if (lanjutBilaSah) siapkanJalan(r.tanggal);
  } catch (e) {
    isi.append(el('p', { kelas: 'tidak' }, e.message));
  }
}

async function siapkanJalan(tanggal) {
  // T-04: tahapan data → aturan → paket, lalu perkiraan biaya.
  kosongkan($('tahap-ringkas')).append(`Hari dipilih: ${tanggalId(tanggal)}.`);
  $('langkah-tahap').hidden = false;
}

/* ------------------------------------------------------------------ */
/* mulai                                                               */
/* ------------------------------------------------------------------ */

window.addEventListener('DOMContentLoaded', () => {
  $('form-tanggal').addEventListener('submit', (e) => {
    e.preventDefault();
    periksaTanggal($('tanggal').value.trim(), false);
  });
  $('form-kode').addEventListener('submit', (e) => {
    e.preventDefault();
    cariHari($('kode').value.trim().toUpperCase(), Number($('jendela').value || 10));
  });
  muatStatus().catch((e) => {
    kosongkan($('status-isi')).append(el('p', { kelas: 'tidak' }, `Status tidak terbaca: ${e.message}`));
  });
});
