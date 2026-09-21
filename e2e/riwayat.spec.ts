import { expect, test } from '@playwright/test';
import {
  LABEL_MULAI,
  bilahTurunAda,
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import type { Page } from '@playwright/test';

/**
 * E-02 — tombol kembali peramban berlangkah, bukan melompat keluar situs.
 *
 * Cacat aslinya (M3.1 §10f, ditambal A4-T1): satu entri riwayat didorong tiap
 * kali nama layar berubah, termasuk ketika layarnya berubah **karena** pemain
 * menekan kembali. Entri baru itu memotong perjalanan, dan kembali yang kedua
 * membawa pemilik keluar dari situs di ponselnya.
 *
 * Tes meja `riwayat.test.ts` sudah menjaga modelnya. Yang belum pernah dijaga
 * adalah peramban sungguhan: `history.back()` berturut-turut, dengan `popstate`
 * sungguhan dan efek React yang sungguh berjalan.
 */

/** Nama layar menurut aplikasi, dibaca dari yang tampil — bukan dari `history.state`. */
async function layarSekarang(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const titik = document.querySelector('[aria-label^="Soal "]');
    if (titik !== null) return titik.getAttribute('aria-label') ?? '';
    const judul = document.querySelector('h1')?.textContent ?? '';
    if (judul.startsWith('Kita mundur ke')) return 'layar pertama';
    return judul;
  });
}

/** Nama layar menurut entri riwayat yang sedang aktif. */
async function entriRiwayat(page: Page): Promise<string | null> {
  return await page.evaluate(
    () => (window.history.state as { layar?: string } | null)?.layar ?? null,
  );
}

async function majuSampaiSoal3(page: Page): Promise<number> {
  const kasus = bacaKasus();
  const sebelum = await page.evaluate(() => window.history.length);
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    if (nomor === kasus.soal.length - 1) break;
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
  }
  await tungguSoal(page, 3);
  return (await page.evaluate(() => window.history.length)) - sebelum;
}

test('E-02 kembali tiga kali mendarat di soal 2, soal 1, lalu layar pertama', async ({ page }) => {
  await buka(page, penandaBaru());
  const asal = new URL(page.url()).origin;

  /*
   * Maju tiga layar harus menambah **tepat tiga** entri riwayat. Versi lama
   * menambah lebih dari itu — entri yang lahir tanpa gerakan pemain — dan
   * itulah sebabnya kembali menjadi tidak bisa diramalkan.
   */
  const tambahanEntri = await majuSampaiSoal3(page);
  expect(tambahanEntri, 'maju tiga layar menambah tepat tiga entri riwayat').toBe(3);

  const jejak: { layar: string; entri: string | null; asal: string }[] = [];

  await page.goBack();
  await tungguSoal(page, 2);
  jejak.push({ layar: await layarSekarang(page), entri: await entriRiwayat(page), asal: new URL(page.url()).origin });

  await page.goBack();
  await tungguSoal(page, 1);
  jejak.push({ layar: await layarSekarang(page), entri: await entriRiwayat(page), asal: new URL(page.url()).origin });

  await page.goBack();
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  jejak.push({ layar: await layarSekarang(page), entri: await entriRiwayat(page), asal: new URL(page.url()).origin });

  expect(
    jejak.map((l) => l.layar),
    'tiga kali kembali mendarat di soal 2, soal 1, layar pertama',
  ).toEqual(['Soal 2 dari 3', 'Soal 1 dari 3', 'layar pertama']);

  expect(
    jejak.map((l) => l.entri),
    'entri riwayat peramban ikut mundur bersama layarnya',
  ).toEqual(['soal-2', 'soal-1', 'pembuka']);

  for (const langkah of jejak) {
    expect(langkah.asal, 'setiap langkah mundur tetap di asal yang sama').toBe(asal);
  }

  /*
   * Langkah keempat adalah yang membuat tes ini menggigit.
   *
   * Tiga langkah pertama masih benar walau riwayatnya kacau: layarnya digerakkan
   * reducer, bukan oleh tumpukan peramban, jadi "soal 2, soal 1, layar pertama"
   * tetap muncul bahkan ketika entri didorong di tempat yang salah. Yang tidak
   * bisa berpura-pura adalah **panjang perjalanannya**: dari layar pertama,
   * kembali sekali lagi harus benar-benar meninggalkan situs.
   *
   * Terlalu banyak entri (`dorong` yang seharusnya `diam`) membuat pemain
   * terperangkap: ia menekan kembali dan tidak ke mana-mana. Terlalu sedikit
   * membuatnya terlempar keluar terlalu cepat — persis keluhan pemilik.
   */
  await page.goBack();
  await expect
    .poll(async () => page.url().startsWith(asal), {
      message: 'kembali sekali lagi dari layar pertama harus meninggalkan situs',
    })
    .toBe(false);
});

/**
 * E-02b — tombol **maju** peramban (cacat C-1, ditambal A1-T2).
 *
 * Cacatnya: `popstate` selalu dianggap "mundur", padahal tombol maju
 * menyalakan peristiwa yang sama. Dari layar pertama `layarSebelumnya()`
 * mengembalikan `null`, jadi aksinya diabaikan — penunjuk riwayat peramban
 * maju sementara layarnya diam, dan sejak itu keduanya tidak sinkron lagi
 * sehingga **kembali pun berhenti bekerja**. Terukur sebelum ditambal:
 *
 * ```
 * mundur 3     {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"pembuka"}
 * MAJU 1       {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"soal-1"}
 * MAJU 2       {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"soal-2"}
 * mundur lagi  {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"soal-1"}
 * ```
 */
test('E-02b maju sekali sesudah kembali mendarat di soal 1', async ({ page }) => {
  await buka(page, penandaBaru());
  await majuSampaiSoal3(page);
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  await page.goForward();
  expect(await entriRiwayat(page), 'peramban maju ke entri soal-1').toBe('soal-1');
  await tungguSoal(page, 1);
  expect(await layarSekarang(page), 'layarnya ikut maju, bukan diam di layar pertama').toBe(
    'Soal 1 dari 3',
  );
});

/**
 * E-02c — maju dan mundur boleh diselang-seling tanpa tumpukannya melenceng.
 *
 * Satu langkah maju yang benar belum membuktikan apa-apa kalau langkah
 * sesudahnya melenceng: cacat C-1 justru baru terasa pada ketukan **berikutnya**,
 * ketika layar dan entri riwayat sudah tidak sinkron.
 */
test('E-02c mundur x2 lalu maju x2 lalu mundur x1 mendarat di layar yang benar', async ({
  page,
}) => {
  await buka(page, penandaBaru());
  const asal = new URL(page.url()).origin;
  await majuSampaiSoal3(page);

  const jejak: { langkah: string; layar: string; entri: string | null; asal: string }[] = [];
  const catat = async (langkah: string): Promise<void> => {
    jejak.push({
      langkah,
      layar: await layarSekarang(page),
      entri: await entriRiwayat(page),
      asal: new URL(page.url()).origin,
    });
  };

  await page.goBack();
  await tungguSoal(page, 2);
  await catat('mundur-1');
  await page.goBack();
  await tungguSoal(page, 1);
  await catat('mundur-2');

  await page.goForward();
  await tungguSoal(page, 2);
  await catat('maju-1');
  await page.goForward();
  await tungguSoal(page, 3);
  await catat('maju-2');

  await page.goBack();
  await tungguSoal(page, 2);
  await catat('mundur-3');

  expect(
    jejak.map((l) => `${l.langkah}=${l.layar}`),
    'urutan layar sepanjang mundur x2, maju x2, mundur x1',
  ).toEqual([
    'mundur-1=Soal 2 dari 3',
    'mundur-2=Soal 1 dari 3',
    'maju-1=Soal 2 dari 3',
    'maju-2=Soal 3 dari 3',
    'mundur-3=Soal 2 dari 3',
  ]);
  expect(
    jejak.map((l) => l.entri),
    'entri riwayat peramban sinkron dengan layarnya di tiap langkah',
  ).toEqual(['soal-2', 'soal-1', 'soal-2', 'soal-3', 'soal-2']);
  for (const l of jejak) {
    expect(l.asal, `langkah ${l.langkah} tetap di asal yang sama`).toBe(asal);
  }

  // Jawaban yang sudah dikunci tidak boleh berubah karena tombol peramban.
  await expect(
    page.getByText('Cocok dengan kartu').first(),
    'soal yang sudah dikunci tetap terkunci sesudah maju-mundur',
  ).toBeVisible();
});
