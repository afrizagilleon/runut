import { expect, test } from '@playwright/test';
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

/**
 * E-40 — tiga celah aksesibilitas dari kritik §5 (M3.10 D-9, K-14).
 *
 * 1. Pegangan balon `.grip i`: `--tinta-redup` pada opacity 0,55 = 2,41:1 di
 *    balon terang dan 2,75:1 di balon gelap — gagal WCAG 1.4.11 (3:1), padahal
 *    ia satu-satunya isyarat bahwa balon bisa ditarik.
 * 2. Tombol utama berbidang `--stempel` diberi cincin fokus berwarna SAMA:
 *    di celah 2 px cincin itu menyatu dengan bidangnya. Cincinnya `--tinta`.
 * 3. `.tombol-utama:disabled { opacity: .45 }` tertinggal, padahal
 *    `docs/desain.md` melarang tombol utama tampil mati — dihapus supaya tidak
 *    ada yang tergoda memakainya.
 *
 * Kontras dihitung dengan rumus WCAG 2.x dari warna TERHITUNG, dengan opacity
 * dicampur ke latar balonnya.
 */

test('E-40 pegangan balon >= 3:1, cincin fokus tombol utama --tinta, tanpa gaya tombol mati', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error('soal 1 tidak ada');
  await buka(page, penandaBaru());

  // (2) Cincin fokus tombol utama, sebelum ada sentuhan apa pun (fokus papan ketik).
  const fokus = await page.getByRole('button', { name: 'Mulai simulasi' }).evaluate((el) => {
    (el as HTMLElement).focus();
    const g = getComputedStyle(el);
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.color = 'var(--tinta)';
    const tinta = getComputedStyle(coba).color;
    coba.style.color = 'var(--stempel)';
    const stempel = getComputedStyle(coba).color;
    coba.remove();
    return {
      terlihat: el.matches(':focus-visible'),
      gaya: g.outlineStyle,
      tebal: g.outlineWidth,
      warna: g.outlineColor,
      bidang: g.backgroundColor,
      tinta,
      stempel,
    };
  });

  // (3) Tidak ada aturan gaya untuk tombol utama yang mati.
  const aturanMati = await page.evaluate(() => {
    const hasil: string[] = [];
    for (const lembar of document.styleSheets) {
      let aturan: CSSRuleList;
      try {
        aturan = lembar.cssRules;
      } catch {
        continue;
      }
      for (const a of aturan) {
        if (a instanceof CSSStyleRule && /tombol-utama[^,{]*:disabled/.test(a.selectorText)) {
          hasil.push(a.cssText);
        }
      }
    }
    return hasil;
  });

  // (1) Pegangan balon yang mengintip.
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await ketuk(bilahTurun(page));
  await tungguMasukLayar(opsi(page, soal.pilihan[0]?.kunci ?? 'a'), AMBANG_OPSI, 'opsi terlihat');
  await tungguGulirBerhenti(page);
  await expect(page.locator('.melayang-aktif')).toHaveCount(1);
  const grip = await page.evaluate(() => {
    const urai = (w: string): [number, number, number] => {
      const m = /rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/.exec(w);
      return [Number(m?.[1] ?? 0), Number(m?.[2] ?? 0), Number(m?.[3] ?? 0)];
    };
    const lum = ([r, g, b]: [number, number, number]): number => {
      const s = (c: number): number => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b);
    };
    const i = document.querySelector('.melayang .grip i');
    const balon = document.querySelector('.melayang-balon');
    if (i === null || balon === null) throw new Error('pegangan tidak ada');
    const gi = getComputedStyle(i);
    const opasitas = Number(gi.opacity);
    const depan = urai(gi.backgroundColor);
    const latar = urai(getComputedStyle(balon).backgroundColor);
    const campur = depan.map((c, n) => c * opasitas + (latar[n] ?? 0) * (1 - opasitas)) as [number, number, number];
    const a = lum(campur);
    const b = lum(latar);
    return {
      opasitas,
      warna: gi.backgroundColor,
      latar: getComputedStyle(balon).backgroundColor,
      rasio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100,
    };
  });

  // eslint-disable-next-line no-console
  console.log(
    `E-40 [${test.info().project.name}] pegangan: ${JSON.stringify(grip)}\n` +
      `  fokus tombol utama: ${JSON.stringify(fokus)}\n  aturan :disabled tombol utama: ${String(aturanMati.length)}`,
  );

  expect(grip.rasio, `pegangan balon ${grip.warna} x${String(grip.opasitas)} di atas ${grip.latar}`).toBeGreaterThanOrEqual(3);
  expect(fokus.terlihat, 'fokus papan ketik memang tampil').toBe(true);
  expect(fokus.gaya).toBe('solid');
  expect(fokus.tebal).toBe('2px');
  expect(fokus.warna, 'cincin fokus tombol utama berwarna --tinta').toBe(fokus.tinta);
  expect(fokus.warna, 'cincin fokus tidak sewarna bidang tombolnya').not.toBe(fokus.bidang);
  expect(aturanMati, 'tidak ada gaya untuk tombol utama yang mati').toEqual([]);
});
