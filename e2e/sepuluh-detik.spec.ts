import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_MULAI,
  buka,
  mulaiKasus,
  penandaBaru,
  simpanLayar,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-30 — ukuran sepuluh detik pertama, di 360 × 640 (M3.9 D-6).
 *
 * Data alpha 23 Sep: ±9 sesi masuk soal 1 lalu pergi dalam 1–15 detik tanpa
 * satu ketukan. Varian A dirancang supaya yang perlu dibaca untuk mulai terlihat
 * TANPA menggulir, dan jarak ke opsi pertama pendek. Tes ini mengukur tiga janji
 * itu di peramban yang melukis, untuk kedua kasus:
 *
 * 1. layar pertama: judul, contoh gelembung, ajakan, dan tombol "Mulai kasus"
 *    semuanya `bottom ≤ innerHeight` tanpa gulir; tidak ada "Kita mundur ke";
 * 2. soal 1: kartu PENENTU (`kartu_penentu[0]` dari berkas kasus, bukan
 *    "kartu pertama di layar") adalah kartu pertama dan terlihat utuh di bawah
 *    keping, di atas bilah, tanpa menggulir;
 * 3. soal 1: tepi bawah opsi a dicapai dengan gulir ≤ 260 px.
 *
 * Contoh gelembung dibandingkan dengan `soal[0].pesan.isi` berkas kasus, jadi
 * gelembung yang ditulis ulang sebagai teks tetap membuat tes ini merah.
 *
 * Kontrak menyebut "terang"; tes jalan di kedua proyek ponsel karena tata
 * letaknya tidak bergantung pada skema warna, dan tangkapan layar gelap juga
 * diminta (RQ-08). Tangkapan layar: `<proyek>/k06/<kasus>/01-pertama.png`,
 * `02-soal1.png`.
 */

const BATAS_GULIR_OPSI_A = 260;

interface Kotak {
  top: number;
  bottom: number;
}

async function kotak(page: Page, pemilih: string): Promise<Kotak> {
  const k = await page.locator(pemilih).first().boundingBox();
  expect(k, `${pemilih} harus punya kotak`).not.toBeNull();
  return { top: k?.y ?? 0, bottom: (k?.y ?? 0) + (k?.height ?? 0) };
}

for (const kasus_id of ID_KASUS) {
  test(`E-30 [${kasus_id}] sepuluh detik pertama muat di 360 × 640`, async ({ page }) => {
    test.skip(test.info().project.name === 'lebar', 'D-6 diukur di 360 × 640');
    const kasus = bacaKasus(kasus_id);
    const soal = kasus.soal[0];
    expect(soal, 'kasus punya soal pertama').toBeDefined();
    if (soal === undefined) return;
    const subfolder = `k06/${kasus_id}`;

    /* --- 1. layar pertama tanpa gulir ------------------------------------ */
    await buka(page, penandaBaru(), kasus_id);
    const mulai = page.getByRole('button', { name: LABEL_MULAI });
    await expect(mulai).toBeVisible();
    await expect(page.locator('[data-uid="contoh-pesan"] .isi')).toHaveText(soal.pesan.isi);
    await expect(page.locator('body')).not.toContainText('Kita mundur ke');
    const jendela = page.viewportSize()?.height ?? 0;
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const pertama = {
      judul: await kotak(page, 'h1#judul-pembuka'),
      contoh: await kotak(page, '[data-uid="contoh-pesan"]'),
      ajak: await kotak(page, '[data-uid="ajak"]'),
      mulai: await kotak(page, '[data-uid="bilah"] .tombol-utama'),
    };
    const lapor1 = Object.entries(pertama)
      .map(([nama, k]) => `${nama}.bawah=${k.bottom.toFixed(1)}`)
      .join(' ');
    for (const [nama, k] of Object.entries(pertama)) {
      expect(k.bottom, `${nama} harus terlihat tanpa menggulir (${lapor1}, jendela ${String(jendela)})`).toBeLessThanOrEqual(
        jendela,
      );
    }
    await simpanLayar(page, '01', 'pertama', false, subfolder);

    /* --- 2. soal 1: kartu penentu utuh tanpa gulir ------------------------ */
    await mulaiKasus(page);
    await tungguSoal(page, 1);
    await tungguGulirBerhenti(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const penentu = soal.kartu_penentu[0] ?? '';
    const lembarPertama = await page
      .locator('.tumpukan [data-uid^="lembar:"]')
      .first()
      .getAttribute('data-uid');
    expect(lembarPertama, 'kartu pertama di layar harus kartu penentu').toBe(`lembar:${penentu}`);

    const keping = await kotak(page, '[data-uid="keping"]');
    const kartu = await kotak(page, `[data-uid="lembar:${penentu}"]`);
    const bilah = await kotak(page, '[data-uid^="bilah:"]');
    const lapor2 = `keping.bawah=${keping.bottom.toFixed(1)} kartu=${kartu.top.toFixed(1)}–${kartu.bottom.toFixed(1)} bilah.atas=${bilah.top.toFixed(1)}`;
    expect(kartu.top, `kartu penentu di bawah keping: ${lapor2}`).toBeGreaterThanOrEqual(keping.bottom);
    expect(kartu.bottom, `kartu penentu utuh di atas bilah: ${lapor2}`).toBeLessThanOrEqual(bilah.top);
    await simpanLayar(page, '02', 'soal1', false, subfolder);

    /* --- 3. opsi a dicapai dengan gulir ≤ 260 px -------------------------- */
    const opsiA = await kotak(page, `[data-uid="opsi:${soal.pilihan[0]?.kunci ?? 'a'}"]`);
    const gulirPerlu = Math.max(0, opsiA.bottom - jendela);
    const gulirPerluBilah = Math.max(0, opsiA.bottom - bilah.top);
    // eslint-disable-next-line no-console
    console.log(
      `E-30 [${test.info().project.name}] [${kasus_id}] layar pertama: ${lapor1} jendela=${String(jendela)} · soal 1: ${lapor2} · opsi a.bawah=${opsiA.bottom.toFixed(1)} -> gulir ke tepi jendela ${gulirPerlu.toFixed(1)} px (ke tepi bilah ${gulirPerluBilah.toFixed(1)} px), batas ${String(BATAS_GULIR_OPSI_A)}`,
    );
    expect(gulirPerlu, `opsi a harus tercapai dengan gulir ≤ ${String(BATAS_GULIR_OPSI_A)} px`).toBeLessThanOrEqual(
      BATAS_GULIR_OPSI_A,
    );
    // Dan itu sungguh terjadi: sesudah menggulir sejauh itu, tepi bawah opsi a di dalam jendela.
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' });
    }, Math.ceil(gulirPerlu));
    await tungguGulirBerhenti(page);
    const opsiSesudah = await kotak(page, `[data-uid="opsi:${soal.pilihan[0]?.kunci ?? 'a'}"]`);
    expect(opsiSesudah.bottom).toBeLessThanOrEqual(jendela + 0.5);
  });
}
