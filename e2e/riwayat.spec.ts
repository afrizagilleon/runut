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
 * CACAT PRODUK yang ditemukan e2e ini, belum diperbaiki — lihat §9 "Cacat yang
 * ditemukan", butir **C-1**.
 *
 * `web/src/Aplikasi.tsx` mendengarkan `popstate` dan **selalu** men-dispatch
 * `{ jenis: 'mundur' }`, tanpa melihat ke mana peramban sebenarnya berpindah.
 * Tombol **maju** juga menyalakan `popstate`. Dari layar pertama,
 * `layarSebelumnya()` mengembalikan `null`, jadi aksinya diabaikan: penunjuk
 * riwayat peramban maju ke `soal-1` sementara layarnya tetap layar pertama —
 * dan sejak itu keduanya tidak sinkron lagi, sehingga kembali berikutnya pun
 * tidak menggerakkan layar. Terukur:
 *
 * ```
 * mundur 3     {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"pembuka"}
 * MAJU 1       {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"soal-1"}
 * MAJU 2       {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"soal-2"}
 * mundur lagi  {"layar":"Kita mundur ke Rabu, 8 Oktober","entri":"soal-1"}
 * ```
 *
 * Tidak saya perbaiki sendiri karena perbaikannya bukan tambalan kecil: ia
 * butuh aksi reducer baru "pindah ke layar bernama", dan harus memutuskan
 * peristiwa apa yang lahir ketika pemain **maju** — `lihat_balik` menurut
 * namanya berarti melihat ke belakang, dan D-6 adalah daftar peristiwa
 * tertutup. Itu keputusan penulis kontrak, bukan keputusan eksekutor (§3.6(3)).
 *
 * `test.fail()`, bukan tes yang dilemahkan: begitu cacatnya diperbaiki, tes ini
 * menjadi **merah dengan sendirinya** dan memaksa anotasi ini dicabut.
 */
test('E-02b maju sekali sesudah kembali harus mendarat di soal 1 (CACAT C-1)', async ({ page }) => {
  test.fail(true, 'C-1: popstate selalu dianggap mundur; tombol maju tidak menggerakkan layar');

  await buka(page, penandaBaru());
  await majuSampaiSoal3(page);
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  await page.goForward();
  expect(await entriRiwayat(page), 'peramban memang sudah maju ke entri soal-1').toBe('soal-1');
  /*
   * Tenggat pendek dengan sengaja: ketidaksinkronan ini terjadi seketika, tidak
   * ada yang perlu ditunggu 15 detik. Tenggat penuh hanya menambah setengah
   * menit ke setiap putaran `npm run e2e` tanpa menambah satu pun bukti.
   */
  await expect(page.locator('[aria-label="Soal 1 dari 3"]')).toBeVisible({ timeout: 3_000 });
});
