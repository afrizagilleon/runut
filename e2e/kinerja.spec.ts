import { expect, test } from '@playwright/test';
import { LABEL_MULAI, buka, ketuk, penandaBaru } from './bantu/main.ts';
import { peristiwaSesi, tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-24 — `kinerja` sampai ke berkas, sekali per sesi (M3.8 D-4).
 *
 * Batasnya dibaca dari jam halaman sendiri (`performance.now()`), jadi tes
 * tahu rentang yang benar tanpa bertanya kepada produk: waktu tampil tidak
 * mungkin lebih besar dari "sekarang" ketika tombol pertama sudah terlihat,
 * dan waktu interaktif harus jatuh di antara saat sebelum dan sesudah ketukan.
 */

test('E-24a ketukan hidup pertama menutup kinerja; kedua angkanya di dalam jam halaman', async ({
  page,
}) => {
  const penanda = penandaBaru();
  await buka(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);
  const sesudahTampil = await page.evaluate(() => performance.now());

  const sebelumKetuk = await page.evaluate(() => performance.now());
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  const [k] = await tungguCocok(sesi, (p) => p.nama === 'kinerja', 'kinerja harus tiba');
  const sesudahKetuk = await page.evaluate(() => performance.now());

  const tampil = k?.isi['ms_ke_tampil'];
  const interaktif = k?.isi['ms_ke_interaktif'];
  expect(typeof tampil).toBe('number');
  expect(typeof interaktif).toBe('number');
  expect(tampil as number).toBeGreaterThan(0);
  expect(tampil as number).toBeLessThanOrEqual(Math.ceil(sesudahTampil));
  expect(interaktif as number).toBeGreaterThanOrEqual(Math.floor(sebelumKetuk));
  expect(interaktif as number).toBeLessThanOrEqual(Math.ceil(sesudahKetuk));
  expect(Number.isInteger(tampil) && Number.isInteger(interaktif), 'dibulatkan').toBe(true);

  // Sekali per sesi: ketukan dan sembunyi berikutnya tidak melahirkan yang kedua.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tungguCocok(sesi, (p) => p.nama === 'tampak', 'tampak sembunyi');
  expect(peristiwaSesi(sesi).filter((p) => p.nama === 'kinerja')).toHaveLength(1);

  // eslint-disable-next-line no-console
  console.log(
    `E-24a [${test.info().project.name}] ms_ke_tampil=${String(tampil)} (≤ ${sesudahTampil.toFixed(0)}) ` +
      `ms_ke_interaktif=${String(interaktif)} (${sebelumKetuk.toFixed(0)}–${sesudahKetuk.toFixed(0)})`,
  );
});

test('E-24b tanpa ketukan: kinerja lahir saat halaman tersembunyi, interaktif null', async ({
  page,
}) => {
  const penanda = penandaBaru();
  await buka(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const [k] = await tungguCocok(sesi, (p) => p.nama === 'kinerja', 'kinerja harus tiba tanpa ketukan');
  expect(typeof k?.isi['ms_ke_tampil']).toBe('number');
  expect(k?.isi['ms_ke_interaktif']).toBeNull();
  const urutan = peristiwaSesi(sesi).map((p) => p.nama);
  expect(urutan.indexOf('kinerja'), 'kinerja mendahului tampak').toBe(urutan.indexOf('tampak') - 1);
});
