// Tangkapan layar tampilan AI agent (mode replay) untuk dinilai pemilik.
//
//   1. npm run penyusun -- --replay-agent --port 8791
//   2. node alat/penyusun/potret-agen.mjs [http://127.0.0.1:8791]
//
// Chromium headless (Playwright yang sudah terpasang), dua ukuran: 1280×800 dan
// 375×812. Skrip ini TIDAK menyalakan server dan tidak memanggil apa pun selain
// alamat lokal itu. Gambar ke .cache/tangkapan/m2d31/. Selain memotret, ia
// mencatat bahwa pemutaran memang bertahap (jumlah baris di DOM per waktu),
// bahwa jeda menahan, dan bahwa konsol bersih.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ASAL = process.argv[2] ?? 'http://127.0.0.1:8791';
const KELUAR = fileURLToPath(new URL('../../.cache/tangkapan/m2d31/', import.meta.url));
const UKURAN = [
  { nama: '1280', width: 1280, height: 800 },
  { nama: '375', width: 375, height: 812 },
];

mkdirSync(KELUAR, { recursive: true });
const peramban = await chromium.launch();
const berkas = [];
let gagal = false;

for (const u of UKURAN) {
  const ctx = await peramban.newContext({ viewport: { width: u.width, height: u.height }, colorScheme: 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const konsol = [];
  const luar = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') konsol.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => konsol.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (!r.url().startsWith(ASAL)) luar.push(r.url()); });
  const potret = async (nama, penuh = false) => {
    const jalur = `${KELUAR}${u.nama}-${nama}.png`;
    await page.screenshot({ path: jalur, fullPage: penuh });
    berkas.push(`.cache/tangkapan/m2d31/${u.nama}-${nama}.png`);
  };
  const jumlahBaris = () => page.evaluate(() => document.querySelectorAll('#tampilan-ringkas .agen-baris').length);
  const langkah = () => page.evaluate(() => Number(document.documentElement.dataset.langkah ?? 0));
  const tunggu = (n) => page.waitForFunction((x) => Number(document.documentElement.dataset.langkah ?? 0) >= x, n, { timeout: 60_000 });
  const tampilan = (nama) => page.click(`[data-tampilan="${nama}"]`);
  const keAtasBilah = () => page.evaluate(() => document.getElementById('agen-kerja').scrollIntoView({ block: 'start' }));

  await page.goto(ASAL);
  await page.waitForSelector('html[data-siap="1"]');
  await potret('01-halaman-awal');

  // Penyusun mengetik kode saham yang ditawarkan halaman, lalu menekan tombol.
  const kode = (await page.getAttribute('#kode', 'placeholder') ?? '').replace('mis. ', '');
  await page.fill('#kode', kode.toLowerCase());
  await page.click('#tombol-putar');

  // Pemutaran bertahap: jumlah baris di DOM dicatat tiap 400 ms sampai langkah 6.
  const catatan = [];
  const mulai = Date.now();
  while ((await langkah()) < 6) {
    catatan.push(`${String(Date.now() - mulai).padStart(5)} ms: ${await jumlahBaris()} baris`);
    await page.waitForTimeout(400);
  }
  console.log(`[${u.nama}] pemutaran bertahap (baris Ringkas di DOM per waktu):\n  ${catatan.join('\n  ')}`);
  const unik = new Set(catatan.map((c) => c.split(': ')[1]));
  if (unik.size < 5) { gagal = true; console.log(`[${u.nama}] GAGAL: langkah tidak muncul satu per satu`); }

  // Jeda: selama dijeda tidak ada langkah baru.
  await page.click('#tombol-jeda');
  const saatJeda = await langkah();
  await page.waitForTimeout(4500);
  const sesudahJeda = await langkah();
  console.log(`[${u.nama}] jeda: langkah ${saatJeda} → ${sesudahJeda} sesudah 4,5 detik; tombol "${await page.textContent('#tombol-jeda')}"; keadaan "${await page.textContent('#agen-kini')}"`);
  if (saatJeda !== sesudahJeda) gagal = true;
  await potret('02-tengah-pemutaran-ringkas-dijeda');

  // Lanjut sampai langkah 9, jeda tepat sesudah langkah muncul (tool-nya masih menyala).
  await page.click('#tombol-jeda');
  await tunggu(9);
  await page.click('#tombol-jeda');
  await tampilan('diagram');
  await keAtasBilah();
  console.log(`[${u.nama}] diagram langkah ${await langkah()}: menyala = ${JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#agen-simpul > li.agen-nyala .agen-tool')].map((e) => e.textContent)))}; garis menyala = ${await page.evaluate(() => document.querySelectorAll('#agen-garis > g.agen-nyala').length)}; garis seluruhnya = ${await page.evaluate(() => document.querySelectorAll('#agen-garis > g').length)}; tata = ${await page.getAttribute('#agen-bidang', 'data-tata')}`);
  await potret('03-tengah-pemutaran-diagram');
  await tampilan('rinci');
  await keAtasBilah();
  await potret('04-tengah-pemutaran-rinci');

  // Kecepatan 4×, lanjut sampai langkah 13, lalu lompat ke akhir.
  await page.selectOption('#kecepatan', '4');
  await page.click('#tombol-jeda');
  await tunggu(13);
  const sebelumLompat = await langkah();
  await page.click('#tombol-lompat');
  await page.waitForSelector('html[data-agen="tuntas"]');
  console.log(`[${u.nama}] lompat: dari langkah ${sebelumLompat} ke ${await langkah()}; "${await page.textContent('#agen-kini')}"; ${await page.textContent('#agen-biaya')}`);

  await tampilan('ringkas');
  await keAtasBilah();
  await potret('05-akhir-ringkas');
  await potret('06-akhir-ringkas-halaman-penuh', true);
  await tampilan('rinci');
  await keAtasBilah();
  await potret('07-akhir-rinci');
  // Satu lipatan "rekaman asli" dibuka (penolakan uji tebak tanpa kartu, langkah 5).
  const lipatan = page.locator('#rinci-isi li[data-langkah="5"] details.agen-asli').first();
  await lipatan.locator('summary').click();
  await lipatan.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -160));
  await potret('08-rinci-rekaman-asli-dibuka');
  await tampilan('diagram');
  await keAtasBilah();
  await potret('09-akhir-diagram');
  await page.evaluate(() => document.getElementById('agen-simulasi').scrollIntoView({ block: 'start' }));
  await potret('10-akhir-simulasi-jadi');
  await tampilan('ringkas');
  await potret('11-akhir-halaman-penuh', true);

  const akhir = await page.evaluate(() => ({
    langkah: document.querySelectorAll('#tampilan-ringkas .agen-baris').length,
    rinci: document.querySelectorAll('#rinci-isi .agen-baris').length,
    tahap: [...document.querySelectorAll('#tampilan-ringkas .agen-tahap')].map((t) => `${t.querySelector('h3').textContent}: ${t.querySelector('.agen-tahap-angka').textContent}`),
    soal: document.querySelectorAll('#simulasi-isi .gelembung').length,
    gulirMendatar: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    lebarDokumen: document.documentElement.scrollWidth,
  }));
  console.log(`[${u.nama}] akhir: ${JSON.stringify(akhir, null, 1)}`);
  if (akhir.gulirMendatar) { gagal = true; console.log(`[${u.nama}] GAGAL: halaman bergulir mendatar`); }

  // Putar dari awal: tampilan kosong lagi, simulasi tersembunyi.
  await page.click('#tombol-ulang');
  await tunggu(1);
  console.log(`[${u.nama}] putar dari awal: langkah ${await langkah()}, simulasi tersembunyi = ${await page.evaluate(() => document.getElementById('agen-simulasi').hidden)}`);
  console.log(`[${u.nama}] konsol: ${konsol.length === 0 ? 'bersih' : JSON.stringify(konsol)}; permintaan ke luar ${ASAL}: ${luar.length === 0 ? 'tidak ada' : JSON.stringify(luar)}`);
  if (konsol.length > 0 || luar.length > 0) gagal = true;
  await ctx.close();
}

await peramban.close();
console.log(`\n${berkas.length} gambar:\n${berkas.join('\n')}`);
process.exitCode = gagal ? 1 : 0;
