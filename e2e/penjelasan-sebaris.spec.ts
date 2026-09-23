import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-16 — penjelasan sebaris muncul di tempat yang diketuk (M3.6 D-1).
 *
 * Cacat yang ditemukan pemilik di ponselnya, 22 Sep 2026: di layar "Waktu
 * berjalan lagi" ia mengetuk "9 Oktober 2025" dan **tidak melihat apa-apa**.
 * Penjelasannya memang terbuka — tetapi di bawah *seluruh* paragraf, dan
 * paragraf itu empat kalimat panjangnya. Yang diketuk ada di baris pertama,
 * yang terbuka ada jauh di bawah lipatan. Temannya dari FEB mengetuk, lalu
 * bingung.
 *
 * Yang dijaga di sini:
 *   1. blok penjelasan berada **di dalam paragraf yang sama**, tepat sesudah
 *      **kalimat** yang memuat tautannya — bukan sesudah seluruh paragraf;
 *   2. ia masuk layar tanpa pemain harus menggulir lagi;
 *   3. **satu blok per paragraf**: tautan kedua di paragraf yang sama menutup
 *      yang pertama;
 *   4. tautan yang tertutup oleh tautan kedua bisa dibuka lagi dengan **satu**
 *      ketukan — kontrol yang diketuk tanpa akibat adalah cacat tersendiri;
 *   5. (M3.8 D-8) menutup yang terlihat meninggalkan paragraf TANPA penjelasan.
 *
 * Tidak satu pun angka di bawah disalin dari kode produk: semuanya diukur dari
 * halaman yang sungguh dilukis.
 */

/** Satu baris teks 17 px ber-line-height 1,7 = 28,9 px; 30 px adalah batasnya. */
const SATU_BARIS = 30;

async function sampaiPembukaan(page: Page): Promise<void> {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  /*
   * Sobekan kalender menutup ruang 176 px miliknya sendiri (`tutup-ruang`).
   * Mengukur sebelum ia selesai berarti mengukur halaman yang masih bergerak:
   * posisi gulir yang sama terbaca 401 atau 227 tergantung apakah ruang itu
   * sudah tertutup. Yang ditunggu animasinya, bukan jamnya.
   */
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map(async (gerak) => {
        try {
          await gerak.finished;
        } catch {
          /* dibatalkan: tidak ada yang perlu ditunggu lagi */
        }
      }),
    );
  });
  await tungguGulirBerhenti(page);
}

interface TautanDiParagraf {
  uid: string;
  teks: string;
  /** Nomor kalimat tempat tautan ini berada; -1 kalau kalimatnya tidak ada. */
  kalimat: number;
  /** Tidak ada lagi kata sesudah tautan ini di dalam kalimatnya. */
  akhirKalimat: boolean;
}

/**
 * Semua tautan angka di sebuah paragraf, beserta nomor kalimatnya.
 *
 * Nomor kalimat dibaca dari halaman (`data-kalimat`), **tidak dihitung ulang di
 * tes**: memotong kalimat adalah aturan produk, dan tes yang memotongnya sendiri
 * hanya akan setuju dengan dirinya sendiri.
 */
async function tautanParagraf(paragraf: Locator): Promise<TautanDiParagraf[]> {
  return await paragraf.locator('[data-uid^="angka:"]').evaluateAll((daftar) =>
    daftar.map((el) => {
      const kalimat = el.closest('[data-kalimat]');
      const pembungkus = el.parentElement ?? el;
      let sisa = 'belum-terukur';
      if (kalimat !== null) {
        const jangkauan = document.createRange();
        jangkauan.setStartAfter(pembungkus);
        jangkauan.setEnd(kalimat, kalimat.childNodes.length);
        sisa = jangkauan.toString();
      }
      return {
        uid: el.getAttribute('data-uid') ?? '',
        teks: el.textContent ?? '',
        kalimat: kalimat === null ? -1 : Number(kalimat.getAttribute('data-kalimat')),
        akhirKalimat: kalimat !== null && sisa.replace(/[\s.,;:!?—-]/g, '') === '',
      };
    }),
  );
}

interface UkuranPenjelasan {
  /** Blok penjelasan ada di dalam paragraf tautan ini. */
  adaBlok: boolean;
  /** Berapa blok penjelasan yang terbuka di paragraf itu. */
  blokDiParagraf: number;
  /** Blok itu adik langsung dari kalimat yang memuat tautannya. */
  sesudahKalimatTautan: boolean;
  /** Nomor kalimat tempat tautan berada, dan tempat blok disisipkan. */
  kalimatTautan: number;
  kalimatBlok: number;
  /** Jarak tegak, px: dari dasar kotak tautan / dasar kalimatnya ke puncak blok. */
  jarakDariTautan: number;
  jarakDariKalimat: number;
  /** Puncak blok relatif viewport, dan tinggi viewport-nya. */
  atasBlok: number;
  tinggiLayar: number;
  /** Berapa kalimat paragraf ini punya — supaya "bukan di ujung" bisa dibuktikan. */
  jumlahKalimat: number;
}

/**
 * Ukur letak blok penjelasan terhadap tautan yang baru diketuk.
 *
 * Kelas `.penjelasan-sebaris` dipakai untuk **mengukur**, bukan untuk menemukan
 * elemen yang diketuk — itu yang diizinkan D-7 M3.3.
 */
async function ukurPenjelasan(tautan: Locator): Promise<UkuranPenjelasan> {
  return await tautan.evaluate((el) => {
    const kalimat = el.closest('[data-kalimat]');
    const paragraf = el.closest('li, [data-uid="teks-kunci"]');
    const blok = paragraf?.querySelector('.penjelasan-sebaris') ?? null;
    const kotakTautan = el.getBoundingClientRect();
    const kotakKalimat = kalimat?.getBoundingClientRect() ?? null;
    const kotakBlok = blok?.getBoundingClientRect() ?? null;
    const sebelumBlok = blok?.previousElementSibling ?? null;
    return {
      adaBlok: blok !== null,
      blokDiParagraf: paragraf?.querySelectorAll('.penjelasan-sebaris').length ?? 0,
      sesudahKalimatTautan: sebelumBlok !== null && sebelumBlok === kalimat,
      kalimatTautan: kalimat === null ? -1 : Number(kalimat.getAttribute('data-kalimat')),
      kalimatBlok:
        sebelumBlok === null ? -1 : Number(sebelumBlok.getAttribute('data-kalimat') ?? '-1'),
      jarakDariTautan: kotakBlok === null ? Number.NaN : kotakBlok.top - kotakTautan.bottom,
      jarakDariKalimat:
        kotakBlok === null || kotakKalimat === null
          ? Number.NaN
          : kotakBlok.top - kotakKalimat.bottom,
      atasBlok: kotakBlok === null ? Number.NaN : kotakBlok.top,
      tinggiLayar: window.innerHeight,
      jumlahKalimat: paragraf?.querySelectorAll('[data-kalimat]').length ?? 0,
    };
  });
}

/**
 * Bawa sebuah tautan ke dekat puncak layar, lalu diamkan halamannya.
 *
 * Tanpa ini, `tap()` sendiri yang menggulir halaman supaya sasarannya nyaman
 * diketuk — dan tes lalu mengukur guliran **alatnya**, bukan guliran produk.
 * Pemilik mengetuk tautan yang sudah terlihat; keadaan itulah yang ditirukan.
 */
async function letakkanDiPuncak(page: Page, sasaran: Locator): Promise<void> {
  const pegangan = await sasaran.elementHandle();
  expect(pegangan, 'tautan yang akan diketuk harus ada di DOM').not.toBeNull();
  if (pegangan === null) return;
  await pegangan.evaluate((el) => {
    window.scrollBy({ top: el.getBoundingClientRect().top - 120, behavior: 'instant' });
  });
  await tungguGulirBerhenti(page);
  await pegangan.dispose();
}

/** Paragraf garis waktu yang punya tautan angka paling banyak: paragraf panjangnya. */
async function paragrafTerpanjang(page: Page): Promise<{ paragraf: Locator; nomor: number }> {
  const daftar = page.locator('[data-uid="garis-waktu"] > li');
  const jumlah = await daftar.count();
  expect(jumlah, 'garis waktu harus punya paragraf').toBeGreaterThan(0);
  let terbaik = -1;
  let terbanyak = 0;
  for (let nomor = 0; nomor < jumlah; nomor += 1) {
    const tautan = await daftar.nth(nomor).locator('[data-uid^="angka:"]').count();
    if (tautan > terbanyak) {
      terbanyak = tautan;
      terbaik = nomor;
    }
  }
  expect(terbanyak, 'paragraf garis waktu harus memuat tautan angka').toBeGreaterThanOrEqual(3);
  return { paragraf: daftar.nth(terbaik), nomor: terbaik };
}

test('E-16a tautan di tengah kalimat panjang membuka penjelasan di kalimat itu juga', async ({
  page,
}) => {
  await sampaiPembukaan(page);
  const { paragraf, nomor } = await paragrafTerpanjang(page);

  const semua = await tautanParagraf(paragraf);
  expect(
    semua.length,
    `paragraf ${String(nomor)} harus punya beberapa tautan; yang ada: ${JSON.stringify(semua)}`,
  ).toBeGreaterThanOrEqual(3);

  // Tautan pertama paragraf ini adalah tanggal yang diketuk pemilik.
  const pertama = semua[0];
  expect(pertama, 'tautan pertama harus ada').toBeDefined();
  if (pertama === undefined) return;
  expect(
    pertama.kalimat,
    `tautan "${pertama.teks}" harus berada di dalam sebuah kalimat bernomor (D-1); ` +
      `yang terbaca: ${JSON.stringify(pertama)}`,
  ).toBeGreaterThanOrEqual(0);

  const tautan = paragraf.locator(`[data-uid="${pertama.uid}"]`).first();
  await letakkanDiPuncak(page, tautan);
  const gulirSebelum = await page.evaluate(() => window.scrollY);

  await ketuk(tautan);
  await expect(paragraf.locator('.penjelasan-sebaris')).toHaveCount(1);

  /*
   * Halaman dikembalikan ke posisi gulir **saat pemain mengetuk**.
   *
   * `tap()` memusatkan sasarannya sendiri sebelum mengetuk, dan berapa jauh ia
   * memusatkan berbeda tiap putaran — terukur 401 -> 227 dan 401 -> 370 di mesin
   * ini. Mengukur di posisi itu berarti mengukur guliran **alat uji**. Yang
   * ditanya D-1 adalah pertanyaan pemain: dari tempat aku mengetuk, apakah
   * penjelasannya terlihat tanpa aku menggulir lagi?
   */
  const gulirTap = await page.evaluate(() => window.scrollY);
  await page.evaluate((y: number) => {
    window.scrollTo({ top: y, behavior: 'instant' });
  }, gulirSebelum);
  await tungguGulirBerhenti(page);

  const ukur = await ukurPenjelasan(tautan);
  const gulirSesudah = await page.evaluate(() => window.scrollY);

  expect(ukur.adaBlok, 'penjelasan harus terbuka di paragraf yang sama').toBe(true);
  expect(
    ukur.sesudahKalimatTautan,
    `blok penjelasan harus adik langsung kalimat ${String(ukur.kalimatTautan)}; ` +
      `yang ada: sesudah kalimat ${String(ukur.kalimatBlok)}`,
  ).toBe(true);
  expect(
    ukur.jarakDariKalimat,
    `jarak kalimat -> penjelasan ${ukur.jarakDariKalimat.toFixed(1)} px harus <= ${String(SATU_BARIS)} px`,
  ).toBeLessThanOrEqual(SATU_BARIS);
  expect(ukur.jarakDariKalimat, 'jaraknya hasil ukur, bukan penanda').toBeGreaterThanOrEqual(-1);
  expect(
    gulirSesudah,
    'pengukuran dilakukan di posisi gulir tempat pemain mengetuk',
  ).toBeCloseTo(gulirSebelum, 0);
  expect(
    ukur.atasBlok,
    `puncak blok ${ukur.atasBlok.toFixed(1)} px harus di dalam layar 0..${String(ukur.tinggiLayar)} ` +
      'tanpa gulir tambahan',
  ).toBeGreaterThanOrEqual(0);
  expect(ukur.atasBlok).toBeLessThan(ukur.tinggiLayar);

  console.log(
    `E-16a paragraf-${String(nomor)} tautan="${pertama.teks}" kalimat=${String(ukur.kalimatTautan)}/` +
      `${String(ukur.jumlahKalimat)} jarak-dari-kalimat=${ukur.jarakDariKalimat.toFixed(1)}px ` +
      `jarak-dari-tautan=${ukur.jarakDariTautan.toFixed(1)}px atas-blok=${ukur.atasBlok.toFixed(1)}px ` +
      `tinggi-layar=${String(ukur.tinggiLayar)}px gulir-saat-ketuk=${String(gulirSebelum)} ` +
      `(tap memusatkan ke ${String(gulirTap)}, dikembalikan sebelum diukur)`,
  );
});

test('E-16b tautan di ujung kalimat: penjelasan tepat satu baris di bawahnya', async ({ page }) => {
  await sampaiPembukaan(page);
  const { paragraf, nomor } = await paragrafTerpanjang(page);

  const semua = await tautanParagraf(paragraf);
  const diujung = semua.find((t) => t.akhirKalimat);
  expect(
    diujung,
    `paragraf ${String(nomor)} harus punya tautan yang menutup kalimatnya; ` +
      `yang ada: ${JSON.stringify(semua)}`,
  ).toBeDefined();
  if (diujung === undefined) return;

  const tautan = paragraf.locator(`[data-uid="${diujung.uid}"]`).first();
  await letakkanDiPuncak(page, tautan);
  await ketuk(tautan);
  await expect(paragraf.locator('.penjelasan-sebaris')).toHaveCount(1);

  const ukur = await ukurPenjelasan(tautan);
  expect(ukur.sesudahKalimatTautan, 'blok berada tepat sesudah kalimat tautannya').toBe(true);
  expect(
    ukur.jarakDariTautan,
    `tautan "${diujung.teks}" menutup kalimatnya, jadi jarak tautan -> penjelasan ` +
      `(${ukur.jarakDariTautan.toFixed(1)} px) harus <= ${String(SATU_BARIS)} px`,
  ).toBeLessThanOrEqual(SATU_BARIS);
  expect(ukur.jarakDariTautan, 'jaraknya hasil ukur, bukan penanda').toBeGreaterThanOrEqual(-1);

  console.log(
    `E-16b tautan="${diujung.teks}" kalimat=${String(ukur.kalimatTautan)} ` +
      `jarak-dari-tautan=${ukur.jarakDariTautan.toFixed(1)}px`,
  );
});

test('E-16c satu blok per paragraf, dan tautan yang kalah baru tetap bisa dibuka sekali ketuk', async ({
  page,
}) => {
  await sampaiPembukaan(page);
  const { paragraf, nomor } = await paragrafTerpanjang(page);

  const semua = await tautanParagraf(paragraf);
  const pertama = semua[0];
  const lain = semua.find((t) => pertama !== undefined && t.kalimat > pertama.kalimat);
  expect(pertama, 'tautan pertama harus ada').toBeDefined();
  expect(
    lain,
    `paragraf ${String(nomor)} harus punya tautan di kalimat lain; yang ada: ${JSON.stringify(semua)}`,
  ).toBeDefined();
  if (pertama === undefined || lain === undefined) return;

  const satu = paragraf.locator(`[data-uid="${pertama.uid}"]`).first();
  const dua = paragraf.locator(`[data-uid="${lain.uid}"]`).first();

  await ketuk(satu);
  await expect(paragraf.locator('.penjelasan-sebaris')).toHaveCount(1);
  await expect(satu, 'tautan pertama mengatakan dirinya terbuka').toHaveAttribute(
    'aria-expanded',
    'true',
  );

  await ketuk(dua);
  const sesudahDua = await ukurPenjelasan(dua);
  expect(
    sesudahDua.blokDiParagraf,
    'tautan kedua di paragraf yang sama menutup yang pertama: tepat satu blok',
  ).toBe(1);
  expect(sesudahDua.sesudahKalimatTautan, 'bloknya pindah ke kalimat tautan kedua').toBe(true);
  await expect(satu, 'tautan pertama tidak lagi mengaku terbuka').toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(dua).toHaveAttribute('aria-expanded', 'true');

  /*
   * Ketukan yang tidak berakibat apa-apa adalah cacat tersendiri (M3.2 §10c).
   * Sejak M3.8 D-8 tautan pertama sudah DITUTUP reducer ketika tautan kedua
   * dibuka; SATU ketukan harus membukanya lagi (dan menutup yang kedua).
   */
  await ketuk(satu);
  const kembali = await ukurPenjelasan(satu);
  expect(kembali.blokDiParagraf, 'tetap satu blok').toBe(1);
  expect(
    kembali.sesudahKalimatTautan,
    'satu ketukan mengembalikan penjelasan ke kalimat tautan pertama',
  ).toBe(true);
  await expect(satu).toHaveAttribute('aria-expanded', 'true');
  await expect(dua).toHaveAttribute('aria-expanded', 'false');

  console.log(
    `E-16c paragraf-${String(nomor)} tautan-1="${pertama.teks}" (kalimat ${String(pertama.kalimat)}) ` +
      `tautan-2="${lain.teks}" (kalimat ${String(lain.kalimat)}) blok-terbuka=1`,
  );
});

test('E-16d teks kunci sesudah dikunci: penjelasan menyusup ke kalimatnya, bukan ke ujung paragraf', async ({
  page,
}) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);

  /*
   * Soal yang teks kuncinya paling banyak bertautan dipilih dari berkas kasus,
   * bukan ditulis nomornya di sini.
   */
  const hitungTautan = (teks: string): number => (teks.match(/\[\[/g) ?? []).length;
  let pilihan = 0;
  for (const [nomor, soal] of kasus.soal.entries()) {
    if (hitungTautan(soal.penjelasan) > hitungTautan(kasus.soal[pilihan]?.penjelasan ?? '')) {
      pilihan = nomor;
    }
  }

  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    if (nomor === pilihan) break;
    await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
  }

  const teksKunci = page.locator('[data-uid="teks-kunci"]');
  await expect(teksKunci).toBeVisible();
  const semua = await tautanParagraf(teksKunci);
  expect(
    semua.length,
    `teks kunci soal ${String(pilihan + 1)} harus bertautan; yang ada: ${JSON.stringify(semua)}`,
  ).toBeGreaterThan(0);

  // Tautan di kalimat yang BUKAN kalimat terakhir: hanya di situ "menyusup"
  // bisa dibedakan dari "ditempel di ujung paragraf".
  const kalimatTerakhir = Math.max(...semua.map((t) => t.kalimat));
  const sasaran = semua.find((t) => t.kalimat >= 0 && t.kalimat < kalimatTerakhir) ?? semua[0];
  expect(sasaran, 'harus ada tautan yang bisa diuji').toBeDefined();
  if (sasaran === undefined) return;

  const tautan = teksKunci.locator(`[data-uid="${sasaran.uid}"]`).first();
  await letakkanDiPuncak(page, tautan);
  await ketuk(tautan);
  await expect(teksKunci.locator('.penjelasan-sebaris')).toHaveCount(1);

  const ukur = await ukurPenjelasan(tautan);
  expect(ukur.sesudahKalimatTautan, 'blok berada tepat sesudah kalimat tautannya').toBe(true);
  expect(
    ukur.kalimatBlok,
    `blok disisipkan sesudah kalimat ${String(ukur.kalimatBlok)} dari ` +
      `${String(ukur.jumlahKalimat)} kalimat — bukan sesudah kalimat terakhir`,
  ).toBeLessThan(ukur.jumlahKalimat - 1);
  expect(
    ukur.jarakDariKalimat,
    `jarak kalimat -> penjelasan ${ukur.jarakDariKalimat.toFixed(1)} px`,
  ).toBeLessThanOrEqual(SATU_BARIS);

  console.log(
    `E-16d soal-${String(pilihan + 1)} tautan="${sasaran.teks}" kalimat=${String(ukur.kalimatTautan)}/` +
      `${String(ukur.jumlahKalimat)} jarak-dari-kalimat=${ukur.jarakDariKalimat.toFixed(1)}px ` +
      `jarak-dari-tautan=${ukur.jarakDariTautan.toFixed(1)}px`,
  );
});

/**
 * E-16e — urutan PERSIS yang dilakukan pemilik (M3.8 D-8).
 *
 * Layar "Waktu berjalan lagi" DADA, paragraf yang memuat dua laporan:
 * buka "laporan 19 Oktober 2025" → buka "laporan 26 Oktober 2025" (menutupi
 * 19) → ketuk 26 lagi untuk menutup → **19 muncul kembali**. Sebabnya: 19 tidak
 * pernah keluar dari daftar yang terbuka, ia hanya kalah baru.
 *
 * Yang dijaga: sesudah menutup yang terlihat, paragraf itu kosong dari
 * penjelasan, dan kedua tautan mengatakan dirinya tertutup.
 */
test('E-16e buka A, buka B, tutup B: tidak ada penjelasan, kedua tautan aria-expanded false', async ({
  page,
}) => {
  await sampaiPembukaan(page);
  const paragraf = page
    .locator('[data-uid="garis-waktu"] > li')
    .filter({ hasText: 'laporan 19 Oktober 2025' })
    .filter({ hasText: 'laporan 26 Oktober 2025' });
  await expect(paragraf, 'paragraf pemilik ada, tepat satu').toHaveCount(1);
  const a = paragraf.locator('[data-uid="angka:fil-2025-10-19"]');
  const b = paragraf.locator('[data-uid="angka:fil-2025-10-26"]');
  await expect(a).toHaveCount(1);
  await expect(b).toHaveCount(1);
  const blok = paragraf.locator('.penjelasan-sebaris');

  await letakkanDiPuncak(page, a);
  await ketuk(a);
  await expect(blok).toHaveCount(1);
  await expect(a).toHaveAttribute('aria-expanded', 'true');

  await ketuk(b);
  await expect(blok).toHaveCount(1);
  await expect(b).toHaveAttribute('aria-expanded', 'true');
  await expect(a).toHaveAttribute('aria-expanded', 'false');

  await ketuk(b);
  await expect(blok, 'menutup yang terlihat meninggalkan paragraf TANPA penjelasan').toHaveCount(0);
  await expect(a, 'A tidak muncul kembali').toHaveAttribute('aria-expanded', 'false');
  await expect(b).toHaveAttribute('aria-expanded', 'false');
  console.log('E-16e buka 19 → buka 26 → tutup 26: blok=0, aria-expanded 19=false 26=false');
});
