// Tampilan AI agent di pintu penyusun. JavaScript polos, modul ES.
//
// Server mengirim langkah-langkah agent lewat SSE (/api/agen/aliran); halaman
// ini memutarnya SATU PER SATU dengan jeda (bisa dijeda, dilanjutkan,
// dilompati ke akhir, diatur kecepatannya) dan menggambarnya di tiga tampilan
// yang selalu sinkron: Ringkas, Rinci, Diagram.
//
// Diagram: AI agent satu lembar di tengah, tool di sekelilingnya dalam empat
// lembar kelompok. Tiap langkah: tool call terbang dari agent ke tool yang
// dipilih, tool result terbang kembali, lalu hasilnya mendarat di lembar agent
// sebagai cap. Geraknya hanya itu, dan mati di prefers-reduced-motion.
//
// Semua teks dari server dimasukkan lewat textContent; tidak ada HTML yang dirakit dari teks.
// Teks tetap halaman ada di agen-murni.js (`TEKS`), yang juga dites.
import {
  KECEPATAN, LAMA_TERBANG_MS, Pemutar, TEKS, angkaLangkah, angkaSingkat, biayaLangkah, budgetDariKetikan, capLangkah, dolar, kalimatAkhir, keadaanAgen,
  kodeDariKetikan, labelStatus, persen, potongNama, ringkasTahap, tanggalPanjang, toolBerhasil, uraiSse,
} from './agen-murni.js';

/* ------------------------------------------------------------------ */
/* bantuan DOM                                                         */
/* ------------------------------------------------------------------ */

const SVG = 'http://www.w3.org/2000/svg';

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

function svg(tag, attr) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, String(v));
  return e;
}

function kosongkan(e) {
  while (e.firstChild) e.removeChild(e.firstChild);
  return e;
}

const $ = (id) => document.getElementById(id);

const gerakHalus = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const layarLebar = window.matchMedia('(min-width: 1200px)');

/** Nama tool: huruf mesin, boleh patah di garis bawah. */
function namaTool(nama) {
  const s = el('span', { kelas: 'agen-tool' });
  for (const [i, p] of potongNama(nama).entries()) {
    if (i > 0) s.append(document.createElement('wbr'));
    s.append(p);
  }
  return s;
}

function daftarTool(nama) {
  const keluar = [];
  for (const [i, n] of nama.entries()) {
    if (i > 0) keluar.push(', ');
    keluar.push(namaTool(n));
  }
  return keluar;
}

/* ------------------------------------------------------------------ */
/* keadaan                                                             */
/* ------------------------------------------------------------------ */

const k = {
  kode: null,
  /**
   * Dari mana langkah di layar berasal: 'putar' (rekaman di repo) atau
   * 'langsung' (agent yang sedang bekerja). Tidak pernah berganti diam-diam:
   * hanya `putar()` dan `ikutiLangsung()` yang mengisinya.
   */
  sumber: null,
  /** Bagian `jalankan` dari /api/status: boleh tidaknya menjalankan agent, batas budget. */
  jalankan: null,
  /** Kode saham yang sedang dimintai persetujuan (kotak setuju terbuka). */
  kodeSetuju: null,
  /** Ada kerja agent dari halaman ini yang belum berakhir. */
  bekerja: false,
  /** Keadaan akhir kerja agent yang dijalankan dari halaman (peristiwa `akhir`). */
  akhir: null,
  kepala: null,
  /** Langkah yang sudah ditampilkan. */
  tampil: [],
  simulasi: null,
  tampilan: 'ringkas',
  /** Pemutar langkah (jeda, lanjut, lompat, kecepatan): agen-murni.js. */
  pemutar: null,
  kecepatan: 1,
  /** Berapa kali tiap tool dipanggil sejauh ini (indeks = kepala.tool). */
  hitung: [],
  /** Bagian per tahap di tampilan Ringkas dan Rinci: id → { ringkas, rinci, langkah }. */
  tahap: new Map(),
  /** Pembatal pembacaan aliran yang sedang berjalan. */
  batal: null,
  /**
   * Gerak di diagram untuk langkah terakhir: 'pergi' (tool call menuju tool),
   * 'kembali' (tool result menuju agent), 'tiba' (hasil sudah di agent; juga
   * keadaan diam). `gen` naik tiap gerak baru, supaya akhir animasi lama diabaikan.
   */
  gerak: 'tiba',
  gen: 0,
};

const fase = () => k.pemutar?.fase ?? 'diam';

/* ------------------------------------------------------------------ */
/* tampilan Ringkas dan Rinci                                          */
/* ------------------------------------------------------------------ */

function bagianTahap(id) {
  let t = k.tahap.get(id);
  if (t !== undefined) return t;
  const nama = k.kepala.tahap.find((x) => x.id === id)?.nama ?? id;
  const buat = (wadah) => {
    const angka = el('p', { kelas: 'meta agen-tahap-angka' });
    const daftar = el('ol', { kelas: 'agen-langkah' });
    wadah.append(el('section', { kelas: 'agen-tahap', 'data-tahap': id }, el('h3', {}, nama), angka, daftar));
    return { angka, daftar };
  };
  t = { ringkas: buat($('tampilan-ringkas')), rinci: buat($('rinci-isi')), langkah: [] };
  k.tahap.set(id, t);
  return t;
}

function tandaStatus(status) {
  const label = labelStatus(status);
  return label === null ? null : el('span', { kelas: `agen-tanda agen-tanda-${status}` }, label);
}

function barisKalimat(status, kalimat, jumlah) {
  return el(
    'li',
    { kelas: `agen-kalimat${status === null ? '' : ` agen-kalimat-${status}`}` },
    tandaStatus(status),
    status === null ? null : ' ',
    kalimat,
    jumlah > 1 ? el('span', { kelas: 'meta' }, ` (${TEKS.draf(jumlah)})`) : null,
  );
}

function kepalaLangkah(l) {
  return el('p', { kelas: 'agen-panggil' }, el('span', { kelas: 'meta' }, `${TEKS.memanggil} `), daftarTool(l.memanggil));
}

function barisRingkas(l) {
  return el(
    'li',
    { kelas: 'agen-baris', 'data-langkah': l.no },
    el('span', { kelas: 'agen-no', 'aria-label': TEKS.langkah(l.no, null) }, String(l.no)),
    el(
      'div',
      { kelas: 'agen-apa' },
      kepalaLangkah(l),
      el(
        'ul',
        { kelas: 'agen-kalimat-daftar' },
        l.ringkas.map((r) => barisKalimat(r.status, r.kalimat, r.jumlah)),
      ),
    ),
    el('p', { kelas: 'meta agen-angka' }, angkaSingkat(l)),
  );
}

/** Satu nilai tool result apa adanya: obyek → daftar medan, larik → daftar butir. */
function nilaiAsli(nilai) {
  if (typeof nilai === 'string') return nilai === '' ? el('span', { kelas: 'meta' }, TEKS.teksKosong) : el('span', { kelas: 'agen-teks-asli' }, nilai);
  if (Array.isArray(nilai)) {
    if (nilai.length === 0) return el('span', { kelas: 'meta' }, TEKS.daftarKosong);
    return el('ol', { kelas: 'agen-larik' }, nilai.map((x) => el('li', {}, nilaiAsli(x))));
  }
  if (nilai !== null && typeof nilai === 'object') {
    const isi = Object.entries(nilai);
    if (isi.length === 0) return el('span', { kelas: 'meta' }, TEKS.kosong);
    return el('dl', { kelas: 'agen-medan' }, isi.flatMap(([m, v]) => [el('dt', {}, m), el('dd', {}, nilaiAsli(v))]));
  }
  return el('span', {}, String(nilai));
}

/** Lipatan "rekaman asli": isinya baru digambar saat dibuka (tool result bisa panjang). */
function lipatanAsli(h) {
  const isi = el('div', { kelas: 'agen-asli-isi' });
  const d = el('details', { kelas: 'agen-asli' }, el('summary', {}, TEKS.rekamanAsli), isi);
  d.addEventListener('toggle', () => {
    if (!d.open || isi.firstChild) return;
    isi.append(
      el('p', { kelas: 'meta' }, `${TEKS.ringkasanRekaman}: `, el('span', { kelas: 'agen-teks-asli' }, h.asli.ringkas)),
      el('p', { kelas: 'meta' }, `${TEKS.isiRekaman}:`),
      nilaiAsli(h.asli.hasil),
    );
  });
  return d;
}

function barisRinci(l) {
  return el(
    'li',
    { kelas: 'agen-baris agen-baris-rinci', 'data-langkah': l.no },
    el('span', { kelas: 'agen-no', 'aria-label': TEKS.langkah(l.no, null) }, String(l.no)),
    el(
      'div',
      { kelas: 'agen-apa' },
      kepalaLangkah(l),
      el('p', { kelas: 'meta agen-angka-rinci' }, angkaLangkah(l).join(' · ')),
      l.ucapan === null ? null : el('p', { kelas: 'agen-ucapan' }, el('span', { kelas: 'meta' }, `${TEKS.ucapan} `), `“${l.ucapan}”`),
      el(
        'ul',
        { kelas: 'agen-hasil' },
        l.hasil.map((h) =>
          el(
            'li',
            {},
            el('p', { kelas: 'agen-hasil-kepala' }, el('span', { kelas: 'meta' }, `${TEKS.toolResult} `), namaTool(h.alat)),
            el('ul', { kelas: 'agen-kalimat-daftar' }, barisKalimat(h.status, h.kalimat, 1)),
            lipatanAsli(h),
          ),
        ),
      ),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* tampilan Diagram                                                    */
/* ------------------------------------------------------------------ */

function pasangKotak(e, kotak) {
  e.style.left = kotak.left;
  e.style.top = kotak.top;
  e.style.width = kotak.width;
  e.style.height = kotak.height;
}

/** Geometri diagram untuk lebar layar sekarang (dihitung server; halaman hanya menggambar). */
function geometri() {
  return layarLebar.matches ? k.kepala.diagram.lebar : k.kepala.diagram.tegak;
}

/**
 * Gambar ulang diagram menurut lebar layar. AI agent satu lembar di tengah;
 * tiap kelompok tool satu lembar berkepala; tiap garis agent ⇄ satu tool.
 */
function gambarDiagram() {
  if (k.kepala === null) return;
  const lebar = layarLebar.matches;
  const g = geometri();
  const bidang = $('agen-bidang');
  bidang.dataset.tata = lebar ? 'lebar' : 'tegak';
  bidang.dataset.keterangan = g.keterangan ? 'ya' : 'tidak';
  bidang.style.aspectRatio = `${g.bidang.lebar} / ${g.bidang.tinggi}`;
  bidang.style.setProperty('--kali', String(k.kecepatan));
  const garis = kosongkan($('agen-garis'));
  garis.setAttribute('viewBox', `0 0 ${g.bidang.lebar} ${g.bidang.tinggi}`);
  const lembar = kosongkan($('agen-lembar'));
  for (const kel of g.kelompok) {
    const nama = k.kepala.kelompok.find((x) => x.id === kel.id)?.nama ?? kel.id;
    const kertas = el('div', { kelas: 'agen-kelompok', 'data-kelompok': kel.id });
    pasangKotak(kertas, kel.lembar);
    const kepala = el('p', { kelas: 'agen-kelompok-nama', 'data-kelompok': kel.id }, nama);
    pasangKotak(kepala, kel.kepala);
    lembar.append(kertas, kepala);
  }
  const simpul = kosongkan($('agen-simpul'));
  pasangKotak($('agen-kotak'), g.agen);
  for (const [i, t] of k.kepala.tool.entries()) {
    const d = g.tool[i];
    if (d === undefined) continue;
    const grup = svg('g', { 'data-tool': i });
    grup.append(svg('line', d.garis));
    garis.append(grup);
    const namaKelompok = k.kepala.kelompok.find((x) => x.id === d.kelompok)?.nama ?? '';
    const li = el(
      'li',
      { 'data-tool': i, 'data-kelompok': d.kelompok },
      el('span', { kelas: 'sembunyi' }, `${namaKelompok}: `),
      el('span', { kelas: 'agen-simpul-nama' }, namaTool(t.nama), el('span', { kelas: 'agen-hitung', hidden: true })),
      t.keterangan ? el('span', { kelas: 'agen-simpul-ket' }, t.keterangan) : null,
    );
    pasangKotak(li, d.kotak);
    simpul.append(li);
  }
  aturGerak('tiba');
}

/** Ganti gerak diagram (dan buang tool call / tool result yang masih terbang bila gerak baru = 'tiba'). */
function aturGerak(gerak) {
  k.gerak = gerak;
  if (gerak === 'tiba') {
    k.gen += 1;
    kosongkan($('agen-kirim'));
  }
  $('agen-bidang').dataset.gerak = gerak;
  document.documentElement.dataset.gerak = gerak;
  nyalakan();
}

/**
 * Terbangkan satu keping per tool di sepanjang garisnya: 'call' dari agent ke
 * tool, 'result' dari tool ke agent. `sesudah` dipanggil ketika semuanya tiba.
 * Lamanya diatur CSS (`--kali` = kecepatan); jeda menahan animasinya.
 */
function terbangkan(jenis, indeks, sesudah) {
  const g = geometri();
  const wadah = kosongkan($('agen-kirim'));
  const gen = k.gen;
  const persen = (nilai, dari) => `${((nilai / dari) * 100).toFixed(2)}%`;
  let sisa = 0;
  for (const i of indeks) {
    const d = g.tool[i];
    if (d === undefined) continue;
    const keAgen = jenis === 'result';
    const keping = el('span', { kelas: `agen-keping agen-keping-${jenis}` }, jenis === 'call' ? TEKS.toolCall : TEKS.toolResult);
    keping.style.setProperty('--x1', persen(keAgen ? d.garis.x2 : d.garis.x1, g.bidang.lebar));
    keping.style.setProperty('--y1', persen(keAgen ? d.garis.y2 : d.garis.y1, g.bidang.tinggi));
    keping.style.setProperty('--x2', persen(keAgen ? d.garis.x1 : d.garis.x2, g.bidang.lebar));
    keping.style.setProperty('--y2', persen(keAgen ? d.garis.y1 : d.garis.y2, g.bidang.tinggi));
    sisa += 1;
    keping.addEventListener('animationend', () => {
      if (gen !== k.gen) return;
      sisa -= 1;
      if (sisa === 0) sesudah();
    }, { once: true });
    wadah.append(keping);
  }
  if (sisa === 0) sesudah();
}

/** Langkah baru di diagram: tool call pergi, tool result kembali, hasil mendarat di agent. */
function gerakkanLangkah(l, bergerak) {
  k.gen += 1;
  if (!bergerak || !gerakHalus() || k.tampilan !== 'diagram' || document.hidden) {
    aturGerak('tiba');
    return;
  }
  const gen = k.gen;
  k.gerak = 'pergi';
  $('agen-bidang').dataset.gerak = 'pergi';
  document.documentElement.dataset.gerak = 'pergi';
  nyalakan();
  terbangkan('call', l.nyala, () => {
    if (gen !== k.gen) return;
    k.gerak = 'kembali';
    $('agen-bidang').dataset.gerak = 'kembali';
    document.documentElement.dataset.gerak = 'kembali';
    nyalakan();
    terbangkan('result', toolBerhasil(l, k.kepala.tool), () => {
      if (gen === k.gen) aturGerak('tiba');
    });
  });
}

/** Cap di lembar agent: status tool result langkah terakhir (lolos, diminta perbaiki, tidak dipakai). */
function gambarCap(l) {
  const wadah = $('agen-cap');
  const kunci = l === undefined || k.gerak !== 'tiba' ? '' : `${l.no}`;
  if (wadah.dataset.langkah === kunci) return;
  wadah.dataset.langkah = kunci;
  kosongkan(wadah);
  if (kunci === '') return;
  for (const status of capLangkah(l)) wadah.append(el('span', { kelas: `cap agen-cap-satu agen-cap-${status}` }, labelStatus(status)));
}

/**
 * Nyalakan garis dan tool langkah terakhir selama tool call / tool result
 * sedang berjalan (atau baru saja tiba), perbarui hitungan panggilan, keadaan
 * agent, dan cap di lembar agent.
 */
function nyalakan() {
  const terakhir = k.tampil.at(-1);
  const aktif = terakhir !== undefined && (k.gerak !== 'tiba' || fase() === 'panggil');
  const nyala = aktif ? terakhir.nyala : [];
  for (const e of document.querySelectorAll('#agen-simpul > li, #agen-garis > g')) {
    const i = Number(e.dataset.tool);
    const n = k.hitung[i] ?? 0;
    // Selama tool call masih di jalan, tool-nya baru DITUJU (bertepi); ia terisi begitu tool call tiba.
    const dituju = nyala.includes(i) && k.gerak === 'pergi' && e.tagName === 'LI';
    e.classList.toggle('agen-dituju', dituju);
    e.classList.toggle('agen-nyala', nyala.includes(i) && !dituju);
    e.classList.toggle('agen-pernah', n > 0);
    if (e.tagName === 'LI') {
      if (nyala.includes(i)) e.setAttribute('aria-current', 'step');
      else e.removeAttribute('aria-current');
      const hitung = e.querySelector('.agen-hitung');
      hitung.hidden = n === 0;
      hitung.textContent = TEKS.dipanggil(n);
      hitung.setAttribute('aria-label', TEKS.dipanggilLabel(n));
    }
  }
  const keadaan = keadaanAgen(fase(), k.gerak, terakhir !== undefined);
  $('agen-kotak').dataset.fase = keadaan;
  $('agen-kotak-keadaan').textContent = {
    diam: TEKS.agenDiam, pikir: TEKS.agenPikir, kirim: TEKS.agenKirim, tunggu: TEKS.agenTunggu, baca: TEKS.agenBaca, usai: TEKS.agenUsai,
  }[keadaan];
  gambarCap(terakhir);
}

/** Catatan di bawah diagram: langkah yang sedang dilihat. */
function gambarKini() {
  const wadah = kosongkan($('diagram-kini'));
  const l = k.tampil.at(-1);
  if (l === undefined) {
    wadah.append(el('p', { kelas: 'meta' }, TEKS.belumAdaLangkah));
    return;
  }
  const namaTahap = k.kepala.tahap.find((x) => x.id === l.tahap)?.nama ?? l.tahap;
  wadah.append(
    el('p', { kelas: 'meta agen-kini-langkah' }, `${TEKS.langkah(l.no, k.kepala.jumlah_langkah)} · ${namaTahap}`),
    kepalaLangkah(l),
    el(
      'ul',
      { kelas: 'agen-tool-ket meta' },
      l.memanggil.map((n) => {
        const t = k.kepala.tool.find((x) => x.nama === n || x.nama_lama.includes(n));
        return t?.keterangan ? el('li', {}, namaTool(n), `: ${t.keterangan}`) : null;
      }),
    ),
    el('ul', { kelas: 'agen-kalimat-daftar' }, l.ringkas.map((r) => barisKalimat(r.status, r.kalimat, r.jumlah))),
    el('p', { kelas: 'meta agen-kini-angka' }, angkaSingkat(l)),
  );
}

/** Legenda diagram (di pojok bidang): dua keping yang terbang dan arti hitungan. */
function gambarLegenda() {
  kosongkan($('legenda-diagram')).append(
    el('li', {}, el('span', { kelas: 'agen-keping-contoh agen-keping-call' }, TEKS.toolCall), ` ${TEKS.legendaCall}`),
    el('li', {}, el('span', { kelas: 'agen-keping-contoh agen-keping-result' }, TEKS.toolResult), ` ${TEKS.legendaResult}`),
    el('li', {}, el('span', { kelas: 'agen-hitung' }, TEKS.contohHitung), ` ${TEKS.legendaHitung}`),
  );
}

/* ------------------------------------------------------------------ */
/* bilah keadaan                                                       */
/* ------------------------------------------------------------------ */

function gambarKeadaan() {
  const p = k.pemutar;
  const jumlah = k.kepala?.jumlah_langkah ?? null;
  const l = k.tampil.at(-1);
  const tuntas = p?.tuntas === true;
  const jeda = p?.jeda === true;
  const bagian = [];
  if (l !== undefined) {
    const namaTahap = k.kepala.tahap.find((x) => x.id === l.tahap)?.nama ?? l.tahap;
    bagian.push(`${TEKS.langkah(l.no, jumlah)} · ${namaTahap}`);
  }
  const langsung = k.sumber === 'langsung';
  if (tuntas && langsung) bagian.push(k.akhir?.hasil === 'terakit' ? TEKS.agenSelesaiTanpaSimulasi : k.akhir?.hasil === 'dihentikan' ? TEKS.agenDihentikan : TEKS.agenBerhenti);
  else if (tuntas) bagian.push(k.simulasi === null ? TEKS.agenSelesaiTanpaSimulasi : TEKS.agenSelesai);
  else if (jeda) bagian.push(TEKS.agenDijeda);
  else if (fase() === 'pikir') bagian.push(TEKS.agenBerpikir);
  else if (p !== null && p.antrean.length === 0 && !p.aliranSelesai) bagian.push(TEKS.agenMenunggu);
  $('agen-kini').textContent = bagian.join(' — ');
  if (k.kepala !== null) {
    const biaya = k.tampil.reduce((j, x) => j + biayaLangkah(x), 0);
    $('agen-biaya').textContent = langsung
      ? TEKS.biayaBudgetLangsung(dolar(biaya), dolar(k.kepala.budget_usd))
      : TEKS.biayaBudget(dolar(biaya), dolar(k.kepala.budget_usd), k.kepala.jumlah_rekaman);
    const persen = k.kepala.budget_usd > 0 ? Math.min(100, (biaya / k.kepala.budget_usd) * 100) : 0;
    $('agen-ukur-isi').style.width = `${persen.toFixed(1)}%`;
  }
  const jedaTombol = $('tombol-jeda');
  jedaTombol.textContent = jeda ? TEKS.tombolLanjut : TEKS.tombolJeda;
  jedaTombol.setAttribute('aria-pressed', jeda ? 'true' : 'false');
  jedaTombol.hidden = tuntas;
  $('tombol-lompat').hidden = tuntas;
  // "Putar dari awal" hanya untuk rekaman: kerja agent yang sungguhan tidak diputar ulang dari tombol ini.
  $('tombol-ulang').hidden = !tuntas || langsung;
  $('tombol-hentikan').hidden = !(langsung && k.bekerja);
  kunciPilihan();
  document.documentElement.dataset.agen = tuntas ? 'tuntas' : jeda ? 'jeda' : 'putar';
  document.documentElement.dataset.langkah = String(k.tampil.length);
}

/* ------------------------------------------------------------------ */
/* pemutaran                                                           */
/* ------------------------------------------------------------------ */

function tampilkanLangkah(l, gulir) {
  k.tampil.push(l);
  for (const i of l.nyala) k.hitung[i] = (k.hitung[i] ?? 0) + 1;
  const t = bagianTahap(l.tahap);
  t.langkah.push(l);
  const r = barisRingkas(l);
  const d = barisRinci(l);
  t.ringkas.daftar.append(r);
  t.rinci.daftar.append(d);
  const angka = ringkasTahap(t.langkah);
  t.ringkas.angka.textContent = angka;
  t.rinci.angka.textContent = angka;
  gerakkanLangkah(l, gulir);
  gambarKini();
  gambarKeadaan();
  if (gulir) {
    const baris = k.tampilan === 'ringkas' ? r : k.tampilan === 'rinci' ? d : null;
    baris?.scrollIntoView({ block: 'nearest', behavior: gerakHalus() ? 'smooth' : 'auto' });
  }
}

function pemutarBaru() {
  const p = new Pemutar({
    tampilkan: tampilkanLangkah,
    fase: () => {
      nyalakan();
      gambarKeadaan();
    },
    tuntas: () => {
      aturGerak('tiba');
      if (k.simulasi !== null) gambarSimulasi(k.simulasi);
      gambarAkhir();
      gambarKeadaan();
    },
    berubah: gambarKeadaan,
  });
  p.kecepatan = k.kecepatan;
  return p;
}

/* ------------------------------------------------------------------ */
/* simulasi yang jadi                                                  */
/* ------------------------------------------------------------------ */

function gambarSimulasi(s) {
  const wadah = kosongkan($('simulasi-isi'));
  wadah.append(
    el('div', { kelas: 'kotak-catatan' }, el('p', {}, s.keterangan_penyetuju)),
    el('h3', { kelas: 'agen-simulasi-judul' }, s.judul),
    el('p', { kelas: 'meta' }, `${s.nama_samaran} · ${tanggalPanjang(s.tanggal)}`),
  );
  for (const [i, o] of s.soal.entries()) {
    wadah.append(
      el(
        'div',
        { kelas: 'omongan' },
        el('h3', {}, TEKS.soalKe(i + 1)),
        el(
          'div',
          { kelas: 'omongan-isi' },
          el(
            'div',
            {},
            el('p', { kelas: 'gelembung-nama' }, o.nama),
            el('div', { kelas: 'gelembung' }, o.pesan, el('span', { kelas: 'jam' }, o.jam)),
            el('p', {}, o.tanya),
            el(
              'ol',
              { kelas: 'pilihan' },
              o.pilihan.map((p) =>
                el(
                  'li',
                  { kelas: p.benar ? 'kunci' : null },
                  el('span', { kelas: 'huruf' }, `${p.kunci}.`),
                  p.teks,
                  p.benar ? el('span', { kelas: 'tanda-kunci' }, ` ✓ ${TEKS.jawabanBenar}`) : null,
                ),
              ),
            ),
          ),
          el(
            'div',
            {},
            el('p', { kelas: 'meta' }, TEKS.kartuFakta),
            o.kartu.map((c) =>
              el(
                'div',
                { kelas: 'kartu-fakta' },
                el('p', { kelas: 'meta' }, c.kepala, c.penentu ? ` · ${TEKS.kartuPenentu}` : null),
                el('p', {}, c.isi),
              ),
            ),
            el('p', { kelas: 'meta' }, TEKS.penjelasan),
            el('p', { kelas: 'penjelasan' }, o.penjelasan),
            o.istilah.length === 0
              ? null
              : [el('p', { kelas: 'meta' }, TEKS.istilah), el('dl', { kelas: 'agen-istilah' }, o.istilah.flatMap((t) => [el('dt', {}, t.kata), el('dd', {}, t.arti)]))],
          ),
        ),
      ),
    );
  }
  wadah.append(
    el(
      'div',
      { kelas: 'omongan' },
      el('h3', {}, TEKS.sesudahnya),
      s.sesudahnya.map((p) => el('p', {}, p)),
      el('p', { kelas: 'penjelasan' }, el('strong', {}, s.penutup.kepala), ' ', s.penutup.isi),
    ),
  );
  $('agen-simulasi').hidden = false;
}

/* ------------------------------------------------------------------ */
/* aliran dari server                                                  */
/* ------------------------------------------------------------------ */

function terimaKepala(kepala) {
  k.kepala = kepala;
  k.hitung = kepala.tool.map(() => 0);
  $('agen-kerja').hidden = false;
  // Judul dan baris asal mengatakan dengan jujur apa yang sedang dilihat: kerja yang berlangsung, atau rekaman.
  const langsung = kepala.mode === 'langsung';
  $('judul-kerja').textContent = langsung ? TEKS.judulKerja : TEKS.judulPutar;
  $('agen-asal').textContent = langsung ? TEKS.asalLangsung(k.jalankan?.kerja?.folder ?? '') : TEKS.asalPutar;
  const lama = kepala.tool.filter((t) => t.nama_lama.length > 0).map((t) => TEKS.namaLama(t.nama, t.nama_lama.join(', ')));
  $('keterangan-ringkas').textContent = TEKS.keteranganRingkas;
  const budget = langsung ? TEKS.keteranganBudgetLangsung(dolar(kepala.budget_usd)) : TEKS.keteranganBudget(dolar(kepala.budget_usd), kepala.jumlah_rekaman);
  $('keterangan-rinci').textContent = [TEKS.keteranganRinci, TEKS.keteranganWaktu, budget, ...lama].join(' ');
  $('pokok-diagram').textContent = TEKS.pokokDiagram(kepala.tool.length);
  gambarLegenda();
  const sumber = kosongkan($('sumber-isi'));
  for (const s of kepala.sumber) sumber.append(el('li', {}, s));
  $('agen-sumber').hidden = kepala.sumber.length === 0;
  gambarDiagram();
  gambarKini();
  gambarKeadaan();
}

function terima(p) {
  if (p.jenis === 'kepala' && p.data !== null) terimaKepala(p.data);
  else if (p.jenis === 'langkah' && p.data !== null) k.pemutar?.terima(p.data);
  else if (p.jenis === 'simulasi' && p.data !== null) k.simulasi = p.data;
  else if (p.jenis === 'akhir' && p.data !== null) {
    // Proses agent sudah berhenti: tombol Hentikan hilang sekarang; kalimat akhirnya tampil sesudah langkah terakhir.
    k.akhir = p.data;
    k.bekerja = false;
    gambarKeadaan();
  } else if (p.jenis === 'selesai') k.pemutar?.selesaiAliran();
}

/** Keadaan akhir kerja agent yang dijalankan dari halaman: kalimatnya, folder keluaran, biaya tercatat. */
function gambarAkhir() {
  const a = k.akhir;
  const wadah = kosongkan($('agen-akhir'));
  wadah.hidden = a === null;
  if (a === null) return;
  wadah.append(
    el('p', {}, kalimatAkhir(a.hasil)),
    a.hasil === 'terakit' ? el('p', { kelas: 'meta' }, TEKS.akhirLanjut) : null,
    el('p', { kelas: 'meta' }, TEKS.akhirFolder(a.folder), a.biaya_usd === null ? null : ` · ${TEKS.akhirBiaya(dolar(a.biaya_usd))}`),
  );
  document.documentElement.dataset.akhir = a.hasil;
}

/** Selagi agent bekerja dari halaman ini, dua pilihan di atas dikunci (hanya satu kerja pada satu waktu). */
function kunciPilihan() {
  const j = k.jalankan;
  $('tombol-jalankan').disabled = j === null || j.siap !== true || k.bekerja;
  $('tombol-putar').disabled = k.bekerja;
}

function setel() {
  k.pemutar?.matikan();
  k.batal?.abort();
  Object.assign(k, { kepala: null, tampil: [], simulasi: null, akhir: null, sumber: null, hitung: [], batal: null, pemutar: null, gerak: 'tiba', gen: k.gen + 1 });
  kosongkan($('agen-akhir')).hidden = true;
  delete document.documentElement.dataset.akhir;
  kosongkan($('agen-kirim'));
  kosongkan($('agen-cap')).dataset.langkah = '';
  k.tahap.clear();
  kosongkan($('tampilan-ringkas'));
  kosongkan($('rinci-isi'));
  kosongkan($('simulasi-isi'));
  $('agen-simulasi').hidden = true;
  $('agen-sumber').hidden = true;
  $('agen-kerja').hidden = true;
  document.documentElement.dataset.langkah = '0';
  document.documentElement.dataset.agen = 'putar';
}

function tampilGalat(pesan) {
  const galat = $('galat-kode');
  galat.textContent = pesan;
  galat.hidden = false;
}

/** Pilihan B: putar ulang rekaman yang ada di repo. Tidak memanggil apa pun selain berkas rekaman. */
async function putar(kode) {
  setel();
  k.kode = kode;
  k.sumber = 'putar';
  document.documentElement.dataset.sumber = 'putar';
  k.pemutar = pemutarBaru();
  await bacaAliran(`/api/agen/aliran?kode=${encodeURIComponent(kode)}`, TEKS.galatSambung);
}

/** Pilihan A: ikuti kerja agent yang SEDANG dijalankan server (sesudah klik setuju, atau sesudah halaman dimuat ulang). */
async function ikutiLangsung() {
  setel();
  k.sumber = 'langsung';
  k.bekerja = true;
  document.documentElement.dataset.sumber = 'langsung';
  k.pemutar = pemutarBaru();
  kunciPilihan();
  await bacaAliran('/api/agen/langsung/aliran', TEKS.galatSambungLangsung);
}

/** Baca satu aliran SSE sampai habis; peristiwanya masuk ke pemutar yang sama untuk kedua pilihan. */
async function bacaAliran(alamat, pesanPutus) {
  const galat = $('galat-kode');
  galat.hidden = true;
  const batal = new AbortController();
  k.batal = batal;
  let jawab;
  try {
    jawab = await fetch(alamat, { headers: { Accept: 'text/event-stream' }, signal: batal.signal });
  } catch {
    if (batal.signal.aborted) return;
    tampilGalat(pesanPutus);
    return;
  }
  if (!jawab.ok || jawab.body === null) {
    let pesan = `HTTP ${jawab.status}`;
    try {
      pesan = (await jawab.json()).galat ?? pesan;
    } catch { /* bukan JSON */ }
    tampilGalat(pesan);
    return;
  }
  const pembaca = jawab.body.getReader();
  const dekoder = new TextDecoder();
  let sisa = '';
  try {
    for (;;) {
      const { done, value } = await pembaca.read();
      if (done) break;
      const u = uraiSse(sisa, dekoder.decode(value, { stream: true }));
      sisa = u.sisa;
      for (const p of u.peristiwa) terima(p);
    }
  } catch {
    if (batal.signal.aborted) return;
    if (k.pemutar?.aliranSelesai !== true) tampilGalat(pesanPutus);
  }
}

/* ------------------------------------------------------------------ */
/* Jalankan Runut Agent: persetujuan budget, lalu agent sungguhan    */
/* ------------------------------------------------------------------ */

async function kirim(jalur, badan) {
  try {
    const jawab = await fetch(jalur, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(badan) });
    let isi = {};
    try {
      isi = await jawab.json();
    } catch { /* bukan JSON */ }
    return { ok: jawab.ok, isi };
  } catch {
    return { ok: false, isi: { galat: TEKS.galatSambung } };
  }
}

function tutupSetuju() {
  k.kodeSetuju = null;
  $('setuju-jalankan').hidden = true;
  $('tombol-jalankan').hidden = false;
}

/** Klik "Jalankan Runut Agent": BELUM menjalankan apa pun — hanya membuka pernyataan biaya dan isian budget. */
async function bukaSetuju() {
  const j = k.jalankan;
  if (j === null || j.siap !== true || k.bekerja) return;
  const kode = kodeDariKetikan($('kode').value);
  if (kode === null) {
    tampilGalat(TEKS.kodeDulu);
    $('kode').focus();
    return;
  }
  $('galat-kode').hidden = true;
  let siap;
  try {
    siap = await (await fetch(`/api/agen/siap?kode=${encodeURIComponent(kode)}`)).json();
  } catch {
    tampilGalat(TEKS.galatSambung);
    return;
  }
  if (siap.galat) {
    tampilGalat(siap.galat);
    return;
  }
  k.kodeSetuju = kode;
  $('pernyataan-biaya').textContent = TEKS.pernyataanBiaya(dolar(j.budget_maks_usd), persen(j.toleransi));
  $('budget').value = String(j.budget_bawaan_usd).replace('.', ',');
  $('baris-kredit').hidden = siap.perlu_kredit !== true;
  $('setuju-kredit').checked = false;
  $('setuju-kredit').disabled = siap.sectors_siap !== true;
  $('teks-kredit').textContent = siap.sectors_siap === true ? TEKS.teksKredit(kode) : TEKS.kreditTanpaKunci(kode);
  $('setuju-jalankan').hidden = false;
  $('tombol-jalankan').hidden = true;
  document.documentElement.dataset.setuju = '1';
}

/** Klik "Setuju, jalankan dengan budget ini": satu-satunya tempat halaman mengirim `setuju: true`. */
async function setujuJalankan() {
  const j = k.jalankan;
  const kode = kodeDariKetikan($('kode').value);
  if (j === null || kode === null || kode !== k.kodeSetuju) {
    tutupSetuju();
    return;
  }
  const budget = budgetDariKetikan($('budget').value, j.budget_maks_usd);
  if (budget === null) {
    tampilGalat(TEKS.budgetTakSah(dolar(j.budget_maks_usd)));
    return;
  }
  const perluKredit = !$('baris-kredit').hidden;
  if (perluKredit && !$('setuju-kredit').checked) {
    tampilGalat(TEKS.kreditDulu);
    return;
  }
  $('galat-kode').hidden = true;
  $('tombol-setuju').disabled = true;
  const hasil = await kirim('/api/agen/jalankan', { kode, setuju: true, budget_usd: budget, ...(perluKredit ? { setuju_kredit: true } : {}) });
  $('tombol-setuju').disabled = false;
  if (!hasil.ok) {
    tampilGalat(hasil.isi.galat ?? TEKS.galatSambung);
    return;
  }
  tutupSetuju();
  delete document.documentElement.dataset.setuju;
  k.kode = kode;
  k.jalankan = { ...j, kerja: hasil.isi };
  void ikutiLangsung();
}

async function hentikan() {
  $('tombol-hentikan').disabled = true;
  const hasil = await kirim('/api/agen/hentikan', {});
  $('tombol-hentikan').disabled = false;
  if (!hasil.ok) tampilGalat(hasil.isi.galat ?? TEKS.galatSambung);
}

/* ------------------------------------------------------------------ */
/* pasang                                                              */
/* ------------------------------------------------------------------ */

function gantiTampilan(nama) {
  // Keping yang masih terbang tidak ikut pindah tampilan: hasilnya langsung dianggap tiba.
  if (k.tampilan === 'diagram' && nama !== 'diagram' && k.gerak !== 'tiba') aturGerak('tiba');
  k.tampilan = nama;
  for (const t of document.querySelectorAll('[data-tampilan]')) t.setAttribute('aria-pressed', t.dataset.tampilan === nama ? 'true' : 'false');
  for (const t of document.querySelectorAll('[data-tampilan-isi]')) t.hidden = t.dataset.tampilanIsi !== nama;
  document.documentElement.dataset.tampilan = nama;
}

async function mulai() {
  const pilih = $('kecepatan');
  for (const v of KECEPATAN) pilih.append(el('option', { value: v.nilai, selected: v.nilai === 1 }, v.label));
  pilih.addEventListener('change', () => {
    k.kecepatan = Number(pilih.value);
    $('agen-bidang').style.setProperty('--kali', String(k.kecepatan));
    k.pemutar?.gantiKecepatan(k.kecepatan);
  });
  for (const t of document.querySelectorAll('[data-tampilan]')) t.addEventListener('click', () => gantiTampilan(t.dataset.tampilan));
  $('tombol-jeda').addEventListener('click', () => k.pemutar?.jedaAtauLanjut());
  $('tombol-lompat').addEventListener('click', () => k.pemutar?.lompat());
  $('tombol-ulang').addEventListener('click', () => {
    if (k.kode !== null) void putar(k.kode);
  });
  layarLebar.addEventListener('change', gambarDiagram);
  const masukan = $('kode');
  masukan.addEventListener('input', () => {
    masukan.value = masukan.value.toUpperCase();
    // Persetujuan berlaku untuk satu kode saham: kode berubah → kotak setuju ditutup.
    if (k.kodeSetuju !== null) tutupSetuju();
  });
  // Enter di kolom kode = pilihan yang tanpa biaya (putar ulang rekaman), tidak pernah menjalankan agent.
  $('form-agen').addEventListener('submit', (e) => {
    e.preventDefault();
    if (k.bekerja) return;
    const kode = kodeDariKetikan(masukan.value);
    if (kode === null) {
      masukan.focus();
      return;
    }
    tutupSetuju();
    void putar(kode);
  });
  $('tombol-jalankan').addEventListener('click', () => void bukaSetuju());
  $('tombol-setuju').addEventListener('click', () => void setujuJalankan());
  $('tombol-batal').addEventListener('click', tutupSetuju);
  $('tombol-hentikan').addEventListener('click', () => void hentikan());
  $('agen-bidang').style.setProperty('--lama-terbang', `${LAMA_TERBANG_MS}ms`);
  gantiTampilan('ringkas');
  try {
    const status = await (await fetch('/api/status')).json();
    if (status.mode === 'replay-agent') {
      $('mode').textContent = TEKS.modeDua;
      const kode = status.agen?.kode_rekaman?.[0];
      if (kode) {
        $('petunjuk-kode').textContent = TEKS.petunjukKode(kode);
        masukan.placeholder = `mis. ${kode}`;
      }
      const j = status.jalankan ?? null;
      k.jalankan = j;
      // Tanpa kunci: pilihan "Jalankan" tetap terlihat, nonaktif, dengan satu kalimat cara mengisinya.
      if (j !== null && j.siap !== true) {
        $('nonaktif-jalankan').textContent = TEKS.nonaktif(j.alasan ?? '');
        $('nonaktif-jalankan').hidden = false;
      }
      kunciPilihan();
      // Halaman dimuat ulang selagi agent bekerja: ikuti kerja itu lagi (tidak menyalakan apa pun).
      if (j?.kerja?.keadaan === 'bekerja') {
        k.kode = j.kerja.kode;
        void ikutiLangsung();
      }
    } else {
      $('mode').textContent = TEKS.modeLain;
    }
  } catch {
    $('mode').textContent = TEKS.galatSambung;
  }
  document.documentElement.dataset.siap = '1';
}

void mulai();
