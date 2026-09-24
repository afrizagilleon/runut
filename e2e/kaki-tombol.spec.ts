import { readFileSync } from 'node:fs';
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
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ID_KASUS, berkasKasus } from './bantu/jalur.ts';

/**
 * E-45 — kaki kartu adalah tombol yang tampak seperti tombol (M3.11 D-5,
 * usulan uji duduk 22 Sep R-04, layar contoh
 * `.contracts/lampiran/M-0311/v3b-kaki-kartu.html` baris ±117).
 *
 * Sampai M3.10 kaki lembar ("Lihat sumbernya ›") adalah baris tulisan ungu di
 * bawah garis tipis; teman uji duduk tidak tahu itu bisa dibuka, dan di soal 1
 * hanya 10 dari 27 sesi yang membukanya. Sekarang: tombol garis tepi 1,5 px
 * `--stempel`, sudut 3 px, di dalam lembar berjarak 12 px dari tepi kiri, kanan,
 * dan bawah, selebar lembar dikurangi 24 px, tinggi >= 44 px, panah "›" di
 * kanan yang berputar 90° saat terbuka. Label: "Buka dokumennya" (lembar
 * dokumen) / "Lihat hitungannya" (lembar hitungan). `data-uid` tidak berubah.
 */

interface Kaki {
  tag: string;
  uid: string;
  teks: string;
  panahTeks: string;
  tepi: string[];
  tepiDitulis: string[];
  tepiPembanding: string;
  corak: string[];
  warnaTepi: string[];
  stempel: string;
  sudut: string;
  lebar: number;
  lebarLembar: number;
  jarakKiri: number;
  jarakKanan: number;
  jarakBawah: number;
  tinggi: number;
  panahKanan: number;
  kakiKanan: number;
  panahPutar: string;
}

async function ukurKaki(page: Page, fact_id: string): Promise<Kaki> {
  return await page.evaluate((id: string) => {
    const lembar = document.querySelector(`[data-uid="lembar:${id}"]`);
    const kaki = document.querySelector(`[data-uid="kaki:${id}"]`);
    if (lembar === null || kaki === null) throw new Error(`lembar/kaki ${id} tidak ada`);
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.borderTop = '1px solid var(--stempel)';
    const stempel = getComputedStyle(coba).borderTopColor;
    coba.remove();
    /*
     * Tebal tepi: Chromium MEMBULATKAN KE BAWAH lebar tepi antara 1 dan 2 px CSS
     * menjadi 1 px — nilai terhitung DAN yang dilukis (kotak ber-tepi 1,5 px
     * setinggi 20 + 2 × 1, terukur di iterasi pertama tes ini, DPR 2). Jadi
     * "terhitung ≥ 1,5 px" tidak bisa dipenuhi oleh tepi 1,5 px di Chromium mana
     * pun. Yang diperiksa: (1) nilai yang DITULIS di lembar gaya = 1,5 px
     * (CSSOM), dan (2) nilai terhitung = nilai terhitung sebuah pembanding
     * ber-tepi 1,5 px di halaman yang sama — kalau Chromium kelak melukis
     * 1,5 px, tes ini ikut menuntutnya.
     */
    const pembanding = document.createElement('div');
    pembanding.style.border = '1.5px solid';
    document.body.append(pembanding);
    const tepiPembanding = getComputedStyle(pembanding).borderTopWidth;
    pembanding.remove();
    const tepiDitulis: string[] = [];
    for (const lembarGaya of document.styleSheets) {
      for (const aturan of lembarGaya.cssRules) {
        if (aturan instanceof CSSStyleRule && aturan.selectorText === '.lembar-kaki') {
          // Singkatan `border` yang memuat var() membuat longhand-nya kosong di
          // CSSOM; tebalnya dibaca dari singkatan itu sendiri.
          const tebal = /^([\d.]+px)\s/.exec(aturan.style.getPropertyValue('border'))?.[1];
          if (tebal !== undefined) tepiDitulis.push(tebal, tebal, tebal, tebal);
        }
      }
    }
    const gk = getComputedStyle(kaki);
    const gl = getComputedStyle(lembar);
    const kk = kaki.getBoundingClientRect();
    const kl = lembar.getBoundingClientRect();
    const panah = kaki.querySelector('.panah');
    const kp = panah?.getBoundingClientRect();
    const dalamKiri = kl.left + parseFloat(gl.borderLeftWidth);
    const dalamKanan = kl.right - parseFloat(gl.borderRightWidth);
    const dalamBawah = kl.bottom - parseFloat(gl.borderBottomWidth);
    return {
      tag: kaki.tagName.toLowerCase(),
      uid: kaki.getAttribute('data-uid') ?? '',
      teks: [...kaki.childNodes]
        .filter((n) => n !== panah)
        .map((n) => n.textContent ?? '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
      panahTeks: (panah?.textContent ?? '').trim(),
      tepi: [gk.borderTopWidth, gk.borderRightWidth, gk.borderBottomWidth, gk.borderLeftWidth],
      tepiDitulis,
      tepiPembanding,
      corak: [gk.borderTopStyle, gk.borderRightStyle, gk.borderBottomStyle, gk.borderLeftStyle],
      warnaTepi: [gk.borderTopColor, gk.borderRightColor, gk.borderBottomColor, gk.borderLeftColor],
      stempel,
      sudut: gk.borderTopLeftRadius,
      lebar: kk.width,
      lebarLembar: kl.width,
      jarakKiri: kk.left - dalamKiri,
      jarakKanan: dalamKanan - kk.right,
      // Jarak ke tepi bawah hanya berarti saat tertutup (saat terbuka isinya di bawah kaki).
      jarakBawah: dalamBawah - kk.bottom,
      tinggi: kk.height,
      panahKanan: kp?.right ?? 0,
      kakiKanan: kk.right,
      panahPutar: panah === null ? '(tidak ada)' : getComputedStyle(panah).transform,
    };
  }, fact_id);
}

function jenisFakta(kasus_id: string): Map<string, string> {
  const isi = JSON.parse(readFileSync(berkasKasus(kasus_id), 'utf8')) as {
    fakta: { fact_id: string; sumber: { jenis: string } }[];
  };
  return new Map(isi.fakta.map((f) => [f.fact_id, f.sumber.jenis]));
}

const LABEL_DOKUMEN = 'Buka dokumennya';
const LABEL_HITUNG = 'Lihat hitungannya';

/** Putaran 90°: matriks transform Chromium untuk rotate(90deg). */
const PUTAR_90 = /^matrix\((6\.1\d*e-17|0), 1, -1, (6\.1\d*e-17|0), 0, 0\)$/;

for (const kasus_id of ID_KASUS) {
  test(`E-45 [${kasus_id}] kaki kartu penentu soal 1 = tombol garis tepi selebar lembar; buka -> tutup -> buka`, async ({
    page,
  }) => {
    const kasus = bacaKasus(kasus_id);
    const soal = kasus.soal[0];
    const penentu = soal?.kartu_penentu[0];
    if (soal === undefined || penentu === undefined) throw new Error('soal 1 tanpa kartu penentu');
    const jenis = jenisFakta(kasus_id);
    const labelHarap = jenis.get(penentu) === 'turunan' ? LABEL_HITUNG : LABEL_DOKUMEN;

    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);
    await tungguSoal(page, 1);
    await tungguGulirBerhenti(page);

    const tutup1 = await ukurKaki(page, penentu);
    // eslint-disable-next-line no-console
    console.log(`E-45 [${test.info().project.name}] [${kasus_id}] tertutup ${JSON.stringify(tutup1)}`);
    expect(tutup1.tag, 'kaki kartu adalah button').toBe('button');
    expect(tutup1.uid, 'data-uid kaki tidak berubah').toBe(`kaki:${penentu}`);
    expect(tutup1.teks, 'label kaki').toBe(labelHarap);
    expect(tutup1.panahTeks, 'panah "›" di kaki').toBe('›');
    expect(tutup1.tepiDitulis, 'tepi yang ditulis di lembar gaya: 1,5 px keempat sisi').toEqual(['1.5px', '1.5px', '1.5px', '1.5px']);
    expect(tutup1.tepi, `tepi terhitung = pembanding 1,5 px (${tutup1.tepiPembanding})`).toEqual([
      tutup1.tepiPembanding,
      tutup1.tepiPembanding,
      tutup1.tepiPembanding,
      tutup1.tepiPembanding,
    ]);
    for (const t of tutup1.tepi) expect(parseFloat(t), 'tepi terlihat').toBeGreaterThanOrEqual(1);
    expect(tutup1.corak).toEqual(['solid', 'solid', 'solid', 'solid']);
    expect(tutup1.warnaTepi, 'tepi --stempel').toEqual([tutup1.stempel, tutup1.stempel, tutup1.stempel, tutup1.stempel]);
    expect(tutup1.sudut).toBe('3px');
    expect(tutup1.lebar / tutup1.lebarLembar, 'lebar >= 85 % lembar').toBeGreaterThanOrEqual(0.85);
    expect(Math.abs(tutup1.jarakKiri - 12), `jarak kiri 12 px (${tutup1.jarakKiri.toFixed(2)})`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(tutup1.jarakKanan - 12), `jarak kanan 12 px (${tutup1.jarakKanan.toFixed(2)})`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(tutup1.jarakBawah - 12), `jarak bawah 12 px (${tutup1.jarakBawah.toFixed(2)})`).toBeLessThanOrEqual(0.5);
    expect(tutup1.tinggi).toBeGreaterThanOrEqual(44);
    expect(tutup1.kakiKanan - tutup1.panahKanan, 'panah di kanan (dalam bantalan 12 px + tepi)').toBeLessThanOrEqual(16);
    expect(tutup1.panahPutar, 'panah tidak berputar saat tertutup').toBe('none');

    // Semua kaki di soal ini memakai label baru.
    const semua = await page.locator('.lembar [data-uid^="kaki:"]').evaluateAll((el) =>
      el.map((e) => [
        (e.getAttribute('data-uid') ?? '').slice(5),
        [...e.childNodes]
          .filter((n) => !(n instanceof Element && n.classList.contains('panah')))
          .map((n) => n.textContent ?? '')
          .join('')
          .trim(),
      ]),
    );
    for (const [id, teks] of semua) {
      expect(teks, `kaki ${String(id)}`).toBe(jenis.get(id ?? '') === 'turunan' ? LABEL_HITUNG : LABEL_DOKUMEN);
    }

    const kaki = page.locator(`[data-uid="kaki:${penentu}"]`);
    const isi = page.locator(`[data-uid="lembar:${penentu}"] .buka`);
    // buka
    await ketuk(kaki);
    await expect(kaki).toHaveAttribute('aria-expanded', 'true');
    await expect(isi).toBeVisible();
    await expect.poll(async () => (await ukurKaki(page, penentu)).panahPutar, { message: 'panah berputar 90° saat terbuka' }).toMatch(PUTAR_90);
    const terbuka = await ukurKaki(page, penentu);
    // tutup
    await ketuk(kaki);
    await expect(kaki).toHaveAttribute('aria-expanded', 'false');
    await expect(isi).toHaveCount(0);
    await expect.poll(async () => (await ukurKaki(page, penentu)).panahPutar).toBe('none');
    const tutup2 = await ukurKaki(page, penentu);
    // buka lagi
    await ketuk(kaki);
    await expect(kaki).toHaveAttribute('aria-expanded', 'true');
    await expect(isi).toBeVisible();
    // eslint-disable-next-line no-console
    console.log(
      `E-45 [${test.info().project.name}] [${kasus_id}] terbuka tinggi=${terbuka.tinggi.toFixed(1)} jarak=${terbuka.jarakKiri.toFixed(1)}/${terbuka.jarakKanan.toFixed(1)} · ` +
        `tertutup lagi jarakBawah=${tutup2.jarakBawah.toFixed(1)} tinggi=${tutup2.tinggi.toFixed(1)}`,
    );
    expect(Math.abs(tutup2.jarakBawah - 12)).toBeLessThanOrEqual(0.5);

    // Masih bisa dijawab seperti biasa sesudahnya.
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(page, kasus.soal.length === 1 ? LABEL_SESUDAHNYA : 'Lanjut ke soal 2');
    await tungguSoal(page, 2);
  });
}
