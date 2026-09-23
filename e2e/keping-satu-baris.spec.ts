import { expect, test, type Page } from '@playwright/test';
import {
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-29 — keping kalender SATU baris + penanda "sesudahnya" (M3.9 D-5).
 *
 * Patokan pertama (`docs/contoh/layar-soal.html` ±110–113) menaruh tanggal di
 * KIRI dan tiga bulatan di KANAN dalam satu baris keping (`.keping-dalam`:
 * `display:flex; align-items:center; justify-content:space-between; gap:12px`);
 * patokan kedua (`layar-soal-v3d.html` ±46–50, ±133) menambah penanda
 * "sesudahnya" — kotak 10 × 8 bertepi atas bergerigi — di kanan bulatan.
 * Produk sejak M3.2 menaruh bulatan di BAWAH tanggal, dan penanda itu tidak
 * pernah dibangun. Itu kesalahan review, bukan keputusan.
 *
 * Yang diukur adalah nilai terhitung dan kotak di peramban, berdampingan
 * dengan angka patokan — tabel kesetiaannya dicetak ke log.
 */

interface Keping {
  kepingTinggi: number;
  lembar: { top: number; bottom: number; left: number; right: number };
  tanggal: { top: number; bottom: number; left: number; right: number };
  titik: { top: number; bottom: number; left: number; right: number };
  titikAnak: Array<{ kelas: string; left: number; lebar: number; tinggi: number }>;
  gayaLembar: { display: string; justify: string; align: string; gap: string; padKiri: number; padKanan: number; garis: number };
  gayaTitik: { display: string; align: string; gap: string };
  sesudah: {
    ada: number;
    title: string;
    label: string;
    lebar: number;
    tinggi: number;
    radius: string;
    garis: string;
    clip: string;
    latar: string;
    marginKiri: string;
  };
  stempel: string;
  /** Nilai terhitung `border: 1.5px` patokan v3d di peramban INI (Chromium membulatkannya). */
  garisPatokan: string;
}

async function ukurKeping(page: Page): Promise<Keping> {
  return page.evaluate(() => {
    const k = (el: Element): { top: number; bottom: number; left: number; right: number } => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    const keping = document.querySelector('[data-uid="keping"]');
    const lembar = keping?.querySelector('.kalender-keping');
    const tanggal = keping?.querySelector('.kalender-tanggal');
    const titik = keping?.querySelector('.titik-soal');
    if (!keping || !lembar || !tanggal || !titik) throw new Error('keping tidak lengkap');
    const gl = getComputedStyle(lembar);
    const gt = getComputedStyle(titik);
    const sesudah = titik.querySelectorAll('.titik-sesudah');
    const s = sesudah[0];
    const gs = s === undefined ? null : getComputedStyle(s);
    const coba = document.createElement('div');
    coba.style.background = 'var(--stempel)';
    document.body.append(coba);
    const stempel = getComputedStyle(coba).backgroundColor;
    coba.style.border = '1.5px solid';
    const garisPatokan = getComputedStyle(coba).borderTopWidth;
    coba.remove();
    return {
      kepingTinggi: keping.getBoundingClientRect().height,
      lembar: k(lembar),
      tanggal: k(tanggal),
      titik: k(titik),
      titikAnak: [...titik.children].map((c) => {
        const r = c.getBoundingClientRect();
        return { kelas: c.className, left: r.left, lebar: r.width, tinggi: r.height };
      }),
      gayaLembar: {
        display: gl.display,
        justify: gl.justifyContent,
        align: gl.alignItems,
        gap: gl.columnGap,
        padKiri: parseFloat(gl.paddingLeft),
        padKanan: parseFloat(gl.paddingRight),
        garis: parseFloat(gl.borderRightWidth),
      },
      gayaTitik: { display: gt.display, align: gt.alignItems, gap: gt.columnGap },
      sesudah: {
        ada: sesudah.length,
        title: s?.getAttribute('title') ?? '',
        label: s?.getAttribute('aria-label') ?? '',
        lebar: s === undefined ? 0 : s.getBoundingClientRect().width,
        tinggi: s === undefined ? 0 : s.getBoundingClientRect().height,
        radius: gs?.borderRadius ?? '',
        garis: gs?.borderTopWidth ?? '',
        clip: gs?.clipPath ?? '',
        latar: gs?.backgroundColor ?? '',
        marginKiri: gs?.marginLeft ?? '',
      },
      stempel,
      garisPatokan,
    };
  });
}

const tengah = (r: { top: number; bottom: number }): number => (r.top + r.bottom) / 2;

for (const kasus_id of ID_KASUS) {
  test(`E-29 [${kasus_id}] tanggal kiri, bulatan kanan, satu baris; penanda sesudahnya`, async ({
    page,
  }) => {
    const kasus = bacaKasus(kasus_id);
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);
    await tungguSoal(page, 1);
    await tungguGulirBerhenti(page);

    const u = await ukurKeping(page);
    const tabel = [
      `| nilai | patokan | produk |`,
      `|---|---|---|`,
      `| keping: display / justify / align / gap | flex / space-between / center / 12px | ${u.gayaLembar.display} / ${u.gayaLembar.justify} / ${u.gayaLembar.align} / ${u.gayaLembar.gap} |`,
      `| bulatan: display / align / gap | flex / center / 6px | ${u.gayaTitik.display} / ${u.gayaTitik.align} / ${u.gayaTitik.gap} |`,
      `| posisi bulatan | kanan, sebaris dengan tanggal | tengah-y tanggal ${tengah(u.tanggal).toFixed(1)} · bulatan ${tengah(u.titik).toFixed(1)}; kanan bulatan ${u.titik.right.toFixed(1)} · batas isi keping ${(u.lembar.right - u.gayaLembar.padKanan - u.gayaLembar.garis).toFixed(1)} |`,
      `| penanda sesudahnya | ada, 10×8, radius 0, garis 1.5px, clip-path bergerigi, margin-left 4px | ada=${String(u.sesudah.ada)}, ${u.sesudah.lebar.toFixed(1)}×${u.sesudah.tinggi.toFixed(1)}, radius ${u.sesudah.radius}, garis ${u.sesudah.garis} (patokan terhitung ${u.garisPatokan}), clip ${u.sesudah.clip.slice(0, 40)}…, margin-left ${u.sesudah.marginKiri} |`,
      `| tinggi keping ([data-uid=keping]) | 47 (v3d --tinggi-keping) | ${u.kepingTinggi.toFixed(1)} |`,
    ].join('\n');
    // eslint-disable-next-line no-console
    console.log(`E-29 [${test.info().project.name}] [${kasus_id}]\n${tabel}`);

    // Satu baris: disalin dari patokan, bukan ditafsir.
    expect(u.gayaLembar.display).toBe('flex');
    expect(u.gayaLembar.justify).toBe('space-between');
    expect(u.gayaLembar.align).toBe('center');
    expect(u.gayaLembar.gap).toBe('12px');
    expect(u.gayaTitik.display).toBe('flex');
    expect(u.gayaTitik.align).toBe('center');
    expect(u.gayaTitik.gap).toBe('6px');
    // Tanggal dan bulatan sebaris: pusat tegak berselisih paling banyak 1,5 px.
    expect(Math.abs(tengah(u.tanggal) - tengah(u.titik)), tabel).toBeLessThanOrEqual(1.5);
    // Bulatan di KANAN tanggal, menempel ke tepi kanan isi keping.
    expect(u.titik.left, tabel).toBeGreaterThan(u.tanggal.right);
    const batasKanan = u.lembar.right - u.gayaLembar.padKanan - u.gayaLembar.garis;
    expect(Math.abs(u.titik.right - batasKanan), tabel).toBeLessThanOrEqual(1);
    // Keping satu baris lebih pendek daripada dua baris lama (62 px, ledger M3.7).
    expect(u.kepingTinggi, tabel).toBeLessThan(55);

    // Tiga bulatan soal + satu penanda sesudahnya, di ujung kanan.
    expect(u.titikAnak).toHaveLength(kasus.soal.length + 1);
    expect(u.sesudah.ada).toBe(1);
    expect(u.titikAnak.at(-1)?.kelas).toContain('titik-sesudah');
    expect(u.sesudah.title.toLowerCase()).toContain('lalu apa yang terjadi sesudahnya');
    expect(u.sesudah.label.toLowerCase()).toContain('lalu apa yang terjadi sesudahnya');
    expect(u.sesudah.lebar).toBeCloseTo(10, 0);
    expect(u.sesudah.tinggi).toBeCloseTo(8, 0);
    expect(u.sesudah.radius).toBe('0px');
    // Patokan menulis 1.5px; yang dibandingkan nilai terhitungnya di peramban yang sama.
    expect(u.sesudah.garis).toBe(u.garisPatokan);
    expect(u.sesudah.marginKiri).toBe('4px');
    expect(u.sesudah.clip).toContain('polygon');
    // Di layar soal penanda belum terisi.
    expect(u.sesudah.latar).not.toBe(u.stempel);

    // Soal 2: bulatan pertama lewat, kedua kini, penanda tetap di kanan dan tetap satu baris.
    const pertama = kasus.soal[0];
    if (pertama === undefined) return;
    await pilihOpsi(page, pertama.jawaban);
    await kunciJawaban(page);
    await lanjut(page, 'Lanjut ke soal 2');
    await tungguSoal(page, 2);
    await tungguGulirBerhenti(page);
    const u2 = await ukurKeping(page);
    expect(u2.titikAnak.map((a) => a.kelas)).toEqual([
      'titik titik-lewat',
      'titik titik-kini',
      'titik',
      'titik titik-sesudah',
    ]);
    expect(Math.abs(tengah(u2.tanggal) - tengah(u2.titik))).toBeLessThanOrEqual(1.5);
  });
}
