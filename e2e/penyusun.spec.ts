import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AKAR, CACHE } from './bantu/jalur.ts';

/**
 * E-60 — asap halaman pintu penyusun (M2d-9), di Chromium yang melukis.
 *
 * Server penyusun dijalankan oleh spesifikasi ini sendiri dalam MODE PALSU
 * (`--palsu`): agen palsu (lingkar & gerbang kode sungguhan, model palsu) dan
 * Sectors palsu (404), di 127.0.0.1 port bebas, keluaran ke folder sementara.
 * Tidak ada jaringan keluar dan tidak ada biaya. Tangkapan layar ke
 * `.cache/e2e/m2d9/`.
 *
 * Dengan konfigurasi bawaan hanya berjalan di proyek `ponsel-terang` (satu
 * proyek cukup; viewport laptop diatur di berkas ini). Tanpa server produk:
 * `npx playwright test --config <konfigurasi berisi proyek "penyusun">`.
 */

const LAYAR = join(CACHE, 'm2d9');
let server: ChildProcess | null = null;
let asal = '';
let keluaran = '';

test.use({ viewport: { width: 1100, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.skip(!['ponsel-terang', 'penyusun'].includes(test.info().project.name), 'satu proyek cukup: halaman alat, viewport laptop diatur di berkas ini');
  mkdirSync(LAYAR, { recursive: true });
  keluaran = mkdtempSync(join(tmpdir(), 'penyusun-e2e-'));
  server = spawn(process.execPath, ['--experimental-strip-types', join(AKAR, 'alat', 'penyusun', 'server.ts'), '--port', '0', '--palsu', '--keluaran', keluaran], { cwd: AKAR });
  asal = await new Promise<string>((selesai, gagal) => {
    let teks = '';
    const waktu = setTimeout(() => gagal(new Error(`server penyusun tidak siap: ${teks}`)), 30_000);
    server?.stdout?.on('data', (b: Buffer) => {
      teks += b.toString('utf8');
      const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(teks);
      if (m !== null) {
        clearTimeout(waktu);
        selesai(`http://127.0.0.1:${m[1] ?? ''}`);
      }
    });
    server?.on('exit', (k) => gagal(new Error(`server penyusun keluar (${String(k)}): ${teks}`)));
  });
});

test.afterAll(() => {
  server?.kill();
  server = null;
});

function jagaLokal(page: Page): string[] {
  const luar: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(asal)) luar.push(r.url());
  });
  return luar;
}

test('E-60a usulan hari, penolakan tanggal beralasan, dan persetujuan kredit', async ({ page }) => {
  const luar = jagaLokal(page);
  await page.goto(`${asal}/`);
  await expect(page.getByRole('heading', { level: 1, name: 'Agen penyusun' })).toBeVisible();
  await expect(page.locator('#mode')).toContainText('MODE PALSU');
  await page.fill('#kode', 'TIRT');
  await page.click('#form-kode button');
  await expect(page.locator('.kartu-usulan')).toHaveCount(3);
  await expect(page.locator("[data-tanggal='2025-12-10'] h3")).toContainText('Penghentian sementara');
  await expect(page.locator('#usulan')).toContainText('Data sesudah T dilihat HANYA untuk menghitung');
  await page.screenshot({ path: join(LAYAR, 'e60a-usulan.png'), fullPage: true });

  await page.fill('#tanggal', '2025-12-13');
  await page.click('#form-tanggal button');
  await expect(page.locator('[data-kode="BUKAN_HARI_BURSA"]')).toContainText('bursa tutup di akhir pekan');
  await expect(page.locator('[data-kode="BUKAN_HARI_BURSA"] button')).toHaveCount(2);
  await page.fill('#tanggal', '2026-10-07');
  await page.click('#form-tanggal button');
  await expect(page.locator('[data-kode="MASA_DEPAN"]')).toContainText('masa depan');
  await page.screenshot({ path: join(LAYAR, 'e60a-tanggal-ditolak.png') });

  await page.fill('#kode', 'ZZZZ');
  await page.click('#form-kode button');
  await expect(page.locator('#kode-isi')).toContainText('paling banyak 10 kredit');
  await page.click('#kode-isi .tombol-utama');
  await expect(page.locator('#kode-isi')).toContainText('Sectors tidak mengenal kode ZZZZ');
  expect(luar).toEqual([]);
});

test('E-60b agen bekerja terlihat → draf terbit → perbaiki kata → uji ulang → setujui', async ({ page }) => {
  const luar = jagaLokal(page);
  await page.goto(`${asal}/`);
  await page.fill('#kode', 'TIRT');
  await page.click('#form-kode button');
  await page.fill('#nama-jalan', 'asap-tirt');
  await page.click("[data-tanggal='2025-12-10'] button");
  await expect(page.locator('#setujui-biaya')).toBeVisible();
  await expect(page.locator('[data-tahap="aturan"]')).toContainText('33 aturan pemeriksa');
  await expect(page.locator('[data-tahap="paket"]')).toContainText('definisi kurasi M2d');
  await page.screenshot({ path: join(LAYAR, 'e60b-persetujuan-biaya.png'), fullPage: true });
  await page.click('#setujui-biaya');
  await expect(page.locator('#terbit')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-tahap="agen"]').filter({ hasText: 'kritikus: kritikus makna' })).toHaveCount(3);
  await expect(page.locator('#hasil-isi article.omongan')).toHaveCount(3);
  await page.screenshot({ path: join(LAYAR, 'e60b-terbit.png'), fullPage: true });

  // Angka dikunci: omongan 2 menyebut "58".
  await page.click('[data-sunting="2"] summary');
  const area2 = page.locator('[data-sunting="2"] textarea');
  await area2.fill((await area2.inputValue()).replace('58', '59'));
  await page.click('[data-sunting="2"] button');
  await expect(page.locator('[data-sunting="2"] p.tidak')).toContainText('Angka dikunci');
  // Kata boleh diganti: omongan 1.
  await page.click('[data-sunting="1"] summary');
  const area = page.locator('[data-sunting="1"] textarea');
  const lama = await area.inputValue();
  await area.fill(lama.replace('gara-gara', 'karena'));
  await page.click('[data-sunting="1"] button');
  await expect(page.locator('#uji-ulang')).toBeVisible();
  await expect(page.locator('#setujui')).toHaveCount(0);
  await page.click('#uji-ulang');
  await expect(page.locator('#setujui')).toBeVisible({ timeout: 30_000 });
  await page.click('#setujui');
  await expect(page.locator('#putusan')).toContainText('bukan cases/');
  await expect(page.locator('#catatan-suntingan')).toContainText('manusia');
  await page.screenshot({ path: join(LAYAR, 'e60b-disetujui.png'), fullPage: true });

  const disetujui = join(keluaran, 'asap-tirt', 'draf-disetujui.json');
  expect(existsSync(disetujui)).toBe(true);
  expect(readFileSync(disetujui, 'utf8')).toContain('karena');
  expect(luar).toEqual([]);
});
