/**
 * `node e2e/bantu/potret.ts [folder]` — tangkapan layar untuk pemilik (M3.10
 * D-10) dan arsip reviewer (M3.11 D-7: `node e2e/bantu/potret.ts layar-m311`).
 * Tanpa argumen folder tetap `layar-m310`; argumen hanya boleh berbentuk
 * `layar-<nama>` dan selalu jatuh di dalam `.cache/e2e/`.
 *
 * Terang DAN gelap, 360 × 640 (ponsel sentuh) DAN 1280 × 800, kedua kasus,
 * tujuh layar: layar pertama, soal 1 dibuka, soal 1 dikunci, pembukaan atas,
 * pembukaan penuh, akhir, terima kasih. Hasilnya ke `.cache/e2e/<folder>/`,
 * folder yang TIDAK dikosongkan `globalSetup` rangkaian e2e (yang dikosongkan
 * hanya `.cache/e2e/layar/` dan `.cache/e2e/data/`).
 *
 * Tanpa server dan tanpa jaringan, seperti `alat/buat-pratinjau.ts`: build
 * tanpa pengumpul ke `.cache/e2e/dist-potret`, setiap permintaan ke asal tiruan
 * dipenuhi dari cakram lewat `page.route`, yang lain dibatalkan dan dilaporkan.
 * Tidak ada port yang didengar. Jawabannya selalu kunci yang benar.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { build } from 'vite';
import { chromium, type Browser, type Page } from '@playwright/test';
import { AKAR, CACHE, ID_KASUS, berkasKasus } from './jalur.ts';

const DIST = join(CACHE, 'dist-potret');
const FOLDER = process.argv[2] ?? 'layar-m310';
if (!/^layar-[a-z0-9-]+$/.test(FOLDER)) throw new Error(`folder potret harus berbentuk layar-<nama>, bukan "${FOLDER}"`);
const KELUAR = join(CACHE, FOLDER);
const ASAL = 'http://localhost:4998';

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
  ponsel: boolean;
}

const UKURAN: Ukuran[] = [
  { nama: '360', lebar: 360, tinggi: 640, ponsel: true },
  { nama: '1280', lebar: 1280, tinggi: 800, ponsel: false },
];

async function gulirBerhenti(page: Page): Promise<void> {
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

async function animasiSelesai(page: Page): Promise<void> {
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
}

async function satuPutaran(
  peramban: Browser,
  kasus_id: string,
  skema: 'light' | 'dark',
  ukuran: Ukuran,
  dibatalkan: string[],
): Promise<string[]> {
  const kasus = JSON.parse(readFileSync(berkasKasus(kasus_id), 'utf8')) as {
    soal: Array<{ jawaban: string }>;
  };
  const konteks = await peramban.newContext({
    viewport: { width: ukuran.lebar, height: ukuran.tinggi },
    deviceScaleFactor: ukuran.ponsel ? 2 : 1,
    isMobile: ukuran.ponsel,
    hasTouch: ukuran.ponsel,
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

  const dir = join(KELUAR, `${skema === 'light' ? 'terang' : 'gelap'}-${ukuran.nama}`, kasus_id);
  mkdirSync(dir, { recursive: true });
  const ditulis: string[] = [];
  const potret = async (nama: string, penuh = false): Promise<void> => {
    await gulirBerhenti(page);
    const jalur = join(dir, `${nama}.png`);
    await page.screenshot({ path: jalur, fullPage: penuh });
    ditulis.push(jalur);
  };
  const klik = async (nama: string | RegExp): Promise<void> => {
    await page.getByRole('button', { name: nama }).click();
  };

  await page.goto(`${ASAL}/?kasus=${kasus_id}`);
  await page.getByRole('button', { name: 'Mulai simulasi' }).waitFor();
  await animasiSelesai(page);
  await potret('01-pertama');

  await klik('Mulai simulasi');
  await page.locator('[aria-label="Soal 1 dari 3"]').waitFor();
  await animasiSelesai(page);
  await potret('02-soal1-dibuka');

  for (const [nomor, soal] of kasus.soal.entries()) {
    await page.locator(`[aria-label="Soal ${String(nomor + 1)} dari 3"]`).waitFor();
    await page.locator(`[data-uid="opsi:${soal.jawaban}"]`).click();
    await klik('Cek jawabanku');
    await page.locator('[data-uid="teks-kunci"]').waitFor();
    if (nomor === 0) await potret('03-soal1-dikunci');
    await klik(nomor === kasus.soal.length - 1 ? 'Lihat yang terjadi sesudahnya' : `Lanjut ke soal ${String(nomor + 2)}`);
  }

  await page.getByRole('heading', { name: 'Waktu berjalan lagi' }).waitFor();
  await animasiSelesai(page);
  await potret('04-pembukaan-atas');
  await potret('05-pembukaan-penuh', true);

  await klik('Lanjut: tiga pertanyaan singkat');
  await page.getByRole('heading', { name: 'Tiga pertanyaan singkat' }).waitFor();
  await potret('06-akhir');

  await klik('Selesai');
  await page.getByRole('heading', { name: 'Terima kasih.' }).waitFor();
  await potret('07-terima-kasih');

  await konteks.close();
  return ditulis;
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
        for (const kasus_id of ID_KASUS) {
          const ditulis = await satuPutaran(peramban, kasus_id, skema, ukuran, dibatalkan);
          jumlah += ditulis.length;
          process.stdout.write(`${skema} ${ukuran.nama} ${kasus_id}: ${String(ditulis.length)} gambar\n`);
        }
      }
    }
  } finally {
    await peramban.close();
  }
  process.stdout.write(
    `potret: ${String(jumlah)} gambar di ${KELUAR}; permintaan ke luar yang dibatalkan: ${String(dibatalkan.length)}\n`,
  );
  for (const alamat of dibatalkan) process.stdout.write(`  dibatalkan: ${alamat}\n`);
}

await utama();
