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
 * E-39 — tanda baca tidak ikut ditebalkan, dan tidak berjarak dari tautannya
 * (M3.10 D-8, kritik K-11).
 *
 * Sampai `bcd4ac7`: "**Rp13.**", "**1 Agustus,** Rp178", "**(1.000 lembar):**",
 * dan di layar pembukaan "Rp140 ." — celah sebelum titik akibat bantalan
 * 2 px pada kotak tombol tautan. Diperiksa di tiap layar yang memuat angka:
 * soal 1–3 sebelum dan sesudah dikunci, dan pembukaan — kedua kasus.
 */

interface Temuan {
  tebalBertandaBaca: string[];
  celah: string[];
  terikatNowrap: string[];
  jumlahTebal: number;
  jumlahEkor: number;
  celahTerbesar: number;
}

async function periksa(page: Page): Promise<Temuan> {
  return page.evaluate(() => {
    const tebal = [
      ...document.querySelectorAll(
        '#isi strong, #isi b, #isi .andaian, #isi .hari-ini, #isi .rujukan-datar, #isi [data-uid^="angka:"]',
      ),
    ].filter((el) => el.getClientRects().length > 0);
    const tebalBertandaBaca = tebal
      .map((el) => (el.textContent ?? '').trim())
      .filter((t) => /[.,:;)]$/.test(t));

    const celah: string[] = [];
    const terikatNowrap: string[] = [];
    let jumlahEkor = 0;
    let celahTerbesar = 0;
    for (const ikat of document.querySelectorAll('#isi .tanpa-putus')) {
      const tombol = ikat.querySelector('[data-uid^="angka:"]');
      const ekor = tombol?.nextSibling;
      if (tombol === null || tombol === undefined || ekor === null || ekor === undefined) continue;
      if (ekor.nodeType !== Node.TEXT_NODE || (ekor.textContent ?? '') === '') continue;
      if (tombol.getClientRects().length === 0) continue;
      jumlahEkor += 1;
      const rentang = document.createRange();
      rentang.setStart(ekor, 0);
      rentang.setEnd(ekor, 1);
      const kTanda = rentang.getBoundingClientRect();
      const kTombol = tombol.getBoundingClientRect();
      // Sebaris: tanda bacanya harus menempel ke sisi kanan tombolnya.
      if (Math.abs(kTanda.top - kTombol.top) < kTombol.height) {
        const jarak = kTanda.left - kTombol.right;
        celahTerbesar = Math.max(celahTerbesar, jarak);
        if (jarak > 0.5) {
          celah.push(`${(tombol.textContent ?? '').trim()}|${ekor.textContent ?? ''} celah ${jarak.toFixed(2)}px`);
        }
      }
      // Yang diikat hanya sambungan tautan-tanda baca; teks tautannya sendiri boleh membungkus.
      const ws = getComputedStyle(tombol).whiteSpace;
      if (ws !== 'normal') terikatNowrap.push(`${(tombol.textContent ?? '').trim()} white-space=${ws}`);
    }
    return { tebalBertandaBaca, celah, terikatNowrap, jumlahTebal: tebal.length, jumlahEkor, celahTerbesar };
  });
}

for (const kasus_id of ID_KASUS) {
  test(`E-39 [${kasus_id}] tanda baca di luar penekanan, menempel ke tautannya, di tiap layar`, async ({
    page,
  }) => {
    const kasus = bacaKasus(kasus_id);
    const kumpul: Array<{ layar: string } & Temuan> = [];
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);
    for (const [nomor, soal] of kasus.soal.entries()) {
      await tungguSoal(page, nomor + 1);
      kumpul.push({ layar: `soal-${String(nomor + 1)}`, ...(await periksa(page)) });
      await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
      await pilihOpsi(page, soal.jawaban);
      await kunciJawaban(page);
      await expect(page.locator('[data-uid="teks-kunci"]')).toBeVisible();
      kumpul.push({ layar: `soal-${String(nomor + 1)}-dikunci`, ...(await periksa(page)) });
      await lanjut(
        page,
        nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
      );
    }
    await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
    kumpul.push({ layar: 'pembukaan', ...(await periksa(page)) });

    // eslint-disable-next-line no-console
    console.log(
      `E-39 [${test.info().project.name}] [${kasus_id}]\n` +
        kumpul
          .map(
            (k) =>
              `  ${k.layar}: penekanan=${String(k.jumlahTebal)} bertanda-baca=${String(k.tebalBertandaBaca.length)} ` +
              `ekor=${String(k.jumlahEkor)} celah-terbesar=${k.celahTerbesar.toFixed(2)}px ` +
              `${[...k.tebalBertandaBaca.slice(0, 3), ...k.celah.slice(0, 2)].join(' ; ')}`,
          )
          .join('\n'),
    );

    expect(kumpul.reduce((n, k) => n + k.jumlahTebal, 0)).toBeGreaterThan(0);
    expect(kumpul.reduce((n, k) => n + k.jumlahEkor, 0), 'ada tautan yang diikuti tanda baca').toBeGreaterThan(0);
    for (const k of kumpul) {
      expect(k.tebalBertandaBaca, `${k.layar}: penekanan yang ikut menebalkan tanda baca`).toEqual([]);
      expect(k.celah, `${k.layar}: celah sebelum tanda baca`).toEqual([]);
      expect(k.terikatNowrap, `${k.layar}: teks tautan ikut diikat nowrap`).toEqual([]);
    }
  });
}
