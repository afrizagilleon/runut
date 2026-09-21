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
      temuan.push({
        berkas,
        baris,
        kode: 'BAYANGAN',
        pesan: `\`${selektor}\` memakai box-shadow. Kertas di patokan tidak melayang.`,
      });
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
