import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_KEMBALI_KARTU,
  bilahTurun,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { tungguPeristiwa, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-07 — pengamat tumpukan kartu.
 *
 * `ms_kartu_terlihat_sebelum` dan `gulir_balik_ke_kartu` adalah dua angka yang
 * dipakai pemilik untuk menjawab "apakah orang benar-benar membaca kartunya
 * sebelum menjawab". Keduanya datang dari `IntersectionObserver`, dan di
 * peramban yang tidak melukis pengamat itu **tidak pernah melapor sama sekali**
 * — persis kegagalan F-1, ketika ketiga soal tercatat nol detik. Tes ini hanya
 * bisa hijau di browser yang benar-benar menghasilkan frame.
 */

/**
 * Tunggu sekian milidetik **menurut jam halaman**.
 *
 * Bukan `waitForTimeout`: yang dijaga di sini adalah jam yang dipakai produk
 * untuk menghitung (`Date.now()` di halaman yang sama), bukan jam proses tes.
 * `expect.poll` atas `performance.now()` menunggu hal yang benar-benar diukur.
 */
async function tungguJamHalaman(page: Page, ms: number): Promise<number> {
  const mulai = await page.evaluate(() => performance.now());
  await expect
    .poll(async () => (await page.evaluate(() => performance.now())) - mulai, {
      timeout: 15_000,
      message: `menunggu ${String(ms)} ms berlalu pada jam halaman`,
    })
    .toBeGreaterThanOrEqual(ms);
  return (await page.evaluate(() => performance.now())) - mulai;
}

/** Berapa bagian tumpukan kartu yang sedang berada di dalam layar, 0–1. */
async function rasioTumpukan(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const tumpukan = document.querySelector('.tumpukan');
    if (tumpukan === null) return -1;
    const k = tumpukan.getBoundingClientRect();
    if (k.height <= 0) return 0;
    const atas = Math.max(0, k.top);
    const bawah = Math.min(window.innerHeight, k.bottom);
    return bawah <= atas ? 0 : (bawah - atas) / k.height;
  });
}

test('E-07 lama kartu terlihat dan gulir balik ke kartu sampai ke berkas', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  const penanda = penandaBaru();
  await buka(page, penanda);
  const sesi = await tungguSatuSesi(penanda);
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  const rasioAwal = await rasioTumpukan(page);
  expect(rasioAwal, 'tumpukan kartu memang terlihat saat layar soal dibuka').toBeGreaterThan(0.5);

  /* --- membaca kartu lebih dari satu detik --------------------------- */
  const dibaca = await tungguJamHalaman(page, 1100);

  /* --- turun ke opsi: kartu keluar layar ------------------------------ */
  const adaTurun = await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  expect(adaTurun, 'di 360 x 640 opsi pertama belum terlihat').toBe(true);
  await ketuk(bilahTurun(page));
  await expect
    .poll(async () => await rasioTumpukan(page), {
      message: 'tumpukan kartu harus keluar layar sesudah turun ke opsi',
    })
    .toBeLessThan(0.5);

  /* --- "↑ Kembali ke dokumen": kartu masuk layar lagi ------------------ */
  await ketuk(page.getByRole('button', { name: LABEL_KEMBALI_KARTU }));
  const rasioBalik = await expect
    .poll(async () => await rasioTumpukan(page), {
      message: '"Kembali ke dokumen" harus membawa tumpukan kartu kembali ke layar',
    })
    .toBeGreaterThan(0.5)
    .then(async () => await rasioTumpukan(page));

  /* --- jawab dan kunci -------------------------------------------------- */
  await pilihOpsi(page, soal.jawaban);
  await kunciJawaban(page);
  const kunci = await tungguPeristiwa(sesi, 'kunci_jawaban', 1);
  const isi = kunci[0]?.isi ?? {};

  const msKartu = Number(isi.ms_kartu_terlihat_sebelum ?? -1);
  const gulirBalik = Number(isi.gulir_balik_ke_kartu ?? -1);

  expect(
    msKartu,
    `kartu terlihat ${String(msKartu)} ms sebelum dikunci (dibaca ${dibaca.toFixed(0)} ms di jam halaman)`,
  ).toBeGreaterThanOrEqual(800);
  expect(gulirBalik, 'gulir balik ke kartu tercatat setidaknya sekali').toBeGreaterThanOrEqual(1);

  // eslint-disable-next-line no-console
  console.log(
    `E-07 sesi=${sesi} rasio-tumpukan-awal=${rasioAwal.toFixed(2)} ` +
      `rasio-sesudah-kembali=${rasioBalik.toFixed(2)} dibaca=${dibaca.toFixed(0)}ms ` +
      `ms_kartu_terlihat_sebelum=${String(msKartu)} gulir_balik_ke_kartu=${String(gulirBalik)} ` +
      `ms_di_soal=${String(isi.ms_di_soal)}`,
  );
});
