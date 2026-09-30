import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_LANJUT_AKHIR,
  LABEL_MULAI,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
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
import { ID_KASUS } from './bantu/jalur.ts';
import { peristiwaSesi, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-62 — kalender simulasi (M3.14 D-3), di peramban yang melukis.
 *
 * - Muncul di layar terima kasih menggantikan "Coba simulasi lain": satu baris
 *   per simulasi NYATA (jumlah = `ID_KASUS`), tanpa hari "segera hadir".
 * - Yang baru diselesaikan ditandai; tanda itu tetap benar walau
 *   `localStorage` melempar.
 * - Memilih hari lain membuka simulasinya (sesi baru) dan `minat_kasus_lain`
 *   tetap lahir dari sesi yang ditinggalkan.
 * - Pengunjung yang kembali mendapat tautan kecil di layar pertama; pengunjung
 *   baru tidak (E-60a).
 */

async function mainkanSampaiTerimaKasih(page: Page, kasus_id: string): Promise<void> {
  const kasus = bacaKasus(kasus_id);
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(page, nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`);
  }
  await lanjut(page, LABEL_LANJUT_AKHIR);
  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
}

const baris = (page: Page, id: string) => page.locator(`[data-uid="kalender:pilih:${id}"]`);

test('E-62a sesudah satu simulasi: kalender nyata, tanda selesai, pilih hari lain', async ({ page }) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();
  const [pertama, kedua] = ID_KASUS as [string, string];
  await buka(page, penanda, pertama);
  const sesi = await tungguSatuSesi(penanda);
  await mainkanSampaiTerimaKasih(page, pertama);

  const kalender = page.locator('[data-uid="kalender-simulasi"]');
  await expect(kalender).toBeVisible();
  await expect(page.getByRole('button', { name: 'Coba simulasi lain' })).toHaveCount(0);
  await expect(page.locator('[data-uid^="kalender:pilih:"]'), 'satu baris per simulasi nyata').toHaveCount(ID_KASUS.length);
  await expect(page.locator('.kisi-simulasi'), 'satu lingkaran per simulasi nyata').toHaveCount(ID_KASUS.length);
  await expect(kalender).not.toContainText(/segera|hadir|menyusul/i);
  await expect(baris(page, pertama)).toContainText('Baru saja selesai');
  await expect(baris(page, kedua)).toContainText('Belum dimainkan');
  await expect(page.locator('.kisi-selesai')).toHaveCount(1);
  expect(
    await page.evaluate(() => window.localStorage.getItem('simulasi_selesai')),
    'tersimpan untuk kunjungan berikutnya',
  ).toBe(JSON.stringify([pertama]));

  await baris(page, kedua).scrollIntoViewIfNeeded();
  await ketuk(baris(page, kedua));
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const kasusKedua = bacaKasus(kedua);
  await expect(page.getByText(kasusKedua.soal[0]?.pesan.isi ?? '—')).toBeVisible();

  expect(peristiwaSesi(sesi).filter((p) => p.nama === 'minat_kasus_lain').length, 'minat tetap lahir').toBeLessThanOrEqual(1);
  await expect
    .poll(() => peristiwaSesi(sesi).filter((p) => p.nama === 'minat_kasus_lain').length, { timeout: 20_000 })
    .toBe(1);
  expect(galat.kode()).toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});

test('E-62b localStorage melempar: kalender tetap tampil dan tanda selesai tetap benar', async ({ page }) => {
  const galat = awasiGalat(page);
  await page.addInitScript(() => {
    const lempar = (): never => {
      throw new DOMException('diblokir', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', { get: lempar, configurable: true });
  });
  const [pertama] = ID_KASUS as [string];
  await buka(page, penandaBaru(), pertama);
  await mainkanSampaiTerimaKasih(page, pertama);
  await expect(page.locator('[data-uid^="kalender:pilih:"]')).toHaveCount(ID_KASUS.length);
  await expect(baris(page, pertama)).toContainText('Baru saja selesai');
  await expect(page.locator('.kisi-selesai')).toHaveCount(1);
  expect(galat.kode(), 'tanpa galat walau penyimpanan diblokir').toEqual([]);
});

test('E-62c pengunjung yang kembali: tautan kecil di layar pertama membuka kalender', async ({ page }) => {
  const penanda = penandaBaru();
  const [pertama, kedua] = ID_KASUS as [string, string];
  await buka(page, penanda, pertama);
  await expect(page.locator('[data-uid="kalender:buka"]'), 'kunjungan pertama: tanpa tautan').toHaveCount(0);
  await buka(page, penanda, pertama);
  const tautan = page.locator('[data-uid="kalender:buka"]');
  await expect(tautan).toBeVisible();
  await ketuk(tautan);
  await expect(page.locator('[data-uid="kalender-simulasi"]')).toBeVisible();
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toHaveCount(0);
  await ketuk(page.locator('[data-uid="kalender:tutup"]'));
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await ketuk(tautan);
  await baris(page, kedua).scrollIntoViewIfNeeded();
  await ketuk(baris(page, kedua));
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await expect(page.getByText(bacaKasus(kedua).soal[0]?.pesan.isi ?? '—')).toBeVisible();
});

test('E-62d kembali ke simulasi yang sudah selesai: tautan "Simulasi baru" membuka yang belum', async ({ page }) => {
  const penanda = penandaBaru();
  const [pertama, kedua] = ID_KASUS as [string, string];
  await buka(page, penanda, pertama);
  await mainkanSampaiTerimaKasih(page, pertama);
  await buka(page, penanda, pertama);
  const baru = page.locator(`[data-uid="kalender:baru:${kedua}"]`);
  await expect(baru).toBeVisible();
  await expect(baru).toContainText('Simulasi baru: Senin, 4 Mei 2026');
  await ketuk(baru);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await expect(page.getByText(bacaKasus(kedua).soal[0]?.pesan.isi ?? '—')).toBeVisible();
  await expect(page.locator('[data-uid^="kalender:baru:"]'), 'ULTJ belum selesai: tidak ada tawaran').toHaveCount(0);
});
