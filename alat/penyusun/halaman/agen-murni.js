// Fungsi murni tampilan AI agent (dipakai agen.js, dites Vitest lewat
// agen-halaman.test.ts): pengurai SSE, jeda antar-langkah, format angka, dan
// SEMUA teks tetap halaman (`TEKS`) supaya bisa diperiksa terhadap daftar kata
// yang tidak boleh tampil.

/** Teks tetap halaman tampilan agent. Kalimat tentang tiap langkah datang dari server. */
export const TEKS = {
  petunjukKode: (kode) => `Rekaman yang ada: ${kode}.`,
  memuat: 'Membaca rekaman…',
  tombolPutar: 'Putar ulang rekaman',
  // --- dua pilihan (M-PN1): menjalankan agent sungguhan, atau memutar ulang rekaman ---
  modeDua:
    'Dua pilihan di bawah. "Jalankan Runut Agent" memanggil model sungguhan dan berbayar, hanya sesudah kamu menyetujui budget-nya. "Putar ulang rekaman" hanya membaca berkas rekaman: tanpa panggilan model, tanpa API key, tanpa biaya.',
  pitaTiruan:
    'PELARI TIRUAN — bukan agent sungguhan. Di sesi ini "Jalankan Runut Agent" hanya menyalin sebuah rekaman lama baris demi baris dengan jeda: tidak ada model yang dipanggil dan tidak ada biaya.',
  tombolJalankan: 'Jalankan Runut Agent',
  tombolSetuju: 'Setuju, jalankan dengan budget ini',
  tombolBatal: 'Batal',
  tombolHentikan: 'Hentikan agent',
  nonaktif: (alasan) => `Belum bisa dijalankan di komputer ini. ${alasan}`,
  pernyataanBiaya: (maks, lebih) =>
    `Menekan tombol setuju memanggil model berbayar lewat OpenRouter dengan kuncimu, untuk kode saham di atas. Agent berhenti sendiri saat budget tidak cukup untuk satu langkah lagi; panggilan yang sudah terkirim boleh melewati budget paling banyak ${lebih}. Dari halaman ini budget paling banyak ${maks}.`,
  pernyataanTiruan: 'Pelari tiruan: tombol setuju tidak memanggil model dan tidak memakai biaya. Budget hanya ditampilkan.',
  labelBudget: 'Budget (dolar AS)',
  budgetTakSah: (maks) => `Budget harus angka di atas 0 dan paling banyak ${maks}.`,
  kodeDulu: 'Ketik kode saham empat huruf dulu.',
  teksKredit: (kode) => `Data ${kode} belum ada di cache lokal. Izinkan agent mengambilnya dari Sectors API (memakai kredit Sectors).`,
  kreditTanpaKunci: (kode) => `Data ${kode} belum ada di cache lokal, dan SECTORS_API_KEY belum diisi di berkas .env.`,
  kreditDulu: 'Centang izin memakai kredit Sectors dulu, atau pilih kode saham yang datanya sudah ada di cache lokal.',
  judulKerja: 'Agent bekerja',
  judulPutar: 'Putar ulang rekaman',
  asalLangsung: (folder) => `Langsung: langkah di bawah ditulis pelari agent selagi halaman ini terbuka, ke ${folder}jejak-agen.jsonl. Tiap langkah muncul begitu selesai ditulis.`,
  asalPutar: 'Putar ulang rekaman: langkah di bawah dibaca dari berkas rekaman di repo. Tidak ada model yang dipanggil.',
  biayaBudgetLangsung: (biaya, budget) => `Biaya ${biaya} dari budget ${budget}`,
  keteranganBudgetLangsung: (budget) => `Budget ${budget} adalah budget yang kamu setujui untuk kerja agent ini.`,
  agenBerhenti: 'Agent berhenti.',
  agenDihentikan: 'Dihentikan.',
  akhirTerakit: 'Agent selesai. Tiga soal terakit menjadi satu simulasi.',
  akhirLanjut: 'Langkah berikutnya (menaikkan kesulitan dan melengkapi simulasi) dijalankan dari terminal: README, bagian Menjalankan (c).',
  akhirBudget: 'Agent berhenti karena budget tidak cukup untuk satu langkah lagi. Rekamannya tersimpan; jalankan lagi dengan budget lebih besar, atau lanjutkan dari terminal.',
  akhirBerhenti: 'Agent berhenti sebelum tiga soal terakit. Sebabnya tercatat di hasil.json di folder keluaran dan di terminal.',
  akhirDihentikan: 'Dihentikan dari halaman ini. Pelari sudah dimatikan; panggilan yang terkirim sebelum itu tetap tercatat biayanya.',
  akhirTanpaHasil: 'Pelari berhenti sebelum menulis hasil. Sebabnya ada di terminal tempat npm run penyusun dinyalakan.',
  akhirFolder: (folder) => `Folder keluaran: ${folder}`,
  akhirBiaya: (biaya) => `Biaya tercatat: ${biaya}.`,
  akhirTiruan: 'Ini keluaran PELARI TIRUAN, bukan kerja agent sungguhan.',
  galatSambungLangsung: 'Sambungan ke server terputus. Agent tetap bekerja di server; muat ulang halaman untuk melihat langkahnya lagi.',
  tombolJeda: 'Jeda',
  tombolLanjut: 'Lanjut',
  tombolLompat: 'Lompat ke akhir',
  tombolUlang: 'Putar dari awal',
  kecepatan: 'Kecepatan',
  agenBerpikir: 'Agent memilih tool berikutnya…',
  agenMenunggu: 'Menunggu langkah agent berikutnya…',
  agenDijeda: 'Dijeda.',
  agenSelesai: 'Agent selesai. Simulasinya jadi.',
  agenSelesaiTanpaSimulasi: 'Agent selesai.',
  agenDiam: 'siap',
  agenPikir: 'memilih tool berikutnya',
  agenKirim: 'mengirim tool call',
  agenTunggu: 'menunggu tool result',
  agenBaca: 'membaca tool result',
  agenUsai: 'selesai',
  toolCall: 'tool call',
  namaAgen: 'AI agent',
  langkah: (no, jumlah) => (jumlah === null ? `Langkah ${no}` : `Langkah ${no} dari ${jumlah}`),
  belumAdaLangkah: 'Belum ada langkah.',
  biayaBudget: (biaya, budget, rekaman) => `Biaya ${biaya} dari budget ${budget} untuk ${rekaman} rekaman`,
  memanggil: 'Agent memanggil',
  ucapan: 'Ucapan agent:',
  toolResult: 'tool result',
  rekamanAsli: 'rekaman asli',
  ringkasanRekaman: 'Ringkasan di rekaman',
  isiRekaman: 'Isi tool result',
  lolos: 'lolos',
  perbaiki: 'diminta perbaiki',
  tidakDipakai: 'tidak dipakai',
  draf: (n) => `${n} draf`,
  dipanggil: (n) => `${n}×`,
  dipanggilLabel: (n) => `dipanggil ${n} kali`,
  kosong: '(kosong)',
  teksKosong: '(teks kosong)',
  daftarKosong: '(daftar kosong)',
  pokokDiagram: (jumlah) => `Satu AI agent, ${jumlah} tool. Agent sendiri yang memilih tool mana yang dipanggil, kapan, dan berapa kali.`,
  legendaCall: 'dari agent ke tool',
  legendaResult: 'dari tool ke agent',
  legendaHitung: 'jumlah panggilan',
  contohHitung: '3×',
  keteranganRingkas: 'Di tiap langkah: "waktu model" adalah lama model menjawab di langkah itu; "biaya" adalah biaya model dan penguji di langkah itu.',
  keteranganWaktu: '"Waktu model" di kepala tiap tahap adalah jumlah lama model menjawab, bukan lama seluruh tahap.',
  keteranganBudget: (budget, rekaman) => `Budget ${budget} adalah jumlah budget ${rekaman} rekaman kerja agent yang diputar di sini.`,
  namaLama: (kini, lama) => `Di rekaman awal, ${kini} masih bernama ${lama}.`,
  keteranganRinci:
    'Rekaman mencatat tool yang dipilih agent dan tool result-nya. Teks berpikir model tidak ditampilkan; yang tampil hanya jumlah tokennya. Kode saham dan alamat berkas disamarkan.',
  judulSimulasi: 'Simulasi yang jadi',
  soalKe: (n) => `Soal ${n}`,
  kartuFakta: 'Kartu fakta',
  kartuPenentu: 'kartu penentu jawaban',
  jawabanBenar: 'jawaban benar',
  penjelasan: 'Penjelasan',
  istilah: 'Istilah',
  sesudahnya: 'Apa yang terjadi sesudahnya',
  sumber: 'Berkas rekaman yang dibaca',
  galatSambung: 'Sambungan ke server terputus. Muat ulang halaman untuk memutar lagi.',
  modeLain: 'Tampilan ini hanya ada bila pintu penyusun dijalankan tanpa --mesin-lama.',
};

/** Label status satu tool result (kata kerja cara kerjanya); `null` untuk tool yang hanya membaca bahan. */
export function labelStatus(status) {
  if (status === 'lolos') return TEKS.lolos;
  if (status === 'perbaiki') return TEKS.perbaiki;
  if (status === 'tidak-dipakai') return TEKS.tidakDipakai;
  return null;
}

/** Lama tool call terbang ke tool, dan lama tool result terbang kembali, pada kecepatan 1×. */
export const LAMA_TERBANG_MS = 380;

/**
 * Apa yang sedang dikerjakan agent di diagram, dari fase pemutar dan gerak
 * tool call / tool result: 'diam' | 'pikir' | 'kirim' | 'tunggu' | 'baca' | 'usai'.
 */
export function keadaanAgen(fasePemutar, gerak, adaLangkah) {
  if (fasePemutar === 'usai') return 'usai';
  if (!adaLangkah) return fasePemutar === 'pikir' ? 'pikir' : 'diam';
  if (gerak === 'pergi') return 'kirim';
  if (gerak === 'kembali') return 'tunggu';
  if (fasePemutar === 'panggil') return 'baca';
  return fasePemutar === 'pikir' ? 'pikir' : 'diam';
}

/** Status yang mendarat di agent sesudah sebuah langkah: satu cap per status, urut kemunculan. */
export function capLangkah(l) {
  const keluar = [];
  for (const r of l.ringkas) if (r.status !== null && !keluar.includes(r.status)) keluar.push(r.status);
  return keluar;
}

/** Indeks tool (di `kepala.tool`) yang tool result-nya tercatat di langkah ini: dari sana tool result kembali. */
export function toolBerhasil(l, tool) {
  const keluar = [];
  for (const h of l.hasil) {
    const i = tool.findIndex((t) => t.nama === h.alat || t.nama_lama.includes(h.alat));
    if (i >= 0 && !keluar.includes(i)) keluar.push(i);
  }
  return keluar;
}

export const KECEPATAN = [
  { nilai: 0.5, label: '0,5×' },
  { nilai: 1, label: '1×' },
  { nilai: 2, label: '2×' },
  { nilai: 4, label: '4×' },
];

/**
 * Jeda sebelum sebuah langkah muncul, pada kecepatan 1×: lama panggilan model
 * di rekaman dibagi 30, tidak kurang dari 0,9 detik (supaya satu baris sempat
 * terbaca) dan tidak lebih dari 3,2 detik.
 */
export const RUMUS_JEDA_AGEN = { PEMBAGI: 30, DASAR_MS: 700, MIN_MS: 900, BATAS_MS: 3200 };

export function jedaLangkah(lamaMs, kecepatan = 1) {
  const r = RUMUS_JEDA_AGEN;
  const dasar = Math.min(r.BATAS_MS, Math.max(r.MIN_MS, r.DASAR_MS + (Number.isFinite(lamaMs) ? lamaMs : 0) / r.PEMBAGI));
  return Math.round(dasar / (kecepatan > 0 ? kecepatan : 1));
}

/**
 * Pengurai SSE bertahap: `sisa` = teks yang belum membentuk satu peristiwa
 * utuh. Mengembalikan peristiwa yang sudah utuh (`jenis` dari baris `event:`,
 * `data` sudah diurai dari JSON) dan sisa barunya. Baris komentar dan `retry:`
 * dilewati.
 */
export function uraiSse(sisa, potongan) {
  const teks = (sisa + potongan).replace(/\r\n/g, '\n');
  const blok = teks.split('\n\n');
  const baru = blok.pop() ?? '';
  const peristiwa = [];
  for (const b of blok) {
    let jenis = null;
    const data = [];
    for (const baris of b.split('\n')) {
      if (baris.startsWith('event:')) jenis = baris.slice(6).trim();
      else if (baris.startsWith('data:')) data.push(baris.slice(5).replace(/^ /, ''));
    }
    if (jenis === null) continue;
    let isi = null;
    try {
      isi = data.length === 0 ? null : JSON.parse(data.join('\n'));
    } catch {
      isi = null;
    }
    peristiwa.push({ jenis, data: isi });
  }
  return { peristiwa, sisa: baru };
}

/** "1.234" — pemisah ribuan Indonesia. */
export function angkaId(nilai) {
  return String(Math.trunc(nilai)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "US$1,84" */
export function dolar(nilai) {
  return `US$${nilai.toFixed(2).replace('.', ',')}`;
}

/** "US$0,0054" — biaya satu langkah (dua desimal menjadikannya nol). */
export function dolarRinci(nilai) {
  return `US$${nilai.toFixed(4).replace('.', ',')}`;
}

/** "4,5 detik" di bawah satu menit; "2 menit 7 detik" di atasnya. */
export function lama(ms) {
  const detik = ms / 1000;
  if (detik < 60) return `${detik.toFixed(1).replace('.', ',')} detik`;
  const bulat = Math.round(detik);
  const sisa = bulat % 60;
  return sisa === 0 ? `${Math.floor(bulat / 60)} menit` : `${Math.floor(bulat / 60)} menit ${sisa} detik`;
}

/** Biaya satu langkah: model + penguji. */
export function biayaLangkah(l) {
  return l.biaya_model_usd + l.biaya_penguji_usd;
}

/** Jumlah langkah, lama model, dan biaya atas sekumpulan langkah. */
export function jumlahkan(langkah) {
  let lamaMs = 0;
  let biaya = 0;
  for (const l of langkah) {
    lamaMs += l.lama_ms;
    biaya += biayaLangkah(l);
  }
  return { jumlah: langkah.length, lama_ms: lamaMs, biaya_usd: biaya };
}

/** "3 langkah · waktu model 8,8 detik · biaya US$0,06" */
export function ringkasTahap(langkah) {
  const j = jumlahkan(langkah);
  return `${j.jumlah} langkah · waktu model ${lama(j.lama_ms)} · biaya ${dolar(j.biaya_usd)}`;
}

/** Butir angka satu langkah untuk tampilan Rinci. */
export function angkaLangkah(l) {
  return [
    `waktu model ${lama(l.lama_ms)}`,
    `biaya model ${dolarRinci(l.biaya_model_usd)}`,
    ...(l.biaya_penguji_usd > 0 ? [`biaya penguji ${dolarRinci(l.biaya_penguji_usd)}`] : []),
    `token berpikir ${angkaId(l.token.berpikir)}`,
    `token masuk ${angkaId(l.token.masuk)}`,
    `token keluar ${angkaId(l.token.keluar)}`,
  ];
}

/** Angka singkat satu langkah untuk tampilan Ringkas: "waktu model 4,5 detik · biaya US$0,0356". */
export function angkaSingkat(l) {
  return `waktu model ${lama(l.lama_ms)} · biaya ${dolarRinci(biayaLangkah(l))}`;
}

/** Nama tool dipotong di garis bawah (boleh patah di sana supaya muat di layar sempit). */
export function potongNama(nama) {
  return nama.split('_').map((p, i, semua) => (i < semua.length - 1 ? `${p}_` : p));
}

/** Kode saham dari ketikan: empat huruf, huruf besar; `null` bila bukan. */
export function kodeDariKetikan(teks) {
  const k = String(teks ?? '').trim().toUpperCase();
  return /^[A-Z]{4}$/.test(k) ? k : null;
}

/**
 * Budget dari ketikan: angka di atas 0 dan paling banyak `maks` (koma atau
 * titik desimal); `null` bila bukan. Server memeriksa lagi batas yang sama.
 */
export function budgetDariKetikan(teks, maks) {
  const t = String(teks ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= maks ? n : null;
}

/** "15%" dari 0,15. */
export function persen(nilai) {
  return `${Math.round(nilai * 100)}%`;
}

/** Kalimat keadaan akhir kerja agent yang dijalankan dari halaman (`akhir.hasil` dari server). */
export function kalimatAkhir(hasil) {
  if (hasil === 'terakit') return TEKS.akhirTerakit;
  if (hasil === 'budget') return TEKS.akhirBudget;
  if (hasil === 'dihentikan') return TEKS.akhirDihentikan;
  if (hasil === 'tanpa-hasil') return TEKS.akhirTanpaHasil;
  return TEKS.akhirBerhenti;
}

/** "15 Juni 2026" dari "2026-06-15". */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function tanggalPanjang(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (m === null) return String(iso ?? '');
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** Bagian akhir jeda (55%) = agent berpikir; sebelumnya tool langkah terakhir masih menyala. */
export const BAGIAN_PIKIR = 0.55;
/** Jeda sesudah langkah terakhir, sebelum simulasi yang jadi ditampilkan (pada 1×). */
export const JEDA_AKHIR_MS = 1200;

/**
 * Pemutar langkah: menerima langkah kapan saja (`terima`), menampilkannya SATU
 * PER SATU dengan jeda `jedaLangkah`, dan bisa dijeda, dilanjutkan, dilompati
 * ke akhir, serta diubah kecepatannya di tengah jeda. Tidak menyentuh DOM:
 * halaman memberi `tampilkan(langkah, gulir)`, `fase(nama)`, `tuntas()`,
 * `berubah()`. Jam bisa diganti (tes memakai jam palsu Vitest).
 *
 * Fase: 'diam' → ('pikir' → 'panggil')* → 'usai'.
 */
export class Pemutar {
  constructor(pakai, jam = {}) {
    this.pakai = pakai;
    this.pasang = jam.pasang ?? ((f, ms) => setTimeout(f, ms));
    this.lepas = jam.lepas ?? ((t) => clearTimeout(t));
    this.sekarang = jam.sekarang ?? (() => performance.now());
    this.antrean = [];
    this.jumlahTampil = 0;
    this.aliranSelesai = false;
    this.tuntas = false;
    this.jeda = false;
    this.kecepatan = 1;
    this.fase = 'diam';
    this.timer = null;
    this.timerPikir = null;
    this.mulaiTimer = 0;
    this.lamaTimer = 0;
    this.sisaMs = null;
    this.mati = false;
  }

  /** Langkah baru dari server. */
  terima(langkah) {
    this.antrean.push(langkah);
    this.jadwalkan();
  }

  /** Server tidak akan mengirim langkah lagi. */
  selesaiAliran() {
    this.aliranSelesai = true;
    this.jadwalkan();
  }

  aturFase(fase) {
    this.fase = fase;
    this.pakai.fase?.(fase);
  }

  hentikanTimer() {
    if (this.timer !== null) this.lepas(this.timer);
    if (this.timerPikir !== null) this.lepas(this.timerPikir);
    this.timer = null;
    this.timerPikir = null;
  }

  pasangTimer(sisa, total, sesudah, pikir) {
    this.mulaiTimer = this.sekarang();
    this.lamaTimer = sisa;
    const sisaPikir = total * BAGIAN_PIKIR;
    if (!pikir) this.aturFase('panggil');
    else if (this.jumlahTampil === 0 || sisa <= sisaPikir) this.aturFase('pikir');
    else {
      this.timerPikir = this.pasang(() => {
        this.timerPikir = null;
        this.aturFase('pikir');
      }, sisa - sisaPikir);
    }
    this.timer = this.pasang(() => {
      this.hentikanTimer();
      this.sisaMs = null;
      sesudah();
    }, sisa);
  }

  munculkan(gulir) {
    const l = this.antrean.shift();
    if (l === undefined) return;
    this.jumlahTampil += 1;
    this.fase = 'panggil';
    this.pakai.tampilkan(l, gulir);
  }

  tuntaskan() {
    this.hentikanTimer();
    this.tuntas = true;
    this.jeda = false;
    this.fase = 'usai';
    this.pakai.tuntas?.();
  }

  /** Jadwalkan langkah berikutnya, bila ada dan tidak sedang dijeda. */
  jadwalkan() {
    if (this.mati || this.timer !== null || this.jeda || this.tuntas) return;
    const berikut = this.antrean[0];
    if (berikut === undefined) {
      if (!this.aliranSelesai) {
        this.pakai.berubah?.();
        return;
      }
      const total = Math.round(JEDA_AKHIR_MS / this.kecepatan);
      this.pasangTimer(this.sisaMs ?? total, total, () => this.tuntaskan(), false);
      return;
    }
    const total = jedaLangkah(berikut.lama_ms, this.kecepatan);
    this.pasangTimer(this.sisaMs ?? total, total, () => {
      this.munculkan(true);
      this.jadwalkan();
    }, true);
  }

  jedaAtauLanjut() {
    if (this.tuntas) return;
    if (!this.jeda) {
      if (this.timer !== null) this.sisaMs = Math.max(0, this.lamaTimer - (this.sekarang() - this.mulaiTimer));
      this.hentikanTimer();
      this.jeda = true;
    } else {
      this.jeda = false;
      this.jadwalkan();
    }
    this.pakai.berubah?.();
  }

  /** Tampilkan semua langkah yang sudah diterima sekarang juga. */
  lompat() {
    if (this.tuntas) return;
    this.hentikanTimer();
    this.sisaMs = null;
    this.jeda = false;
    while (this.antrean.length > 0) this.munculkan(false);
    if (this.aliranSelesai) this.tuntaskan();
    else this.jadwalkan();
    this.pakai.berubah?.();
  }

  gantiKecepatan(baru) {
    const lama = this.kecepatan;
    if (!(baru > 0) || baru === lama) return;
    this.kecepatan = baru;
    if (this.timer === null) {
      if (this.sisaMs !== null) this.sisaMs = (this.sisaMs * lama) / baru;
      return;
    }
    const sisa = Math.max(0, this.lamaTimer - (this.sekarang() - this.mulaiTimer));
    this.hentikanTimer();
    this.sisaMs = (sisa * lama) / baru;
    this.jadwalkan();
  }

  /** Hentikan selamanya (pemutaran diganti yang baru). */
  matikan() {
    this.mati = true;
    this.hentikanTimer();
  }
}
