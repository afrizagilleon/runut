import { expect, test, type Page } from '@playwright/test';
import { DIR_DIST_DENGAN, ID_KASUS } from './bantu/jalur.ts';
import { bacaBundel } from './bantu/bundel.ts';
import { bacaKasus } from './bantu/kasus.ts';
import {
  LABEL_MULAI,
  awasiGalat,
  buka,
  bukaTanpaKasus,
  gagalYangBerarti,
  penandaBaru,
} from './bantu/main.ts';
import { peristiwaSesi, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-20 — pemilihan kasus (M4 D-4).
 *
 * Yang dijaga di sini adalah kegagalan yang disebut kontrak dengan nama:
 * **pemain yang sudah memainkan satu kasus disodori kasus yang sama lagi**,
 * dan sebaliknya, **`?kasus=` yang tidak dihormati** — yang akan membuat
 * seluruh rangkaian e2e lain mengukur kasus yang salah tanpa mengatakannya.
 *
 * Pilihannya sendiri sudah dites di meja (`web/src/pilih-kasus.test.ts`). Yang
 * tidak bisa dites di meja, dan karena itu ada di sini: bahwa pilihan itu
 * benar-benar sampai ke `localStorage` peramban sungguhan dan ke `kasus_id`
 * peristiwa yang tiba di pengumpul.
 */

/** Isi `localStorage.kasus_dimainkan` seperti yang dibaca peramban sungguhan. */
async function dimainkanDiPeramban(page: Page): Promise<unknown> {
  const mentah = await page.evaluate(() => window.localStorage.getItem('kasus_dimainkan'));
  return mentah === null ? null : (JSON.parse(mentah) as unknown);
}

/** `kasus_id` yang dibawa peristiwa `mulai` sesi ini. */
function kasusSesi(sesi: string): string {
  const awal = peristiwaSesi(sesi).find((p) => p.nama === 'mulai');
  expect(awal, `peristiwa mulai untuk sesi ${sesi}`).toBeDefined();
  return awal?.kasus_id ?? '';
}

test('E-20a `?kasus=` memaksa kasus itu, dan kasus_id-nya sampai ke pengumpul', async ({
  page,
}) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();
  const kasus = bacaKasus();

  await buka(page, penanda, kasus.kasus_id);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  const sesi = await tungguSatuSesi(penanda);
  expect(kasusSesi(sesi), `?kasus=${kasus.kasus_id} harus menentukan kasus yang dimainkan`).toBe(
    kasus.kasus_id,
  );

  expect(
    await dimainkanDiPeramban(page),
    'kasus yang dibuka harus tercatat di localStorage; tanpa itu kunjungan berikutnya mengulanginya',
  ).toEqual([kasus.kasus_id]);

  expect(galat.kode(), 'tidak boleh ada galat konsol').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});

test('E-20b `?kasus=` yang tak dikenal DIABAIKAN — kasus sungguhan tetap terbuka', async ({
  page,
}) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();

  await page.goto(`/?k=${penanda}&kasus=kasus-yang-tidak-pernah-ada`);

  /*
   * Yang diuji bukan "tidak melempar" melainkan "tetap memainkan kasus yang
   * sungguhan": nilai tak dikenal yang diteruskan apa adanya akan menghasilkan
   * layar kosong, dan layar kosong juga tidak punya galat konsol.
   */
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);
  expect(ID_KASUS, 'kasus yang dimainkan harus salah satu kasus yang ada').toContain(
    kasusSesi(sesi),
  );

  expect(galat.kode(), 'tidak boleh ada galat konsol').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});

test('E-20c tanpa `?kasus=` sama sekali, kasus tetap terpilih dan tercatat', async ({ page }) => {
  const penanda = penandaBaru();
  await bukaTanpaKasus(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  const sesi = await tungguSatuSesi(penanda);
  const dimainkan = kasusSesi(sesi);
  expect(ID_KASUS, 'kasus yang dipilih aplikasi harus salah satu yang terdaftar').toContain(
    dimainkan,
  );

  expect(
    await dimainkanDiPeramban(page),
    'kasus yang terpilih acak pun harus tercatat sebagai sudah dimainkan',
  ).toEqual([dimainkan]);
});

test('E-20d pesan penutup datang dari berkas kasus, bukan dari kode', () => {
  const bundel = bacaBundel(DIR_DIST_DENGAN);
  expect(bundel.length, 'harus ada berkas JS di bundel').toBeGreaterThan(0);
  const seluruhnya = bundel.map((b) => b.teks).join('\n');

  /*
   * Kalimat lamanya ditulis mati di `Aplikasi.tsx`. Kalau ia kembali ke sana,
   * setiap kasus akan menutup dengan janji yang sama — dan kata "sehat" adalah
   * penilaian saham, yang tidak pernah boleh keluar dari produk ini.
   */
  expect(
    seluruhnya.includes('perusahaan yang sehat'),
    'kalimat penutup lama tidak boleh ada lagi di bundel',
  ).toBe(false);
  expect(
    seluruhnya.includes('sedang kami siapkan'),
    'janji "sedang kami siapkan" tidak boleh ada lagi di bundel',
  ).toBe(false);

  // Yang ada di bundel adalah isi tiap berkas kasus, kata demi kata.
  for (const kasus_id of ID_KASUS) {
    const kasus = bacaKasus(kasus_id);
    expect(
      seluruhnya.includes(kasus.penutup.kepala),
      `pesan penutup ${kasus_id} (kepala) harus ikut ke bundel`,
    ).toBe(true);
    expect(
      seluruhnya.includes(kasus.penutup.isi),
      `pesan penutup ${kasus_id} (isi) harus ikut ke bundel`,
    ).toBe(true);
  }
});
