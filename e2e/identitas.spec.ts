import { expect, test, type Page } from '@playwright/test';
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
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-09 — INV-10: identitas emiten tidak bocor sebelum layar pembukaan.
 *
 * Seluruh gagasan permainan ini bergantung padanya. Pemain harus memutuskan dari
 * dokumen, bukan dari ingatan atau dari pencarian cepat; begitu kode sahamnya
 * terbaca di layar soal, pertanyaannya berhenti menjadi pertanyaan.
 *
 * Dua ukuran dipakai, dan bedanya penting:
 *
 * - **`innerText`** = apa yang benar-benar TERBACA di layar. Isi `<details>`
 *   yang masih tertutup tidak termasuk.
 * - **`textContent`** = apa yang ADA di DOM, terbuka maupun tidak.
 *
 * E-09a memakai yang pertama: itulah kebocoran yang dialami pemain. E-09b
 * memakai keduanya dan lebih keras — ia sedang merah karena cacat C-3.
 */

/** `data-uid` lipatan "Rincian teknis"; dipisahkan karena C-3 (lihat E-09b). */
const UID_RINCIAN = 'rincian';

/**
 * Buka semua yang bisa dibuka di layar ini.
 *
 * `rincianTeknis: false` membuka semuanya **kecuali** lipatan "Rincian teknis",
 * supaya E-09a tetap menjaga seluruh permukaan lain sementara satu kebocoran
 * yang sudah diketahui ditangani tesnya sendiri.
 */
async function bukaSemuaLipatan(page: Page, rincianTeknis: boolean): Promise<number> {
  let dibuka = 0;

  const lipat = page.locator('[aria-expanded="false"]');
  for (let n = (await lipat.count()) - 1; n >= 0; n -= 1) {
    await ketuk(lipat.nth(n));
    dibuka += 1;
  }

  const angka = page.locator('[data-uid^="angka:"]');
  for (let n = (await angka.count()) - 1; n >= 0; n -= 1) {
    await ketuk(angka.nth(n));
    dibuka += 1;
  }

  // Dua putaran: membuka sebuah lipatan bisa melahirkan lipatan baru di dalamnya.
  for (let putaran = 0; putaran < 2; putaran += 1) {
    const rinci = page.locator('details');
    for (let n = (await rinci.count()) - 1; n >= 0; n -= 1) {
      const satu = rinci.nth(n);
      if (!rincianTeknis && (await satu.getAttribute('data-uid')) === UID_RINCIAN) continue;
      if ((await satu.evaluate((el) => (el as HTMLDetailsElement).open)) === false) {
        await ketuk(satu.locator('summary'));
        dibuka += 1;
      }
    }
  }
  return dibuka;
}

/** Teks yang benar-benar terbaca di layar (tidak termasuk lipatan yang tertutup). */
async function teksTerlihat(page: Page): Promise<string> {
  return await page.evaluate(() => document.body.innerText);
}

/** Seluruh teks yang ada di DOM, termasuk yang masih di balik lipatan tertutup. */
async function teksDom(page: Page): Promise<string> {
  return await page.evaluate(() => document.body.textContent ?? '');
}

async function tautanKeluar(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const asal = window.location.origin;
    return [...document.querySelectorAll('[href]')]
      .map((el) => el.getAttribute('href') ?? '')
      .filter((h) => h !== '')
      .filter((h) => {
        try {
          return new URL(h, asal).origin !== asal;
        } catch {
          return false;
        }
      });
  });
}

async function mainkanSampaiPembukaan(
  page: Page,
  periksa: (nama: string) => Promise<void>,
): Promise<void> {
  const kasus = bacaKasus();
  await periksa('layar-pertama');
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await periksa(`soal-${String(nomor + 1)}-sebelum-dikunci`);

    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await periksa(`soal-${String(nomor + 1)}-sesudah-dikunci`);

    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
}

test('E-09a identitas emiten tidak bocor sebelum pembukaan, dan muncul sesudahnya', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const rahasia = [
    { medan: 'simbol', nilai: kasus.emiten.simbol },
    { medan: 'nama', nilai: kasus.emiten.nama },
  ];

  await buka(page, penandaBaru());
  const laporan: string[] = [];

  await mainkanSampaiPembukaan(page, async (nama) => {
    const dibuka = await bukaSemuaLipatan(page, false);
    const teks = await teksTerlihat(page);
    for (const r of rahasia) {
      expect(
        teks.includes(r.nilai),
        `layar "${nama}" tidak boleh memuat ${r.medan} emiten ("${r.nilai}")`,
      ).toBe(false);
    }
    expect(await tautanKeluar(page), `layar "${nama}" tidak boleh punya href keluar`).toEqual([]);
    laporan.push(
      `${nama}: lipatan-dibuka=${String(dibuka)} panjang-teks=${String(teks.length)} href-keluar=0`,
    );
  });

  /* --- sesudah pembukaan: identitasnya justru HARUS tampil ------------- */
  const teksPembukaan = await teksTerlihat(page);
  const tampil = rahasia.filter((r) => teksPembukaan.includes(r.nilai)).map((r) => r.medan);
  expect(tampil, 'sesudah pembukaan, kode saham dan nama emiten keduanya tampil').toEqual([
    'simbol',
    'nama',
  ]);
  expect(await tautanKeluar(page), 'layar pembukaan pun tidak punya href keluar').toEqual([]);

  // eslint-disable-next-line no-console
  console.log(`E-09a sebelum pembukaan (tanpa "Rincian teknis"):\n  ${laporan.join('\n  ')}`);
});

/**
 * CACAT PRODUK yang ditemukan e2e ini, belum diperbaiki — lihat §9 "Cacat yang
 * ditemukan", butir **C-3**.
 *
 * Kode saham emiten **terbaca di layar soal**, dua ketukan dari mana saja:
 * "Lihat sumbernya ›" pada sebuah lembar, lalu "Rincian teknis". Yang bocor
 * adalah baris kosakata mesin yang dibangun `isiSumber()` di
 * `web/src/sumber.ts` dari data kasus:
 *
 * ```
 * susp-2025-06-30     -> Parameter symbol : DADA
 * div-2025-09-16      -> Endpoint         : /v2/company/corporate-actions/DADA/
 * fil-2025-08-25-03   -> Parameter symbol : DADA
 * fil-2025-08-25-04   -> Parameter symbol : DADA
 * fil-2025-09-01-01   -> Parameter symbol : DADA
 * ```
 *
 * Lima dari kartu ketiga soal, jadi ia bisa dijangkau di **setiap** layar soal.
 * Ini melanggar INV-10, dan taruhannya bukan kecil: begitu kode sahamnya
 * terbaca, pemain bisa mencari jawabannya alih-alih membaca dokumennya, dan
 * seluruh premis permainan runtuh.
 *
 * Tidak saya perbaiki sendiri karena perbaikannya **mengubah kata yang dibaca
 * pemain** (§3.6(3)): entah barisnya disembunyikan, entah kodenya disamarkan,
 * entah "Endpoint" tidak ditampilkan sama sekali — ketiganya keputusan tentang
 * apa yang pantas dibaca orang di lipatan itu, bukan tambalan teknis. Datanya
 * sendiri ada di `cases/**` dan `factory/**` yang terlarang bagi saya, jadi
 * menyaringnya berarti `isiSumber()` harus tahu kode emitennya — satu argumen
 * baru, semua pemanggilnya, dan tes unitnya.
 */
test('E-09b identitas tidak bocor walau "Rincian teknis" dibuka (CACAT C-3)', async ({ page }) => {
  test.fail(true, 'C-3: Parameter symbol dan Endpoint di "Rincian teknis" memuat kode saham');

  const kasus = bacaKasus();
  const rahasia = [
    { medan: 'simbol', nilai: kasus.emiten.simbol },
    { medan: 'nama', nilai: kasus.emiten.nama },
  ];

  await buka(page, penandaBaru());
  await mainkanSampaiPembukaan(page, async (nama) => {
    await bukaSemuaLipatan(page, true);
    const terlihat = await teksTerlihat(page);
    const dom = await teksDom(page);
    for (const r of rahasia) {
      expect(
        terlihat.includes(r.nilai),
        `layar "${nama}" tidak boleh MENAMPILKAN ${r.medan} emiten ("${r.nilai}")`,
      ).toBe(false);
      expect(
        dom.includes(r.nilai),
        `layar "${nama}" tidak boleh MEMUAT ${r.medan} emiten ("${r.nilai}") di DOM`,
      ).toBe(false);
    }
  });
});
