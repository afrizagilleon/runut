import { expect, test } from '@playwright/test';
import { LABEL_MULAI, buka, penandaBaru } from './bantu/main.ts';
import { mulaiDenganPenanda, peristiwaSesi, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-06a — `mulai` tiba tanpa meninggalkan halaman, tepat **satu** per sesi.
 *
 * Dua cacat berbeda dijaga satu tes:
 *
 * - **Terlambat.** Sebelum A-1, `mulai` menunggu antrean penuh atau halaman
 *   mati, jadi kunjungan yang ditinggalkan di layar pertama tidak pernah sampai
 *   ke pengumpul. Yang hilang begitu bukan sembarang angka: ia justru jumlah
 *   pengunjung, angka yang akan disebut pemilik ke juri. Karena itu tes ini
 *   menunggu berkas pengumpul **sementara halamannya masih terbuka** dan tidak
 *   pernah disentuh.
 * - **Kembar.** `StrictMode` menjalankan efek dua kali di mode pengembangan, dan
 *   `mulai` pernah lahir dua kali karenanya. Karena itu proyek `dev` ikut
 *   menjalankan tes ini, dan jumlahnya diperiksa `toBe(1)` — bukan "setidaknya
 *   satu".
 */
test('E-06a mulai tiba tanpa meninggalkan halaman, tepat satu per sesi', async ({ page }) => {
  const penanda = penandaBaru();
  await buka(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  // Halamannya masih terbuka dan belum diketuk sama sekali.
  const sesi = await tungguSatuSesi(penanda);

  const mulai = mulaiDenganPenanda(penanda);
  expect(mulai.length, 'tepat satu peristiwa "mulai" untuk penanda ini').toBe(1);
  const satu = mulai[0];
  expect(satu).toBeDefined();
  if (satu === undefined) return;

  expect(satu.isi.penanda, 'mulai membawa penanda yang dipakai tes').toBe(penanda);
  expect(satu.urut, 'mulai adalah peristiwa pertama sesi').toBe(1);
  expect(satu.sesi).toBe(sesi);
  expect(typeof satu.isi.lebar_layar).toBe('number');

  const semua = peristiwaSesi(sesi);
  expect(
    semua.filter((p) => p.nama === 'mulai').length,
    'tidak ada mulai kembar di sesi ini',
  ).toBe(1);

  // eslint-disable-next-line no-console
  console.log(
    `E-06a [${test.info().project.name}] sesi=${sesi} mulai=1 ` +
      `peristiwa-saat-diperiksa=${semua.map((p) => p.nama).join(',')}`,
  );
});
