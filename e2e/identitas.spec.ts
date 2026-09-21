import { expect, test, type ElementHandle, type Page } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  bersentuh,
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

/**
 * Buka semua yang bisa dibuka di layar ini, termasuk "Rincian teknis".
 *
 * **Tiap kontrol dipegang sekali, lalu diperiksa dan diketuk lewat pegangan
 * yang sama** — dan itulah inti perbaikan A1-T5c.
 *
 * Versi sebelumnya memakai `locator.nth(n)` dan **menyelesaikan selektornya
 * berkali-kali untuk satu kontrol yang sama**: sekali untuk `count()`, sekali
 * untuk membaca `open`, sekali lagi untuk `locator('summary')`, sekali lagi
 * saat mengetuk. Di antara pembacaan itu daftarnya **tumbuh**: tiap lipatan yang
 * terbuka melahirkan "Rincian teknis"-nya sendiri, dan tiap tautan angka yang
 * terbuka melahirkan satu blok penjelasan beserta lipatannya. Indeks ke-n pada
 * pembacaan pertama bukan elemen yang sama dengan indeks ke-n pada pembacaan
 * berikutnya, jadi kontrol bisa terlewat, terketuk dua kali (terbuka lalu
 * tertutup lagi), atau — yang paling merusak — kontrol yang sengaja dilewati
 * bisa ikut terketuk. Itu hipotesis paling masuk akal untuk E-09a yang gagal
 * satu dari empat putaran di tangan reviewer.
 *
 * Pegangan (`elementHandles`) tidak bisa bergeser: ia menunjuk simpul, bukan
 * posisi. Pemeriksaan "masih tertutup?" dan ketukannya memakai pegangan yang
 * sama, jadi keduanya tidak mungkin bicara tentang elemen yang berbeda.
 */
async function bukaSemuaLipatan(page: Page): Promise<number> {
  let dibuka = 0;
  // Empat putaran: membuka lipatan melahirkan lipatan baru di dalamnya, dan
  // yang baru itu pun bisa melahirkan lagi. Putarannya berhenti sendiri begitu
  // tidak ada lagi yang tertutup.
  for (let putaran = 0; putaran < 4; putaran += 1) {
    const pegangan: ElementHandle<Node>[] = [
      ...(await page.locator('[aria-expanded="false"]').elementHandles()),
      ...(await page.locator('details:not([open]) > summary').elementHandles()),
    ];
    if (pegangan.length === 0) break;

    for (const satu of pegangan) {
      try {
        /*
         * Membuka satu kontrol bisa membuka kontrol lain: tautan angka dan kaki
         * lembar berbagi himpunan `sumberTerbuka` yang sama. Tanpa pemeriksaan
         * ini, ketukan berikutnya justru MENUTUP yang sudah terbuka.
         */
        const masihTertutup = await satu.evaluate((simpul) => {
          if (!(simpul instanceof Element)) return false;
          if (simpul.tagName.toLowerCase() === 'summary') {
            return (simpul.parentElement as HTMLDetailsElement | null)?.open !== true;
          }
          return simpul.getAttribute('aria-expanded') === 'false';
        });
        if (!masihTertutup) continue;
        await satu.scrollIntoViewIfNeeded();
        if (bersentuh()) await satu.tap();
        else await satu.click();
        dibuka += 1;
      } catch {
        // Simpulnya sudah lepas dari DOM karena lipatan lain berubah; putaran
        // berikutnya akan memungut penggantinya.
      } finally {
        await satu.dispose();
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
