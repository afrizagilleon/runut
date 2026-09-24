import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-42 — angka di kartu tebal berwarna tinta, bukan ungu (M3.11 D-2, kritik K-4b).
 *
 * Ungu (`--stempel`) = bisa diketuk, atau garis kepala sumber resmi. Angka di
 * badan lembar TIDAK bisa diketuk (ketukannya tercatat `mati`), jadi warnanya
 * tinta; tebalnya tetap. Sampai M3.10 angka itu tebal ungu — rupa yang sama
 * dengan tautan angka di teks kunci, dan `docs/desain.md` sendiri melarang
 * "warna tautan pada benda yang diam".
 *
 * Yang diperiksa, di soal 1–3 kedua kasus, dengan SEMUA kaki lembar terbuka
 * (isi yang terbuka juga bagian lembar) dan lagi sesudah dikunci (salinan
 * ringkas kartu penentu): setiap elemen berteks di dalam `.lembar` yang bukan
 * kontrol (bukan `button`, `a`, `summary`, `[role=button]`, dan tidak di
 * dalamnya) TIDAK berwarna terhitung `--stempel`. Garis kepala lembar tetap
 * `--stempel` — pengecualian yang disebut kontrak, diperiksa juga.
 */

interface Temuan {
  diperiksa: number;
  angka: number;
  angkaWarna: string[];
  angkaBerat: string[];
  ungu: { teks: string; kelas: string; warna: string }[];
  kepalaBukanStempel: string[];
  stempel: string;
  tinta: string;
}

async function periksaLembar(page: Page): Promise<Temuan> {
  return await page.evaluate(() => {
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.color = 'var(--stempel)';
    const stempel = getComputedStyle(coba).color;
    coba.style.color = 'var(--tinta)';
    const tinta = getComputedStyle(coba).color;
    coba.remove();

    const KONTROL = 'button, a, summary, [role="button"]';
    const ungu: { teks: string; kelas: string; warna: string }[] = [];
    let diperiksa = 0;
    for (const el of document.querySelectorAll('.lembar *')) {
      if (el.closest(KONTROL) !== null) continue;
      const teksSendiri = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();
      if (teksSendiri === '') continue;
      const k = el.getBoundingClientRect();
      if (k.width === 0 || k.height === 0) continue;
      diperiksa += 1;
      const warna = getComputedStyle(el).color;
      if (warna === stempel) ungu.push({ teks: teksSendiri.slice(0, 40), kelas: el.className, warna });
    }
    const angka = [...document.querySelectorAll('.lembar .angka-lembar, .lembar-badan b, .lembar-badan strong')];
    const kepalaBukanStempel = [...document.querySelectorAll('.lembar')]
      .map((l) => getComputedStyle(l).borderTopColor)
      .filter((w) => w !== stempel);
    return {
      diperiksa,
      angka: angka.length,
      angkaWarna: [...new Set(angka.map((a) => getComputedStyle(a).color))],
      angkaBerat: [...new Set(angka.map((a) => getComputedStyle(a).fontWeight))],
      ungu,
      kepalaBukanStempel,
      stempel,
      tinta,
    };
  });
}

async function bukaSemuaKaki(page: Page): Promise<void> {
  const kaki = page.locator('.lembar [data-uid^="kaki:"][aria-expanded="false"]');
  const jumlah = await kaki.count();
  for (let i = 0; i < jumlah; i += 1) {
    await ketuk(page.locator('.lembar [data-uid^="kaki:"][aria-expanded="false"]').first());
  }
  await expect(page.locator('.lembar [data-uid^="kaki:"][aria-expanded="false"]')).toHaveCount(0);
}

for (const kasus_id of ID_KASUS) {
  test(`E-42 [${kasus_id}] tidak ada benda diam di lembar yang berwarna --stempel; angka tebal berwarna tinta`, async ({
    page,
  }) => {
    const kasus = bacaKasus(kasus_id);
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);
    const laporan: string[] = [];
    let totalAngka = 0;
    for (const [nomor, soal] of kasus.soal.entries()) {
      await tungguSoal(page, nomor + 1);
      await bukaSemuaKaki(page);
      const dibuka = await periksaLembar(page);
      await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
      await pilihOpsi(page, nomor === 0 ? kunciSalah(soal) : soal.jawaban);
      await kunciJawaban(page);
      await expect(page.locator('[data-uid="penentu"] .lembar').first()).toBeVisible();
      const dikunci = await periksaLembar(page);
      for (const [keadaan, t] of [
        ['dibuka', dibuka],
        ['dikunci', dikunci],
      ] as const) {
        totalAngka += t.angka;
        laporan.push(
          `soal ${String(nomor + 1)} ${keadaan}: diperiksa=${String(t.diperiksa)} angka=${String(t.angka)} ` +
            `warna-angka=${JSON.stringify(t.angkaWarna)} berat=${JSON.stringify(t.angkaBerat)} ` +
            `ungu-diam=${JSON.stringify(t.ungu)} kepala-bukan-stempel=${String(t.kepalaBukanStempel.length)}`,
        );
        expect(t.diperiksa, `soal ${String(nomor + 1)} ${keadaan}: ada teks lembar yang diperiksa`).toBeGreaterThan(0);
        expect(t.ungu, `soal ${String(nomor + 1)} ${keadaan}: benda diam berwarna --stempel ${t.stempel}`).toEqual([]);
        expect(t.kepalaBukanStempel, `soal ${String(nomor + 1)} ${keadaan}: garis kepala lembar tetap --stempel`).toEqual([]);
        if (t.angka > 0) {
          expect(t.angkaWarna, `soal ${String(nomor + 1)} ${keadaan}: angka lembar berwarna tinta`).toEqual([t.tinta]);
          expect(t.angkaBerat, `soal ${String(nomor + 1)} ${keadaan}: angka lembar tetap tebal`).toEqual(['700']);
        }
      }
      await lanjut(page, nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`);
    }
    // eslint-disable-next-line no-console
    console.log(`E-42 [${test.info().project.name}] [${kasus_id}]\n  ${laporan.join('\n  ')}`);
    expect(totalAngka, 'kasus ini memang punya angka tebal di lembar').toBeGreaterThan(0);
  });
}
