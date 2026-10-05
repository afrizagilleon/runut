/**
 * `npm run periksa:desain` — INV-11 dan INV-12 sebagai gate yang bisa dijalankan
 * (RQ-08).
 *
 * Kenapa ini ada: risiko utama M3.2 bukan layar yang salah, melainkan layar yang
 * **mirip**. Produk bisa menyalin patokan di layar soal lalu diam-diam membawa
 * kembali gaya lama di layar yang tidak ada di contoh — layar sesudah-dikunci,
 * pembukaan, akhir. Karena itu skrip ini berjalan atas **seluruh** CSS, bukan
 * satu layar, dan atas seluruh markup, bukan satu komponen.
 *
 * Ia sengaja tidak memakai parser CSS pihak ketiga: nol dependensi baru (INV
 * proyek), dan CSS di repo ini ditulis tangan dengan satu deklarasi per baris.
 *
 * Semua aturannya murni dan dites; yang dikerjakan `utama()` hanyalah membaca
 * berkas dan mencetak.
 */
import { readFileSync } from 'node:fs';

/** Skala ukuran huruf yang sah (`docs/desain.md` v3). */
export const SKALA: readonly number[] = [12, 14, 16, 17, 20, 28, 72];

/**
 * Satu-satunya ukuran di luar skala, dan hanya untuk satu selektor.
 *
 * `docs/desain.md` menulis skala tanpa 13, tetapi `docs/contoh/layar-soal.html`
 * menulis `.opsi-huruf { font: 500 13px/1 }`. D-1 memutuskan: kalau kata-kata
 * dan contoh berbeda, **contoh yang menang** — layar itu sudah disetujui pemilik
 * dengan matanya. Pengecualiannya dieja di sini supaya 13 px di selektor
 * **lain** tetap merah.
 */
export const PENGECUALIAN_HURUF: ReadonlyArray<[string, number]> = [['.opsi-huruf', 13]];

/** Radius yang sah (D-1): lembar 2, opsi dan tombol 3, pesan 4/16/16/16, lingkaran 50%. */
export const RADIUS: readonly string[] = [
  '0',
  '2px',
  '3px',
  '50%',
  '0 0 2px 2px',
  '3px 3px 0 0',
  '4px 16px 16px 16px',
];

/**
 * Dua pemakaian huruf kapital yang diizinkan INV-11: keping kalender dan cap
 * umpan balik ("cap karet memang berhuruf kapital", `docs/desain.md`).
 */
export const KAPITAL_DIIZINKAN: readonly string[] = ['.kalender-keping', '.cap'];
export const MAKS_KAPITAL = 2;

/** Kelas tombol yang dianggap **tindakan utama** oleh INV-12. */
export const KELAS_TOMBOL_UTAMA: readonly string[] = ['tombol-utama'];

/* ------------------------------------------------------------------ */
/* Huruf mesin tik (D-B3, amandemen A-2)                               */
/* ------------------------------------------------------------------ */

/**
 * `docs/desain.md` baris 36: *"mesin tik hanya untuk keping kalender dan
 * rincian teknis."*
 *
 * Aturan itu sudah ada sejak v3 dan tetap dilanggar diam-diam, karena tidak ada
 * yang memeriksanya: blok "Kartu yang menentukan" memakai huruf mesin tik untuk
 * judul dan kepala lembarnya, dan baru ketahuan ketika teman pemilik mengirim
 * tangkapan layar karena alasan **lain** (A-2). Itu persis "risiko utama" M3.2 —
 * gaya lama terbawa ke layar yang tidak ada di contoh.
 *
 * Daftar di bawah adalah **daftar tertutup**: pemakaian baru harus masuk ke sini
 * lebih dulu, dengan alasannya, dan itulah gunanya. Ia terbagi dua, dan
 * pembagiannya jujur — sebagian memang disahkan desain atau patokan, sebagian
 * warisan yang belum diputuskan rupanya.
 */
export interface IzinMesin {
  /** Selektor yang diizinkan, dicocokkan sebagai kelas utuh. */
  selektor: string;
  /** Kenapa ia sah, atau kenapa ia masih di sini. */
  alasan: string;
  /** `true` = disahkan `docs/desain.md`/patokan; `false` = warisan, menunggu putusan. */
  disahkan: boolean;
}

/*
 * M3.10 D-3 (kritik K-5) MENCABUT tiga izin: `.keping-tanggal` (tanggal garis
 * waktu, kini peran meta — patokan :44 yang dirujuknya adalah keping KALENDER,
 * bukan tanggal garis waktu), `.bacaan h3`, dan `.jejak-rinci > summary`
 * (keduanya warisan; kini huruf baca). Menulis mesin tik di sana lagi merah.
 * M3.10 D-6 (kritik K-8) mencabut `.jangkar` (jangkar skala layar akhir, kini
 * peran meta).
 */
export const MESIN_DIIZINKAN: readonly IzinMesin[] = [
  {
    selektor: '.kalender-keping',
    alasan:
      'keping kalender — docs/desain.md baris 34 ("keping 12 px mesin tik") dan ' +
      'baris 36; patokan docs/contoh/layar-soal.html:44',
    disahkan: true,
  },
  {
    selektor: '.kalender-pita',
    alasan:
      'bagian benda kalender yang sama (pita bulan pada halaman kalender); ' +
      'docs/desain.md baris 34 menyebut kalender sebagai satu pemakaian khusus',
    disahkan: true,
  },
  {
    selektor: '.kalender-hari',
    alasan: 'bagian benda kalender yang sama (nama hari pada halaman kalender)',
    disahkan: true,
  },
  {
    selektor: '.rincian dt',
    alasan: 'rincian teknis — docs/desain.md baris 36, disebut namanya',
    disahkan: true,
  },
  {
    selektor: '.cap',
    alasan:
      'WARISAN, belum diputuskan. docs/desain.md menyebut cap sebagai satu dari dua ' +
      'tulisan kapital, tetapi tidak menyebut hurufnya. Mengubahnya mengubah rupa, ' +
      'jadi ia dilaporkan, bukan ditebak (A-2, D-B3)',
    disahkan: false,
  },
];

/* ------------------------------------------------------------------ */
/* Bayangan (M3.7)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Satu-satunya `box-shadow` yang sah, dengan nilainya dieja.
 *
 * Aturannya tidak berubah — "kertas di patokan tidak melayang" tetap berlaku
 * untuk setiap bahan lain di layar. Yang dikecualikan adalah satu benda yang
 * memang melayang menurut patokan yang disetujui pemilik dengan matanya:
 * salinan balon chat di `docs/contoh/layar-soal-v3d.html:118`, yang berdiri di
 * atas isi halaman dan butuh satu garis untuk mengatakannya.
 *
 * **Nilainya ikut dieja**, bukan hanya selektornya. Pengecualian yang hanya
 * menyebut selektor akan membuka pintu untuk bayangan kabur apa pun di benda
 * yang sama — dan yang dilarang desain adalah kaburnya, bukan namanya:
 * `0 2px 0` tanpa radius kabur adalah garis tegas, bukan kertas yang terangkat.
 */
export interface IzinBayangan {
  selektor: string;
  nilai: string;
  alasan: string;
}

export const BAYANGAN_DIIZINKAN: readonly IzinBayangan[] = [
  {
    selektor: '.melayang-balon',
    nilai: '0 2px 0 var(--garis)',
    alasan:
      'salinan balon chat yang melayang di bawah keping (M3.7 D-1); patokan ' +
      'docs/contoh/layar-soal-v3d.html:118 menulisnya persis begini. Tanpa kabur: ' +
      'satu garis tegas 2 px, bukan kertas yang terangkat',
  },
];

/**
 * Nilai `font-family`/`font` yang membawa huruf mesin tik.
 *
 * Bukan hanya `var(--mesin)`: tumpukan mesin tik apa pun ditangkap, supaya
 * menuliskan `ui-monospace, monospace` langsung — atau lewat variabel bernama
 * lain — tidak menjadi jalan memutar.
 */
const POLA_MESIN = /--mesin|\bmono(space)?\b/i;

export interface Temuan {
  berkas: string;
  baris: number;
  kode: string;
  pesan: string;
}

/** Buang komentar `/* … *​/` tanpa menggeser nomor baris. */
export function tanpaKomentar(isi: string): string {
  return isi.replace(/\/\*[\s\S]*?\*\//g, (cocok) => cocok.replace(/[^\n]/g, ' '));
}

export interface Deklarasi {
  baris: number;
  /** Selektor terdalam yang bukan at-rule; `''` di luar blok mana pun. */
  selektor: string;
  properti: string;
  nilai: string;
}

/**
 * Pecah CSS menjadi daftar deklarasi beserta selektornya.
 *
 * Bukan parser CSS lengkap, dan tidak berpura-pura: ia menangani blok bersarang
 * (`@media`, `@keyframes`) dan satu deklarasi per baris, yang persis bentuk
 * `web/src/gaya.css`. Kalau suatu hari CSS-nya ditulis dengan gaya lain, yang
 * terjadi adalah temuan palsu — kegagalan yang terlihat, bukan yang senyap.
 */
export function pecahDeklarasi(isi: string): Deklarasi[] {
  const keluar: Deklarasi[] = [];
  const tumpukan: string[] = [];
  let calon = '';

  for (const [nomor, baris] of tanpaKomentar(isi).split('\n').entries()) {
    // Potongan di dalam blok: deklarasi, atau serpihan selektor yang belum
    // bertemu '{' (selektor berbaris banyak). Yang tidak berbentuk
    // `properti: nilai` dikembalikan ke `calon`.
    const ambil = (teks: string): void => {
      for (const potong of teks.split(';')) {
        if (potong.trim() === '') continue;
        const cocok = /^\s*([-a-zA-Z]+)\s*:\s*(.+)$/s.exec(potong);
        if (cocok === null) {
          calon += `${potong} `;
          continue;
        }
        const dalam = [...tumpukan].reverse().find((s) => !s.startsWith('@')) ?? '';
        keluar.push({
          baris: nomor + 1,
          selektor: dalam,
          properti: cocok[1] ?? '',
          nilai: (cocok[2] ?? '').trim().replace(/\s+/g, ' '),
        });
      }
    };

    let sisa = baris;
    while (sisa !== '') {
      const buka = sisa.indexOf('{');
      const tutup = sisa.indexOf('}');
      if (buka < 0 && tutup < 0) {
        ambil(sisa);
        break;
      }
      if (buka >= 0 && (tutup < 0 || buka < tutup)) {
        tumpukan.push((calon + sisa.slice(0, buka)).trim().replace(/\s+/g, ' '));
        calon = '';
        sisa = sisa.slice(buka + 1);
        continue;
      }
      // Blok ditutup: deklarasi terakhirnya boleh tanpa titik koma.
      ambil(sisa.slice(0, tutup));
      tumpukan.pop();
      calon = '';
      sisa = sisa.slice(tutup + 1);
    }
  }
  return keluar;
}

/**
 * Apakah selektor ini memakai kelas itu — sebagai kelas **utuh**.
 *
 * Bukan `includes()`: dengan pencocokan potongan, `.cap-tanda`, `.capsule`, dan
 * `.kalender-keping-besar` semuanya akan lolos sebagai "keping kalender dan cap
 * umpan balik", dan seluruh INV-11 bisa dilewati hanya dengan memberi nama
 * berawalan sama. Ditemukan waktu menyusun bukti merah G2.
 */
function cocokSelektor(selektor: string, kelas: string): boolean {
  const pola = new RegExp(`${kelas.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
  return selektor.split(',').some((bagian) => pola.test(bagian));
}

/** Seluruh aturan CSS INV-11, dijalankan atas satu berkas. */
export function periksaCss(berkas: string, isi: string): Temuan[] {
  const temuan: Temuan[] = [];
  const deklarasi = pecahDeklarasi(isi);

  let kapital = 0;
  for (const d of deklarasi) {
    const { properti, nilai, selektor, baris } = d;

    if (properti === 'font-family' || properti === 'font') {
      if (POLA_MESIN.test(nilai)) {
        const izin = MESIN_DIIZINKAN.find((i) => cocokSelektor(selektor, i.selektor));
        if (izin === undefined) {
          temuan.push({
            berkas,
            baris,
            kode: 'MESIN_TIK_DI_LUAR_DAFTAR',
            pesan:
              `\`${selektor}\` memakai huruf mesin tik. docs/desain.md: "mesin tik ` +
              `hanya untuk keping kalender dan rincian teknis". Kalau ini memang ` +
              `disahkan desain atau patokan, tambahkan ke MESIN_DIIZINKAN beserta ` +
              `rujukan barisnya.`,
          });
        }
      }
    }

    if (properti === 'text-transform' && nilai === 'uppercase') {
      kapital += 1;
      if (!KAPITAL_DIIZINKAN.some((k) => cocokSelektor(selektor, k))) {
        temuan.push({
          berkas,
          baris,
          kode: 'KAPITAL_BUKAN_KEPING_ATAU_CAP',
          pesan:
            `\`${selektor}\` memakai huruf kapital. INV-11 hanya mengizinkan ` +
            `${KAPITAL_DIIZINKAN.join(' dan ')}.`,
        });
      }
    }

    if (properti === 'font-size' || properti === 'font') {
      /*
       * Singkatan `font:` ikut diperiksa. Tanpa itu, seluruh aturan skala bisa
       * dilewati hanya dengan menulis `font: 500 15px/1` alih-alih `font-size`
       * — jalan memutar yang persis sebesar aturan yang dijaganya.
       */
      const ukuranTertulis =
        properti === 'font-size' ? [nilai] : [...nilai.matchAll(/(\d+(?:\.\d+)?px)/g)].map((m) => m[1] ?? '');
      for (const ukuran of ukuranTertulis) {
        const px = /^(\d+(?:\.\d+)?)px$/.exec(ukuran);
        const dikecualikan = PENGECUALIAN_HURUF.some(
          ([kelas, sah]) => cocokSelektor(selektor, kelas) && ukuran === `${String(sah)}px`,
        );
        if (dikecualikan) continue;
        if (px === null || !SKALA.includes(Number(px[1]))) {
          temuan.push({
            berkas,
            baris,
            kode: 'SKALA_HURUF',
            pesan:
              `\`${selektor}\` memakai ukuran huruf ${ukuran}, di luar skala ` +
              `${SKALA.join(' · ')} (docs/desain.md).`,
          });
        }
      }
    }

    if (properti === 'border-radius' && !RADIUS.includes(nilai)) {
      temuan.push({
        berkas,
        baris,
        kode: 'RADIUS',
        pesan: `\`${selektor}\` memakai border-radius ${nilai}, di luar daftar D-1 (${RADIUS.join(' · ')}).`,
      });
    }

    if (properti === 'box-shadow' && nilai !== 'none') {
      const izin = BAYANGAN_DIIZINKAN.find(
        (i) => cocokSelektor(selektor, i.selektor) && nilai === i.nilai,
      );
      if (izin === undefined) {
        temuan.push({
          berkas,
          baris,
          kode: 'BAYANGAN',
          pesan:
            `\`${selektor}\` memakai box-shadow ${nilai}. Kertas di patokan tidak ` +
            `melayang. Kalau ini memang disahkan patokan, tambahkan selektor DAN ` +
            `nilainya ke BAYANGAN_DIIZINKAN beserta rujukan barisnya.`,
        });
      }
    }

    if (properti === 'backdrop-filter') {
      temuan.push({
        berkas,
        baris,
        kode: 'KABUR',
        pesan: `\`${selektor}\` memakai backdrop-filter.`,
      });
    }

    if (/gradient\(/.test(nilai)) {
      temuan.push({
        berkas,
        baris,
        kode: 'GRADIEN',
        pesan: `\`${selektor}\` memakai gradient pada \`${properti}\`.`,
      });
    }
  }

  if (kapital > MAKS_KAPITAL) {
    temuan.push({
      berkas,
      baris: 0,
      kode: 'KAPITAL_TERLALU_BANYAK',
      pesan: `${String(kapital)} aturan text-transform: uppercase; INV-11 mengizinkan paling banyak ${String(MAKS_KAPITAL)}.`,
    });
  }

  return temuan;
}

/**
 * INV-12 di markup: tidak ada tombol tindakan utama yang **dirender mati**.
 *
 * Yang dicari adalah elemen `<button>` yang membawa kelas tombol utama dan
 * atribut `disabled` sekaligus. `<fieldset disabled>` tidak dihitung: ia
 * membekukan pilihan sesudah jawaban dikunci, dan itu memang yang diminta D-3 —
 * yang dilarang INV-12 adalah **tombol utama kelabu** yang tidak memberi tahu
 * pemain apa yang kurang.
 */
export function periksaMarkup(berkas: string, isi: string): Temuan[] {
  const temuan: Temuan[] = [];
  const bersih = tanpaKomentar(isi);
  for (const cocok of bersih.matchAll(/<button\b[\s\S]*?>/g)) {
    const tag = cocok[0];
    if (!KELAS_TOMBOL_UTAMA.some((kelas) => tag.includes(kelas))) continue;
    // `disabled={false}` tidak pernah mati; yang lain dianggap bisa mati.
    if (!/\bdisabled\b/.test(tag)) continue;
    if (/disabled=\{false\}/.test(tag)) continue;
    temuan.push({
      berkas,
      baris: bersih.slice(0, cocok.index).split('\n').length,
      kode: 'TOMBOL_MATI',
      pesan:
        'Tombol tindakan utama dirender dengan `disabled`. INV-12: tombol utama ' +
        'tidak pernah tampil mati — kalau belum ada yang bisa dilakukan, bilahnya menyingkir.',
    });
  }
  return temuan;
}

export function laporkan(temuan: Temuan[]): string {
  if (temuan.length === 0) return 'periksa:desain — bersih.\n';
  const baris = [`periksa:desain — ${String(temuan.length)} temuan:`, ''];
  for (const t of temuan) {
    const tempat = t.baris === 0 ? t.berkas : `${t.berkas}:${String(t.baris)}`;
    baris.push(`  [${t.kode}] ${tempat}`);
    baris.push(`      ${t.pesan}`);
  }
  baris.push('');
  return baris.join('\n');
}

export function utama(berkasCss: string[], berkasMarkup: string[]): number {
  const temuan: Temuan[] = [];
  for (const berkas of berkasCss) {
    temuan.push(...periksaCss(berkas, readFileSync(berkas, 'utf8')));
  }
  for (const berkas of berkasMarkup) {
    temuan.push(...periksaMarkup(berkas, readFileSync(berkas, 'utf8')));
  }
  process.stdout.write(laporkan(temuan));
  return temuan.length === 0 ? 0 : 1;
}

/** Berkas yang diperiksa kalau tidak disebutkan di baris perintah. */
export const CSS_BAWAAN = ['web/src/gaya.css'];
export const MARKUP_BAWAAN = [
  'web/src/Aplikasi.tsx',
  'web/src/KartuFakta.tsx',
  'web/src/Kalender.tsx',
  'web/src/Teks.tsx',
  'web/src/BatasGalat.tsx',
  'web/src/Dapur.tsx',
  'web/src/JejakAgen.tsx',
];

const dijalankanLangsung =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^[A-Za-z]:/, ''));

if (dijalankanLangsung) {
  const argumen = process.argv.slice(2);
  const css = argumen.filter((a) => a.endsWith('.css'));
  const markup = argumen.filter((a) => a.endsWith('.tsx'));
  process.exitCode = utama(
    css.length > 0 ? css : [...CSS_BAWAAN],
    markup.length > 0 ? markup : [...MARKUP_BAWAAN],
  );
}
