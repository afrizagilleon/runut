import { expect, test, type Page } from '@playwright/test';
import { LABEL_MULAI, buka, ketuk, penandaBaru } from './bantu/main.ts';
import { peristiwaSesi, semuaBaris, tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-23 — `galat` sampai ke berkas, disamarkan (M3.8 D-3).
 *
 * Galat "dari aplikasi" ditirukan dengan skrip yang benar-benar DIMUAT dari
 * asal aplikasi: `page.route` menjawab `/uji-galat-*.js` langsung dari tes
 * (tidak ada jaringan keluar), lalu halaman menyisipkan `<script src>` ke sana.
 * Dengan begitu `ErrorEvent.filename` adalah alamat seasal yang sungguhan,
 * persis seperti galat dari bundel kita — bukan nilai yang dikarang tes.
 *
 * Pesannya sengaja membawa semua yang tidak boleh sampai: alamat lengkap
 * dengan query, angka panjang, potongan UA. Yang diperiksa adalah BARIS di
 * berkas pengumpul.
 */

const PESAN_KOTOR =
  "boom di https://rahasia.contoh/jalur?k=kodeRahasia nomor 12345678 agen Mozilla/5.0 AppleWebKit/537.36";

async function pasangSkripGalat(page: Page): Promise<void> {
  await page.route('**/uji-galat-*.js', (rute) => {
    const nama = new URL(rute.request().url()).pathname;
    const isi =
      nama === '/uji-galat-kotor.js'
        ? `throw new Error(${JSON.stringify(PESAN_KOTOR)});`
        : // Hanya nomornya: jalur di dalam pesan akan disamarkan menjadi ‹url›,
          // dan enam pesan berbeda akan menjadi satu pesan yang sama.
          `throw new Error(${JSON.stringify(`galat berbeda ke-${nama.replace(/\D/g, '')}`)});`;
    return rute.fulfill({ contentType: 'application/javascript', body: isi });
  });
}

async function muatSkrip(page: Page, nama: string): Promise<void> {
  await page.evaluate(async (jalur) => {
    await new Promise<void>((selesai) => {
      const s = document.createElement('script');
      s.src = jalur;
      s.onload = () => selesai();
      s.onerror = () => selesai();
      document.head.appendChild(s);
    });
  }, `/${nama}`);
}

test('E-23a galat seasal = aplikasi, disamarkan; berulang dicatat sekali', async ({ page }) => {
  await pasangSkripGalat(page);
  const penanda = penandaBaru();
  await buka(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);

  for (let i = 0; i < 3; i += 1) await muatSkrip(page, 'uji-galat-kotor.js');

  const [g] = await tungguCocok(sesi, (p) => p.nama === 'galat', 'galat dari skrip seasal harus tiba');
  expect(g?.isi['jenis']).toBe('error');
  expect(g?.isi['sumber']).toBe('aplikasi');
  const pesan = String(g?.isi['pesan']);
  expect(pesan).toContain('‹url›');
  expect(pesan).toContain('‹n›');
  expect(pesan.length).toBeLessThanOrEqual(120);

  // Tiga kali dilempar, satu kali dicatat. Peristiwa penting berikutnya
  // (layar_masuk) menjadi saksi bahwa tidak ada galat kedua yang tertinggal.
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguCocok(sesi, (p) => p.nama === 'layar_masuk' && p.isi['layar'] === 'soal-1', 'soal-1');
  expect(peristiwaSesi(sesi).filter((p) => p.nama === 'galat')).toHaveLength(1);

  const mentah = JSON.stringify(semuaBaris().filter((p) => p.sesi === sesi));
  expect(mentah).not.toMatch(/rahasia|kodeRahasia|12345678|Mozilla|AppleWebKit|:\/\//);

  // eslint-disable-next-line no-console
  console.log(`E-23a [${test.info().project.name}] pesan="${pesan}"`);
});

test('E-23b galat dari luar, penolakan, dan batas lima per sesi', async ({ page }) => {
  await pasangSkripGalat(page);
  const penanda = penandaBaru();
  await buka(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);

  // Dilempar dari kode yang dievaluasi tes: tidak ada berkas seasal → luar.
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('dilempar dari luar aplikasi');
    }, 0);
  });
  const [luar] = await tungguCocok(
    sesi,
    (p) => p.nama === 'galat' && String(p.isi['pesan']).includes('dilempar dari luar'),
    'galat luar harus tiba',
  );
  expect(luar?.isi['sumber']).toBe('luar');

  await page.evaluate(() => {
    void Promise.reject(new Error(`tolak ${'y'.repeat(300)}`));
  });
  const [tolak] = await tungguCocok(
    sesi,
    (p) => p.nama === 'galat' && p.isi['jenis'] === 'penolakan',
    'penolakan harus tiba',
  );
  expect(String(tolak?.isi['pesan']).length).toBe(120);

  // Enam galat berbeda lagi: hanya tiga yang masih muat di batas lima.
  for (let i = 1; i <= 6; i += 1) await muatSkrip(page, `uji-galat-${String(i)}.js`);
  await expect
    .poll(() => peristiwaSesi(sesi).filter((p) => p.nama === 'galat').length, {
      message: 'lima galat pertama harus tiba',
    })
    .toBe(5);
  // Saksi: peristiwa penting sesudahnya tiba, dan galat tetap lima.
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguCocok(sesi, (p) => p.nama === 'layar_masuk' && p.isi['layar'] === 'soal-1', 'soal-1');
  expect(peristiwaSesi(sesi).filter((p) => p.nama === 'galat')).toHaveLength(5);

  const semua = peristiwaSesi(sesi);
  expect(semua.map((p) => p.urut), 'urut tanpa lubang').toEqual(semua.map((_, n) => n + 1));
});
