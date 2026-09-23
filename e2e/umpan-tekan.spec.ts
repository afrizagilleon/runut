import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  bersentuh,
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, type SoalUji } from './bantu/kasus.ts';

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

/**
 * Soal pertama yang punya baris istilah, beserta nomornya (1-based).
 *
 * Sejak M3.9 D-4 soal 1 adalah pemanasan TANPA istilah, jadi ketiga kontrol
 * (kaki lembar, baris istilah, opsi) tidak lagi berada di soal 1. Soalnya
 * dicari dari data, bukan ditulis mati: tes ini menguji umpan tekan, dan ia
 * harus tetap menemukan baris istilah di mana pun baris itu berada.
 */
function soalBeristilah(): { soal: SoalUji; nomor: number } {
  const daftar = bacaKasus().soal;
  const indeks = daftar.findIndex((s) => s.istilah.length > 0);
  const soal = daftar[indeks];
  if (soal === undefined) throw new Error('tidak ada soal beristilah di kasus bawaan');
  return { soal, nomor: indeks + 1 };
}

/** Mainkan soal-soal sebelum `nomor` dengan jawaban benar, sampai soal `nomor` tampil. */
async function sampaiSoal(page: Page, nomor: number): Promise<void> {
  await tungguSoal(page, 1);
  const daftar = bacaKasus().soal;
  for (let ke = 1; ke < nomor; ke += 1) {
    const soal = daftar[ke - 1];
    if (soal === undefined) throw new Error(`soal ${String(ke)} tidak ada`);
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(page, `Lanjut ke soal ${String(ke + 1)}`);
    await tungguSoal(page, ke + 1);
  }
  // Pindah soal menggulir ke puncak halaman dengan halus; tekanan tetikus yang
  // dihitung dari kotak di tengah guliran itu mendarat di tempat yang salah.
  await tungguGulirBerhenti(page);
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
  /*
   * Ke TENGAH layar, bukan "kalau perlu": `scrollIntoViewIfNeeded` menganggap
   * kontrol yang berada di bawah bilah bawah `fixed` sudah terlihat, dan
   * tekanannya lalu mendarat di tombol bilah itu. Sejak M3.9 baris istilah
   * pertama ada di soal 2, dan di 1280 × 800 ia berada tepat di balik bilah.
   */
  await sasaran.evaluate((el) => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await tungguGulirBerhenti(page);
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

  const { soal, nomor } = soalBeristilah();

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await sampaiSoal(page, nomor);

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

  const { soal, nomor } = soalBeristilah();

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await sampaiSoal(page, nomor);

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
