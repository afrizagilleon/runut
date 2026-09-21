import { expect, test } from '@playwright/test';
import {
  AMBANG_OPSI,
  LABEL_KUNCI,
  LABEL_SESUDAHNYA,
  LABEL_TURUN,
  bilahTurun,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  rasioDiViewport,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-04 — bilah bawah empat keadaan (M3.2 D-4), di browser yang melukis.
 *
 * Keempat keadaan itu ditentukan `bilahBawah()`, fungsi murni yang sudah punya
 * tes meja. Yang **tidak** bisa diuji tanpa browser yang melukis adalah
 * pemicunya: keadaan "opsi pertama terlihat" datang dari `IntersectionObserver`,
 * dan di panel peramban tanpa frame pengamat itu tidak pernah melapor sama
 * sekali. Jadi di sanalah bilahnya akan menetap selamanya menutupi opsi, dan
 * tidak ada tes meja yang bisa melihatnya.
 *
 * INV-12 ikut dijaga di tiap keadaan: tidak pernah ada tombol yang tampil mati.
 */
test('E-04 empat keadaan bilah bawah, dan tidak pernah ada tombol mati', async ({ page }) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);

  const laporan: string[] = [];

  const tidakAdaTombolMati = async (keadaan: string): Promise<void> => {
    await expect(
      page.locator('button:disabled'),
      `INV-12: tidak boleh ada tombol mati pada keadaan "${keadaan}"`,
    ).toHaveCount(0);
  };

  for (const [nomor, soal] of kasus.soal.entries()) {
    const terakhir = nomor === kasus.soal.length - 1;
    const kunciPertama = soal.pilihan[0]?.kunci ?? 'a';
    await tungguSoal(page, nomor + 1);

    /* --- keadaan 1 & 2: "↓ Jawab di bawah" ada persis ketika opsi belum terlihat */
    const adaTurun = await bilahTurunAda(page, kunciPertama);
    const rasioAwal = await rasioDiViewport(opsi(page, kunciPertama));
    laporan.push(
      `soal-${String(nomor + 1)} saat masuk: bilah-turun=${String(adaTurun)} ` +
        `rasio-opsi-pertama=${rasioAwal.toFixed(2)}`,
    );
    await tidakAdaTombolMati(`soal ${String(nomor + 1)} saat masuk`);

    if (adaTurun) {
      await expect(bilahTurun(page)).toBeVisible();
      await ketuk(bilahTurun(page));

      // Judul pertanyaan masuk viewport …
      const rasioJudul = await tungguMasukLayar(
        page.getByRole('heading', { name: soal.tanya }),
        0.9,
        `judul pertanyaan soal ${String(nomor + 1)} harus masuk layar sesudah "Jawab di bawah"`,
      );
      // … dan bilahnya HILANG DARI DOM begitu opsi pertama terlihat.
      const rasioOpsi = await tungguMasukLayar(
        opsi(page, kunciPertama),
        AMBANG_OPSI,
        `opsi pertama soal ${String(nomor + 1)} harus terlihat`,
      );
      await expect(
        bilahTurun(page),
        'bilah "Jawab di bawah" hilang dari DOM begitu opsi pertama terlihat',
      ).toHaveCount(0);
      laporan.push(
        `soal-${String(nomor + 1)} sesudah ketuk turun: rasio-judul=${rasioJudul.toFixed(2)} ` +
          `rasio-opsi-pertama=${rasioOpsi.toFixed(2)} bilah-turun=hilang`,
      );
    } else {
      expect(
        rasioAwal,
        'kalau bilah turun tidak dirender, opsi pertama memang sudah terlihat',
      ).toBeGreaterThanOrEqual(AMBANG_OPSI);
      // Tidak ada bilah sama sekali adalah jawaban yang sah (D-4), bukan tombol kelabu.
      await expect(page.getByRole('button', { name: LABEL_TURUN })).toHaveCount(0);
      await expect(page.getByRole('button', { name: LABEL_KUNCI })).toHaveCount(0);
    }
    await tidakAdaTombolMati(`soal ${String(nomor + 1)} sesudah turun`);

    /* --- keadaan 3: sesudah memilih → "Kunci jawaban" ------------------- */
    await pilihOpsi(page, soal.jawaban);
    await expect(page.getByRole('button', { name: LABEL_KUNCI })).toBeVisible();
    await expect(page.getByRole('button', { name: LABEL_TURUN })).toHaveCount(0);
    await tidakAdaTombolMati(`soal ${String(nomor + 1)} sesudah memilih`);

    /* --- keadaan 4: sesudah dikunci → lanjut ----------------------------- */
    await kunciJawaban(page);
    const labelLanjut = terakhir ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`;
    await expect(page.getByRole('button', { name: labelLanjut })).toBeVisible();
    await expect(page.getByRole('button', { name: LABEL_KUNCI })).toHaveCount(0);
    await tidakAdaTombolMati(`soal ${String(nomor + 1)} sesudah dikunci`);
    laporan.push(`soal-${String(nomor + 1)} sesudah dikunci: bilah="${labelLanjut}"`);

    await lanjut(page, labelLanjut);
  }

  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();

  // eslint-disable-next-line no-console
  console.log(`E-04 keadaan bilah bawah:\n  ${laporan.join('\n  ')}`);
});
