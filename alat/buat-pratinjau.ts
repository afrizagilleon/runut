/**
 * `node alat/buat-pratinjau.ts` — membuat `web/public/pratinjau.png`, gambar
 * pratinjau tautan (`og:image`, 1200 × 630) dari layar pertama DADA versi
 * terang (M3.10 D-4b, kritik K-6).
 *
 * Tanpa server dan tanpa jaringan: aplikasi dibangun ke `.cache/e2e/dist-pratinjau`
 * (tanpa alamat pengumpul, jadi tidak ada peristiwa yang dikirim), lalu setiap
 * permintaan ke asal tiruan dipenuhi dari cakram lewat `page.route`, dan
 * permintaan lain apa pun DIBATALKAN dan dilaporkan. Tidak ada port yang dibuka.
 *
 * Penjaga identitas: sebelum memotret, seluruh teks halaman diperiksa tidak
 * memuat kode maupun nama emiten kasus mana pun (layar pertama memang tersamar,
 * "Saham D"). Pratinjau tautan terbaca sebelum orang membuka apa pun; kalau
 * penjaga ini gagal, gambarnya TIDAK ditulis.
 *
 * Gambar dipotret di jendela 1200 × 630 dengan `zoom` 1,2 pada akar dokumen,
 * supaya kalender, judul, contoh omongan, ajakan, dan tombol "Mulai simulasi" tetap terbaca di kartu pratinjau yang kecil dan
 * masuk satu bingkai (kaki tiga kalimat jatuh di luarnya). Zoom itu hanya ada di halaman sekali-pakai milik skrip
 * ini; produk tidak menyentuhnya.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { chromium } from '@playwright/test';

const AKAR = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(AKAR, '.cache', 'e2e', 'dist-pratinjau');
const KELUARAN = join(AKAR, 'web', 'public', 'pratinjau.png');
const ASAL = 'http://localhost:4999';
const KASUS = 'dada-2025-10-08';
const LEBAR = 1200;
const TINGGI = 630;
const ZOOM = '1.2';

const TIPE: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

/** Kode dan nama emiten SEMUA kasus di repo, huruf kecil. */
function identitasTerlarang(): string[] {
  const hasil: string[] = [];
  for (const id of ['dada-2025-10-08', 'ultj-2026-05-04']) {
    const kasus = JSON.parse(readFileSync(join(AKAR, 'cases', `${id}.json`), 'utf8')) as {
      emiten: { simbol: string; nama: string };
    };
    hasil.push(kasus.emiten.simbol.toLowerCase(), kasus.emiten.nama.toLowerCase());
  }
  return hasil;
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
  try {
    const konteks = await peramban.newContext({
      viewport: { width: LEBAR, height: TINGGI },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
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

    await page.goto(`${ASAL}/?kasus=${KASUS}`);
    await page.getByRole('button', { name: 'Mulai simulasi' }).waitFor({ state: 'visible' });

    const teks = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    const bocor = identitasTerlarang().filter((kata) => teks.includes(kata));
    if (bocor.length > 0) {
      throw new Error(`layar pertama memuat identitas emiten (${bocor.join(', ')}); gambar tidak ditulis`);
    }

    await page.evaluate((zoom) => {
      document.documentElement.style.setProperty('zoom', zoom);
    }, ZOOM);
    const tombol = await page.getByRole('button', { name: 'Mulai simulasi' }).boundingBox();
    if (tombol === null || tombol.y + tombol.height > TINGGI) {
      throw new Error(`tombol "Mulai simulasi" tidak masuk bingkai ${String(LEBAR)} × ${String(TINGGI)}`);
    }

    const png = await page.screenshot({ type: 'png' });
    if (png.readUInt32BE(16) !== LEBAR || png.readUInt32BE(20) !== TINGGI) {
      throw new Error(`ukuran gambar ${String(png.readUInt32BE(16))} × ${String(png.readUInt32BE(20))}`);
    }
    mkdirSync(join(AKAR, 'web', 'public'), { recursive: true });
    writeFileSync(KELUARAN, png);
    process.stdout.write(
      `pratinjau ditulis: web/public/pratinjau.png ${String(LEBAR)} × ${String(TINGGI)}, ` +
        `${String(png.length)} bait; tombol Mulai y=${tombol.y.toFixed(0)}–${(tombol.y + tombol.height).toFixed(0)}; ` +
        `identitas emiten di layar: tidak ada; permintaan ke luar yang dibatalkan: ${String(dibatalkan.length)}\n`,
    );
    for (const alamat of dibatalkan) process.stdout.write(`  dibatalkan: ${alamat}\n`);
  } finally {
    await peramban.close();
  }
}

await utama();
