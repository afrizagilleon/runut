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
  const s = new EventSource(`/api/jalan/${encodeURIComponent(id)}/aliran?sesudah=${keadaan.nomorTerakhir || 0}`);
  keadaan.sumber = s;
  s.addEventListener('tahap', (e) => {
    const p = JSON.parse(e.data);
    if (p.no <= (keadaan.nomorTerakhir || 0)) return;
    keadaan.nomorTerakhir = p.no;
    saatPeristiwa(p);
  });
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

/* ------------------------------------------------------------------ */
/* 3 · tahapan (SSE) dan persetujuan biaya                             */
/* ------------------------------------------------------------------ */

async function siapkanJalan(tanggal) {
  $('langkah-tahap').hidden = false;
  kosongkan($('tahap'));
  kosongkan($('persetujuan-biaya'));
  $('langkah-hasil').hidden = true;
  $('langkah-penyetuju').hidden = true;
  $('tahap-ringkas').textContent = `Menyiapkan ${keadaan.kode} · ${tanggalId(tanggal)}…`;
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
  history.replaceState(null, '', `?jalan=${encodeURIComponent(id)}`);
  $('langkah-tahap').hidden = false;
  kosongkan($('tahap'));
  kosongkan($('persetujuan-biaya'));
  $('tahap-ringkas').textContent = `Jalan ${id}`;
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
  const masukan = el('input', { id: 'pagu-jalan', type: 'number', min: b.min_usd, max: b.maks_usd, step: '0.05', value: b.bawaan_usd.toFixed(2) });
  const tombol = el('button', { kelas: 'tombol tombol-utama', type: 'button', id: 'setujui-biaya' }, '');
  const segarkan = () => { tombol.textContent = `Setujui dan jalankan agen (maks ${usd(Number(masukan.value))})`; };
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
}

function labelTahap(p) {
  return {
    data: '1 · Data', aturan: '2 · 33 aturan', paket: '3 · Paket fakta', perkiraan: '4 · Perkiraan biaya', agen: '5 · Agen',
    hasil: '6 · Hasil', suntingan: 'Suntingan', 'uji-ulang': 'Uji ulang', penyetuju: 'Penyetuju', galat: 'Galat',
  }[p.tahap] || p.tahap;
}

function tampilkanPeristiwa(p) {
  let kelas = '';
  if (p.tahap === 'galat') kelas = 'tolak';
  else if (p.tahap === 'agen' || p.tahap === 'uji-ulang') kelas = p.isi.putusan === 'tolak' || p.isi.putusan === 'galat' || p.isi.lolos === false ? 'tolak' : p.isi.putusan === 'lolos' || p.isi.lolos === true ? 'lolos' : '';
  else if (p.tahap === 'hasil') kelas = p.isi.terbit ? 'lolos' : 'tolak';
  else if (p.tahap === 'perkiraan') kelas = 'bayar';
  const li = el('li', { kelas, 'data-tahap': p.tahap }, el('span', { kelas: 'judul-tahap' }, `${labelTahap(p)} `), p.judul);
  if ((p.tahap === 'agen' || p.tahap === 'uji-ulang') && typeof p.isi.biaya_usd === 'number') {
    li.append(el('span', { kelas: 'rincian' }, ` · ${p.isi.model || 'kode'} · ${usd(p.isi.biaya_usd)}`));
    if (Array.isArray(p.isi.alasan) && p.isi.alasan.length > 1) li.append(el('details', {}, el('summary', {}, 'alasan lengkap'), el('ul', {}, p.isi.alasan.map((a) => el('li', {}, a)))));
    if (typeof p.isi.total_usd === 'number') $('tahap-ringkas').textContent = `Jalan ${keadaan.jalan} · biaya langkah sejauh ini ${usd(p.isi.total_usd)}`;
  }
  if (p.tahap === 'aturan') li.append(daftarAturan(p.isi));
  if (p.tahap === 'paket') li.append(daftarPaket(p.isi));
  if (p.tahap === 'hasil' && Array.isArray(p.isi.penolakan) && p.isi.penolakan.length > 0) li.append(el('ul', {}, p.isi.penolakan.map((a) => el('li', {}, a))));
  $('tahap').append(li);
  if (p.tahap === 'perkiraan') kotakPersetujuan(p.isi);
  // Diputar ulang (?jalan=…): persetujuan yang sudah diberikan tidak ditawarkan lagi.
  if (p.tahap === 'agen' && typeof p.isi.pagu_usd === 'number') {
    kosongkan($('persetujuan-biaya')).append(el('p', { kelas: 'meta' }, `Disetujui: pagu jalan ${usd(p.isi.pagu_usd)}.`));
  }
  if (p.tahap === 'hasil' || p.tahap === 'penyetuju' || (p.tahap === 'uji-ulang' && typeof p.isi.lolos === 'boolean')) muatJalan(keadaan.jalan);
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
    el('h3', {}, `Omongan ${no}`),
    el('p', { kelas: 'gelembung-nama' }, o.nama),
    el('div', { kelas: 'gelembung' }, o.pesan, el('span', { kelas: 'jam' }, o.jam)),
    el('p', { kelas: 'meta' }, 'Kartu yang dipegang pemain:'),
    o.kartu.map((id) => {
      const k = kartu[id];
      return el('div', { kelas: 'kartu-fakta' + (k && k.jenis === 'hitungan' ? ' hitungan' : '') },
        el('p', { kelas: 'meta' }, `${k ? k.asal : 'fakta'}${k ? ' · ' + tanggalId(k.terbit) : ''}${o.kartu_penentu.includes(id) ? ' · penentu' : ''}`),
        el('p', {}, k ? k.klaim : id));
    }),
    el('ol', { kelas: 'pilihan' }, HURUF.map((h) => el('li', { kelas: opsi.tandaiKunci && h === o.kunci ? 'kunci' : '' },
      el('span', { kelas: 'huruf' }, `${h})`), polos(o.pilihan[h]), opsi.tandaiKunci && h === o.kunci ? el('span', { kelas: 'meta' }, ' (kunci)') : null))),
    el('div', { kelas: 'penjelasan' }, el('p', { kelas: 'meta' }, 'Penjelasan sesudah menjawab:'), el('p', {}, teksRujukan(o.penjelasan))),
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

function tampilkanHasil(j) {
  if (!j.hasil) return;
  $('langkah-hasil').hidden = false;
  const isi = kosongkan($('hasil-isi'));
  const biaya = j.hasil.biaya_ledger_usd === null || j.hasil.biaya_ledger_usd === undefined
    ? `biaya ${j.mesin && j.mesin.palsu ? 'palsu' : 'jejak'} ${usd(j.hasil.biaya_usd)}`
    : `biaya nyata (ledger) ${usd(j.hasil.biaya_ledger_usd)}`;
  if (j.hasil.terbit && j.draf) {
    isi.append(el('div', { kelas: 'kotak-catatan lolos', id: 'terbit' },
      el('p', {}, `Terbit sesudah ${j.hasil.putaran} putaran — ${biaya}. Draf di bawah ditampilkan seperti di layar pemain; belum dipasang ke produk.`),
      el('p', { kelas: 'meta' }, `Jejak lengkap: eval/penyusun/${j.id}/jejak-agen.json`)));
    j.draf.omongan.forEach((o, i) => isi.append(tampilkanOmongan(o, i + 1, j.kartu, { tandaiKunci: true })));
    if (typeof tampilkanPenyetuju === 'function') tampilkanPenyetuju(j);
    return;
  }
  isi.append(el('div', { kelas: 'kotak-catatan tolak', id: 'penolakan' },
    el('p', {}, `Tidak terbit — ${biaya}.`),
    el('p', {}, j.alasan_awam),
    j.hasil.penolakan.length > 0 ? el('p', {}, 'Alasan penolakan terakhir per omongan:') : null,
    el('ul', {}, j.hasil.penolakan.map((a) => el('li', {}, a))),
    el('p', { kelas: 'meta' }, `Jejak lengkap: eval/penyusun/${j.id}/jejak-agen.json dan hasil.json`)));
  const terakhir = j.draf_terakhir.map((o, i) => [o, i + 1]).filter(([o]) => o);
  if (terakhir.length > 0) {
    const dikunci = new Set((j.keadaan || []).map((k) => k.no));
    isi.append(el('p', { kelas: 'meta' }, 'Versi terakhir tiap posisi (hanya untuk dibaca; simulasi tidak terbit):'));
    for (const [o, no] of terakhir) {
      isi.append(el('p', { kelas: dikunci.has(no) ? 'ok' : 'tidak' }, `Omongan ${no}: ${dikunci.has(no) ? 'lolos semua gerbang (dikunci)' : 'belum lolos semua gerbang'}`));
      isi.append(tampilkanOmongan(o, no, j.kartu, { tandaiKunci: true }));
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
  if (j.putusan) {
    isi.append(el('div', { kelas: 'kotak-catatan ' + (j.putusan.putusan === 'setujui' ? 'lolos' : 'tolak'), id: 'putusan' },
      el('p', {}, j.putusan.putusan === 'setujui'
        ? `Disetujui ${tanggalId(j.putusan.waktu)}. Ditulis ke: ${j.putusan.berkas.join(', ')} — bukan cases/. Memasang ke produk adalah langkah terpisah dengan izin deploy.`
        : `Ditolak: ${j.putusan.alasan}. Ditulis ke: ${j.putusan.berkas.join(', ')}.`)));
  } else {
    // Form suntingan di bawah tiap omongan pada bagian hasil.
    document.querySelectorAll('#hasil-isi article.omongan').forEach((art) => {
      const no = Number(art.getAttribute('data-omongan'));
      art.append(formSunting(j, no, j.draf.omongan[no - 1]));
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
      const setujui = el('button', { kelas: 'tombol tombol-utama', type: 'button', id: 'setujui' }, 'Setujui draf ini');
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
    isi.append(el('details', {}, el('summary', {}, 'Tolak draf ini'), alasan, tolak));
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
      `Uji ulang ${u.ke} (suntingan ≤ ${u.sampai_suntingan}, omongan ${u.diuji.join(', ')}): ${u.lolos === null ? 'berjalan' : u.lolos ? 'LOLOS' : 'TIDAK LOLOS'} · ${usd(u.biaya_usd)}`,
      u.lolos === false ? el('ul', {}, [...u.masalah, ...u.per_omongan.flatMap((x) => x.alasan)].slice(0, 6).map((a) => el('li', { kelas: 'meta' }, a))) : null))));
  }
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
  const dariUrl = new URLSearchParams(location.search).get('jalan');
  if (dariUrl) bukaJalan(dariUrl);
  muatStatus().catch((e) => {
    kosongkan($('status-isi')).append(el('p', { kelas: 'tidak' }, `Status tidak terbaca: ${e.message}`));
  });
});
