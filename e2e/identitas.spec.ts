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
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-09 — INV-10: identitas emiten tidak bocor sebelum layar pembukaan.
 *
 * Seluruh gagasan permainan ini bergantung padanya. Pemain harus memutuskan dari
 * dokumen, bukan dari ingatan atau dari pencarian cepat; begitu kode sahamnya
 * terbaca di layar soal, pertanyaannya berhenti menjadi pertanyaan.
 *
 * Dua ukuran dipakai, dan bedanya penting:
 *
 * - **`innerText`** = apa yang benar-benar TERBACA di layar (E-09a);
 * - **`textContent`** = apa yang ADA di DOM, terbuka maupun tidak (E-09b).
 *
 * Sejak amandemen A-1 keduanya membuka **semua** lipatan, termasuk "Rincian
 * teknis" — di sanalah kode saham dulu bocor (C-3), dan di sanalah penjaganya
 * sekarang berdiri.
 */

/** Buka semua yang bisa dibuka di layar ini, termasuk "Rincian teknis". */
async function bukaSemuaLipatan(page: Page): Promise<number> {
  let dibuka = 0;

  const lipat = page.locator('[aria-expanded="false"]');
  for (let n = (await lipat.count()) - 1; n >= 0; n -= 1) {
    await ketuk(lipat.nth(n));
    dibuka += 1;
  }

  // Dua putaran: membuka sebuah lipatan bisa melahirkan lipatan baru di dalamnya
  // ("Rincian teknis" hanya ada setelah panel sumbernya terbentang).
  for (let putaran = 0; putaran < 2; putaran += 1) {
    const susulan = page.locator('[aria-expanded="false"]');
    for (let n = (await susulan.count()) - 1; n >= 0; n -= 1) {
      await ketuk(susulan.nth(n));
      dibuka += 1;
    }
    const rinci = page.locator('details');
    for (let n = (await rinci.count()) - 1; n >= 0; n -= 1) {
      const satu = rinci.nth(n);
      if ((await satu.evaluate((el) => (el as HTMLDetailsElement).open)) === false) {
        await ketuk(satu.locator('summary'));
        dibuka += 1;
      }
    }
  }
  return dibuka;
}

/** Teks yang benar-benar terbaca di layar. */
async function teksTerlihat(page: Page): Promise<string> {
  return await page.evaluate(() => document.body.innerText);
}

/** Seluruh teks yang ada di DOM. */
async function teksDom(page: Page): Promise<string> {
  return await page.evaluate(() => document.body.textContent ?? '');
}

/**
 * Pesan gagal yang bisa didiagnosis tanpa membuka jejak (D-A5b): layar, kata
 * yang ketemu, di posisi berapa, dan ±60 karakter di sekitarnya.
 *
 * Keluarannya **ASCII saja**. Konsol Windows ber-cp1252 bisa mati oleh karakter
 * non-ASCII, dan pesan gagal yang membunuh prosesnya sendiri tidak menolong
 * siapa pun — persis kenapa putaran reviewer yang merah tidak terbaca sebabnya.
 */
function keterangan(namaLayar: string, ukuran: string, teks: string, kata: string): string {
  const posisi = teks.indexOf(kata);
  if (posisi < 0) return `${namaLayar} (${ukuran}): "${kata}" tidak ditemukan`;
  const awal = Math.max(0, posisi - 60);
  const akhir = Math.min(teks.length, posisi + kata.length + 60);
  const sekitar = teks
    .slice(awal, akhir)
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return (
    `${namaLayar} (${ukuran}): menemukan "${kata}" di indeks ${String(posisi)} ` +
    `dari ${String(teks.length)} karakter; sekitarnya: ...${sekitar}...`
  );
}

async function tautanKeluar(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const asal = window.location.origin;
    return [...document.querySelectorAll('[href]')]
      .map((el) => el.getAttribute('href') ?? '')
      .filter((h) => h !== '')
      .filter((h) => {
        try {
          return new URL(h, asal).origin !== asal;
        } catch {
          return false;
        }
      });
  });
}

async function mainkanSampaiPembukaan(
  page: Page,
  periksa: (nama: string) => Promise<void>,
): Promise<void> {
  const kasus = bacaKasus();
  await periksa('layar-pertama');
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await periksa(`soal-${String(nomor + 1)}-sebelum-dikunci`);

    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await periksa(`soal-${String(nomor + 1)}-sesudah-dikunci`);

    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(
    page.getByRole('heading', { name: 'Waktu berjalan lagi' }),
    'layar pembukaan tercapai sesudah ketiga soal dikunci',
  ).toBeVisible();
}

function rahasiaKasus(): { medan: string; nilai: string }[] {
  const kasus = bacaKasus();
  return [
    { medan: 'simbol', nilai: kasus.emiten.simbol },
    { medan: 'nama', nilai: kasus.emiten.nama },
  ];
}

test('E-09a identitas emiten tidak TERBACA sebelum pembukaan, dan muncul sesudahnya', async ({
  page,
}) => {
  const rahasia = rahasiaKasus();
  await buka(page, penandaBaru());
  const laporan: string[] = [];

  await mainkanSampaiPembukaan(page, async (nama) => {
    const dibuka = await bukaSemuaLipatan(page);
    const teks = await teksTerlihat(page);
    for (const r of rahasia) {
      expect(teks.includes(r.nilai), keterangan(nama, 'innerText', teks, r.nilai)).toBe(false);
    }
    expect(
      await tautanKeluar(page),
      `layar "${nama}": tidak boleh ada href ke asal lain`,
    ).toEqual([]);
    laporan.push(
      `${nama}: lipatan-dibuka=${String(dibuka)} panjang-teks=${String(teks.length)} href-keluar=0`,
    );
  });

  /* --- sesudah pembukaan: identitasnya justru HARUS tampil ------------- */
  const teksPembukaan = await teksTerlihat(page);
  const tampil = rahasia.filter((r) => teksPembukaan.includes(r.nilai)).map((r) => r.medan);
  expect(
    tampil,
    `layar pembukaan: kode saham dan nama emiten keduanya harus tampil; ` +
      `panjang teks ${String(teksPembukaan.length)} karakter`,
  ).toEqual(['simbol', 'nama']);
  expect(
    await tautanKeluar(page),
    'layar pembukaan: tidak boleh ada href ke asal lain',
  ).toEqual([]);

  // eslint-disable-next-line no-console
  console.log(`E-09a sebelum pembukaan:\n  ${laporan.join('\n  ')}`);
});

test('E-09b identitas emiten tidak ADA DI DOM sebelum pembukaan, lipatan teknis pun dibuka', async ({
  page,
}) => {
  const rahasia = rahasiaKasus();
  await buka(page, penandaBaru());
  const laporan: string[] = [];

  await mainkanSampaiPembukaan(page, async (nama) => {
    const dibuka = await bukaSemuaLipatan(page);
    const terlihat = await teksTerlihat(page);
    const dom = await teksDom(page);
    for (const r of rahasia) {
      expect(terlihat.includes(r.nilai), keterangan(nama, 'innerText', terlihat, r.nilai)).toBe(
        false,
      );
      expect(dom.includes(r.nilai), keterangan(nama, 'textContent', dom, r.nilai)).toBe(false);
    }
    laporan.push(
      `${nama}: lipatan-dibuka=${String(dibuka)} panjang-dom=${String(dom.length)}`,
    );
  });

  /* --- sesudah pembukaan, nilai aslinya utuh lagi ---------------------- */
  const domPembukaan = await teksDom(page);
  for (const r of rahasia) {
    expect(
      domPembukaan.includes(r.nilai),
      `layar pembukaan: ${r.medan} emiten ("${r.nilai}") harus ada utuh di DOM`,
    ).toBe(true);
  }

  // eslint-disable-next-line no-console
  console.log(`E-09b sebelum pembukaan (semua lipatan dibuka):\n  ${laporan.join('\n  ')}`);
});
