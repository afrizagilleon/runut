import { expect, test, type Page } from '@playwright/test';
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
 * E-36 — "Pilihanmu" tidak berwarna peringatan sebelum dikunci (M3.10 D-5,
 * kritik K-7).
 *
 * Sampai `bcd4ac7` `.opsi-dipilih .opsi-tanda-pemain` berwarna `--belum-cocok`
 * (oranye): warna "belum cocok" tampil SEBELUM ada penilaian — juga ketika
 * pilihannya benar. Sebelum dikunci labelnya `--stempel`, warna pilihan itu
 * sendiri; oranye hanya untuk pilihan yang sesudah dikunci memang keliru.
 */

async function warnaLabel(page: Page, kunci: string): Promise<{ label: string; warna: string; stempel: string; oranye: string }> {
  return opsi(page, kunci).evaluate((el) => {
    const label = el.querySelector('.opsi-tanda-pemain');
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.color = 'var(--stempel)';
    const stempel = getComputedStyle(coba).color;
    coba.style.color = 'var(--belum-cocok)';
    const oranye = getComputedStyle(coba).color;
    coba.remove();
    return {
      label: label?.textContent ?? '',
      warna: label === null ? '' : getComputedStyle(label).color,
      stempel,
      oranye,
    };
  });
}

test('E-36 "Pilihanmu" berwarna --stempel sebelum dikunci, --belum-cocok hanya bila keliru sesudahnya', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error('soal 1 tidak ada');
  const salah = kunciSalah(soal);

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');

  await pilihOpsi(page, salah);
  const sebelumSalah = await warnaLabel(page, salah);
  await pilihOpsi(page, soal.jawaban);
  const sebelumBenar = await warnaLabel(page, soal.jawaban);
  await pilihOpsi(page, salah);
  await kunciJawaban(page);
  await expect(page.locator('[data-uid="teks-kunci"]')).toBeVisible();
  const sesudahSalah = await warnaLabel(page, salah);

  // eslint-disable-next-line no-console
  console.log(
    `E-36 [${test.info().project.name}] stempel=${sebelumSalah.stempel} belum-cocok=${sebelumSalah.oranye}\n` +
      `  dipilih (keliru, belum dikunci): "${sebelumSalah.label}" ${sebelumSalah.warna}\n` +
      `  dipilih (benar, belum dikunci):  "${sebelumBenar.label}" ${sebelumBenar.warna}\n` +
      `  dikunci keliru:                  "${sesudahSalah.label}" ${sesudahSalah.warna}`,
  );
  expect(sebelumSalah.label).toBe('Pilihanmu');
  expect(sebelumSalah.warna, 'sebelum dikunci: warna pilihan, bukan peringatan').toBe(sebelumSalah.stempel);
  expect(sebelumBenar.label).toBe('Pilihanmu');
  expect(sebelumBenar.warna, 'pilihan yang benar pun tidak oranye sebelum dikunci').toBe(sebelumBenar.stempel);
  expect(sesudahSalah.label).toBe('Pilihanmu');
  expect(sesudahSalah.warna, 'sesudah dikunci dan keliru: --belum-cocok').toBe(sesudahSalah.oranye);
});
