import { expect, test } from '@playwright/test';
import {
  AMBANG_OPSI,
  LABEL_KASUS_LAIN,
  LABEL_LANJUT_AKHIR,
  LABEL_LONCAT,
  LABEL_MULAI,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  awasiGalat,
  bilahTurun,
  bilahTurunAda,
  buka,
  gagalYangBerarti,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  rasioDiViewport,
  simpanLayar,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';

/**
 * E-10 — satu permainan penuh, dari layar pertama sampai pesan penutup, di
 * browser yang melukis; plus tangkapan layar D-8.
 *
 * Tes ini sengaja **tidak** membaca berkas pengumpul. Dua alasan: yang diuji di
 * sini adalah jalan yang dilalui pemain, bukan data yang lahir darinya (itu
 * E-06); dan proyek `alpha` menjalankan berkas yang sama terhadap server
 * sungguhan, tempat berkas pengumpulnya tidak boleh — dan tidak bisa — dibaca.
 *
 * Tangkapan layarnya bahan review, bukan pembanding: tidak ada
 * `toHaveScreenshot` di sini, dan tidak pernah ada tes yang merah karena satu
 * piksel bergeser.
 */
test('E-10 satu permainan penuh, tanpa galat konsol, dengan tangkapan layar', async ({ page }) => {
  const kasus = bacaKasus();
  const galat = awasiGalat(page);
  /*
   * Proyek `alpha` memakai `?k=uji` seperti yang disepakati D-9: penanda itu
   * sudah dikecualikan dari ringkasan pemilik, jadi sesi reviewer tidak ikut
   * terhitung sebagai peserta.
   */
  const penanda = test.info().project.name === 'alpha' ? 'uji' : penandaBaru();

  await buka(page, penanda);

  /* --- layar pertama ------------------------------------------------- */
  const tombolMulai = page.getByRole('button', { name: LABEL_MULAI });
  await expect(tombolMulai).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kita mundur ke');
  await simpanLayar(page, 1, 'layar-pertama');

  await mulaiKasus(page);

  /* --- soal 1: jawab SALAH ------------------------------------------- */
  const soal1 = kasus.soal[0];
  expect(soal1, 'kasus harus punya soal pertama').toBeDefined();
  if (soal1 === undefined) return;

  await tungguSoal(page, 1);
  await expect(page.getByRole('heading', { name: soal1.tanya })).toBeVisible();
  await simpanLayar(page, 2, 'soal-1-atas');

  const kunciPertama = soal1.pilihan[0]?.kunci ?? 'a';
  const adaBilahTurun = await bilahTurunAda(page, kunciPertama);
  if (adaBilahTurun) {
    await ketuk(bilahTurun(page));
    // Begitu diketuk, judul pertanyaan masuk layar dan bilahnya menyingkir.
    await tungguMasukLayar(
      opsi(page, kunciPertama),
      AMBANG_OPSI,
      'opsi pertama harus terlihat sesudah "Jawab di bawah" diketuk',
    );
  }
  await simpanLayar(page, 3, 'sesudah-jawab-di-bawah');

  /* --- sumber sebuah lembar dibuka di tempat -------------------------- */
  const faktaPertama = soal1.kartu[0] ?? '';
  const kaki = page.locator(`[data-uid="kaki:${faktaPertama}"]`);
  await expect(kaki).toHaveAttribute('aria-expanded', 'false');
  await ketuk(kaki);
  await expect(kaki).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Kalimat resminya').first()).toBeVisible();
  await simpanLayar(page, 4, 'sumber-terbuka');

  const salah = kunciSalah(soal1);
  await pilihOpsi(page, salah);
  await kunciJawaban(page);
  await expect(page.getByText('Belum cocok dengan kartu')).toBeVisible();
  await simpanLayar(page, 5, 'soal-1-dikunci-salah');

  /* --- soal 2: jawab BENAR -------------------------------------------- */
  const soal2 = kasus.soal[1];
  expect(soal2, 'kasus harus punya soal kedua').toBeDefined();
  if (soal2 === undefined) return;

  await lanjut(page, 'Lanjut ke soal 2');
  await tungguSoal(page, 2);
  await expect(page.getByRole('heading', { name: soal2.tanya })).toBeVisible();
  await simpanLayar(page, 6, 'soal-2');

  await bilahTurunAda(page, soal2.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal2.jawaban);
  await kunciJawaban(page);
  await expect(page.getByText('Cocok dengan kartu').first()).toBeVisible();

  /* --- soal 3: jawab BENAR -------------------------------------------- */
  const soal3 = kasus.soal[2];
  expect(soal3, 'kasus harus punya soal ketiga').toBeDefined();
  if (soal3 === undefined) return;

  await lanjut(page, 'Lanjut ke soal 3');
  await tungguSoal(page, 3);
  await expect(page.getByRole('heading', { name: soal3.tanya })).toBeVisible();
  await simpanLayar(page, 7, 'soal-3');

  await bilahTurunAda(page, soal3.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal3.jawaban);
  await kunciJawaban(page);

  /* --- pembukaan ------------------------------------------------------ */
  await lanjut(page, LABEL_SESUDAHNYA);
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await simpanLayar(page, 8, 'pembukaan-atas');
  await simpanLayar(page, 9, 'pembukaan-penuh', true);

  const ringkasan = page.getByRole('heading', { name: 'Apa yang bisa dan tidak bisa dibaca' });
  expect(
    await rasioDiViewport(ringkasan),
    'ringkasan harus berada di luar layar sebelum jalan pintas diketuk',
  ).toBeLessThan(0.5);
  await ketuk(page.getByRole('button', { name: LABEL_LONCAT }));
  await tungguMasukLayar(
    ringkasan,
    0.9,
    '"Langsung ke ringkasan" harus menggulir judul ringkasan ke dalam layar',
  );

  /* --- layar akhir ---------------------------------------------------- */
  await lanjut(page, LABEL_LANJUT_AKHIR);
  await expect(page.getByRole('heading', { name: 'Tiga pertanyaan singkat' })).toBeVisible();
  await expect(page.getByRole('group')).toHaveCount(3);
  await expect(page.locator('textarea')).toHaveCount(1);
  await simpanLayar(page, 10, 'layar-akhir');

  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
  await simpanLayar(page, 11, 'terima-kasih');

  await ketuk(page.getByRole('button', { name: LABEL_KASUS_LAIN }));
  await expect(page.getByText('Tidak semua saham seperti ini.')).toBeVisible();
  await simpanLayar(page, 12, 'kasus-lain');

  expect(galat.kode(), 'tidak boleh ada galat konsol maupun pageerror sepanjang permainan').toEqual(
    [],
  );
  expect(
    gagalYangBerarti(galat.permintaanGagal()),
    'tidak boleh ada permintaan yang gagal selain ikon tab yang memang tidak disediakan',
  ).toEqual([]);
});
