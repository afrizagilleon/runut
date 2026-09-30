import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LABEL_LANJUT_AKHIR,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { AKAR } from './bantu/jalur.ts';

/**
 * E-50 — halaman "Dapur agen" (M3.13 D-4/D-5), di peramban yang melukis.
 *
 * - `?dapur` merender halaman dapur MENGGANTIKAN permainan: tanpa sesi, jadi
 *   tidak satu pun permintaan ke pengumpul (`/e`).
 * - Status kedua jalan dibaca dari `web/src/dapur-data.json` (hasil
 *   `alat/dapur.ts` atas jejak mentah), bukan diketik di sini.
 * - Dua pintu masuk (putusan kritikus D-5: keduanya): di layar terima kasih
 *   (tab yang sama) dan di bagian jejak verifikasi (tab baru, "↗").
 */

interface DataDapur {
  jalan: Array<{ id: string; terbit: boolean; simulasi: { nama_samaran: string } }>;
}

const DATA = JSON.parse(readFileSync(join(AKAR, 'web', 'src', 'dapur-data.json'), 'utf8')) as DataDapur;
const TAUTAN = 'Lihat dapur agen AI kami';

test('E-50a ?dapur: halaman dapur tanpa permainan dan tanpa peristiwa', async ({ page }) => {
  const keKolektor: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/e') keKolektor.push(r.url());
  });
  await page.goto('/?dapur');
  await expect(page.getByRole('heading', { level: 1, name: 'Dapur agen' })).toBeVisible();
  await expect(page.getByText('Simulasi yang kamu mainkan di sini disusun Claude (model AI) bersama pemilik proyek, lalu diuji dan disetujui manusia.')).toBeVisible();
  for (const j of DATA.jalan) {
    const label = j.terbit ? 'Draf — lolos semua penjaga, belum dimainkan' : 'Ditolak — tidak terbit';
    await expect(page.locator(`[data-uid="dapur:${j.id}"] .dapur-status`)).toHaveText(label);
    await expect(page.getByRole('heading', { name: `Jalan agen: data ${j.simulasi.nama_samaran}` })).toBeVisible();
  }
  // Amandemen A-1: tidak ada isi simulasi yang tayang; jalan atasnya hanya angka.
  await expect(page.locator('[data-uid="dapur:agregat"]')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/Perusahaan [DU]\b/);
  await expect(page.getByRole('button', { name: 'Mulai simulasi' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '← Main simulasinya' })).toHaveAttribute('href', './');
  // Tidak ada halaman yang melebar melewati layar ponsel.
  const lebih = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(lebih).toBeLessThanOrEqual(0);
  expect(keKolektor, 'halaman dapur tidak mengirim peristiwa').toEqual([]);
});

test('E-50b pintu masuk: jejak verifikasi (tab baru) dan layar terima kasih (tab sama)', async ({ page }) => {
  test.skip(test.info().project.name === 'lebar', 'alur ponsel; tata letak lebar diuji spesifikasi lain');
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(page, nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`);
  }

  const pintuB = page.locator('[data-uid="dapur:jejak"]');
  await expect(pintuB).toHaveAttribute('href', '?dapur');
  await expect(pintuB).toHaveAttribute('target', '_blank');
  await expect(pintuB).toHaveAttribute('aria-label', `${TAUTAN} (buka di tab baru)`);
  await expect(pintuB).toHaveText(`${TAUTAN} ↗`);

  await ketuk(page.getByRole('button', { name: LABEL_LANJUT_AKHIR }));
  await ketuk(page.getByRole('button', { name: LABEL_SELESAI }));
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
  const pintuA = page.getByRole('link', { name: `${TAUTAN} ›` });
  await expect(pintuA).toBeVisible();
  await expect(pintuA).not.toHaveAttribute('target', '_blank');
  await ketuk(pintuA);
  await expect(page.getByRole('heading', { level: 1, name: 'Dapur agen' })).toBeVisible();
});
