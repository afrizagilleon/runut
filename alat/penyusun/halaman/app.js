// Halaman pintu penyusun (M2d-9; tampilan M2d-12). JavaScript polos, modul ES.
// Semua teks dari server (termasuk tulisan agen) dimasukkan lewat textContent,
// tidak pernah lewat innerHTML. Kalimat ringkasan datang dari ringkas.js
// (fungsi murni yang juga dites Vitest).
//
// Jalan langsung dan tayang ulang memakai jalur yang SAMA: peristiwa `tahap`
// dari /api/jalan/<id>/aliran digambar oleh tampilkanPeristiwa(). Tayang ulang
// hanya menambah penanda rekaman dan penanda jeda (event `tayang`).
import {
  hariId, labelPeristiwa, nomorTahap, teksBerhenti, lama, ringkasPapan, statusPeristiwa, tanggalId,
  judulTanpaAwalan, teksHasil, teksJeda, teksRekaman, teksStatus, usd, usdBiaya,
} from './ringkas.js';

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

/** Jumlah permintaan yang sedang berjalan (perekam menunggu sampai 0). */
let tunggu = 0;
function tandaiTunggu(d) {
  tunggu += d;
  document.documentElement.dataset.tunggu = String(tunggu);
}

async function api(jalur, badan) {
  const opsi = badan === undefined
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(badan) };
  tandaiTunggu(1);
  try {
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
  } finally {
    tandaiTunggu(-1);
  }
}

function tanda(ok) {
  return el('span', { kelas: ok ? 'ok' : 'tidak' }, ok ? '✓' : '✗');
}

const keadaan = { status: null, kode: null, jendela: 10, jalan: null, sumber: null, peristiwa: [], rekaman: null };

const tayangUlang = () => keadaan.rekaman !== null;

/* ------------------------------------------------------------------ */
/* status kunci dan pagu (jalan langsung) / penanda rekaman (tayang)   */
/* ------------------------------------------------------------------ */

async function muatStatus() {
  const s = await api('/api/status');
  keadaan.status = s;
  if (s.mode === 'tayang-ulang') {
    siapkanTayangUlang(s);
    return;
  }
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

function siapkanTayangUlang(s) {
  const r = s.rekaman;
  keadaan.rekaman = r;
  document.documentElement.dataset.mode = 'tayang-ulang';
  for (const id of ['status', 'langkah-kode', 'langkah-hari']) $(id).hidden = true;
  const t = teksRekaman(r);
  $('mode').textContent = '';
  const tandaR = $('rekaman');
  tandaR.hidden = false;
  kosongkan(tandaR).append(
    el('span', { kelas: 'rekaman-label' }, 'Rekaman'),
    el('span', { kelas: 'rekaman-isi' }, el('b', {}, t.label), el('span', { kelas: 'rekaman-tambahan' }, ` · jam ${r.jam_jalan_wib} WIB`),
      r.catatan && r.catatan.konteks_singkat ? el('span', { kelas: 'rekaman-konteks' }, ` · ${r.catatan.konteks_singkat}`) : null,
      el('span', { kelas: 'rekaman-tambahan' }, ' · tanpa panggilan model')),
    el('span', { kelas: 'rekaman-jeda', id: 'rekaman-jeda', 'aria-live': 'off' }, ''),
  );
  kosongkan($('rekaman-rincian')).append(...[t.konteks ? el('b', {}, `${t.konteks} `) : null, t.rincian].filter(Boolean));
  if (r.kode && r.tanggal_t) tampilkanKeping(r.kode, r.tanggal_t);
  bukaJalan(r.id);
}

/** Keping kalender: hari yang dibekukan, seperti di layar pemain. */
function tampilkanKeping(kode, tanggal) {
  const k = $('keping');
  k.hidden = false;
  const [y, m, d] = tanggal.split('-').map(Number);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1];
  kosongkan(k).append(
    el('span', { kelas: 'keping-kode' }, kode),
    el('span', { kelas: 'keping-hari' }, hariId(tanggal)),
    el('span', {}, `${d} ${bulan} ${y}`),
  );
  k.setAttribute('aria-label', `Hari yang dibekukan: ${kode}, ${hariId(tanggal)} ${tanggalId(tanggal)}`);
}

/* ------------------------------------------------------------------ */
/* aliran tahapan (Server-Sent Events)                                 */
/* ------------------------------------------------------------------ */

function sambungAliran(id, saatPeristiwa, saatSelesai) {
  if (keadaan.sumber) keadaan.sumber.close();
  const s = new EventSource(`/api/jalan/${encodeURIComponent(id)}/aliran?sesudah=${keadaan.nomorTerakhir || 0}`);
  keadaan.sumber = s;
  s.addEventListener('tahap', (e) => {
    const p = JSON.parse(e.data);
    if (p.no <= (keadaan.nomorTerakhir || 0)) return;
    keadaan.nomorTerakhir = p.no;
    saatPeristiwa(p);
    document.documentElement.dataset.nomor = String(p.no);
  });
  // Tayang ulang saja: jeda sebelum peristiwa berikutnya (jujur tentang waktu asli).
  s.addEventListener('tayang', (e) => {
    const t = JSON.parse(e.data);
    const teks = teksJeda(t);
    const j = $('rekaman-jeda');
    if (j) j.textContent = teks || '';
  });
  s.addEventListener('selesai', () => {
    s.close();
    if (keadaan.sumber === s) keadaan.sumber = null;
    const j = $('rekaman-jeda');
    if (j) j.textContent = 'Rekaman selesai.';
    document.documentElement.dataset.selesai = '1';
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

/* ------------------------------------------------------------------ */
/* 3 · tahapan (SSE), papan ringkasan, dan persetujuan biaya           */
/* ------------------------------------------------------------------ */

async function siapkanJalan(tanggal) {
  $('langkah-tahap').hidden = false;
  kosongkan($('tahap'));
  kosongkan($('persetujuan-biaya'));
  $('langkah-hasil').hidden = true;
  $('langkah-penyetuju').hidden = true;
  $('tahap-ringkas').textContent = `Menyiapkan ${keadaan.kode} · ${tanggalId(tanggal)}…`;
  tampilkanKeping(keadaan.kode, tanggal);
  try {
    const nama = $('nama-jalan').value.trim();
    const r = await api('/api/siapkan', { kode: keadaan.kode, tanggal, jendela: keadaan.jendela, ...(nama ? { id: nama } : {}) });
    bukaJalan(r.id);
  } catch (e) {
    $('tahap-ringkas').textContent = e.message;
  }
}

function bukaJalan(id) {
  keadaan.jalan = id;
  keadaan.nomorTerakhir = 0;
  keadaan.peristiwa = [];
  keadaan.versiTampil = null;
  if (!tayangUlang()) history.replaceState(null, '', `?jalan=${encodeURIComponent(id)}`);
  $('langkah-tahap').hidden = false;
  $('papan').hidden = false;
  kosongkan($('tahap'));
  kosongkan($('persetujuan-biaya'));
  $('tahap-ringkas').textContent = `Jalan ${id}. Setiap baris adalah satu peristiwa log, urut seperti terjadi; teksnya apa adanya dari log ("putaran" di log lama = versi). "+n d" = waktu asli sejak baris sebelumnya.`;
  gambarPapan();
  sambungAliran(id, tampilkanPeristiwa, () => muatJalan(id));
}

function daftarAturan(isi) {
  return el('details', {},
    el('summary', {}, `Lihat ${isi.aktif} aturan dan kalimat awamnya`),
    el('table', { kelas: 'tabel' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Aturan'), el('th', {}, 'Kalimat awam'), el('th', {}, 'Hasil atas data ≤ T'))),
      el('tbody', {}, isi.aturan.map((a) => el('tr', {},
        el('td', { kelas: 'mesin' }, a.kode),
        el('td', {}, a.awam),
        el('td', {}, a.dijalankan
          ? `${a.diperiksa} ${a.satuan} diperiksa; ${a.merah} merah; ${a.tidak_lengkap} tidak lengkap`
          : `tidak berjalan: ${a.alasan_lewat || ''}`),
      ))),
    ),
  );
}

function daftarPaket(isi) {
  return el('details', {},
    el('summary', {}, `Lihat ${isi.fakta.length} fakta, ${isi.disingkirkan.length} yang dibuang, dan calon sudut`),
    el('p', { kelas: 'meta' }, isi.keterangan),
    el('p', {}, `Peristiwa (dikirim ke penulis): ${isi.peristiwa}`),
    isi.aturan_calon ? el('ul', { kelas: 'meta' }, isi.aturan_calon.map((a) => el('li', {}, a))) : null,
    el('ul', {}, isi.fakta.map((f) => el('li', {}, el('span', { kelas: 'mesin' }, f.fact_id), ` (${f.asal}, terbit ${tanggalId(f.terbit)}): ${f.klaim}`))),
    isi.disingkirkan.length > 0 ? el('p', {}, 'Dibuang:') : null,
    el('ul', {}, isi.disingkirkan.map((d) => el('li', {}, el('span', { kelas: 'mesin' }, d.fact_id), `: ${d.alasan}`))),
    el('p', { kelas: 'meta' }, `Urutan sudut soal: ${isi.sudut.slice(0, 9).join(', ')}${isi.sudut.length > 9 ? ', …' : ''}`),
  );
}

function kotakPersetujuan(isi) {
  const kotak = kosongkan($('persetujuan-biaya'));
  const p = isi.perkiraan;
  const b = isi.batas;
  kotak.append(el('div', { kelas: 'kotak-catatan penting' },
    el('h3', {}, isi.mesin.palsu ? 'Jalankan agen PALSU (tanpa biaya)' : 'Perkiraan biaya maksimum — perlu persetujuanmu'),
    el('p', { kelas: 'meta' }, `Mesin: ${isi.mesin.nama} — ${isi.mesin.keterangan}`),
    el('table', { kelas: 'tabel' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Peran'), el('th', {}, 'Model'), el('th', {}, 'Maks per panggilan'))),
      el('tbody', {}, p.per_panggilan.map((x) => el('tr', {}, el('td', {}, x.peran), el('td', { kelas: 'mesin' }, x.model), el('td', {}, usd(x.maks_usd))))),
    ),
    el('p', {}, `Satu omongan melewati semua gerbang: ≤ ${usd(p.per_omongan_usd)}. Satu putaran (3 omongan): ≤ ${usd(p.per_putaran_usd)}. Paling banyak ${p.maks_putaran} putaran.`),
    el('ul', { kelas: 'meta' }, p.catatan.map((c) => el('li', {}, c))),
    isi.mesin.palsu ? null : el('p', {}, `Sisa pagu penyusun ${usd(b.sisa_penyusun_usd)}; sisa LLM_PAGU_USD ${usd(b.sisa_llm_usd)}.`),
  ));
  if (!isi.siap.siap) {
    kotak.append(el('p', { kelas: 'tidak' }, isi.siap.alasan));
    return;
  }
  if (b.maks_usd < b.min_usd) {
    kotak.append(el('p', { kelas: 'tidak' }, `Sisa pagu (${usd(b.maks_usd)}) di bawah pagu jalan minimum ${usd(b.min_usd)}; agen tidak bisa dijalankan.`));
    return;
  }
  const r = keadaan.rekaman;
  const nilai = r && typeof r.pagu_usd === 'number' ? r.pagu_usd : b.bawaan_usd;
  const masukan = el('input', { id: 'pagu-jalan', type: 'number', min: b.min_usd, max: b.maks_usd, step: '0.05', value: nilai.toFixed(2), readonly: Boolean(r), kelas: r ? 'masukan-rekaman' : null });
  // Tayang ulang: tombol tetap di tempatnya (seperti aslinya) tetapi tampak dan bersifat tidak aktif.
  const tombol = el('button', { kelas: r ? 'tombol tombol-rekaman' : 'tombol tombol-utama', type: 'button', id: 'setujui-biaya', disabled: Boolean(r), 'aria-disabled': r ? 'true' : null }, '');
  const segarkan = () => { tombol.textContent = `${r ? 'Rekaman, tidak aktif: ' : ''}Setujui dan jalankan agen (maks ${usd(Number(masukan.value))})`; };
  masukan.addEventListener('input', segarkan);
  segarkan();
  tombol.addEventListener('click', async () => {
    tombol.disabled = true;
    try {
      await api(`/api/jalan/${encodeURIComponent(keadaan.jalan)}/mulai`, { setuju: true, pagu_usd: Number(masukan.value) });
      kosongkan(kotak).append(el('p', { kelas: 'meta' }, `Disetujui: pagu jalan ${usd(Number(masukan.value))}. Agen berjalan; tahapannya muncul di atas.`));
    } catch (e) {
      tombol.disabled = false;
      kotak.append(el('p', { kelas: 'tidak' }, e.message));
    }
  });
  kotak.append(el('div', { kelas: 'baris-form' },
    el('label', { for: 'pagu-jalan' }, `Pagu jalan ini (US$, ${b.min_usd.toFixed(2)}–${b.maks_usd.toFixed(2)}); kode menghentikan agen sebelum panggilan yang akan melewatinya`),
    masukan, tombol));
  if (r) {
    kotak.append(el('p', { kelas: 'catatan-rekaman', 'data-rekaman': 'persetujuan' },
      `${r.label}: persetujuan ini sudah tercatat di log. Di tayangan ulang tombol tidak memicu panggilan.`,
      r.catatan && r.catatan.persetujuan ? ` ${r.catatan.persetujuan}` : ''));
  }
}

function tampilkanPeristiwa(p) {
  keadaan.peristiwa.push(p);
  const status = statusPeristiwa(p);
  const sebelum = keadaan.peristiwa.length > 1 ? keadaan.peristiwa[keadaan.peristiwa.length - 2] : null;
  const jeda = sebelum ? Date.parse(p.waktu) - Date.parse(sebelum.waktu) : null;
  // Pembatas kelompok tiap versi baru (bukan peristiwa; tanpa data-tahap).
  if (p.tahap === 'agen' && typeof p.isi.putaran === 'number' && p.isi.putaran !== keadaan.versiTampil) {
    keadaan.versiTampil = p.isi.putaran;
    const o = p.isi.omongan;
    $('tahap').append(el('li', { kelas: 'kelompok', 'data-kelompok': p.isi.putaran, 'aria-hidden': 'true' },
      `Versi ${p.isi.putaran}${typeof o === 'number' ? ` · omongan ${o}` : ''}`));
  }
  const li = el('li', { kelas: `peristiwa ${status}`, 'data-tahap': p.tahap, 'data-no': p.no },
    el('span', { kelas: 'tanda-status' }, teksStatus(status) || (nomorTahap(p) === null ? '' : `Tahap ${nomorTahap(p)}`)),
    el('div', { kelas: 'badan-peristiwa' },
      el('p', { kelas: 'label-peristiwa' }, labelPeristiwa(p), jeda === null ? '' : ` · +${lama(jeda)}`),
      el('p', { kelas: 'judul-tahap' }, judulTanpaAwalan(p)),
    ),
  );
  const badan = li.lastChild;
  if ((p.tahap === 'agen' || p.tahap === 'uji-ulang') && typeof p.isi.biaya_usd === 'number') {
    badan.append(el('p', { kelas: 'rincian' }, `${p.isi.model || 'kode'} · ${usdBiaya(p.isi.biaya_usd)}${typeof p.isi.total_usd === 'number' ? ` · total ${usdBiaya(p.isi.total_usd)}` : ''}`));
    if (Array.isArray(p.isi.alasan) && p.isi.alasan.length > 1) badan.append(el('details', {}, el('summary', {}, 'alasan lengkap'), el('ul', {}, p.isi.alasan.map((a) => el('li', {}, a)))));
  }
  if (p.tahap === 'aturan') badan.append(daftarAturan(p.isi));
  if (p.tahap === 'paket') badan.append(daftarPaket(p.isi));
  if (p.tahap === 'hasil' && Array.isArray(p.isi.penolakan) && p.isi.penolakan.length > 0) badan.append(el('ul', {}, p.isi.penolakan.map((a) => el('li', {}, a))));
  $('tahap').append(li);
  if (p.tahap === 'perkiraan') kotakPersetujuan(p.isi);
  // Persetujuan yang sudah diberikan tidak ditawarkan lagi; barisnya sendiri sudah di daftar tahapan.
  if (p.tahap === 'agen' && typeof p.isi.pagu_usd === 'number') {
    kosongkan($('persetujuan-biaya'));
    const r = keadaan.rekaman;
    if (r) {
      badan.append(el('p', { kelas: 'catatan-rekaman', 'data-rekaman': 'disetujui' },
        `${r.label}: persetujuan ini dari log, tidak memicu panggilan.`, r.catatan && r.catatan.persetujuan ? ` ${r.catatan.persetujuan}` : ''));
    }
  }
  gambarPapan();
  ikutiTerbaru(li);
  if (p.tahap === 'hasil' || p.tahap === 'penyetuju' || (p.tahap === 'uji-ulang' && typeof p.isi.lolos === 'boolean')) muatJalan(keadaan.jalan);
}

/**
 * Gulir mengikuti peristiwa terbaru selama pembaca tidak menggulir sendiri ke
 * atas. Perekam video mengatur gulirnya sendiri (PENYUSUN_GULIR_LUAR).
 */
let ikuti = true;
function ikutiTerbaru(li) {
  if (window.PENYUSUN_GULIR_LUAR || !ikuti) return;
  const halus = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  li.scrollIntoView({ block: 'nearest', behavior: halus ? 'smooth' : 'auto' });
}

/* papan ringkasan: urutan tahap, omongan, gerbang versi terkini, biaya */
function gambarPapan() {
  const r = ringkasPapan(keadaan.peristiwa);
  const papan = $('papan');
  if (!papan) return;
  kosongkan($('papan-tahap')).append(...r.tahap.map((t, i) => el('li', { kelas: `langkah ${t.keadaan}`, 'data-langkah': t.kunci, 'aria-current': t.keadaan === 'sedang' ? 'step' : null },
    el('span', { kelas: 'langkah-no' }, String(i + 1)),
    el('span', { kelas: 'langkah-nama' }, t.nama,
      t.kunci === 'agen' && r.versi > 0 ? el('span', { kelas: 'langkah-rincian' }, ` · versi ${r.versi}${r.omonganAktif ? `, omongan ${r.omonganAktif}` : ''}`) : null,
      t.kunci === 'perkiraan' && r.pagu !== null ? el('span', { kelas: 'langkah-rincian' }, ` · pagu ${usd(r.pagu)}`) : null),
    el('span', { kelas: 'langkah-keadaan' }, t.catatan),
  )));
  kosongkan($('papan-omongan')).append(...r.omongan.map((o) => el('li', { kelas: `omongan-${o.keadaan}` },
    el('span', { kelas: 'omongan-no' }, `Omongan ${o.no}`),
    el('span', {}, o.keadaan === 'dikunci' ? `✓ ${o.teks}` : o.keadaan === 'tolak' ? `✗ ${o.teks}` : o.teks),
    o.ditolak ? el('span', { kelas: 'omongan-ditolak' }, o.ditolak) : null)));
  const g = $('papan-gerbang');
  kosongkan(g);
  if (r.gerbang.length === 0) {
    g.append(el('p', { kelas: 'meta' }, r.tahap.find((t) => t.kunci === 'agen').keadaan === 'belum' ? 'Agen AI belum mulai.' : '—'));
  } else {
    $('papan-gerbang-judul').textContent = `Gerbang versi ${r.versi}${r.omonganAktif ? ` · omongan ${r.omonganAktif}` : ''}`;
    g.append(el('ol', { kelas: 'daftar-gerbang' }, r.gerbang.map((x) => el('li', { kelas: `gerbang ${x.status}` },
      el('span', { kelas: 'tanda-status' }, teksStatus(x.status)),
      el('span', { kelas: 'gerbang-nama' }, `${x.peran} — ${x.tugas}`),
      x.status === 'tolak' && x.alasan ? el('span', { kelas: 'gerbang-alasan' }, x.alasan) : null))));
  }
  const biaya = $('papan-biaya');
  kosongkan(biaya).append(...[
    el('p', { kelas: 'biaya-label' }, r.palsu ? 'Biaya palsu sejauh ini' : 'Biaya nyata sejauh ini'),
    el('p', { kelas: 'biaya-angka', 'data-biaya': r.biaya === null ? '' : String(r.biaya) }, usdBiaya(r.biaya === null ? 0 : r.biaya)),
    el('p', { kelas: 'meta' }, [
      r.pagu === null ? 'belum ada persetujuan biaya' : `pagu jalan ${usd(r.pagu)}`,
      r.panggilan > 0 ? `${r.panggilan} panggilan model` : null,
      r.ditolak > 0 ? `${r.ditolak} kali ditolak gerbang` : null,
    ].filter(Boolean).join(' · ')),
    r.hasil && r.hasil.ledger !== null ? el('p', { kelas: 'meta' }, `Dicocokkan ke ledger di akhir jalan: ${usdBiaya(r.hasil.ledger)}.`) : null,
    r.hasil && !r.hasil.terbit && r.hasil.berhenti ? el('p', { kelas: 'papan-berhenti' }, `Berhenti (dari log): ${teksBerhenti(r.hasil.berhenti)}`) : null,
  ].filter(Boolean));
  $('papan-ringkas').textContent = r.hasil
    ? (r.hasil.terbit ? 'Selesai: terbit, menunggu penyetuju.' : 'Selesai: tidak terbit.')
    : r.sedang === 'agen' ? `Versi ${r.versi}${r.omonganAktif ? `, omongan ${r.omonganAktif}` : ''}.` : '';
}

/* ------------------------------------------------------------------ */
/* 4 · hasil: draf seperti di layar pemain, atau penolakan beralasan   */
/* ------------------------------------------------------------------ */

function teksRujukan(teks) {
  const keluar = [];
  const pola = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
  let akhir = 0;
  let m;
  while ((m = pola.exec(teks)) !== null) {
    if (m.index > akhir) keluar.push(teks.slice(akhir, m.index));
    keluar.push(el('b', { title: m[1] }, m[2]));
    akhir = m.index + m[0].length;
  }
  if (akhir < teks.length) keluar.push(teks.slice(akhir));
  return keluar;
}

function polos(teks) {
  return String(teks).replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1');
}

function tampilkanOmongan(o, no, kartu, opsi) {
  const HURUF = ['a', 'b', 'c', 'd'];
  return el('article', { kelas: 'omongan', 'data-omongan': no },
    el('h3', {}, `Omongan ${no}`, opsi.status ? el('span', { kelas: `omongan-status ${opsi.status.kelas}` }, opsi.status.teks) : null),
    el('div', { kelas: 'omongan-isi' },
      el('div', { kelas: 'omongan-kiri' },
        el('p', { kelas: 'gelembung-nama' }, o.nama),
        el('div', { kelas: 'gelembung' }, o.pesan, el('span', { kelas: 'jam' }, o.jam)),
        el('p', { kelas: 'meta' }, 'Kartu yang dipegang pemain:'),
        o.kartu.map((id) => {
          const k = kartu[id];
          return el('div', { kelas: 'kartu-fakta' + (k && k.jenis === 'hitungan' ? ' hitungan' : '') },
            el('p', { kelas: 'meta' }, `${k ? k.asal : 'fakta'}${k ? ' · ' + tanggalId(k.terbit) : ''}${o.kartu_penentu.includes(id) ? ' · penentu' : ''}`),
            el('p', {}, k ? k.klaim : id));
        }),
      ),
      el('div', { kelas: 'omongan-kanan' },
        el('ol', { kelas: 'pilihan' }, HURUF.map((h) => el('li', { kelas: opsi.tandaiKunci && h === o.kunci ? 'kunci' : '' },
          el('span', { kelas: 'huruf' }, `${h})`), polos(o.pilihan[h]), opsi.tandaiKunci && h === o.kunci ? el('span', { kelas: 'tanda-kunci' }, ' ✓ kunci') : null))),
        el('div', { kelas: 'penjelasan' }, el('p', { kelas: 'meta' }, 'Penjelasan sesudah menjawab:'), el('p', {}, teksRujukan(o.penjelasan))),
      ),
    ),
    opsi.tambahan || null,
  );
}

async function muatJalan(id) {
  try {
    const j = await api(`/api/jalan/${encodeURIComponent(id)}`);
    keadaan.dataJalan = j;
    tampilkanHasil(j);
  } catch (e) {
    $('tahap-ringkas').textContent = e.message;
  }
}

function catatanSesudahJalan() {
  const r = keadaan.rekaman;
  if (!r || !r.catatan || r.catatan.sesudah.length === 0) return null;
  return el('div', { kelas: 'kotak-catatan catatan-sesudah', id: 'catatan-sesudah' },
    el('h3', {}, 'Catatan sesudah jalan (bukan bagian log ini)'),
    el('ul', {}, r.catatan.sesudah.map((c) => el('li', {}, c))),
    r.catatan.sumber ? el('p', { kelas: 'meta' }, `Sumber: ${r.catatan.sumber}`) : null);
}

function tampilkanHasil(j) {
  if (!j.hasil) return;
  $('langkah-hasil').hidden = false;
  const isi = kosongkan($('hasil-isi'));
  const biaya = j.hasil.biaya_ledger_usd === null || j.hasil.biaya_ledger_usd === undefined
    ? `biaya ${j.mesin && j.mesin.palsu ? 'palsu' : 'jejak'} ${usdBiaya(j.hasil.biaya_usd)}`
    : `biaya nyata (ledger) ${usdBiaya(j.hasil.biaya_ledger_usd)}`;
  const h = teksHasil(j.hasil);
  if (j.hasil.terbit && j.draf) {
    isi.append(el('div', { kelas: 'kotak-catatan lolos', id: 'terbit' },
      el('p', { kelas: `cap ${h.kelas}` }, h.cap),
      el('p', {}, `${h.kalimat} ${biaya[0].toUpperCase()}${biaya.slice(1)}.`),
      el('p', { kelas: 'meta' }, `Draf di bawah ditampilkan seperti di layar pemain, ditulis agen AI (Runut Agent). Jejak lengkap: eval/penyusun/${j.id}/jejak-agen.json`)));
    const c = catatanSesudahJalan();
    if (c) isi.append(c);
    j.draf.omongan.forEach((o, i) => isi.append(tampilkanOmongan(o, i + 1, j.kartu, { tandaiKunci: true })));
    tampilkanPenyetuju(j);
    return;
  }
  isi.append(el('div', { kelas: 'kotak-catatan tolak', id: 'penolakan' },
    el('p', { kelas: `cap ${h.kelas}` }, h.cap),
    el('p', {}, `${h.kalimat} ${biaya[0].toUpperCase()}${biaya.slice(1)}.`),
    el('p', {}, j.alasan_awam),
    j.hasil.penolakan.length > 0 ? el('p', {}, 'Alasan penolakan terakhir per omongan:') : null,
    el('ul', {}, j.hasil.penolakan.map((a) => el('li', {}, a))),
    el('p', { kelas: 'meta' }, `Jejak lengkap: eval/penyusun/${j.id}/jejak-agen.json dan hasil.json`)));
  const c = catatanSesudahJalan();
  if (c) isi.append(c);
  const terakhir = j.draf_terakhir.map((o, i) => [o, i + 1]).filter(([o]) => o);
  if (terakhir.length > 0) {
    const dikunci = new Set((j.keadaan || []).map((k) => k.no));
    isi.append(el('p', { kelas: 'meta' }, 'Versi terakhir tiap posisi (hanya untuk dibaca; simulasi ini tidak terbit):'));
    for (const [o, no] of terakhir) {
      const status = dikunci.has(no) ? { kelas: 'ok', teks: '✓ lolos semua gerbang (dikunci)' } : { kelas: 'tidak', teks: '✗ belum lolos semua gerbang' };
      isi.append(tampilkanOmongan(o, no, j.kartu, { tandaiKunci: true, status }));
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5 · penyetuju: setujui / tolak / perbaiki kata → uji ulang          */
/* ------------------------------------------------------------------ */

const LOKASI = [['pesan', 'pesan teman'], ['pilihan-a', 'pilihan a'], ['pilihan-b', 'pilihan b'], ['pilihan-c', 'pilihan c'], ['pilihan-d', 'pilihan d'], ['penjelasan', 'penjelasan']];

function teksLokasi(o, lokasi) {
  if (lokasi === 'pesan') return o.pesan;
  if (lokasi === 'penjelasan') return o.penjelasan;
  return o.pilihan[lokasi.slice(-1)];
}

function formSunting(j, no, o) {
  const pilih = el('select', { 'aria-label': `bagian omongan ${no} yang disunting` }, LOKASI.map(([v, t]) => el('option', { value: v }, t)));
  const area = el('textarea', { 'aria-label': `teks baru omongan ${no}` });
  const pesan = el('p', { kelas: 'meta' });
  const isiUlang = () => { area.value = teksLokasi(o, pilih.value); pesan.textContent = ''; };
  pilih.addEventListener('change', isiUlang);
  isiUlang();
  const simpan = el('button', { kelas: 'tombol', type: 'button' }, 'Simpan suntingan');
  simpan.addEventListener('click', async () => {
    try {
      const baru = await api(`/api/jalan/${encodeURIComponent(j.id)}/sunting`, { omongan: no, lokasi: pilih.value, teks: area.value });
      keadaan.dataJalan = baru;
      tampilkanHasil(baru);
    } catch (e) {
      pesan.textContent = e.message;
      pesan.className = 'tidak';
    }
  });
  return el('details', { kelas: 'sunting', 'data-sunting': no },
    el('summary', {}, `Perbaiki kata di omongan ${no}`),
    el('p', { kelas: 'meta' }, 'Hanya kata yang boleh diubah. Angka, rujukan fakta [[…|…]], dan label "Betul,"/"Keliru," dikunci; suntingan dicatat dan draf diuji ulang oleh gerbang yang sama.'),
    pilih, area, simpan, pesan);
}

function tampilkanPenyetuju(j) {
  $('langkah-penyetuju').hidden = false;
  const isi = kosongkan($('penyetuju-isi'));
  const p = j.penyetuju;
  if (keadaan.rekaman) {
    isi.append(el('p', { kelas: 'catatan-rekaman', 'data-rekaman': 'penyetuju' },
      `${keadaan.rekaman.label}: ${j.putusan ? 'putusan di bawah tercatat di folder jalan.' : 'belum ada putusan penyetuju. Di tayangan ulang tombol tidak menjalankan apa pun.'}`));
  }
  if (j.putusan) {
    isi.append(el('div', { kelas: 'kotak-catatan ' + (j.putusan.putusan === 'setujui' ? 'lolos' : 'tolak'), id: 'putusan' },
      el('p', {}, j.putusan.putusan === 'setujui'
        ? `Disetujui ${tanggalId(j.putusan.waktu)}. Ditulis ke: ${j.putusan.berkas.join(', ')} — bukan cases/. Memasang ke produk adalah langkah terpisah dengan izin deploy.`
        : `Ditolak: ${j.putusan.alasan}. Ditulis ke: ${j.putusan.berkas.join(', ')}.`)));
  } else {
    isi.append(el('p', {}, 'Penyetuju (manusia) memeriksa draf agen AI: setujui, tolak dengan alasan, atau perbaiki kata lalu uji ulang lewat gerbang yang sama.'));
    // Form suntingan di bawah tiap omongan pada bagian hasil.
    document.querySelectorAll('#hasil-isi article.omongan').forEach((art) => {
      const no = Number(art.getAttribute('data-omongan'));
      art.append(tayangUlang()
        ? el('p', { kelas: 'meta' }, `Perbaiki kata di omongan ${no}: tidak aktif di rekaman.`)
        : formSunting(j, no, j.draf.omongan[no - 1]));
    });
    if (p.uji_ulang.diuji.length > 0) {
      const tombol = el('button', { kelas: 'tombol tombol-utama', type: 'button', id: 'uji-ulang' },
        `Setujui biaya dan uji ulang omongan ${p.uji_ulang.diuji.join(', ')} (maks ${usd(p.uji_ulang.maks_usd)})`);
      tombol.addEventListener('click', async () => {
        tombol.disabled = true;
        try {
          await api(`/api/jalan/${encodeURIComponent(j.id)}/uji-ulang`, { setuju: true });
          sambungAliran(j.id, tampilkanPeristiwa, () => muatJalan(j.id));
        } catch (e) {
          tombol.disabled = false;
          isi.append(el('p', { kelas: 'tidak' }, e.message));
        }
      });
      isi.append(el('div', { kelas: 'kotak-catatan penting' },
        el('p', {}, 'Ada suntingan yang belum diuji ulang. Draf belum boleh disetujui sampai gerbang yang sama (validator, gerbang kode, pilihan-saja, pembaca kartu, kritikus, penebak) tidak keberatan.'),
        p.sibuk ? el('p', { kelas: 'meta' }, 'Uji ulang sedang berjalan…') : tombol));
    }
    if (p.boleh) {
      if (tayangUlang()) isi.append(el('p', { kelas: 'putusan-belum' }, 'Belum ada putusan penyetuju manusia.'));
      const setujui = el('button', { kelas: tayangUlang() ? 'tombol tombol-rekaman' : 'tombol tombol-utama', type: 'button', id: 'setujui', disabled: tayangUlang(), 'aria-disabled': tayangUlang() ? 'true' : null },
        `${tayangUlang() ? 'Rekaman, tidak aktif: ' : ''}Setujui draf ini`);
      setujui.addEventListener('click', async () => {
        try {
          await api(`/api/jalan/${encodeURIComponent(j.id)}/setujui`, {});
          await muatJalan(j.id);
        } catch (e) {
          isi.append(el('p', { kelas: 'tidak' }, e.message));
        }
      });
      isi.append(el('p', {}, setujui));
    }
    const alasan = el('textarea', { id: 'alasan-tolak', 'aria-label': 'alasan penolakan', placeholder: 'Alasan menolak draf ini' });
    const tolak = el('button', { kelas: 'tombol tombol-bahaya', type: 'button', id: 'tolak' }, 'Tolak dengan alasan');
    tolak.addEventListener('click', async () => {
      try {
        await api(`/api/jalan/${encodeURIComponent(j.id)}/tolak`, { alasan: alasan.value });
        await muatJalan(j.id);
      } catch (e) {
        isi.append(el('p', { kelas: 'tidak' }, e.message));
      }
    });
    if (tayangUlang()) isi.append(el('p', { kelas: 'meta' }, 'Tolak dengan alasan: tidak aktif di rekaman.'));
    else isi.append(el('details', {}, el('summary', {}, 'Tolak draf ini'), alasan, tolak));
  }
  if (j.suntingan.length > 0) {
    isi.append(el('h3', {}, 'Catatan suntingan'), el('table', { kelas: 'tabel', id: 'catatan-suntingan' },
      el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Siapa · kapan'), el('th', {}, 'Letak'), el('th', {}, 'Dari → ke'))),
      el('tbody', {}, j.suntingan.map((s) => el('tr', {},
        el('td', {}, String(s.ke)),
        el('td', {}, `${s.penyunting} · ${s.waktu.replace('T', ' ').slice(0, 19)}`),
        el('td', {}, `omongan ${s.omongan}, ${s.lokasi}`),
        el('td', {}, el('del', {}, polos(s.dari)), ' → ', el('ins', {}, polos(s.ke_teks))))))));
  }
  if (j.uji_ulang.length > 0) {
    isi.append(el('h3', {}, 'Uji ulang'), el('ul', {}, j.uji_ulang.map((u) => el('li', { kelas: u.lolos ? 'ok' : '' },
      `Uji ulang ${u.ke} (suntingan ≤ ${u.sampai_suntingan}, omongan ${u.diuji.join(', ')}): ${u.lolos === null ? 'berjalan' : u.lolos ? 'LOLOS' : 'TIDAK LOLOS'} · ${usdBiaya(u.biaya_usd)}`,
      u.lolos === false ? el('ul', {}, [...u.masalah, ...u.per_omongan.flatMap((x) => x.alasan)].slice(0, 6).map((a) => el('li', { kelas: 'meta' }, a))) : null))));
  }
}

/* ------------------------------------------------------------------ */
/* mulai                                                               */
/* ------------------------------------------------------------------ */

function mulaiHalaman() {
  $('form-tanggal').addEventListener('submit', (e) => {
    e.preventDefault();
    periksaTanggal($('tanggal').value.trim(), false);
  });
  $('form-kode').addEventListener('submit', (e) => {
    e.preventDefault();
    cariHari($('kode').value.trim().toUpperCase(), Number($('jendela').value || 10));
  });
  // Pembaca menggulir ke atas sendiri → berhenti mengikuti; kembali ke dasar → ikuti lagi.
  window.addEventListener('scroll', () => {
    const dasar = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    if (dasar) ikuti = true;
  }, { passive: true });
  window.addEventListener('wheel', (e) => { if (e.deltaY < 0) ikuti = false; }, { passive: true });
  const dariUrl = new URLSearchParams(location.search).get('jalan');
  muatStatus().then(() => {
    if (dariUrl && !tayangUlang()) bukaJalan(dariUrl);
  }).catch((e) => {
    kosongkan($('status-isi')).append(el('p', { kelas: 'tidak' }, `Status tidak terbaca: ${e.message}`));
    if (dariUrl) bukaJalan(dariUrl);
  });
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', mulaiHalaman);
else mulaiHalaman();
