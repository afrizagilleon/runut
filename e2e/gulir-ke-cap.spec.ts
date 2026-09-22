import { expect, test } from '@playwright/test';
import {
  buka,
  ketuk,
  kunciJawaban,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  rasioDiViewport,
  tungguGulirBerhenti,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';

/**
 * E-15 — sesudah "Kunci jawaban", layar menunjukkan hasilnya (M3.5 D-3).
 *
 * Cacat yang ditemukan manusia: di uji duduk 22 Sep ketiga penguji mengunci
 * lalu langsung menekan "Lanjut". Cap, kartu penentu, dan penjelasan semuanya
 * berada di bawah lipatan — terukur dari PNG kritik gesekan — sementara tombol
 * lanjut duduk persis di bawah jempol. Satu penguji lalu mengisi "terasa
 * seperti ujian hafalan": ia memang tidak pernah melihat jawabannya.
 *
 * Yang diuji: sesudah mengunci **dan tanpa ketukan lain**, halaman bergulir
 * sendiri sehingga cap umpan balik masuk layar, dan tombol "Lanjut" tetap ada
 * di bilah bawah — memindahkan beban, bukan menambah kata.
 */
test('E-15 sesudah mengunci, layar bergulir sampai cap umpan balik terlihat', async ({ page }) => {
  const kasus = bacaKasus();
  const soal1 = kasus.soal[0];
  expect(soal1, 'kasus harus punya soal pertama').toBeDefined();
  if (soal1 === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  await pilihOpsi(page, kunciSalah(soal1));
  await tungguGulirBerhenti(page);

  const cap = page.locator('[data-uid="sesudah-dikunci"] .cap');
  /*
   * Subyek dan pembandingnya di satu tes: kalau capnya sudah terlihat sebelum
   * dikunci, guliran tidak membuktikan apa pun dan tes ini hiasan. Ia belum
   * ada di DOM sebelum dikunci, jadi yang diperiksa adalah wadahnya —
   * `role="status"` yang memang lahir bersama layarnya.
   */
  const wadah = page.locator('[data-uid="sesudah-dikunci"]');
  const rasioSebelum = await rasioDiViewport(wadah);
  const yWadahSebelum = await wadah.evaluate((el) => el.getBoundingClientRect().top);
  expect(
    yWadahSebelum,
    `wadah cap harus berada di bawah lipatan sebelum dikunci; terukur y = ${String(yWadahSebelum)}`,
  ).toBeGreaterThan(0);

  const scrollSebelum = await page.evaluate(() => window.scrollY);

  await kunciJawaban(page);

  const rasioSesudah = await tungguMasukLayar(
    cap,
    0.9,
    'cap umpan balik harus masuk layar sesudah "Kunci jawaban", tanpa ketukan lain',
  );
  await tungguGulirBerhenti(page);
  const scrollSesudah = await page.evaluate(() => window.scrollY);
  const yCap = await cap.evaluate((el) => el.getBoundingClientRect().top);
  const layar = page.viewportSize();

  expect(
    scrollSesudah,
    `guliran harus bertambah sesudah mengunci: ${String(scrollSebelum)} -> ${String(scrollSesudah)}`,
  ).toBeGreaterThan(scrollSebelum);
  expect(rasioSesudah, 'cap harus masuk layar sedikitnya 0,9 bagian').toBeGreaterThanOrEqual(0.9);

  /*
   * Kepingnya menempel di puncak layar setinggi ~64 px. Cap yang mendarat di
   * bawahnya bukan cap yang tertutup — dan cap yang tertutup adalah persis
   * kegagalan yang sedang ditambal.
   */
  const keping = await page
    .locator('[data-uid="keping"]')
    .evaluate((el) => el.getBoundingClientRect().bottom);
  expect(
    yCap,
    `cap harus mendarat di bawah keping (keping bawah = ${keping.toFixed(2)}), terukur y = ${yCap.toFixed(2)}`,
  ).toBeGreaterThanOrEqual(keping - 0.5);

  // Tombolnya tetap di bilah bawah: yang dipindahkan adalah mata pemain, bukan
  // jalan keluarnya.
  const lanjut = page.getByRole('button', { name: 'Lanjut ke soal 2' });
  await expect(lanjut, 'tombol Lanjut tetap ada sesudah layar bergulir').toBeVisible();
  expect(
    await rasioDiViewport(lanjut),
    'tombol Lanjut tetap utuh di bilah bawah',
  ).toBeGreaterThan(0.9);

  console.log(
    `D-3 gulir ke cap (${test.info().project.name}, ` +
      `${String(layar?.width ?? 0)}x${String(layar?.height ?? 0)}): ` +
      `scrollY ${String(scrollSebelum)} -> ${String(scrollSesudah)}; ` +
      `rasio wadah cap sebelum=${rasioSebelum.toFixed(4)} cap sesudah=${rasioSesudah.toFixed(4)}; ` +
      `cap y-viewport=${yCap.toFixed(2)}; keping bawah=${keping.toFixed(2)}`,
  );
});

/**
 * E-15b — gulir halus tidak ikut pindah layar.
 *
 * Cacat yang ditemukan rangkaian ini sendiri sewaktu D-3 dipasang: menekan
 * "Lanjut" **sementara** layar masih meluncur ke cap membawa sisa luncurannya
 * ke layar berikutnya. `scrollTo(0, 0)` di `Aplikasi` membatalkan animasinya,
 * tetapi satu frame yang telanjur dikirim ke kompositor mendarat sesudahnya —
 * terukur `1016 → 1025 → 1045 → 69`, lalu diam di 69. Di bawah beban sisanya
 * jauh lebih besar: E-10 merah dua putaran berturut-turut dengan layar
 * pembukaan yang terbuka tepat di ringkasannya.
 *
 * Jadi yang dijaga di sini adalah janji yang lebih tua dari D-3: berpindah
 * layar mendaratkan pemain di puncak layar baru. Tanpa penjaga ini, cacatnya
 * hanya muncul di bawah beban — bentuk kegagalan yang paling mahal.
 */
test('E-15b menekan Lanjut saat layar masih meluncur tetap mendarat di puncak', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal1 = kasus.soal[0];
  expect(soal1, 'kasus harus punya soal pertama').toBeDefined();
  if (soal1 === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await pilihOpsi(page, soal1.jawaban);

  // Tanpa menunggu gulirnya selesai: justru selagi ia berjalan.
  await kunciJawaban(page);
  await ketuk(page.getByRole('button', { name: 'Lanjut ke soal 2' }));

  await tungguSoal(page, 2);
  await tungguGulirBerhenti(page);
  const sisa = await page.evaluate(() => window.scrollY);
  expect(
    sisa,
    `soal 2 harus terbuka di puncak layar; sisa guliran dari soal 1 = ${String(sisa)} px`,
  ).toBe(0);
  console.log(`D-3 sisa gulir saat pindah layar (${test.info().project.name}): ${String(sisa)} px`);
});
