/**
 * `node e2e/bantu/potret-m316.ts <sebelum|sesudah-rN|sesudah>` — tangkapan
 * layar sorotan pemandu (M3.16 D-5) ke `.cache/e2e/m316/<ragam>/`.
 *
 * Pola `potret-m314.ts`: build tanpa pengumpul ke `.cache/e2e/dist-potret-m316`,
 * setiap permintaan ke asal tiruan dipenuhi dari cakram lewat `page.route`,
 * yang lain dibatalkan dan dilaporkan. Tidak ada port yang didengar.
 *
 * 360 × 640 dan 390 × 844 (ponsel sentuh), terang dan gelap, simulasi DADA,
 * pengunjung baru (`?pemandu=1`):
 *
 * - `01..04-langkah-n` — tiap langkah pemandu, sesudah gulirnya berhenti;
 * - `05-sesudah` — sesudah "Tunjukkan" (petunjuk didemonstrasikan);
 * - `06-langkah-2-digulir` — langkah 2 lalu halaman digulir 200 px: lubang
 *   harus ikut kartunya;
 * - `07-langkah-2-putar` — langkah 2, lalu jendela diputar ke mendatar;
 * - `08-langkah-4-reduced` — langkah 4 dengan `prefers-reduced-motion`.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { build } from 'vite';
import { chromium, type Browser, type Page } from '@playwright/test';
import { AKAR, CACHE } from './jalur.ts';

const RAGAM = process.argv[2] ?? '';
if (!/^(sebelum|sesudah-r\d|sesudah)$/.test(RAGAM)) {
  throw new Error(`ragam harus sebelum|sesudah-rN|sesudah, bukan "${RAGAM}"`);
}
const DIST = join(CACHE, 'dist-potret-m316');
const KELUAR = join(CACHE, 'm316', RAGAM);
const ASAL = 'http://localhost:4996';
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

const UKURAN: Ukuran[] = [
  { nama: '360', lebar: 360, tinggi: 640 },
  { nama: '390', lebar: 390, tinggi: 844 },
];

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
          if (diam >= 20) beres();
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
  reduced = false,
): Promise<{ page: Page; tutup: () => Promise<void> }> {
  const konteks = await peramban.newContext({
    viewport: { width: ukuran.lebar, height: ukuran.tinggi },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: skema,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
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

/** Buka soal 1 dengan pemandu dipaksa; majukan ke langkah ke-n (1-based). */
async function keLangkah(page: Page, n: number): Promise<void> {
  await page.goto(`${ASAL}/?kasus=${KASUS_ID}&pemandu=1`);
  await page.getByRole('button', { name: 'Mulai simulasi' }).click();
  await page.locator('[aria-label="Soal 1 dari 3"]').waitFor();
  await page.locator('.pemandu').waitFor();
  for (let i = 1; i < n; i += 1) {
    await page.locator(`[data-uid="pemandu:lanjut:${String(i)}"]`).click();
    await page.locator('.pemandu').getByText(`${String(i + 1)} dari 4`).waitFor();
  }
}

async function satuUkuran(
  peramban: Browser,
  skema: 'light' | 'dark',
  ukuran: Ukuran,
  dibatalkan: string[],
): Promise<number> {
  const dir = join(KELUAR, `${skema === 'light' ? 'terang' : 'gelap'}-${ukuran.nama}`);
  mkdirSync(dir, { recursive: true });
  let jumlah = 0;
  const potret = async (page: Page, nama: string): Promise<void> => {
    await tenang(page);
    await page.screenshot({ path: join(dir, `${nama}.png`) });
    jumlah += 1;
  };

  {
    const { page, tutup } = await konteksBaru(peramban, skema, ukuran, dibatalkan);
    await keLangkah(page, 1);
    for (let n = 1; n <= 4; n += 1) {
      await potret(page, `0${String(n)}-langkah-${String(n)}`);
      await page
        .locator(n === 4 ? '[data-uid="pemandu:selesai:4"]' : `[data-uid="pemandu:lanjut:${String(n)}"]`)
        .click();
    }
    await potret(page, '05-sesudah');
    await tutup();
  }
  {
    const { page, tutup } = await konteksBaru(peramban, skema, ukuran, dibatalkan);
    await keLangkah(page, 2);
    await tenang(page);
    await page.evaluate(() => window.scrollBy(0, 200));
    await potret(page, '06-langkah-2-digulir');
    await page.setViewportSize({ width: ukuran.tinggi, height: ukuran.lebar });
    await potret(page, '07-langkah-2-putar');
    await tutup();
  }
  {
    const { page, tutup } = await konteksBaru(peramban, skema, ukuran, dibatalkan, true);
    await keLangkah(page, 4);
    await potret(page, '08-langkah-4-reduced');
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
  let jumlah = 0;
  try {
    for (const skema of ['light', 'dark'] as const) {
      for (const ukuran of UKURAN) {
        jumlah += await satuUkuran(peramban, skema, ukuran, dibatalkan);
        process.stdout.write(`${skema} ${ukuran.nama}: selesai\n`);
      }
    }
  } finally {
    await peramban.close();
  }
  process.stdout.write(`potret-m316: ${String(jumlah)} gambar di ${KELUAR}\n`);
  process.stdout.write(`permintaan ke luar yang dibatalkan: ${String(dibatalkan.length)}\n`);
  for (const alamat of dibatalkan) process.stdout.write(`  dibatalkan: ${alamat}\n`);
}

await utama();
