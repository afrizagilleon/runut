import { expect, test, type Page } from '@playwright/test';
import { LABEL_MULAI, awasiGalat, gagalYangBerarti, ketuk, penandaBaru, tertutupPuncak, tungguSoal } from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-60 — pemandu pengguna baru (M3.14 D-1), di peramban yang melukis.
 *
 * Setiap konteks Playwright adalah pengunjung baru (`kunjungan_ke` 1), jadi
 * tes di berkas ini sengaja TIDAK memakai `buka()` (yang menambah
 * `pemandu=0` untuk rangkaian lain).
 *
 * - Layar pertama tidak berubah: tidak ada langkah tambahan sebelum "Mulai".
 * - Pemandu menempel di soal 1, empat langkah, bisa dilewati, tidak kembali
 *   sendiri di kunjungan kedua, dan bisa dibuka lagi lewat "Cara main".
 * - Pemandu tidak pernah menyentuh pilihan jawaban; langkah ketiga menandai
 *   `kartu_penentu`.
 * - Ketukannya sampai ke pengumpul lewat `ketuk` yang sudah ada.
 */

const KASUS = bacaKasus();
const SOAL1 = KASUS.soal[0];

function alamat(penanda: string, tambahan = ''): string {
  return `/?k=${penanda}&kasus=${KASUS.kasus_id}${tambahan}`;
}

const panel = (page: Page) => page.locator('.pemandu');

/** Sidik pilihan: kelas, `checked`, dan atribut tiap opsi — harus sama sebelum dan sesudah. */
async function sidikPilihan(page: Page): Promise<string> {
  return await page.locator('fieldset.pilihan').evaluate((f) =>
    [...f.querySelectorAll('label.opsi')]
      .map((l) => `${l.className}|${String((l.querySelector('input') as HTMLInputElement).checked)}`)
      .join(';'),
  );
}

test('E-60a pengunjung baru: layar pertama sama, lalu empat langkah di soal 1', async ({ page }) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();
  await page.goto(alamat(penanda));

  /* Layar pertama: tidak ada pemandu, tidak ada tombol tambahan. */
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('[data-uid="kalender:buka"]'), 'pengunjung baru: tanpa tautan kalender').toHaveCount(0);

  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguSoal(page, 1);
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toContainText('1 dari 4');
  await expect(page.locator('[data-uid^="bilah:"]'), 'bilah bawah menyingkir selama pemandu').toHaveCount(0);
  const awal = await sidikPilihan(page);

  // Urutan sesudah kritik D-6 (putusan B): omongan → kartu → pilihan → tombol petunjuk.
  const harapan = ['figure.pesan.disorot', '.tumpukan.disorot', 'fieldset.pilihan.disorot', '.tombol-petunjuk.disorot'];
  for (const [n, pemilih] of harapan.entries()) {
    await expect(panel(page)).toContainText(`${String(n + 1)} dari 4`);
    await expect(page.locator(pemilih).first(), `langkah ${String(n + 1)}`).toBeInViewport();
    await expect(page.locator('label.opsi.disorot, .lembar-ditandai')).toHaveCount(0);
    const tombol = page.locator(n === 3 ? '[data-uid="pemandu:selesai:4"]' : `[data-uid="pemandu:lanjut:${String(n + 1)}"]`);
    await ketuk(tombol);
  }
  /* "Tunjukkan" = petunjuk didemonstrasikan sekali: TEPAT kartu_penentu, label terbaca, pemandu selesai. */
  await expect(panel(page)).toHaveCount(0);
  const ditandai = await page
    .locator('.lembar-ditandai')
    .evaluateAll((els) => els.map((e) => (e.getAttribute('data-uid') ?? '').replace('lembar:', '')));
  expect(ditandai.sort()).toEqual([...(SOAL1?.kartu_penentu ?? [])].sort());
  await expect(page.locator('.tanda-kartu').first()).toHaveText('Coba cek kartu ini');
  await expect(page.locator('.tanda-kartu').first(), 'label petunjuk di layar').toBeInViewport({ ratio: 1 });
  await expect.poll(async () => (await tertutupPuncak(page.locator('.tanda-kartu').first())).tertutup, { message: 'label tidak tertutup keping/balon' }).toBe(false);
  await expect(page.locator('.disorot')).toHaveCount(0);
  expect(await sidikPilihan(page), 'pemandu tidak menyentuh pilihan').toBe(awal);

  /*
   * Ketukan pemandu sampai ke pengumpul lewat `ketuk` yang sudah ada. Antrean
   * disiram saat halaman ditinggalkan (pola `pelacak.spec.ts`).
   */
  const sesi = await tungguSatuSesi(penanda);
  expect(galat.kode()).toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
  await page.goto('about:blank');
  await tungguCocok(
    sesi,
    (p) => p.nama === 'ketuk' && p.isi.uid === 'pemandu:selesai:4' && p.isi.layar === 'soal-1',
    'ketuk pemandu:selesai:4 di soal-1',
  );
  await tungguCocok(
    sesi,
    (p) => p.nama === 'ketuk' && p.isi.uid === 'pemandu:lanjut:1' && p.isi.mati === false,
    'ketuk pemandu:lanjut:1 hidup',
  );
});

test('E-60b Lewati menutup; kunjungan kedua tanpa pemandu; "Cara main" membuka lagi', async ({ page }) => {
  const penanda = penandaBaru();
  await page.goto(alamat(penanda));
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguSoal(page, 1);
  await ketuk(page.locator('[data-uid="pemandu:lewati:1"]'));
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('[data-uid^="bilah:"]').first()).toBeVisible();

  /* Kunjungan kedua di peramban yang sama. */
  await page.goto(alamat(penanda));
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguSoal(page, 1);
  await expect(page.locator('[data-uid^="bilah:"]').first()).toBeVisible();
  await expect(panel(page), 'kunjungan kedua: tidak ada pemandu').toHaveCount(0);

  await ketuk(page.locator('[data-uid="cara-main"]'));
  await expect(panel(page)).toContainText('1 dari 4');
  await expect(page.locator('figure.pesan.disorot')).toBeVisible();
});

test('E-60c memilih jawaban di tengah pemandu menutupnya; ?pemandu=1 memaksa', async ({ page }) => {
  const penanda = penandaBaru();
  await page.goto(alamat(penanda, '&pemandu=1'));
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguSoal(page, 1);
  await expect(panel(page)).toBeVisible();
  const kunci = SOAL1?.pilihan[0]?.kunci ?? 'a';
  await page.locator(`[data-uid="opsi:${kunci}"]`).scrollIntoViewIfNeeded();
  await ketuk(page.locator(`[data-uid="opsi:${kunci}"]`));
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('[data-uid="bilah:kunci"]')).toBeVisible();
});

test('E-60d gerak menghormati prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(alamat(penandaBaru()));
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguSoal(page, 1);
  const transisi = await page.locator('figure.pesan.disorot').evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(transisi).toBe('0s');
  for (const n of [1, 2, 3]) await ketuk(page.locator(`[data-uid="pemandu:lanjut:${String(n)}"]`));
  await ketuk(page.locator('[data-uid="pemandu:selesai:4"]'));
  /* Tanpa gerak: kartunya sudah di layar pada frame berikutnya, tanpa luncuran. */
  await expect(page.locator('.lembar-ditandai').first()).toBeInViewport();
});
