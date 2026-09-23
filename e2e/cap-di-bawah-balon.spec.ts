import { expect, test, type Page } from '@playwright/test';
import {
  AMBANG_OPSI,
  bilahTurun,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';
import { intipBalonProduk } from './bantu/ambang.ts';
import { peristiwaSesi, tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-25 — sesudah "Kunci jawaban", cap mendarat DI BAWAH balon melayang
 * (M3.8 amandemen A-1, D-10).
 *
 * Cacat produk yang hidup sejak M3.7: `useGulirKeCap` menggulir cap dengan
 * `scroll-margin-top: 64px`, angka yang hanya memperhitungkan keping. Balon
 * melayang yang mengintip (tepi 28 px + grip, tepat di bawah keping) ikut
 * menutupi puncak layar, jadi cap "BELUM COCOK"/"COCOK" — satu-satunya hal
 * yang ingin dilihat pemain sesudah mengunci — mendarat di baliknya.
 *
 * Yang diukur adalah kotak yang sungguhan sesudah gulir DAN gerak balon
 * berhenti: tepi atas cap tidak boleh di atas tepi bawah balon (termasuk
 * garis 2 px di bawahnya), dan cap harus utuh di atas bilah bawah. Diulang
 * untuk kedua kasus, karena panjang pesan dan kartunya berbeda.
 */

const INTIP = intipBalonProduk();

interface Kotak {
  aktif: boolean;
  turun: boolean;
  balonBawah: number;
  kepingBawah: number;
  capAtas: number;
  capBawah: number;
  bilahAtas: number;
  tinggiJendela: number;
}

async function ukur(page: Page): Promise<Kotak> {
  return page.evaluate(() => {
    const wadah = document.querySelector('.melayang');
    const balon = document.querySelector('[data-uid="balon"]');
    const keping = document.querySelector('[data-uid="keping"]');
    const cap = document.querySelector('[data-uid="sesudah-dikunci"] .cap');
    const bilah = document.querySelector('.tindakan');
    // Garis 0 2px 0 di bawah balon (patokan v3d) adalah bagian yang terlihat.
    const bayangan = balon === null ? 0 : parseFloat(getComputedStyle(balon).boxShadow.split(' ').at(-3) ?? '0');
    return {
      aktif: wadah?.classList.contains('melayang-aktif') ?? false,
      turun: wadah?.classList.contains('melayang-turun') ?? false,
      balonBawah: (balon?.getBoundingClientRect().bottom ?? 0) + (Number.isFinite(bayangan) ? bayangan : 0),
      kepingBawah: keping?.getBoundingClientRect().bottom ?? 0,
      capAtas: cap?.getBoundingClientRect().top ?? Number.NaN,
      capBawah: cap?.getBoundingClientRect().bottom ?? Number.NaN,
      bilahAtas: bilah?.getBoundingClientRect().top ?? window.innerHeight,
      tinggiJendela: window.innerHeight,
    };
  });
}

async function tungguBalonDiam(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const balon = document.querySelector('[data-uid="balon"]');
    if (balon === null) return;
    await Promise.all(
      balon.getAnimations().map(async (gerak) => {
        try {
          await gerak.finished;
        } catch {
          /* dibatalkan */
        }
      }),
    );
  });
}

/** Sampai di opsi soal 1, dengan salinan balon melayang (mengintip). */
async function keOpsi(page: Page, kasus_id: string, penanda: string): Promise<void> {
  const soal = bacaKasus(kasus_id).soal[0];
  if (soal === undefined) throw new Error('kasus tidak punya soal pertama');
  await buka(page, penanda, kasus_id);
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await ketuk(bilahTurun(page));
  await tungguMasukLayar(opsi(page, soal.pilihan[0]?.kunci ?? 'a'), AMBANG_OPSI, 'opsi terlihat');
  await tungguGulirBerhenti(page);
  await expect
    .poll(async () => (await ukur(page)).aktif, { message: 'balon harus melayang sebelum mengunci' })
    .toBe(true);
}

async function kunciLaluUkur(page: Page, kasus_id: string): Promise<Kotak> {
  const soal = bacaKasus(kasus_id).soal[0];
  if (soal === undefined) throw new Error('kasus tidak punya soal pertama');
  await pilihOpsi(page, kunciSalah(soal));
  await kunciJawaban(page);
  await expect(page.locator('[data-uid="sesudah-dikunci"] .cap')).toBeVisible();
  await tungguGulirBerhenti(page);
  await tungguBalonDiam(page);
  return ukur(page);
}

function periksaCap(k: Kotak, label: string): void {
  // Prasyarat: balonnya MASIH melayang. Tanpa itu tes ini tidak menguji apa-apa.
  expect(k.aktif, `${label}: balon masih melayang sesudah gulir (prasyarat tes)`).toBe(true);
  expect(k.turun, `${label}: balon mengintip, tidak turun`).toBe(false);
  expect(
    k.balonBawah,
    `${label}: balon mengintip ${String(INTIP)} px di bawah keping (keping=${k.kepingBawah.toFixed(1)})`,
  ).toBeGreaterThan(k.kepingBawah);
  expect(
    k.capAtas,
    `${label}: cap.top=${k.capAtas.toFixed(1)} harus >= balon.bottom=${k.balonBawah.toFixed(1)}`,
  ).toBeGreaterThanOrEqual(k.balonBawah - 0.5);
  expect(
    k.capBawah,
    `${label}: cap utuh di atas bilah bawah (cap.bottom=${k.capBawah.toFixed(1)}, bilah.top=${k.bilahAtas.toFixed(1)})`,
  ).toBeLessThanOrEqual(Math.min(k.bilahAtas, k.tinggiJendela) + 0.5);
}

for (const kasus_id of ID_KASUS) {
  test(`E-25a [${kasus_id}] balon mengintip: cap mendarat di bawahnya, utuh`, async ({ page }, info) => {
    test.skip(info.project.name !== 'ponsel-terang', 'D-10: 360×640 terang');
    await keOpsi(page, kasus_id, penandaBaru());
    const k = await kunciLaluUkur(page, kasus_id);
    periksaCap(k, `${kasus_id} intip`);
    // eslint-disable-next-line no-console
    console.log(
      `E-25a [${kasus_id}] keping.bawah=${k.kepingBawah.toFixed(1)} balon.bawah=${k.balonBawah.toFixed(1)} ` +
        `cap.atas=${k.capAtas.toFixed(1)} cap.bawah=${k.capBawah.toFixed(1)} bilah.atas=${k.bilahAtas.toFixed(1)}`,
    );
  });

  test(`E-25b [${kasus_id}] balon sedang TURUN: kunci mengembalikannya ke intip tanpa peristiwa balon`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'ponsel-terang', 'D-10: 360×640 terang');
    const penanda = penandaBaru();
    await keOpsi(page, kasus_id, penanda);
    const sesi = await tungguSatuSesi(penanda);
    // Pemain menurunkan balonnya sendiri: satu peristiwa `balon {turun, ketuk}`.
    // Diketuk di tepi yang memang terlihat: pusat balon yang mengintip ada di
    // balik keping (lihat `ketukTepiBalon` di balon-melayang.spec.ts).
    const tinggiBalon = await page
      .locator('[data-uid="balon"]')
      .evaluate((el) => el.getBoundingClientRect().height);
    await page
      .locator('[data-uid="balon"]')
      .tap({ position: { x: 24, y: tinggiBalon - INTIP / 2 } });
    await expect
      .poll(async () => (await ukur(page)).turun, { message: 'balon turun sesudah diketuk' })
      .toBe(true);
    await tungguBalonDiam(page);

    const k = await kunciLaluUkur(page, kasus_id);
    periksaCap(k, `${kasus_id} turun→kunci`);

    // Satu-satunya `balon` adalah ketukan pemain; kunci tidak melahirkan yang kedua.
    await tungguCocok(sesi, (p) => p.nama === 'kunci_jawaban', 'kunci_jawaban tiba');
    const balon = peristiwaSesi(sesi).filter((p) => p.nama === 'balon');
    expect(balon.map((p) => `${String(p.isi['keadaan'])}/${String(p.isi['cara'])}`)).toEqual([
      'turun/ketuk',
    ]);
    // eslint-disable-next-line no-console
    console.log(
      `E-25b [${kasus_id}] sesudah kunci: turun=${String(k.turun)} balon.bawah=${k.balonBawah.toFixed(1)} ` +
        `cap.atas=${k.capAtas.toFixed(1)} peristiwa-balon=${String(balon.length)}`,
    );
  });
}
