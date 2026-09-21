import { expect, test } from '@playwright/test';
import {
  bilahTurunAda,
  buka,
  kunciJawaban,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';

/**
 * E-11 — sesudah jawaban salah, pemain tahu mana tadi pilihannya.
 *
 * Cacat aslinya (M3.1 §10f, ditambal A4-T4) lahir dari keputusan reviewer di
 * A1-T4: pilihan pemain yang keliru diturunkan menjadi abu-abu **tanpa label
 * apa pun**. Penekanan memang pindah ke jawaban yang cocok, tetapi pemilik
 * kehilangan satu-satunya hal yang ia butuhkan untuk belajar dari kesalahannya.
 *
 * Yang dijaga di sini adalah **kata**, bukan warna: kata bisa dibaca oleh orang
 * yang tidak membedakan warna, dan kata bisa dites.
 */

const LABEL_PILIHAN_PEMAIN = 'Pilihanmu';
const LABEL_COCOK = '✓ yang cocok dengan kartu';

test('E-11 sesudah salah: "Pilihanmu" dan "yang cocok dengan kartu" di dua opsi berbeda', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');

  const salah = kunciSalah(soal);
  expect(salah, 'opsi keliru harus berbeda dari jawaban').not.toBe(soal.jawaban);

  /* --- sebelum dikunci: hanya "Pilihanmu", belum ada tanda cocok ------ */
  await pilihOpsi(page, salah);
  await expect(opsi(page, salah)).toContainText(LABEL_PILIHAN_PEMAIN);
  await expect(page.getByText(LABEL_COCOK), 'jawaban belum dibocorkan sebelum dikunci').toHaveCount(
    0,
  );

  await kunciJawaban(page);

  /* --- sesudah dikunci ------------------------------------------------- */
  await expect(
    opsi(page, salah),
    'opsi yang dipilih pemain tetap berlabel "Pilihanmu"',
  ).toContainText(LABEL_PILIHAN_PEMAIN);
  await expect(
    opsi(page, soal.jawaban),
    'opsi yang benar berlabel "yang cocok dengan kartu"',
  ).toContainText(LABEL_COCOK);

  // Keduanya harus opsi yang BERBEDA: label yang benar di baris yang sama
  // dengan pilihan pemain akan berarti pemainnya menjawab benar.
  await expect(
    opsi(page, salah),
    'label cocok tidak boleh ikut menempel di pilihan yang keliru',
  ).not.toContainText(LABEL_COCOK);
  await expect(
    opsi(page, soal.jawaban),
    'label "Pilihanmu" tidak boleh menempel di opsi yang tidak dipilih',
  ).not.toContainText(LABEL_PILIHAN_PEMAIN);

  /* --- cap umpan balik --------------------------------------------------- */
  const cap = page.getByText('Belum cocok dengan kartu');
  await expect(cap, 'cap "BELUM COCOK DENGAN KARTU" tampil').toBeVisible();
  const huruf = await cap.evaluate((el) => getComputedStyle(el).textTransform);
  expect(huruf, 'capnya memang ditulis kapital').toBe('uppercase');
  await expect(page.getByText('Cocok dengan kartu', { exact: true })).toHaveCount(0);

  // eslint-disable-next-line no-console
  console.log(
    `E-11 soal 1: jawaban=${soal.jawaban} dipilih=${salah} ` +
      `cap="${(await cap.innerText()).trim()}" text-transform=${huruf}`,
  );
});

test('E-11b sesudah benar: satu baris membawa kedua tanda', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal.jawaban);
  await kunciJawaban(page);

  const benar = opsi(page, soal.jawaban);
  await expect(benar).toContainText(LABEL_PILIHAN_PEMAIN);
  await expect(benar).toContainText(LABEL_COCOK);
  await expect(page.getByText('Belum cocok dengan kartu')).toHaveCount(0);
});
