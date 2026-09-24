import { expect, test, type Page } from '@playwright/test';
import {
  AMBANG_OPSI,
  bilahTurun,
  bilahTurunAda,
  buka,
  ketuk,
  mulaiKasus,
  opsi,
  penandaBaru,
  tungguGulirBerhenti,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { uraiPng } from './bantu/png.ts';

/**
 * E-38 — pita kertas di belakang tepi balon yang mengintip (M3.10 D-7, kritik
 * K-10).
 *
 * Balon melayang selebar 86 %; sampai `bcd4ac7`, di kanannya "›" dan tepi
 * lembar yang sedang lewat di belakangnya MENYEMBUL, sehingga puncak layar
 * tampak rusak (tiga garis bertumpuk di 150 px teratas). Sejak D-7 wadah yang
 * aktif melukis pita `--kertas` setinggi `--intip` + 6 px di belakang balon.
 *
 * Diuji dengan piksel tangkapan layar: pita itu tembus sentuhan
 * (`pointer-events: none`, supaya wadahnya tidak menelan ketukan), jadi
 * `elementFromPoint` tidak bisa melihatnya. Halaman digulir sehingga kaki
 * lembar pertama ("Lihat sumbernya ›") tepat berada di belakang tepi balon,
 * lalu seluruh petak di kanan balon — sepanjang tinggi yang mengintip — harus
 * berwarna `--kertas`.
 */

async function warnaKertas(page: Page): Promise<[number, number, number]> {
  return page.evaluate(() => {
    const coba = document.createElement('div');
    coba.style.color = 'var(--kertas)';
    document.body.append(coba);
    const w = getComputedStyle(coba).color;
    coba.remove();
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(w);
    return [Number(m?.[1] ?? 0), Number(m?.[2] ?? 0), Number(m?.[3] ?? 0)] as [number, number, number];
  });
}

test('E-38 tepi balon yang mengintip berpita kertas: tidak ada yang menyembul di kanannya', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error('soal 1 tidak ada');
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await ketuk(bilahTurun(page));
  await tungguMasukLayar(opsi(page, soal.pilihan[0]?.kunci ?? 'a'), AMBANG_OPSI, 'opsi terlihat');
  await tungguGulirBerhenti(page);

  // Kaki lembar pertama tepat di belakang tepi balon (14 px di bawah keping).
  const kaki = page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`);
  const tujuan = await kaki.evaluate((el) => {
    const keping = document.querySelector('[data-uid="keping"]')?.getBoundingClientRect().bottom ?? 0;
    const k = el.getBoundingClientRect();
    return window.scrollY + (k.top + k.bottom) / 2 - (keping + 14);
  });
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' });
  }, tujuan);
  await tungguGulirBerhenti(page);
  await expect(page.locator('.melayang-aktif')).toHaveCount(1);
  await expect(page.locator('.melayang-turun')).toHaveCount(0);
  // Wadah muncul lewat transisi opacity 180 ms; tunggu sampai selesai.
  await expect
    .poll(async () => await page.locator('.melayang').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');

  const u = await page.evaluate(() => {
    const keping = document.querySelector('[data-uid="keping"]')?.getBoundingClientRect();
    const wadah = document.querySelector('.melayang')?.getBoundingClientRect();
    const balon = document.querySelector('[data-uid="balon"]')?.getBoundingClientRect();
    const kakiLembar = document.querySelector('.lembar-kaki')?.getBoundingClientRect();
    const intip = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--intip'));
    if (!keping || !wadah || !balon || !kakiLembar) throw new Error('ukuran tidak lengkap');
    return {
      kepingBawah: keping.bottom,
      wadahKanan: wadah.right,
      balonKanan: balon.right,
      kakiAtas: kakiLembar.top,
      kakiBawah: kakiLembar.bottom,
      intip,
    };
  });
  const petak = {
    x: Math.ceil(u.balonKanan + 4),
    y: Math.ceil(u.kepingBawah + 2),
    width: Math.floor(u.wadahKanan - u.balonKanan - 6),
    height: Math.floor(u.intip - 4),
  };
  const kertas = await warnaKertas(page);
  const gambar = uraiPng(await page.screenshot({ clip: petak }));
  let beda = 0;
  let contoh = '';
  for (let i = 0; i < gambar.data.length; i += 4) {
    const r = gambar.data[i] ?? 0;
    const g = gambar.data[i + 1] ?? 0;
    const b = gambar.data[i + 2] ?? 0;
    if (Math.abs(r - kertas[0]) > 2 || Math.abs(g - kertas[1]) > 2 || Math.abs(b - kertas[2]) > 2) {
      beda += 1;
      if (contoh === '') contoh = `rgb(${String(r)},${String(g)},${String(b)})`;
    }
  }
  const jumlah = gambar.lebar * gambar.tinggi;
  // eslint-disable-next-line no-console
  console.log(
    `E-38 [${test.info().project.name}] keping.bawah=${u.kepingBawah.toFixed(1)} kaki-lembar ${u.kakiAtas.toFixed(1)}-${u.kakiBawah.toFixed(1)} ` +
      `petak ${JSON.stringify(petak)} kertas=rgb(${kertas.join(',')}) piksel-beda=${String(beda)}/${String(jumlah)} ${contoh}`,
  );
  // Kaki lembar memang berada di belakang pita saat dipotret.
  expect(u.kakiAtas).toBeLessThan(u.kepingBawah + u.intip);
  expect(u.kakiBawah).toBeGreaterThan(u.kepingBawah);
  expect(jumlah).toBeGreaterThan(0);
  expect(beda, `piksel bukan --kertas di kanan tepi balon (contoh ${contoh})`).toBe(0);
});
