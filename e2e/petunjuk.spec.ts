import { expect, test, type Page } from '@playwright/test';
import {
  awasiGalat,
  bilahTurunAda,
  buka,
  gagalYangBerarti,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-61 — tombol "Minta petunjuk" (M3.14 D-2), di peramban yang melukis.
 *
 * - Menggulir ke dan menandai `kartu_penentu` soal itu, dengan label netral.
 * - Tidak pernah menyentuh pilihan: kelas, `checked`, dan isi tiap opsi sama
 *   persis sebelum dan sesudah.
 * - Teks yang tampil tidak memuat kalimat pilihan mana pun.
 * - Tercatat lewat `ketuk` uid `petunjuk-kartu`; tanpa peristiwa baru.
 * - Hilang sesudah dikunci; di soal berikutnya menunjuk kartu soal itu.
 */

const KASUS = bacaKasus();
const petunjuk = (page: Page) => page.locator('[data-uid="petunjuk-kartu"]');

async function sidikPilihan(page: Page): Promise<string> {
  return await page.locator('fieldset.pilihan').evaluate((f) => f.outerHTML);
}

async function kartuDitandai(page: Page): Promise<string[]> {
  return (
    await page
      .locator('.lembar-ditandai')
      .evaluateAll((els) => els.map((e) => (e.getAttribute('data-uid') ?? '').replace('lembar:', '')))
  ).sort();
}

test('E-61a petunjuk menandai kartu penentu, tidak menyentuh pilihan, dan tercatat', async ({ page }) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();
  await buka(page, penanda);
  await mulaiKasus(page);

  for (const [nomor, soal] of KASUS.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await expect(page.locator('.lembar-ditandai')).toHaveCount(0);
    const sebelum = await sidikPilihan(page);
    await petunjuk(page).scrollIntoViewIfNeeded();
    await ketuk(petunjuk(page));
    expect(await kartuDitandai(page), `soal ${String(nomor + 1)}`).toEqual([...soal.kartu_penentu].sort());
    const pertama = page.locator('.lembar-ditandai').first();
    await expect(pertama).toContainText('Coba cek kartu ini');
    await expect(pertama, 'petunjuk menggulir ke kartunya').toBeInViewport();
    expect(await sidikPilihan(page), 'pilihan tidak berubah satu atribut pun').toBe(sebelum);
    const label = (await page.locator('.tanda-kartu').allInnerTexts()).join(' ');
    for (const p of soal.pilihan) {
      expect(label.includes(p.teks.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1'))).toBe(false);
    }

    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await expect(petunjuk(page), 'sesudah dikunci tombol petunjuk hilang').toHaveCount(0);
    await expect(page.locator('.lembar-ditandai')).toHaveCount(0);
    if (nomor < KASUS.soal.length - 1) await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
  }

  const sesi = await tungguSatuSesi(penanda);
  expect(galat.kode()).toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
  await page.goto('about:blank');
  const ketukan = await tungguCocok(
    sesi,
    (p) => p.nama === 'ketuk' && p.isi.uid === 'petunjuk-kartu' && p.isi.mati === false,
    'ketuk petunjuk-kartu',
  );
  expect(new Set(ketukan.map((p) => p.isi.layar))).toEqual(new Set(['soal-1', 'soal-2', 'soal-3']));
});

test('E-61b dengan prefers-reduced-motion: tanpa transisi, kartu tetap sampai di layar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await petunjuk(page).scrollIntoViewIfNeeded();
  await ketuk(petunjuk(page));
  await expect(page.locator('.lembar-ditandai').first()).toBeInViewport();
  const gulir = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(gulir).not.toBe('smooth');
});
