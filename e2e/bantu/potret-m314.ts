/**
 * `node e2e/bantu/potret-m314.ts <sebelum|sesudah-r0|sesudah|uji>` — tangkapan
 * layar M3.14 (D-5, D-6, D-7) ke `.cache/e2e/m314/<ragam>/`.
 *
 * Pola `potret.ts`: build tanpa pengumpul ke `.cache/e2e/dist-potret-m314`,
 * setiap permintaan ke asal tiruan dipenuhi dari cakram lewat `page.route`,
 * yang lain dibatalkan dan dilaporkan. Tidak ada port yang didengar.
 *
 * 360 × 640 dan 390 × 844 (ponsel sentuh), terang dan gelap, simulasi DADA.
 * Layar: pertama; soal 1 tanpa pemandu (atas + penuh); pemandu tiap langkah;
 * petunjuk ditekan; terima kasih + kalender; kalender dari layar pertama
 * (pengunjung yang kembali); dapur atas + penuh. Yang belum ada di sebuah
 * versi (mis. pemandu di `sebelum`) dilewati dan dilaporkan, tidak digagalkan.
 *
 * Ragam `uji` hanya 360 × 640 terang: bahan penguji pemahaman (D-5).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { build } from 'vite';
import { chromium, type Browser, type Page } from '@playwright/test';
import { AKAR, CACHE, berkasKasus } from './jalur.ts';

const RAGAM = process.argv[2] ?? '';
if (!/^(sebelum|sesudah-r\d|sesudah|uji)$/.test(RAGAM)) {
  throw new Error(`ragam harus sebelum|sesudah-rN|sesudah|uji, bukan "${RAGAM}"`);
}
const DIST = join(CACHE, 'dist-potret-m314');
const KELUAR = join(CACHE, 'm314', RAGAM);
const ASAL = 'http://localhost:4997';
const KASUS_ID = 'dada-2025-10-08';

const TIPE: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

interface Ukuran {
  nama: string;
  lebar: number;
  tinggi: number;
}

const UKURAN: Ukuran[] =
  RAGAM === 'uji'
    ? [{ nama: '360', lebar: 360, tinggi: 640 }]
    : [
        { nama: '360', lebar: 360, tinggi: 640 },
        { nama: '390', lebar: 390, tinggi: 844 },
      ];

const SKEMA: Array<'light' | 'dark'> = RAGAM === 'uji' ? ['light'] : ['light', 'dark'];

async function tenang(page: Page): Promise<void> {
  await page.evaluate(
    async () =>
      await Promise.all(
        document.getAnimations().map(async (a) => {
          try {
            await a.finished;
          } catch {
            /* dibatalkan */
          }
        }),
      ),
  );
  await page.evaluate(
    async () =>
      await new Promise<void>((beres) => {
        let terakhir = Number.NaN;
        let diam = 0;
        const langkah = (): void => {
          if (window.scrollY === terakhir) diam += 1;
          else {
            diam = 0;
            terakhir = window.scrollY;
          }
          if (diam >= 10) beres();
          else requestAnimationFrame(langkah);
        };
        requestAnimationFrame(langkah);
      }),
  );
}

async function konteksBaru(
  peramban: Browser,
  skema: 'light' | 'dark',
  ukuran: Ukuran,
  dibatalkan: string[],
): Promise<{ page: Page; tutup: () => Promise<void> }> {
  const konteks = await peramban.newContext({
    viewport: { width: ukuran.lebar, height: ukuran.tinggi },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: skema,
  });
  const page = await konteks.newPage();
  await page.route('**/*', async (rute) => {
    const alamat = new URL(rute.request().url());
    if (alamat.origin !== ASAL) {
      dibatalkan.push(alamat.href);
      await rute.abort();
      return;
    }
    const jalur = alamat.pathname === '/' ? '/index.html' : alamat.pathname;
    const berkas = normalize(join(DIST, decodeURIComponent(jalur)));
    if (!berkas.startsWith(DIST) || !existsSync(berkas)) {
      await rute.fulfill({ status: 404, body: 'tidak ada' });
      return;
    }
    await rute.fulfill({
      status: 200,
      contentType: TIPE[extname(berkas)] ?? 'application/octet-stream',
      body: readFileSync(berkas),
    });
  });
  return { page, tutup: async () => await konteks.close() };
}

async function ada(page: Page, pemilih: string): Promise<boolean> {
  return (await page.locator(pemilih).count()) > 0;
}

async function satuUkuran(
  peramban: Browser,
  skema: 'light' | 'dark',
  ukuran: Ukuran,
  dibatalkan: string[],
  catatan: string[],
): Promise<number> {
  const kasus = JSON.parse(readFileSync(berkasKasus(KASUS_ID), 'utf8')) as {
    soal: Array<{ jawaban: string }>;
  };
  const dir = join(KELUAR, `${skema === 'light' ? 'terang' : 'gelap'}-${ukuran.nama}`);
  mkdirSync(dir, { recursive: true });
  let jumlah = 0;
  const potret = async (page: Page, nama: string, penuh = false): Promise<void> => {
    await tenang(page);
    await page.screenshot({ path: join(dir, `${nama}.png`), fullPage: penuh });
    jumlah += 1;
  };

  /* --- 1. pengunjung baru: layar pertama, pemandu tiap langkah ------------ */
  {
    const { page, tutup } = await konteksBaru(peramban, skema, ukuran, dibatalkan);
    await page.goto(`${ASAL}/?kasus=${KASUS_ID}`);
    await page.getByRole('button', { name: 'Mulai simulasi' }).waitFor();
    await potret(page, '01-pertama');
    await page.getByRole('button', { name: 'Mulai simulasi' }).click();
    await page.locator('[aria-label="Soal 1 dari 3"]').waitFor();
    if (await ada(page, '[data-uid^="pemandu"]')) {
      for (let langkah = 1; langkah <= 6; langkah += 1) {
        const panel = page.locator('.pemandu');
        if ((await panel.count()) === 0) break;
        await potret(page, `02-pemandu-${String(langkah)}`);
        const lanjut = page.locator('[data-uid^="pemandu:lanjut"], [data-uid^="pemandu:selesai"]');
        if ((await lanjut.count()) === 0) break;
        await lanjut.first().click();
      }
      await potret(page, '02-pemandu-sesudah');
    } else {
      catatan.push(`${skema} ${ukuran.nama}: tidak ada pemandu (versi ini)`);
    }
    await tutup();
  }

  /* --- 2. soal 1 tanpa pemandu, petunjuk, akhir, kalender ----------------- */
  {
    const { page, tutup } = await konteksBaru(peramban, skema, ukuran, dibatalkan);
    await page.goto(`${ASAL}/?kasus=${KASUS_ID}&pemandu=0`);
    await page.getByRole('button', { name: 'Mulai simulasi' }).click();
    await page.locator('[aria-label="Soal 1 dari 3"]').waitFor();
    await potret(page, '03-soal1-atas');
    await potret(page, '03-soal1-penuh', true);
    if (RAGAM === 'uji') {
      /* Bahan penguji D-5: soal 1 seperti dilihat di ponsel, digulir per 70 % layar. */
      const tinggi = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      for (let ke = 1, y = 0; ; ke += 1, y += Math.round(ukuran.tinggi * 0.7)) {
        await page.evaluate((t) => window.scrollTo(0, t), Math.min(y, tinggi));
        await potret(page, `03-soal1-gulir-${String(ke)}`);
        if (y >= tinggi) break;
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const petunjuk = page.locator('[data-uid="petunjuk-kartu"]');
    if ((await petunjuk.count()) > 0) {
      await petunjuk.click();
      await potret(page, '04-petunjuk');
    } else {
      catatan.push(`${skema} ${ukuran.nama}: tidak ada tombol petunjuk (versi ini)`);
    }
    for (const [nomor, soal] of kasus.soal.entries()) {
      await page.locator(`[aria-label="Soal ${String(nomor + 1)} dari 3"]`).waitFor();
      await page.locator(`[data-uid="opsi:${soal.jawaban}"]`).click();
      await page.getByRole('button', { name: 'Cek jawabanku' }).click();
      await page.locator('[data-uid="teks-kunci"]').waitFor();
      await page
        .getByRole('button', {
          name: nomor === kasus.soal.length - 1 ? 'Lihat yang terjadi sesudahnya' : `Lanjut ke soal ${String(nomor + 2)}`,
        })
        .click();
    }
    await page.getByRole('heading', { name: 'Waktu berjalan lagi' }).waitFor();
    await page.getByRole('button', { name: 'Lanjut: tiga pertanyaan singkat' }).click();
    await page.getByRole('button', { name: 'Selesai' }).click();
    await page.getByRole('heading', { name: 'Terima kasih.' }).waitFor();
    await potret(page, '05-terima-kasih');
    await potret(page, '05-terima-kasih-penuh', true);
    if (await ada(page, '[data-uid="kalender-simulasi"]')) {
      await page.locator('[data-uid="kalender-simulasi"]').scrollIntoViewIfNeeded();
      await potret(page, '06-kalender-akhir');
      /* Pengunjung yang kembali: layar pertama dengan tautan kalender, lalu kalendernya. */
      await page.goto(`${ASAL}/?kasus=${KASUS_ID}&pemandu=0`);
      await page.getByRole('button', { name: 'Mulai simulasi' }).waitFor();
      await potret(page, '07-pertama-kembali');
      const tautan = page.locator('[data-uid="kalender:buka"]');
      if ((await tautan.count()) > 0) {
        await tautan.click();
        await page.locator('[data-uid="kalender-simulasi"]').waitFor();
        await potret(page, '07-kalender-pertama');
        await potret(page, '07-kalender-pertama-penuh', true);
      }
    } else {
      catatan.push(`${skema} ${ukuran.nama}: tidak ada kalender (versi ini)`);
    }
    await tutup();
  }

  /* --- 3. dapur ------------------------------------------------------------ */
  {
    const { page, tutup } = await konteksBaru(peramban, skema, ukuran, dibatalkan);
    await page.goto(`${ASAL}/?dapur`);
    await page.getByRole('heading', { name: 'Dapur agen' }).waitFor();
    await potret(page, '08-dapur-atas');
    await potret(page, '08-dapur-penuh', true);
    await tutup();
  }
  return jumlah;
}

async function utama(): Promise<void> {
  delete process.env.VITE_KOLEKTOR_URL;
  await build({
    root: join(AKAR, 'web'),
    configFile: join(AKAR, 'vite.config.ts'),
    logLevel: 'warn',
    build: { outDir: DIST, emptyOutDir: true },
  });
  const peramban = await chromium.launch({ channel: 'chromium' });
  const dibatalkan: string[] = [];
  const catatan: string[] = [];
  let jumlah = 0;
  try {
    for (const skema of SKEMA) {
      for (const ukuran of UKURAN) {
        jumlah += await satuUkuran(peramban, skema, ukuran, dibatalkan, catatan);
        process.stdout.write(`${skema} ${ukuran.nama}: selesai\n`);
      }
    }
  } finally {
    await peramban.close();
  }
  process.stdout.write(`potret-m314: ${String(jumlah)} gambar di ${KELUAR}\n`);
  for (const c of catatan) process.stdout.write(`  catatan: ${c}\n`);
  process.stdout.write(`permintaan ke luar yang dibatalkan: ${String(dibatalkan.length)}\n`);
  for (const alamat of dibatalkan) process.stdout.write(`  dibatalkan: ${alamat}\n`);
}

await utama();
