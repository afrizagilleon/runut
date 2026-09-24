import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import { AKAR, ID_KASUS } from './bantu/jalur.ts';

/**
 * E-44 — tepi lembar terang lebih tegas; garis kepala ungu tetap (M3.11 D-4,
 * kritik K-12 pilihan 1).
 *
 * Lembar putih di atas meja #F3F5F7 hanya 1,09:1 dan tepinya (`--garis`, 12 %)
 * 1,26:1 — "kertas di atas meja" terbaca hanya lewat garis kepalanya. Di mode
 * TERANG tepi kiri, kanan, bawah `.lembar` dan keempat tepi `.baris-istilah`
 * kini `--garis-tegas`. Yang paling mudah rusak: `border-color` yang juga
 * menimpa tepi ATAS, sehingga garis kepala ungu (tanda sumber resmi / hitungan
 * kami) ikut hilang. Kepala lembar dibandingkan dengan patokan
 * `docs/contoh/layar-soal.html` (dimuat dari berkas, skema warna sama).
 * Mode gelap tidak diputuskan: tepinya tetap `--garis`.
 */

interface Tepi {
  lembar: { kiri: string; kanan: string; bawah: string; atas: string; atasTebal: string; atasCorak: string }[];
  istilah: { kiri: string; kanan: string; bawah: string; atas: string }[];
  token: { garis: string; garisTegas: string; stempel: string };
}

async function ukurTepi(page: Page): Promise<Tepi> {
  return await page.evaluate(() => {
    const coba = document.createElement('div');
    document.body.append(coba);
    const warna = (v: string): string => {
      coba.style.borderTop = `1px solid var(${v})`;
      return getComputedStyle(coba).borderTopColor;
    };
    const token = { garis: warna('--garis'), garisTegas: warna('--garis-tegas'), stempel: warna('--stempel') };
    coba.remove();
    const lembar = [...document.querySelectorAll('.tumpukan .lembar:not(.lembar-menentukan)')].map((l) => {
      const g = getComputedStyle(l);
      return {
        kiri: g.borderLeftColor,
        kanan: g.borderRightColor,
        bawah: g.borderBottomColor,
        atas: g.borderTopColor,
        atasTebal: g.borderTopWidth,
        atasCorak: g.borderTopStyle,
      };
    });
    const istilah = [...document.querySelectorAll('.baris-istilah')].map((b) => {
      const g = getComputedStyle(b);
      return { kiri: g.borderLeftColor, kanan: g.borderRightColor, bawah: g.borderBottomColor, atas: g.borderTopColor };
    });
    return { lembar, istilah, token };
  });
}

/** Kepala lembar di patokan, di skema warna yang sama. */
async function kepalaPatokan(page: Page): Promise<{ warna: string; tebal: string }> {
  const html = readFileSync(join(AKAR, 'docs', 'contoh', 'layar-soal.html'), 'utf8');
  const lain = await page.context().newPage();
  await lain.setContent(html);
  const hasil = await lain.evaluate(() => {
    const l = document.querySelector('.lembar');
    if (l === null) throw new Error('patokan tanpa .lembar');
    const g = getComputedStyle(l);
    return { warna: g.borderTopColor, tebal: g.borderTopWidth };
  });
  await lain.close();
  return hasil;
}

for (const kasus_id of ID_KASUS) {
  test(`E-44 [${kasus_id}] tepi lembar dan baris istilah --garis-tegas di terang; garis kepala tetap --stempel seperti patokan`, async ({
    page,
  }) => {
    const kasus = bacaKasus(kasus_id);
    const gelap = test.info().project.use.colorScheme === 'dark';
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);
    const patokan = await kepalaPatokan(page);
    let jumlahLembar = 0;
    let jumlahIstilah = 0;
    for (const [nomor, soal] of kasus.soal.entries()) {
      await tungguSoal(page, nomor + 1);
      const t = await ukurTepi(page);
      jumlahLembar += t.lembar.length;
      jumlahIstilah += t.istilah.length;
      const sisi = gelap ? t.token.garis : t.token.garisTegas;
      // eslint-disable-next-line no-console
      console.log(
        `E-44 [${test.info().project.name}] [${kasus_id}] soal ${String(nomor + 1)} token=${JSON.stringify(t.token)} ` +
          `patokan-kepala=${JSON.stringify(patokan)}\n  lembar=${JSON.stringify(t.lembar)}\n  istilah=${JSON.stringify(t.istilah)}`,
      );
      for (const l of t.lembar) {
        expect([l.kiri, l.kanan, l.bawah], `soal ${String(nomor + 1)}: tepi kiri/kanan/bawah lembar (${gelap ? '--garis' : '--garis-tegas'})`).toEqual([sisi, sisi, sisi]);
        expect(l.atas, 'garis kepala lembar tetap --stempel').toBe(t.token.stempel);
        expect([l.atas, l.atasTebal], 'garis kepala lembar sama dengan patokan').toEqual([patokan.warna, patokan.tebal]);
      }
      for (const b of t.istilah) {
        expect([b.kiri, b.kanan, b.bawah, b.atas], `soal ${String(nomor + 1)}: tepi baris istilah`).toEqual([sisi, sisi, sisi, sisi]);
      }
      await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
      await pilihOpsi(page, soal.jawaban);
      await kunciJawaban(page);
      await lanjut(page, nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`);
    }
    expect(jumlahLembar, 'ada lembar yang diperiksa').toBeGreaterThan(0);
    expect(jumlahIstilah, 'ada baris istilah yang diperiksa').toBeGreaterThan(0);
  });
}
