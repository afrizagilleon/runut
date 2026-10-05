// Tampilan AI agent di pintu penyusun. JavaScript polos, modul ES.
//
// Server mengirim langkah-langkah agent lewat SSE (/api/agen/aliran); halaman
// ini memutarnya SATU PER SATU dengan jeda (bisa dijeda, dilanjutkan,
// dilompati ke akhir, diatur kecepatannya) dan menggambarnya di tiga tampilan
// yang selalu sinkron: Ringkas, Rinci, Diagram.
//
// Semua teks dari server dimasukkan lewat textContent; tidak ada HTML yang dirakit dari teks.
// Teks tetap halaman ada di agen-murni.js (`TEKS`), yang juga dites.
import {
  KECEPATAN, Pemutar, TEKS, angkaLangkah, angkaSingkat, biayaLangkah, dolar, kodeDariKetikan,
  potongNama, ringkasTahap, tanggalPanjang, uraiSse,
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
const layarLebar = window.matchMedia('(min-width: 900px)');

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
  if (status === 'lolos') return el('span', { kelas: 'agen-tanda agen-lolos' }, TEKS.lolos);
  if (status === 'ditolak') return el('span', { kelas: 'agen-tanda agen-ditolak' }, TEKS.ditolak);
  return null;
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
        l.tanpa_hasil.length > 0 ? el('li', { kelas: 'agen-kalimat meta' }, daftarTool(l.tanpa_hasil), `: ${TEKS.tanpaHasil}`) : null,
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
        l.tanpa_hasil.length > 0 ? el('li', { kelas: 'meta' }, daftarTool(l.tanpa_hasil), `: ${TEKS.tanpaHasil}`) : null,
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

/** Gambar ulang diagram menurut lebar layar. AI agent satu kotak di tengah; tiap garis agent ⇄ satu tool. */
function gambarDiagram() {
  if (k.kepala === null) return;
  const lebar = layarLebar.matches;
  const g = lebar ? k.kepala.diagram.lebar : k.kepala.diagram.tegak;
  const bidang = $('agen-bidang');
  bidang.dataset.tata = lebar ? 'lebar' : 'tegak';
  bidang.style.aspectRatio = `${g.bidang.lebar} / ${g.bidang.tinggi}`;
  const garis = kosongkan($('agen-garis'));
  garis.setAttribute('viewBox', `0 0 ${g.bidang.lebar} ${g.bidang.tinggi}`);
  const simpul = kosongkan($('agen-simpul'));
  pasangKotak($('agen-kotak'), g.agen);
  for (const [i, t] of k.kepala.tool.entries()) {
    const d = g.tool[i];
    if (d === undefined) continue;
    const grup = svg('g', { 'data-tool': i });
    grup.append(svg('line', d.garis), svg('polygon', { points: d.panah[0] }), svg('polygon', { points: d.panah[1] }));
    garis.append(grup);
    const li = el('li', { 'data-tool': i, title: t.keterangan ?? t.nama }, namaTool(t.nama), el('span', { kelas: 'agen-hitung', hidden: true }));
    pasangKotak(li, d.kotak);
    simpul.append(li);
  }
  nyalakan();
}

/** Nyalakan tool langkah terakhir (bila agent sedang memanggil) dan perbarui hitungan panggilan. */
function nyalakan() {
  const terakhir = k.tampil.at(-1);
  const nyala = fase() === 'panggil' && terakhir !== undefined ? terakhir.nyala : [];
  for (const e of document.querySelectorAll('#agen-simpul > li, #agen-garis > g')) {
    const i = Number(e.dataset.tool);
    e.classList.toggle('agen-nyala', nyala.includes(i));
    if (e.tagName === 'LI') {
      const n = k.hitung[i] ?? 0;
      e.classList.toggle('agen-pernah', n > 0);
      if (nyala.includes(i)) e.setAttribute('aria-current', 'step');
      else e.removeAttribute('aria-current');
      const hitung = e.querySelector('.agen-hitung');
      hitung.hidden = n === 0;
      hitung.textContent = TEKS.dipanggil(n);
      hitung.setAttribute('aria-label', TEKS.dipanggilLabel(n));
    }
  }
  const kotak = $('agen-kotak');
  kotak.dataset.fase = fase();
  $('agen-kotak-keadaan').textContent =
    fase() === 'pikir' ? TEKS.agenPikir : fase() === 'panggil' ? TEKS.agenPanggil : fase() === 'usai' ? TEKS.agenUsai : TEKS.agenDiam;
}

/** Panel di samping diagram: langkah yang sedang dilihat. */
function gambarKini() {
  const wadah = kosongkan($('diagram-kini'));
  const l = k.tampil.at(-1);
  if (l === undefined) {
    wadah.append(el('p', { kelas: 'meta' }, TEKS.belumAdaLangkah));
    return;
  }
  const namaTahap = k.kepala.tahap.find((x) => x.id === l.tahap)?.nama ?? l.tahap;
  wadah.append(
    el('p', { kelas: 'meta' }, `${TEKS.langkah(l.no, k.kepala.jumlah_langkah)} · ${namaTahap}`),
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
    el('p', { kelas: 'meta' }, angkaSingkat(l)),
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
  if (tuntas) bagian.push(k.simulasi === null ? TEKS.agenSelesaiTanpaSimulasi : TEKS.agenSelesai);
  else if (jeda) bagian.push(TEKS.agenDijeda);
  else if (fase() === 'pikir') bagian.push(TEKS.agenBerpikir);
  else if (p !== null && p.antrean.length === 0 && !p.aliranSelesai) bagian.push(TEKS.agenMenunggu);
  $('agen-kini').textContent = bagian.join(' — ');
  if (k.kepala !== null) {
    const biaya = k.tampil.reduce((j, x) => j + biayaLangkah(x), 0);
    $('agen-biaya').textContent = TEKS.biayaBudget(dolar(biaya), dolar(k.kepala.budget_usd));
    const persen = k.kepala.budget_usd > 0 ? Math.min(100, (biaya / k.kepala.budget_usd) * 100) : 0;
    $('agen-ukur-isi').style.width = `${persen.toFixed(1)}%`;
  }
  const jedaTombol = $('tombol-jeda');
  jedaTombol.textContent = jeda ? TEKS.tombolLanjut : TEKS.tombolJeda;
  jedaTombol.setAttribute('aria-pressed', jeda ? 'true' : 'false');
  jedaTombol.hidden = tuntas;
  $('tombol-lompat').hidden = tuntas;
  $('tombol-ulang').hidden = !tuntas;
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
  nyalakan();
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
      nyalakan();
      if (k.simulasi !== null) gambarSimulasi(k.simulasi);
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
  $('keterangan-rinci').textContent = TEKS.keteranganRinci;
  const lama = kepala.tool.filter((t) => t.nama_lama.length > 0).map((t) => TEKS.namaLama(t.nama, t.nama_lama.join(', ')));
  $('keterangan-diagram').textContent = [TEKS.keteranganDiagram, ...lama].join(' ');
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
  else if (p.jenis === 'selesai') k.pemutar?.selesaiAliran();
}

function setel() {
  k.pemutar?.matikan();
  k.batal?.abort();
  Object.assign(k, { kepala: null, tampil: [], simulasi: null, hitung: [], batal: null, pemutar: null });
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

async function putar(kode) {
  setel();
  k.kode = kode;
  k.pemutar = pemutarBaru();
  const galat = $('galat-kode');
  galat.hidden = true;
  const batal = new AbortController();
  k.batal = batal;
  let jawab;
  try {
    jawab = await fetch(`/api/agen/aliran?kode=${encodeURIComponent(kode)}`, { headers: { Accept: 'text/event-stream' }, signal: batal.signal });
  } catch {
    if (batal.signal.aborted) return;
    galat.textContent = TEKS.galatSambung;
    galat.hidden = false;
    return;
  }
  if (!jawab.ok || jawab.body === null) {
    let pesan = `HTTP ${jawab.status}`;
    try {
      pesan = (await jawab.json()).galat ?? pesan;
    } catch { /* bukan JSON */ }
    galat.textContent = pesan;
    galat.hidden = false;
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
    if (k.pemutar?.aliranSelesai !== true) {
      galat.textContent = TEKS.galatSambung;
      galat.hidden = false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* pasang                                                              */
/* ------------------------------------------------------------------ */

function gantiTampilan(nama) {
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
  });
  $('form-agen').addEventListener('submit', (e) => {
    e.preventDefault();
    const kode = kodeDariKetikan(masukan.value);
    if (kode === null) {
      masukan.focus();
      return;
    }
    void putar(kode);
  });
  gantiTampilan('ringkas');
  try {
    const status = await (await fetch('/api/status')).json();
    if (status.mode === 'replay-agent') {
      $('mode').textContent = TEKS.modeReplay;
      const kode = status.agen?.kode_rekaman?.[0];
      if (kode) {
        $('petunjuk-kode').textContent = TEKS.petunjukKode(kode);
        masukan.placeholder = `mis. ${kode}`;
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
