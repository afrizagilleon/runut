import { expect, test, type Page } from '@playwright/test';
import {
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
 * E-17 — titik pemisah di keping kalender berdenyut sekali, di soal pertama
 * (M3.6 D-3).
 *
 * Temuan ketiga pemilik: teman FEB-nya tidak pernah melihat keping
 * "HARI INI · RABU 8 OKT 2025" sama sekali — ia berpatokan pada tiga bulatan
 * kemajuan. Kepingnya menempel diam di puncak layar, dan yang diam tidak
 * menarik mata. Maka titik pemisahnya berdenyut satu detik ketika soal pertama
 * tampil, lalu diam untuk seterusnya.
 *
 * Yang diukur adalah **animasinya sendiri**, bukan jam dinding: berapa lama ia
 * dijanjikan oleh gayanya (`getComputedTiming().endTime`), berapa detak, dan
 * bahwa ia benar-benar mencapai `finished`. Menunggu satu detik lalu memeriksa
 * adalah tes yang tidak tahu apa yang ditunggunya.
 *
 * Ia **menambah satu gerak** di luar sobekan kalender, dan `docs/desain.md`
 * baris 65 melarang itu. Penyimpangannya sadar, datang dari mata pemilik, dan
 * dicatat di ledger M3.6 T-03; `docs/desain.md` tidak disentuh.
 */

interface GerakTitik {
  adaTitik: boolean;
  jumlah: number;
  nama: string[];
  /** Lama yang dijanjikan gayanya: tunda + lama aktif × jumlah detak. */
  dijanjikan: number[];
  detak: number[];
  keadaan: string[];
}

/**
 * Animasi yang melekat pada titik pemisah keping.
 *
 * Kelas dipakai untuk **mengukur**, bukan untuk menemukan elemen yang diketuk
 * (D-7 M3.3): titik ini memang bukan kontrol dan tidak punya peran.
 */
async function gerakTitik(page: Page): Promise<GerakTitik> {
  return await page.evaluate(() => {
    const titik = document.querySelector('[data-uid="keping"] .keping-titik');
    if (titik === null) {
      return { adaTitik: false, jumlah: 0, nama: [], dijanjikan: [], detak: [], keadaan: [] };
    }
    const semua = titik.getAnimations();
    return {
      adaTitik: true,
      jumlah: semua.length,
      nama: semua.map((a) => ('animationName' in a ? String(a.animationName) : 'tanpa-nama')),
      dijanjikan: semua.map((a) => {
        const waktu = a.effect?.getComputedTiming();
        return waktu === undefined ? Number.POSITIVE_INFINITY : Number(waktu.endTime ?? 0);
      }),
      detak: semua.map((a) => Number(a.effect?.getComputedTiming().iterations ?? 0)),
      keadaan: semua.map((a) => a.playState),
    };
  });
}

/** Tunggu semua animasi titik selesai — dalam satuan animasi, bukan jam. */
async function tungguDenyutSelesai(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const titik = document.querySelector('[data-uid="keping"] .keping-titik');
    if (titik === null) return;
    await Promise.all(
      titik.getAnimations().map(async (gerak) => {
        try {
          await gerak.finished;
        } catch {
          /* dibatalkan: dilaporkan lewat playState */
        }
      }),
    );
  });
}

async function keSoalBerikut(page: Page, nomor: number): Promise<void> {
  const kasus = bacaKasus();
  const soal = kasus.soal[nomor - 1];
  if (soal === undefined) throw new Error(`soal ${String(nomor)} tidak ada di berkas kasus`);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal.jawaban);
  await kunciJawaban(page);
  await lanjut(page, `Lanjut ke soal ${String(nomor + 1)}`);
}

test('E-17a titik keping berdenyut satu detik di soal 1, lalu diam', async ({ page }) => {
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  const gerak = await gerakTitik(page);
  expect(gerak.adaTitik, 'keping harus punya titik pemisah yang bisa diukur').toBe(true);
  expect(
    gerak.jumlah,
    `titik keping harus berdenyut di soal 1; animasi yang ada: ${gerak.nama.join(', ')}`,
  ).toBeGreaterThanOrEqual(1);
  expect(gerak.nama, 'namanya denyut').toEqual(expect.arrayContaining(['denyut']));

  const terlama = Math.max(...gerak.dijanjikan);
  expect(
    terlama,
    `denyutnya dijanjikan selesai dalam <= 1 detik; yang tertulis di gayanya ${String(terlama)} ms`,
  ).toBeLessThanOrEqual(1000);
  expect(terlama, 'lamanya hasil baca, bukan penanda').toBeGreaterThan(0);
  expect(gerak.detak, 'tiga detak').toEqual(expect.arrayContaining([3]));

  await tungguDenyutSelesai(page);
  const sesudah = await gerakTitik(page);
  expect(
    sesudah.keadaan.every((k) => k === 'finished'),
    `sesudahnya ia diam; playState: ${sesudah.keadaan.join(', ')}`,
  ).toBe(true);

  console.log(
    `E-17a denyut soal-1: animasi=${String(gerak.jumlah)} [${gerak.nama.join(', ')}] ` +
      `dijanjikan=${terlama.toFixed(0)}ms detak=${gerak.detak.join(',')} ` +
      `playState-akhir=${sesudah.keadaan.join(',')}`,
  );
});

test('E-17b titik keping TIDAK berdenyut lagi di soal 2', async ({ page }) => {
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await keSoalBerikut(page, 1);
  await tungguSoal(page, 2);

  const gerak = await gerakTitik(page);
  expect(gerak.adaTitik, 'keping soal 2 tetap punya titik pemisahnya').toBe(true);
  expect(
    gerak.jumlah,
    `titik keping tidak boleh berdenyut lagi di soal 2; yang ada: ${gerak.nama.join(', ')}`,
  ).toBe(0);

  console.log(`E-17b soal-2: animasi pada titik=${String(gerak.jumlah)}`);
});

test.describe('dengan prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('E-17c tanpa denyut ketika gerak diminta dihentikan', async ({ page }) => {
    await buka(page, penandaBaru());
    await mulaiKasus(page);
    await tungguSoal(page, 1);

    const gerak = await gerakTitik(page);
    expect(gerak.adaTitik, 'titiknya tetap ada, hanya tidak bergerak').toBe(true);
    expect(
      gerak.jumlah,
      `tidak boleh ada denyut sama sekali; yang ada: ${gerak.nama.join(', ')}`,
    ).toBe(0);

    console.log(`E-17c reduced-motion: animasi pada titik=${String(gerak.jumlah)}`);
  });
});
