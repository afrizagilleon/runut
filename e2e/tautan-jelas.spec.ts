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
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-32 — tautan angka jelas-jelas tautan; teks kunci satu penekanan (M3.10 D-2,
 * kritik K-4a).
 *
 * Sampai `bcd4ac7` angka diam di kartu ("1 Agustus", tebal `--stempel`) dan
 * angka yang bisa diketuk di teks kunci ("22 kali", tebal `--stempel` bergaris
 * TITIK 1 px) hanya dibedakan oleh garis setipis rambut. `docs/desain.md`:
 * "tidak ada … warna tautan pada benda yang diam". Warna angka di lembar TIDAK
 * diubah (K-4b menunggu pemilik); yang diubah adalah tautannya: garis bawah
 * UTUH 1,5 px, jarak 4 px, 600.
 *
 * Dan teks kunci memakai satu teknik penekanan per elemen: yang tebal di sana
 * hanya tautan. Angka andaian ("1.000 lembar") yang tebal tanpa bisa diketuk
 * adalah penekanan kedua yang bersaing dengan tautannya.
 */

interface GayaTautan {
  uid: string;
  garis: string;
  corak: string;
  tebalGaris: string;
  jarak: string;
  berat: string;
}

interface TebalDiam {
  teks: string;
  kelas: string;
  berat: string;
}

async function ukurTeksKunci(page: Page): Promise<{ tautan: GayaTautan[]; diam: TebalDiam[]; beratInduk: string }> {
  return page.evaluate(() => {
    const kunci = document.querySelector('[data-uid="teks-kunci"]');
    if (kunci === null) throw new Error('teks kunci tidak ada');
    const beratInduk = getComputedStyle(kunci).fontWeight;
    const tautan = [...kunci.querySelectorAll('[data-uid^="angka:"]')].map((el) => {
      const g = getComputedStyle(el);
      return {
        uid: el.getAttribute('data-uid') ?? '',
        garis: g.textDecorationLine,
        corak: g.textDecorationStyle,
        tebalGaris: g.textDecorationThickness,
        jarak: g.textUnderlineOffset,
        berat: g.fontWeight,
      };
    });
    // Elemen berteks yang BUKAN tautan dan bukan di dalam tautan/penjelasan sebaris.
    const diam = [...kunci.querySelectorAll('*')]
      .filter(
        (el) =>
          el.closest('[data-uid^="angka:"]') === null &&
          el.closest('.penjelasan-sebaris') === null &&
          (el.textContent ?? '').trim() !== '',
      )
      .map((el) => ({
        teks: (el.textContent ?? '').trim().slice(0, 40),
        kelas: el.className,
        berat: getComputedStyle(el).fontWeight,
      }));
    return { tautan, diam, beratInduk };
  });
}

for (const kasus_id of ID_KASUS) {
  test(`E-32 [${kasus_id}] tautan angka bergaris utuh 1,5 px; teks kunci tanpa tebal selain tautan`, async ({
    page,
  }) => {
    const kasus = bacaKasus(kasus_id);
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);

    let jumlahTautan = 0;
    let jumlahDiam = 0;
    for (const [nomor, soal] of kasus.soal.entries()) {
      await tungguSoal(page, nomor + 1);
      await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
      await pilihOpsi(page, soal.jawaban);
      await kunciJawaban(page);
      await expect(page.locator('[data-uid="teks-kunci"]')).toBeVisible();

      const u = await ukurTeksKunci(page);
      jumlahTautan += u.tautan.length;
      jumlahDiam += u.diam.length;
      // eslint-disable-next-line no-console
      console.log(
        `E-32 [${test.info().project.name}] [${kasus_id}] soal ${String(nomor + 1)}: ` +
          `tautan=${String(u.tautan.length)} ${JSON.stringify(u.tautan[0] ?? null)} | ` +
          `elemen diam=${String(u.diam.length)} berat=${[...new Set(u.diam.map((d) => d.berat))].join(',')} ` +
          `(induk ${u.beratInduk})`,
      );
      for (const t of u.tautan) {
        expect(t.garis, `${t.uid}: bergaris bawah`).toBe('underline');
        expect(t.corak, `${t.uid}: garis UTUH, bukan titik`).toBe('solid');
        expect(t.tebalGaris, `${t.uid}: tebal garis`).toBe('1.5px');
        expect(t.jarak, `${t.uid}: jarak garis`).toBe('4px');
        expect(t.berat, `${t.uid}: berat huruf tautan`).toBe('600');
      }
      for (const d of u.diam) {
        expect(
          d.berat,
          `teks kunci soal ${String(nomor + 1)}: "${d.teks}" (${d.kelas}) bukan tautan, jadi tidak tebal`,
        ).toBe(u.beratInduk);
      }

      await lanjut(
        page,
        nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
      );
    }
    expect(jumlahTautan, 'teks kunci memang memuat tautan angka').toBeGreaterThan(0);
    expect(jumlahDiam, 'teks kunci memang memuat elemen yang bukan tautan').toBeGreaterThan(0);

    // Tautan di layar pembukaan memakai rupa yang sama.
    await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
    const pembukaan = await page.evaluate(() =>
      [...document.querySelectorAll('.garis-waktu [data-uid^="angka:"], .bacaan [data-uid^="angka:"]')].map(
        (el) => {
          const g = getComputedStyle(el);
          return `${g.textDecorationLine}/${g.textDecorationStyle}/${g.textDecorationThickness}/${g.textUnderlineOffset}/${g.fontWeight}`;
        },
      ),
    );
    expect(pembukaan.length).toBeGreaterThan(0);
    expect([...new Set(pembukaan)]).toEqual(['underline/solid/1.5px/4px/600']);
  });
}
