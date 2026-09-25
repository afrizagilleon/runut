import { expect, test, type Page } from '@playwright/test';
import { LABEL_MULAI, buka, ketuk, penandaBaru } from './bantu/main.ts';
import { peristiwaSesi, tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-22 — `tampak`: pindah aplikasi lalu kembali, sampai ke berkas (M3.8 D-2).
 *
 * Chromium headless tidak pernah benar-benar menyembunyikan halamannya, jadi
 * perpindahan itu ditirukan: `document.visibilityState` ditimpa di halaman,
 * lalu `visibilitychange` dinyalakan — persis urutan yang dilihat pendengar
 * aplikasi di ponsel. Yang diuji adalah apa yang terjadi SESUDAH peristiwa itu:
 *
 * - `sembunyi` harus tiba di pengumpul **tanpa satu gerakan pun sesudahnya**.
 *   Halaman yang tersembunyi bisa dibekukan kapan saja; peristiwa yang baru
 *   dikirim pada gerakan berikutnya adalah peristiwa yang tidak pernah dikirim.
 * - `ms_sembunyi` pada `kembali` harus sama dengan selang yang diukur halaman
 *   itu sendiri (jam `Date.now()` peramban), bukan sekadar "angka".
 */

async function jadikan(page: Page, keadaan: 'hidden' | 'visible'): Promise<number> {
  return page.evaluate((k) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => k });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => k === 'hidden' });
    const saat = Date.now();
    document.dispatchEvent(new Event('visibilitychange'));
    return saat;
  }, keadaan);
}

test('E-22a sembunyi tiba tanpa gerakan berikutnya; kembali membawa lama yang sebenarnya', async ({
  page,
}) => {
  const penanda = penandaBaru();
  await buka(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);

  const saatSembunyi = await jadikan(page, 'hidden');
  // Tidak ada ketukan, tidak ada navigasi: yang ditunggu hanya berkasnya.
  const [sembunyi] = await tungguCocok(
    sesi,
    (p) => p.nama === 'tampak' && p.isi['keadaan'] === 'sembunyi',
    'tampak sembunyi harus tiba tanpa gerakan berikutnya',
  );
  expect(sembunyi?.isi).toEqual({ layar: 'pembuka', keadaan: 'sembunyi', ms_sembunyi: null });

  /*
   * Selangnya harus cukup panjang supaya toleransi 50 ms di bawah berarti
   * sesuatu: tanpa ini selang alaminya hanya ±30 ms, dan `ms_sembunyi: 0`
   * pun akan lolos. Yang ditunggu adalah JAM halaman, lewat `expect.poll` —
   * bukan `waitForTimeout`: yang diukur memang waktu, jadi waktu harus lewat.
   */
  await expect
    .poll(() => page.evaluate(() => Date.now()), { message: 'menunggu 400 ms jam halaman' })
    .toBeGreaterThanOrEqual(saatSembunyi + 400);
  const saatKembali = await jadikan(page, 'visible');
  const selang = saatKembali - saatSembunyi;

  // `kembali` bukan peristiwa penting; ketukan "Mulai simulasi" menyiramnya
  // bersama `layar_masuk`, seperti yang terjadi pada pemain sungguhan.
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  const [kembali] = await tungguCocok(
    sesi,
    (p) => p.nama === 'tampak' && p.isi['keadaan'] === 'kembali',
    'tampak kembali harus tiba',
  );
  const ms = kembali?.isi['ms_sembunyi'];
  expect(typeof ms).toBe('number');
  // Reducer mengukur dari cap waktu dispatch; selisih dengan jam halaman hanya
  // selang dua baris kode, jadi toleransinya kecil.
  expect(selang).toBeGreaterThanOrEqual(400);
  expect(Math.abs((ms as number) - selang), `ms_sembunyi=${String(ms)} selang=${String(selang)}`).toBeLessThanOrEqual(50);
  expect(kembali?.isi['layar']).toBe('pembuka');

  const semua = peristiwaSesi(sesi);
  expect(semua.map((p) => p.urut), 'urut tanpa lubang').toEqual(semua.map((_, n) => n + 1));

  // eslint-disable-next-line no-console
  console.log(
    `E-22a [${test.info().project.name}] selang-halaman=${String(selang)}ms ms_sembunyi=${String(ms)} ` +
      `urutan=${semua.map((p) => (p.nama === 'tampak' ? `tampak:${String(p.isi['keadaan'])}` : p.nama)).join(',')}`,
  );
});
