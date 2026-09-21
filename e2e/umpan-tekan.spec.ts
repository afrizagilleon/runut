import { expect, test, type Locator, type Page } from '@playwright/test';
import { bersentuh, buka, mulaiKasus, penandaBaru, tungguSoal } from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * C-4 — umpan tekan (`:active`) pada kontrol yang bisa diketuk.
 *
 * Ditemukan reviewer di PNG `04-sumber-terbuka`: kaki lembar bersorot **biru
 * langit** yang tidak ada di palet mana pun. Sebabnya `gaya.css` tidak punya
 * satu pun aturan `:active` dan tidak menyetel `-webkit-tap-highlight-color`,
 * jadi yang tampil adalah sorot ketuk bawaan Chromium. Patokan
 * `docs/contoh/layar-soal.html:72` mengaturnya:
 *
 * ```css
 * .lembar-kaki:active, .baris-istilah:active, .opsi:active { background: var(--garis); }
 * ```
 *
 * Itu satu-satunya aturan `:active` di seluruh berkas patokan — dibaca, bukan
 * ditebak. Tombol utama tidak diaturnya, jadi tombol utama tidak disentuh:
 * mengarang rupa untuknya bukan pekerjaan amandemen ini.
 *
 * Lolos dari review M3.2 karena uji kesetiaan RQ-02 tidak pernah memeriksa
 * pseudo-keadaan — sebuah kontrol hanya diperiksa dalam keadaan diam.
 */

/**
 * Nilai terhitung `var(--garis)` **di halaman ini**.
 *
 * Bukan string yang diketik tangan: `--garis` adalah `color-mix()` dengan
 * cadangan `rgba()`, dan bentuk terhitungnya berbeda antar versi peramban.
 * Sebuah elemen coba yang berlatar `var(--garis)` memberi jawaban yang pasti
 * sebanding dengan yang dibaca dari kontrolnya.
 */
async function warnaGaris(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const coba = document.createElement('div');
    coba.style.background = 'var(--garis)';
    document.body.append(coba);
    const warna = getComputedStyle(coba).backgroundColor;
    coba.remove();
    return warna;
  });
}

async function latar(sasaran: Locator): Promise<string> {
  return await sasaran.evaluate((el) => getComputedStyle(el).backgroundColor);
}

/**
 * Tekan dan tahan di tengah elemen; kembalikan latar terhitung saat ditekan.
 *
 * Transisinya ditunggu sampai selesai, dan itu bukan kehati-hatian berlebihan:
 * `.opsi` punya `transition: background-color 140ms`, jadi membaca
 * `getComputedStyle` tepat sesudah tombol tetikus turun memberi **nilai di
 * tengah transisi** — putih, bukan `--garis`. Versi pertama tes ini merah
 * karenanya, dan CSS-nya sudah benar sejak awal.
 *
 * Ditunggu lewat `getAnimations()`, bukan lewat jam: yang ditunggu memang
 * selesainya animasi.
 */
async function latarSaatDitekan(page: Page, sasaran: Locator): Promise<string> {
  await sasaran.scrollIntoViewIfNeeded();
  const kotak = await sasaran.boundingBox();
  expect(kotak, 'kontrol yang ditekan harus punya kotak').not.toBeNull();
  if (kotak === null) return '';
  await page.mouse.move(kotak.x + kotak.width / 2, kotak.y + kotak.height / 2);
  await page.mouse.down();
  try {
    await sasaran.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map(async (gerak) => {
          try {
            await gerak.finished;
          } catch {
            /* dibatalkan: nilai akhirnya sudah terpasang */
          }
        }),
      );
    });
    return await latar(sasaran);
  } finally {
    await page.mouse.up();
  }
}

test('C-4 kontrol yang ditekan berlatar --garis, bukan sorot bawaan peramban', async ({ page }) => {
  test.skip(bersentuh(), 'mouse.down() tanpa up hanya berarti di proyek tanpa sentuh');

  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal, 'kasus punya soal pertama').toBeDefined();
  if (soal === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  const garis = await warnaGaris(page);
  expect(garis, 'nilai terhitung --garis terbaca').not.toBe('');

  const kontrol: { nama: string; sasaran: Locator }[] = [
    { nama: 'kaki lembar', sasaran: page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`) },
    { nama: 'baris istilah', sasaran: page.locator('[data-uid="istilah"] button') },
    { nama: 'opsi', sasaran: page.locator(`[data-uid="opsi:${soal.pilihan[0]?.kunci ?? 'a'}"]`) },
  ];

  const laporan: string[] = [];
  for (const k of kontrol) {
    const diam = await latar(k.sasaran);
    const ditekan = await latarSaatDitekan(page, k.sasaran);
    laporan.push(`${k.nama}: diam=${diam} ditekan=${ditekan}`);
    expect(
      ditekan,
      `${k.nama} saat ditekan harus berlatar --garis (${garis}), bukan ${ditekan}`,
    ).toBe(garis);
    expect(
      ditekan,
      `${k.nama} saat ditekan harus BERUBAH dari keadaan diamnya (${diam})`,
    ).not.toBe(diam);
  }

  // eslint-disable-next-line no-console
  console.log(`C-4 umpan tekan (--garis = ${garis}):\n  ${laporan.join('\n  ')}`);
});

test('C-4 sorot ketuk bawaan peramban dimatikan di kontrol yang sama', async ({ page }) => {
  test.skip(!bersentuh(), 'sorot ketuk hanya ada di konteks sentuh');

  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal, 'kasus punya soal pertama').toBeDefined();
  if (soal === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  const kontrol: { nama: string; pemilih: string }[] = [
    { nama: 'kaki lembar', pemilih: `[data-uid="kaki:${soal.kartu[0] ?? ''}"]` },
    { nama: 'baris istilah', pemilih: '[data-uid="istilah"] button' },
    { nama: 'opsi', pemilih: `[data-uid="opsi:${soal.pilihan[0]?.kunci ?? 'a'}"]` },
  ];

  const laporan: string[] = [];
  for (const k of kontrol) {
    const sorot = await page.locator(k.pemilih).evaluate((el) => {
      const gaya = getComputedStyle(el) as CSSStyleDeclaration & {
        webkitTapHighlightColor?: string;
      };
      return gaya.webkitTapHighlightColor ?? gaya.getPropertyValue('-webkit-tap-highlight-color');
    });
    laporan.push(`${k.nama}: ${sorot}`);
    /*
     * "Transparan" ditulis peramban sebagai rgba(0, 0, 0, 0). Yang ditolak
     * adalah nilai bawaan Chromium yang beralfa — itulah biru langit di PNG.
     */
    const alfa = /rgba?\([^)]*?,\s*([\d.]+)\s*\)$/.exec(sorot)?.[1] ?? '1';
    expect(
      Number(alfa),
      `${k.nama}: -webkit-tap-highlight-color harus transparan, terbaca ${sorot}`,
    ).toBe(0);
  }

  // eslint-disable-next-line no-console
  console.log(`C-4 sorot ketuk bawaan:\n  ${laporan.join('\n  ')}`);
});
