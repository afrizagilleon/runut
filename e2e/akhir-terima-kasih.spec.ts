import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_LANJUT_AKHIR,
  LABEL_SELESAI,
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
 * E-37 — layar akhir dan terima kasih memakai aturan layar lain (M3.10 D-6,
 * kritik K-8).
 *
 * Sampai `bcd4ac7`: "Tiga pertanyaan singkat" dan "Terima kasih." grotesk
 * 28 px rata KIRI (layar pertama dan pembukaan rata tengah); di terima kasih
 * judul berdiri DI ATAS kalender (layar pertama: kalender lebih dulu);
 * `legend` 700 17 menjadi peran kelima; `.jangkar` bermesin tik ber-spasi; dan
 * garis `fieldset` menyembul di kanan legend satu baris
 * ("Kasus tadi terasa seperti…——").
 */

async function sampaiAkhir(page: Page): Promise<void> {
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
  await lanjut(page, LABEL_LANJUT_AKHIR);
  await expect(page.getByRole('heading', { name: 'Tiga pertanyaan singkat' })).toBeVisible();
}

test('E-37 layar akhir: judul peran judul, legend di dalam garis, jangkar peran meta; terima kasih: kalender -> judul -> kalimat, rata tengah', async ({
  page,
}) => {
  await sampaiAkhir(page);

  const akhir = await page.evaluate(() => {
    const keluarga = (f: string): string =>
      /mono/i.test(f) ? 'mesin' : /condensed|bahnschrift/i.test(f) ? 'kalender' : 'baca';
    const h1 = document.querySelector('#judul-akhir');
    if (h1 === null) throw new Error('judul layar akhir tidak ada');
    const gh = getComputedStyle(h1);
    const fieldset = [...document.querySelectorAll('fieldset.tanya-akhir')].map((f) => {
      const legend = f.querySelector('legend');
      const gf = getComputedStyle(f);
      const gl = legend === null ? null : getComputedStyle(legend);
      const kf = f.getBoundingClientRect();
      const kl = legend?.getBoundingClientRect();
      const garis = parseFloat(gf.borderTopWidth);
      return {
        teks: (legend?.textContent ?? '').slice(0, 30),
        garisAtas: gf.borderTopWidth,
        // Legend yang "dirender" menumpang DI garis fieldset; yang benar berdiri di bawahnya.
        legendDiBawahGaris: kl === undefined ? false : kl.top >= kf.top + garis - 0.5,
        legendKeluarga: gl === null ? '' : keluarga(gl.fontFamily),
        legendUkuran: gl?.fontSize ?? '',
        legendBerat: gl?.fontWeight ?? '',
        legendBaris: gl?.lineHeight ?? '',
      };
    });
    const jangkar = document.querySelector('.jangkar');
    const gj = jangkar === null ? null : getComputedStyle(jangkar);
    const mesin = [...document.querySelectorAll('.layar-akhir *')]
      .filter((el) => (el.textContent ?? '').trim() !== '' && el.children.length === 0)
      .filter((el) => keluarga(getComputedStyle(el).fontFamily) === 'mesin')
      .map((el) => (el.textContent ?? '').slice(0, 30));
    return {
      judul: { keluarga: keluarga(gh.fontFamily), ukuran: gh.fontSize, berat: gh.fontWeight, baris: gh.lineHeight },
      fieldset,
      jangkar: {
        keluarga: gj === null ? '' : keluarga(gj.fontFamily),
        ukuran: gj?.fontSize ?? '',
        berat: gj?.fontWeight ?? '',
        spasi: gj?.letterSpacing ?? '',
      },
      mesin,
    };
  });
  // eslint-disable-next-line no-console
  console.log(`E-37 [${test.info().project.name}] layar akhir ${JSON.stringify(akhir)}`);

  expect(akhir.judul).toEqual({ keluarga: 'baca', ukuran: '20px', berat: '600', baris: '26px' });
  expect(akhir.fieldset.length).toBe(3);
  for (const f of akhir.fieldset) {
    expect(f.legendDiBawahGaris, `legend "${f.teks}" tidak menumpang di garis fieldset`).toBe(true);
    expect([f.legendKeluarga, f.legendUkuran, f.legendBerat, f.legendBaris], `legend "${f.teks}"`).toEqual([
      'baca',
      '17px',
      '600',
      '24.65px',
    ]);
  }
  expect(akhir.fieldset[0]?.garisAtas, 'pertanyaan pertama tanpa garis pemisah di atasnya').toBe('0px');
  expect(akhir.fieldset.slice(1).map((f) => f.garisAtas)).toEqual(['1px', '1px']);
  expect(akhir.jangkar).toEqual({ keluarga: 'baca', ukuran: '14px', berat: '400', spasi: 'normal' });
  expect(akhir.mesin, 'layar akhir tanpa huruf mesin tik').toEqual([]);

  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
  const terima = await page.evaluate(() => {
    const kalender = document.querySelector('.layar-akhir [data-uid="kalender"] .kalender-halaman');
    const h1 = document.querySelector('#judul-terima');
    const kalimat = [...document.querySelectorAll('.layar-akhir p')].filter(
      // M3.14 D-3: kalender simulasi di bawahnya rata kiri seperti daftar; aturan rata tengah milik blok terima kasih.
      (p) =>
        p.closest('.pesan-alpha') === null &&
        p.closest('.kalender-halaman') === null &&
        p.closest('.kalender-simulasi') === null,
    );
    if (kalender === null || h1 === null) throw new Error('layar terima kasih tidak lengkap');
    return {
      kalenderBawah: kalender.getBoundingClientRect().bottom,
      judulAtas: h1.getBoundingClientRect().top,
      judulBawah: h1.getBoundingClientRect().bottom,
      judulRata: getComputedStyle(h1).textAlign,
      kalimat: kalimat.map((p) => ({
        teks: (p.textContent ?? '').slice(0, 30),
        atas: p.getBoundingClientRect().top,
        rata: getComputedStyle(p).textAlign,
      })),
    };
  });
  // eslint-disable-next-line no-console
  console.log(`E-37 [${test.info().project.name}] terima kasih ${JSON.stringify(terima)}`);
  expect(terima.kalenderBawah, 'kalender lebih dulu, judul di bawahnya').toBeLessThanOrEqual(terima.judulAtas);
  expect(terima.judulRata).toBe('center');
  expect(terima.kalimat.length).toBeGreaterThanOrEqual(2);
  for (const k of terima.kalimat) {
    expect(k.atas, `"${k.teks}" di bawah judul`).toBeGreaterThanOrEqual(terima.judulBawah);
    expect(k.rata, `"${k.teks}" rata tengah`).toBe('center');
  }
});
