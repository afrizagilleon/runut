// Tangkapan layar "Jalankan Runut Agent" (M-PN1 §4) — memakai PELARI TIRUAN, tidak pernah agent sungguhan.
//
//   1. npm run penyusun -- --port 8795 --pelari-tiruan     (pelari tiruan: menyalin jejak lama, tanpa panggilan model)
//   2. npm run penyusun -- --port 8796                     (tanpa .env: keadaan "tanpa kunci")
//   3. node alat/penyusun/potret-pn1.mjs [http://127.0.0.1:8795] [http://127.0.0.1:8796]
//
// Skrip ini TIDAK menyalakan server. Ia menolak menekan tombol setuju bila server
// pertama tidak melaporkan pelari tiruan, dan tidak pernah menekan "Jalankan" di
// server kedua. Gambar ke .cache/tangkapan/pn1/ (1280×800 dan 375×812). Ia
// mencatat apa yang terlihat; tidak menilai rupa.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const TIRUAN = process.argv[2] ?? 'http://127.0.0.1:8795';
const TANPA_KUNCI = process.argv[3] ?? 'http://127.0.0.1:8796';
const FOLDER = '.cache/tangkapan/pn1/';
const KELUAR = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url));
const KODE = 'TIRT';
const UKURAN = [
  { nama: '1280', width: 1280, height: 800 },
  { nama: '375', width: 375, height: 812 },
];

mkdirSync(KELUAR, { recursive: true });
const peramban = await chromium.launch();
const berkas = [];
let merah = false;
const catat = (teks) => console.log(teks);
const galat = (teks) => { merah = true; console.log(`TIDAK SESUAI: ${teks}`); };

const statusTiruan = await (await fetch(`${TIRUAN}/api/status`)).json();
if (statusTiruan.jalankan?.tiruan !== true) {
  console.log(`BERHENTI: ${TIRUAN} tidak melaporkan pelari tiruan. Skrip ini tidak menekan tombol setuju di server dengan pelari sungguhan.`);
  process.exit(2);
}
const statusKosong = await (await fetch(`${TANPA_KUNCI}/api/status`)).json();
catat(`status ${TIRUAN}: ${JSON.stringify(statusTiruan.jalankan)}`);
catat(`status ${TANPA_KUNCI}: ${JSON.stringify(statusKosong.jalankan)}`);

for (const u of UKURAN) {
  const ctx = await peramban.newContext({ viewport: { width: u.width, height: u.height }, colorScheme: 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const konsol = [];
  const luar = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') konsol.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => konsol.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (!r.url().startsWith(TIRUAN) && !r.url().startsWith(TANPA_KUNCI)) luar.push(r.url()); });
  const potret = async (nama, penuh = false) => {
    await page.screenshot({ path: `${KELUAR}${u.nama}-${nama}.png`, fullPage: penuh });
    berkas.push(`${FOLDER}${u.nama}-${nama}.png`);
  };
  const data = (kunci) => page.evaluate((x) => document.documentElement.dataset[x] ?? null, kunci);
  const teks = (pilih) => page.evaluate((x) => { const e = document.querySelector(x); return e === null || e.hidden ? null : e.textContent.trim(); }, pilih);
  const langkah = () => page.evaluate(() => Number(document.documentElement.dataset.langkah ?? 0));

  // --- server dengan pelari tiruan ---
  await page.goto(TIRUAN);
  await page.waitForSelector('html[data-siap="1"]');
  catat(`[${u.nama}] judul pilihan: ${JSON.stringify(await page.$$eval('#agen-mulai h3', (h) => h.map((e) => e.textContent)))}; tombol: ${JSON.stringify(await page.$$eval('#agen-mulai button:not([hidden])', (b) => b.filter((e) => e.offsetParent !== null).map((e) => e.textContent)))}`);
  catat(`[${u.nama}] pita: "${await teks('#pita-tiruan')}"`);
  if (!(await teks('#pita-tiruan'))?.startsWith('PELARI TIRUAN — bukan agent sungguhan')) galat(`[${u.nama}] pita pelari tiruan tidak tampil`);
  await potret('01-awal', true);

  await page.fill('#kode', KODE);
  await page.click('#tombol-jalankan');
  await page.waitForSelector('#setuju-jalankan:not([hidden])');
  catat(`[${u.nama}] sebelum setuju: budget terisi "${await page.inputValue('#budget')}"; pernyataan "${await teks('#pernyataan-biaya')}"; kerja di server: ${JSON.stringify((await (await fetch(`${TIRUAN}/api/status`)).json()).jalankan.kerja?.keadaan ?? null)}`);
  await potret('02-sebelum-setuju', true);

  await page.click('#tombol-setuju');
  await page.waitForFunction(() => document.documentElement.dataset.sumber === 'langsung' && Number(document.documentElement.dataset.langkah ?? 0) >= 2, null, { timeout: 60_000 });
  const tengah = await langkah();
  const kerja = (await (await fetch(`${TIRUAN}/api/status`)).json()).jalankan.kerja;
  catat(`[${u.nama}] berjalan: sumber=${await data('sumber')}; ${String(tengah)} langkah tampil; kerja di server ${JSON.stringify(kerja)}; judul "${await teks('#judul-kerja')}"; asal "${await teks('#agen-asal')}"; pita kerja "${await teks('#pita-tiruan-kerja')}"; Hentikan terlihat: ${String(await page.isVisible('#tombol-hentikan'))}; Putar dari awal terlihat: ${String(await page.isVisible('#tombol-ulang'))}; tombol Jalankan terkunci: ${String(await page.isDisabled('#tombol-jalankan'))}; tombol Putar ulang terkunci: ${String(await page.isDisabled('#tombol-putar'))}`);
  if (kerja?.keadaan !== 'bekerja') galat(`[${u.nama}] langkah tampil tetapi pelari sudah berhenti (langkah seharusnya muncul selagi pelari bekerja)`);
  await page.evaluate(() => document.getElementById('agen-kerja').scrollIntoView({ block: 'start' }));
  await potret('03-berjalan-ringkas');
  await page.click('button[data-tampilan="diagram"]');
  await page.evaluate(() => document.getElementById('agen-kerja').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await potret('04-berjalan-diagram', u.width < 600);
  await page.click('button[data-tampilan="ringkas"]');

  await page.waitForFunction(() => document.documentElement.dataset.agen === 'tuntas' && document.documentElement.dataset.akhir !== undefined, null, { timeout: 120_000 });
  catat(`[${u.nama}] selesai: akhir=${await data('akhir')}; ${String(await langkah())} langkah; keadaan "${await teks('#agen-kini')}"; kotak akhir "${(await teks('#agen-akhir'))?.replace(/\s+/g, ' ')}"; Hentikan terlihat: ${String(await page.isVisible('#tombol-hentikan'))}; Putar dari awal terlihat: ${String(await page.isVisible('#tombol-ulang'))}; bagian "Simulasi yang jadi" terlihat: ${String(await page.isVisible('#agen-simulasi'))}`);
  await page.evaluate(() => document.getElementById('agen-kerja').scrollIntoView({ block: 'start' }));
  await potret('05-selesai');
  await potret('05-selesai-penuh', true);

  // Pilihan B sesudahnya: putar ulang rekaman tetap rekaman.
  const rekaman = statusTiruan.agen.kode_rekaman[0];
  await page.fill('#kode', rekaman);
  await page.click('#tombol-putar');
  await page.waitForFunction(() => document.documentElement.dataset.sumber === 'putar' && Number(document.documentElement.dataset.langkah ?? 0) >= 1, null, { timeout: 60_000 });
  catat(`[${u.nama}] putar ulang rekaman: sumber=${await data('sumber')}; judul "${await teks('#judul-kerja')}"; asal "${await teks('#agen-asal')}"; pita kerja "${await teks('#pita-tiruan-kerja')}"; Hentikan terlihat: ${String(await page.isVisible('#tombol-hentikan'))}`);
  await page.evaluate(() => document.getElementById('agen-kerja').scrollIntoView({ block: 'start' }));
  await potret('06-putar-ulang-rekaman');

  // --- server tanpa kunci: pilihan A nonaktif, pilihan B tetap bekerja ---
  await page.goto(TANPA_KUNCI);
  await page.waitForSelector('html[data-siap="1"]');
  const terkunci = await page.isDisabled('#tombol-jalankan');
  catat(`[${u.nama}] tanpa kunci: tombol Jalankan terkunci: ${String(terkunci)}; kalimat "${await teks('#nonaktif-jalankan')}"; pita "${await teks('#pita-tiruan')}"; tombol Putar ulang terkunci: ${String(await page.isDisabled('#tombol-putar'))}`);
  if (statusKosong.jalankan?.siap === false && !terkunci) galat(`[${u.nama}] tanpa kunci tetapi tombol Jalankan tidak terkunci`);
  await potret('07-tanpa-kunci', true);
  await page.fill('#kode', rekaman);
  await page.click('#tombol-putar');
  await page.waitForFunction(() => document.documentElement.dataset.sumber === 'putar' && Number(document.documentElement.dataset.langkah ?? 0) >= 1, null, { timeout: 60_000 });
  catat(`[${u.nama}] tanpa kunci: putar ulang rekaman tetap bekerja (sumber=${await data('sumber')}, ${String(await langkah())} langkah tampil)`);

  const gulirMendatar = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  catat(`[${u.nama}] halaman bergulir mendatar: ${String(gulirMendatar)}; konsol: ${konsol.length === 0 ? 'bersih' : JSON.stringify(konsol)}; permintaan ke luar alamat lokal: ${String(luar.length)}`);
  if (konsol.length > 0) galat(`[${u.nama}] konsol tidak bersih`);
  if (luar.length > 0) galat(`[${u.nama}] ada permintaan ke luar: ${luar.join(', ')}`);
  await ctx.close();
}

await peramban.close();
catat(`gambar (${String(berkas.length)}):`);
for (const b of berkas) catat(`  ${b}`);
process.exit(merah ? 1 : 0);
