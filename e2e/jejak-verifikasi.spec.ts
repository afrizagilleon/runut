import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-18 — kata-kata Jejak verifikasi (M3.6 D-5).
 *
 * Dua hal yang salah sampai M3.5, keduanya ditemukan pemilik:
 *
 * 1. **"rantai laporan kepemilikan"** terdengar seperti "rantai komando".
 *    Kalimat pembuka jejak tidak boleh memakai kata itu lagi.
 * 2. **"sepuluh aturan"** ditulis mati di dalam komponen. Mesin verifikasi V2
 *    punya 31 aturan, tetapi kasus DADA yang hidup masih dibangun V1 dengan 10.
 *    Angka yang ditulis tangan akan berbohong ke salah satu arah begitu mesinnya
 *    berganti, jadi ia sekarang **dibaca dari berkas kasus**.
 *
 * Tes ini membaca angkanya dari `cases/*.json` juga — kalau ia menyalinnya, ia
 * hanya akan setuju dengan salinannya sendiri.
 */

async function sampaiPembukaan(page: Page): Promise<void> {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
}

test('E-18 jejak verifikasi: angkanya dari data, dan kata "rantai" tidak dipakai lagi', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const aturan = kasus.pemeriksaan.length;
  const dijalankan = kasus.pemeriksaan.filter((p) => p.dijalankan).length;
  const temuan = kasus.temuan.length;
  expect(aturan, 'berkas kasus harus memuat daftar pemeriksaan').toBeGreaterThan(0);

  await sampaiPembukaan(page);
  await expect(page.getByRole('heading', { name: 'Jejak verifikasi' })).toBeVisible();

  /* --- kalimat pembuka ------------------------------------------------ */
  const kalimat = page.locator('.jejak > p').first();
  const teks = (await kalimat.innerText()).replace(/\s+/g, ' ');

  /*
   * Hanya aturan yang DIJALANKAN (M3.11 A-1 D-9): DADA mendaftar 10 aturan dan
   * menjalankan 9 (R8 dilewati, datanya tidak ada). "Diperiksa dengan 10
   * pemeriksaan otomatis" mengaku lebih dari yang terjadi.
   */
  expect(dijalankan, 'kasus ini memang punya aturan yang dilewati').toBeLessThan(aturan);
  expect(
    teks,
    `kalimat jejak harus menyebut ${String(dijalankan)} pemeriksaan yang dijalankan (dibaca dari berkas kasus); ` +
      `yang ada: ${teks}`,
  ).toContain(`diperiksa dengan ${String(dijalankan)} pemeriksaan otomatis`);
  expect(teks, `kalimat jejak harus menyebut ${String(temuan)} hal yang tidak cocok`).toContain(
    `${String(temuan)} hal yang tidak cocok`,
  );
  /*
   * Angka mesin V2 tidak boleh bocor ke kalimat kasus V1, dan sebaliknya angka
   * itu tidak boleh dieja sebagai kata lagi ("sepuluh") — kata tidak ikut
   * berubah ketika datanya berubah.
   */
  expect(teks, 'angka 31 milik mesin V2 tidak boleh muncul di kasus V1').not.toContain('31');
  expect(teks, 'angkanya dibaca, bukan dieja').not.toContain('sepuluh');
  expect(teks.toLowerCase(), `kata "rantai" tidak dipakai lagi; yang ada: ${teks}`).not.toContain(
    'rantai',
  );

  /* --- ringkasan lipatan ---------------------------------------------- */
  const ringkasan = page.locator('details[data-uid="jejak"] > summary');
  const teksRingkasan = (await ringkasan.innerText()).replace(/\s+/g, ' ').trim();
  expect(teksRingkasan, 'ringkasan lipatan menyebut angka yang sama').toBe(
    `Lihat ${String(dijalankan)} pemeriksaan dan hasilnya`,
  );
  expect(teksRingkasan.toLowerCase()).not.toContain('rantai');

  /* --- kaki lipatan tetap jujur tentang yang tidak bisa dijalankan ---- */
  await ringkasan.click();
  const rinci = page.locator('details[data-uid="jejak"]');
  await expect(rinci).toHaveJSProperty('open', true);
  const kaki = (await rinci.innerText()).replace(/\s+/g, ' ');
  expect(
    kaki,
    `lipatan harus tetap mengatakan berapa aturan yang tidak bisa dijalankan ` +
      `(${String(aturan - dijalankan)} dari ${String(aturan)})`,
  ).toContain(`${String(aturan - dijalankan)} dari ${String(aturan)}`);

  console.log(
    `E-18 jejak: aturan-di-berkas=${String(aturan)} dijalankan=${String(dijalankan)} ` +
      `temuan=${String(temuan)}\n  kalimat="${teks}"\n  ringkasan="${teksRingkasan}"`,
  );
});
