// Tangkapan layar tampilan AI agent (replay) untuk dinilai pemilik — M2d-32 R-6.
//
//   1. npm run penyusun -- --port 8791          (tanpa bendera mode: tampilan AI agent)
//   2. node alat/penyusun/potret-agen.mjs [http://127.0.0.1:8791]
//
// Chromium headless (Playwright yang sudah terpasang), dua ukuran: 1280×800 dan
// 375×812. Skrip ini TIDAK menyalakan server dan tidak memanggil apa pun selain
// alamat lokal itu. Gambar ke .cache/tangkapan/m2d32/, ditambah satu gambar
// banding diagram sebelum (m2d31) dan sesudah, berdampingan.
//
// Selain memotret, ia mencatat (bukan menilai): pemutaran memang bertahap, jeda
// menahan, urutan gerak diagram (tool call pergi → tool result kembali → hasil
// di agent), isi baris tool tidak terpotong, ukuran nama dan keterangan tool di
// layar sempit (OQ-1), halaman tidak bergulir mendatar, konsol bersih.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ASAL = process.argv[2] ?? 'http://127.0.0.1:8791';
const FOLDER = '.cache/tangkapan/m2d32/';
const KELUAR = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url));
const SEBELUM = fileURLToPath(new URL('../../.cache/tangkapan/m2d31/1280-09-akhir-diagram.png', import.meta.url));
const UKURAN = [
  { nama: '1280', width: 1280, height: 800 },
  { nama: '375', width: 375, height: 812 },
];
/** Langkah yang dipotret di tengah pemutaran: agent mengirim draf ke para penguji. */
const LANGKAH_DIAGRAM = 5;

mkdirSync(KELUAR, { recursive: true });
const peramban = await chromium.launch();
const berkas = [];
let gagal = false;
const catat = (teks) => console.log(teks);
const merah = (teks) => { gagal = true; console.log(`GAGAL: ${teks}`); };

for (const u of UKURAN) {
  const ctx = await peramban.newContext({ viewport: { width: u.width, height: u.height }, colorScheme: 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const konsol = [];
  const luar = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') konsol.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => konsol.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (!r.url().startsWith(ASAL)) luar.push(r.url()); });
  const potret = async (nama, penuh = false) => {
    await page.screenshot({ path: `${KELUAR}${u.nama}-${nama}.png`, fullPage: penuh });
    berkas.push(`${FOLDER}${u.nama}-${nama}.png`);
  };
  const jumlahBaris = () => page.evaluate(() => document.querySelectorAll('#tampilan-ringkas .agen-baris').length);
  const langkah = () => page.evaluate(() => Number(document.documentElement.dataset.langkah ?? 0));
  const tunggu = (n) => page.waitForFunction((x) => Number(document.documentElement.dataset.langkah ?? 0) >= x, n, { timeout: 60_000 });
  const tungguGerak = (n, gerak) => page.waitForFunction(([x, g]) => Number(document.documentElement.dataset.langkah ?? 0) === x && document.documentElement.dataset.gerak === g, [n, gerak], { timeout: 60_000, polling: 'raf' });
  /** Layar sempit: diagram lebih tinggi dari jendela, jadi gambar diagramnya diambil sehalaman penuh. */
  const sempit = u.width < 600;
  const tampilan = (nama) => page.click(`button[data-tampilan="${nama}"]`);
  const keAtasBilah = () => page.evaluate(() => document.getElementById('agen-kerja').scrollIntoView({ block: 'start' }));
  const keDiagram = () => page.evaluate(() => document.getElementById('pokok-diagram').scrollIntoView({ block: 'start' }));
  const jeda = () => page.click('#tombol-jeda');
  /** Keping yang sedang terbang (dijeda) ditaruh tepat di 55% perjalanannya, supaya gambar bisa diulang. */
  const ditengahJalan = () => page.evaluate(() => {
    const terbang = document.getAnimations().filter((a) => a.animationName === 'agen-terbang');
    for (const a of terbang) a.currentTime = 0.55 * Number(a.effect.getComputedTiming().duration);
    return terbang.length;
  });
  const keadaanDiagram = () => page.evaluate(() => ({
    gerak: document.documentElement.dataset.gerak,
    agent: document.getElementById('agen-kotak-keadaan').textContent,
    tool_dituju: [...document.querySelectorAll('#agen-simpul > li.agen-dituju .agen-tool')].map((e) => e.textContent),
    tool_menyala: [...document.querySelectorAll('#agen-simpul > li.agen-nyala .agen-tool')].map((e) => e.textContent),
    garis_menyala: document.querySelectorAll('#agen-garis > g.agen-nyala').length,
    garis_seluruhnya: document.querySelectorAll('#agen-garis > g').length,
    keping: [...document.querySelectorAll('#agen-kirim > .agen-keping')].map((e) => e.textContent),
    cap: [...document.querySelectorAll('#agen-cap > .cap')].map((e) => e.textContent),
    tata: document.getElementById('agen-bidang').dataset.tata,
  }));

  await page.goto(ASAL);
  await page.waitForSelector('html[data-siap="1"]');
  catat(`[${u.nama}] halaman utama tanpa bendera: judul "${await page.textContent('h1')}"; mode "${await page.textContent('#mode')}"`);
  await potret('01-halaman-awal');

  // Penyusun mengetik kode saham yang ditawarkan halaman, lalu menekan tombol.
  const kode = (await page.getAttribute('#kode', 'placeholder') ?? '').replace('mis. ', '');
  await page.fill('#kode', kode.toLowerCase());
  await page.click('#tombol-putar');

  // Pemutaran bertahap: jumlah baris di DOM dicatat tiap 400 ms sampai langkah 4.
  const catatan = [];
  const mulai = Date.now();
  while ((await langkah()) < 4) {
    catatan.push(`${String(Date.now() - mulai).padStart(5)} ms: ${await jumlahBaris()} baris`);
    await page.waitForTimeout(400);
  }
  catat(`[${u.nama}] pemutaran bertahap (baris Ringkas di DOM per waktu):\n  ${catatan.join('\n  ')}`);
  if (new Set(catatan.map((c) => c.split(': ')[1])).size < 4) merah(`[${u.nama}] langkah tidak muncul satu per satu`);

  // Diagram di tengah pemutaran, kecepatan 0,5× supaya gerak langkah 5 sempat ditahan.
  await page.selectOption('#kecepatan', '0.5');
  await tampilan('diagram');
  await keDiagram();
  await tungguGerak(LANGKAH_DIAGRAM, 'pergi');
  await jeda();
  const terbangPergi = await ditengahJalan();
  await page.waitForTimeout(250);
  const pergi = await keadaanDiagram();
  catat(`[${u.nama}] diagram langkah ${await langkah()} — tool call pergi: ${JSON.stringify(pergi)}`);
  if (pergi.gerak !== 'pergi' || terbangPergi === 0 || pergi.keping.some((x) => x !== 'tool call') || pergi.garis_menyala !== pergi.keping.length) merah(`[${u.nama}] gerak "pergi" tidak seperti yang diharapkan`);
  await potret('03-tengah-diagram-tool-call-pergi', sempit);

  await jeda();
  await tungguGerak(LANGKAH_DIAGRAM, 'kembali');
  await jeda();
  const terbangKembali = await ditengahJalan();
  await page.waitForTimeout(250);
  const kembali = await keadaanDiagram();
  catat(`[${u.nama}] diagram langkah ${await langkah()} — tool result kembali: ${JSON.stringify(kembali)}`);
  if (kembali.gerak !== 'kembali' || terbangKembali === 0 || kembali.keping.some((x) => x !== 'tool result')) merah(`[${u.nama}] gerak "kembali" tidak seperti yang diharapkan`);
  await potret('04-tengah-diagram-tool-result-kembali', sempit);

  await jeda();
  await tungguGerak(LANGKAH_DIAGRAM, 'tiba');
  await jeda();
  await page.waitForTimeout(250);
  const tiba = await keadaanDiagram();
  catat(`[${u.nama}] diagram langkah ${await langkah()} — hasil di agent: ${JSON.stringify(tiba)}`);
  if (tiba.keping.length !== 0 || tiba.cap.length === 0) merah(`[${u.nama}] hasil tidak mendarat di agent`);
  // Dua cap sekaligus (langkah ini): keduanya harus muat di dalam lembar agent.
  const capKeluar = await page.evaluate(() => {
    const k = document.getElementById('agen-kotak').getBoundingClientRect();
    return [...document.querySelectorAll('#agen-kotak *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.top < k.top - 1 || r.bottom > k.bottom + 1 || r.left < k.left - 1 || r.right > k.right + 1); }).map((e) => e.textContent);
  });
  catat(`[${u.nama}] isi lembar agent yang keluar dari lembarnya (dua cap): ${JSON.stringify(capKeluar)}`);
  if (capKeluar.length > 0) merah(`[${u.nama}] isi lembar agent keluar dari lembarnya`);
  await potret('05-tengah-diagram-hasil-di-agent', sempit);

  // Ringkas di tengah pemutaran: lanjut satu langkah, lalu jeda. Selama dijeda tidak ada langkah baru.
  await tampilan('ringkas');
  await page.selectOption('#kecepatan', '1');
  await jeda();
  await tunggu(LANGKAH_DIAGRAM + 1);
  await jeda();
  const saatJeda = await langkah();
  await page.waitForTimeout(4500);
  const sesudahJeda = await langkah();
  catat(`[${u.nama}] jeda: langkah ${saatJeda} → ${sesudahJeda} sesudah 4,5 detik; tombol "${await page.textContent('#tombol-jeda')}"; keadaan "${await page.textContent('#agen-kini')}"; ${await page.textContent('#agen-biaya')}`);
  if (saatJeda !== sesudahJeda) merah(`[${u.nama}] jeda tidak menahan`);
  await keAtasBilah();
  await potret('02-tengah-ringkas-dijeda');

  // Kecepatan 4×, lanjut sampai langkah 13, lalu lompat ke akhir.
  await page.selectOption('#kecepatan', '4');
  await jeda();
  await tunggu(13);
  const sebelumLompat = await langkah();
  await page.click('#tombol-lompat');
  await page.waitForSelector('html[data-agen="tuntas"]');
  catat(`[${u.nama}] lompat: dari langkah ${sebelumLompat} ke ${await langkah()}; "${await page.textContent('#agen-kini')}"; ${await page.textContent('#agen-biaya')}`);

  await tampilan('ringkas');
  await keAtasBilah();
  await potret('06-akhir-ringkas');
  await tampilan('rinci');
  await keAtasBilah();
  await potret('07-akhir-rinci');
  // Satu lipatan "rekaman asli" dibuka (langkah 5).
  const lipatan = page.locator('#rinci-isi li[data-langkah="5"] details.agen-asli').first();
  await lipatan.locator('summary').click();
  await lipatan.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -160));
  await potret('07b-rinci-rekaman-asli-dibuka');
  await tampilan('diagram');
  await keDiagram();
  await page.waitForTimeout(250);
  catat(`[${u.nama}] diagram akhir: ${JSON.stringify(await keadaanDiagram())}`);
  await potret('08-akhir-diagram', sempit);
  if (u.nama === '1280') {
    await keAtasBilah();
    await potret('08b-akhir-diagram-dengan-bilah');
  }
  await page.evaluate(() => document.getElementById('agen-simulasi').scrollIntoView({ block: 'start' }));
  await potret('09-akhir-simulasi-jadi');
  await tampilan('ringkas');
  await potret('10-akhir-ringkas-halaman-penuh', true);
  await tampilan('diagram');
  await potret('11-akhir-diagram-halaman-penuh', true);

  // Diagram di DOM: kelompok, isi baris tool, dan ukuran teks (OQ-1).
  const ukur = await page.evaluate(() => {
    const kanvas = document.createElement('canvas').getContext('2d');
    const lebarTeks = (teks, gaya) => {
      kanvas.font = `${gaya.fontWeight} ${gaya.fontSize} ${gaya.fontFamily}`;
      return Math.round(kanvas.measureText(teks).width);
    };
    /** Apakah ada isi (anak, cucu) yang keluar dari kotak induknya, diukur dari kotak yang tergambar. */
    const keluarDari = (induk) => {
      const k = induk.getBoundingClientRect();
      return [...induk.querySelectorAll('*')].some((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.top < k.top - 1 || r.bottom > k.bottom + 1 || r.left < k.left - 1 || r.right > k.right + 1);
      });
    };
    const baris = [...document.querySelectorAll('#agen-simpul > li')].map((li) => {
      const nama = li.querySelector('.agen-tool');
      const ket = li.querySelector('.agen-simpul-ket');
      const isi = li.clientWidth - parseFloat(getComputedStyle(li).paddingLeft) - parseFloat(getComputedStyle(li).paddingRight);
      return {
        tool: nama.textContent,
        kelompok: li.dataset.kelompok,
        lebar_isi_px: Math.round(isi),
        lebar_nama_px: lebarTeks(nama.textContent, getComputedStyle(nama)),
        lebar_keterangan_px: ket === null ? null : lebarTeks(ket.textContent, { fontWeight: '400', fontSize: getComputedStyle(nama).fontSize, fontFamily: getComputedStyle(document.body).fontFamily }),
        keterangan_tampil: ket !== null && getComputedStyle(ket).display !== 'none',
        terpotong: li.scrollHeight > li.clientHeight + 1 || li.scrollWidth > li.clientWidth + 1 || keluarDari(li),
      };
    });
    return {
      tata: document.getElementById('agen-bidang').dataset.tata,
      lebar_bidang_px: Math.round(document.getElementById('agen-bidang').getBoundingClientRect().width),
      kelompok: [...document.querySelectorAll('#agen-lembar > .agen-kelompok-nama')].map((e) => `${e.textContent} (${document.querySelectorAll(`#agen-simpul > li[data-kelompok="${e.dataset.kelompok}"]`).length})`),
      lembar_agent: document.querySelectorAll('#agen-bidang .agen-kotak').length,
      agent_terpotong: keluarDari(document.getElementById('agen-kotak')),
      baris,
    };
  });
  catat(`[${u.nama}] diagram di DOM: tata ${ukur.tata}, bidang ${ukur.lebar_bidang_px} px, lembar agent ${ukur.lembar_agent}, kelompok ${JSON.stringify(ukur.kelompok)}`);
  catat(`[${u.nama}] baris tool (lebar isi | nama | keterangan satu baris, px; keterangan tampil?; terpotong?):\n  ${ukur.baris.map((b) => `${b.tool.padEnd(28)} ${b.kelompok.padEnd(8)} ${String(b.lebar_isi_px).padStart(4)} | ${String(b.lebar_nama_px).padStart(4)} | ${String(b.lebar_keterangan_px).padStart(4)}  ${b.keterangan_tampil ? 'tampil' : 'di catatan langkah'}  ${b.terpotong ? 'TERPOTONG' : 'utuh'}`).join('\n  ')}`);
  if (ukur.baris.some((b) => b.terpotong) || ukur.agent_terpotong) merah(`[${u.nama}] ada isi baris tool atau lembar agent yang terpotong`);
  if (ukur.lembar_agent !== 1 || ukur.kelompok.length !== 4 || ukur.baris.length !== 12) merah(`[${u.nama}] diagram tidak berisi 1 agent, 4 kelompok, 12 tool`);

  const akhir = await page.evaluate(() => ({
    langkah: document.querySelectorAll('#tampilan-ringkas .agen-baris').length,
    rinci: document.querySelectorAll('#rinci-isi .agen-baris').length,
    tahap: [...document.querySelectorAll('#tampilan-ringkas .agen-tahap')].map((t) => `${t.querySelector('h3').textContent}: ${t.querySelector('.agen-tahap-angka').textContent}`),
    label_status: [...new Set([...document.querySelectorAll('#tampilan-ringkas .agen-tanda')].map((e) => e.textContent))],
    nama_tool_di_langkah: [...new Set([...document.querySelectorAll('#tampilan-ringkas .agen-panggil .agen-tool')].map((e) => e.textContent))],
    soal: document.querySelectorAll('#simulasi-isi .gelembung').length,
    gulirMendatar: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    lebarDokumen: document.documentElement.scrollWidth,
  }));
  catat(`[${u.nama}] akhir: ${JSON.stringify(akhir, null, 1)}`);
  if (akhir.gulirMendatar) merah(`[${u.nama}] halaman bergulir mendatar`);

  // Putar dari awal: tampilan kosong lagi, simulasi tersembunyi.
  await page.click('#tombol-ulang');
  await tunggu(1);
  catat(`[${u.nama}] putar dari awal: langkah ${await langkah()}, simulasi tersembunyi = ${await page.evaluate(() => document.getElementById('agen-simulasi').hidden)}`);
  catat(`[${u.nama}] konsol: ${konsol.length === 0 ? 'bersih' : JSON.stringify(konsol)}; permintaan ke luar ${ASAL}: ${luar.length === 0 ? 'tidak ada' : JSON.stringify(luar)}`);
  if (konsol.length > 0 || luar.length > 0) gagal = true;
  await ctx.close();

  // Tanpa gerak (prefers-reduced-motion): tidak ada keping yang terbang; hasil langsung di agent.
  if (u.nama === '1280') {
    const tenang = await peramban.newContext({ viewport: { width: u.width, height: u.height }, colorScheme: 'light', reducedMotion: 'reduce' });
    const p2 = await tenang.newPage();
    await p2.goto(ASAL);
    await p2.waitForSelector('html[data-siap="1"]');
    await p2.fill('#kode', kode);
    await p2.click('#tombol-putar');
    await p2.click('button[data-tampilan="diagram"]');
    const gerakTerlihat = new Set();
    let kepingTerlihat = 0;
    while (Number(await p2.evaluate(() => document.documentElement.dataset.langkah ?? 0)) < 5) {
      gerakTerlihat.add(await p2.evaluate(() => document.documentElement.dataset.gerak));
      kepingTerlihat += await p2.evaluate(() => document.querySelectorAll('#agen-kirim > .agen-keping').length);
      await p2.waitForTimeout(60);
    }
    catat(`[${u.nama}] prefers-reduced-motion: gerak yang terlihat sampai langkah 5 = ${JSON.stringify([...gerakTerlihat])}; keping terbang terlihat = ${kepingTerlihat}`);
    if (kepingTerlihat !== 0 || [...gerakTerlihat].some((g) => g !== 'tiba')) merah('prefers-reduced-motion tidak dihormati');
    await tenang.close();
  }
}

// Banding diagram 1280: sebelum (m2d31) dan sesudah, berdampingan, tanpa penilaian.
if (existsSync(SEBELUM)) {
  const ctx = await peramban.newContext({ viewport: { width: 2632, height: 860 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const b64 = (jalur) => `data:image/png;base64,${readFileSync(jalur).toString('base64')}`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px 24px 24px;background:#fff;font:600 20px system-ui,sans-serif;color:#14213d">
    <div style="display:flex;gap:24px">
      <figure style="margin:0"><figcaption style="padding:0 0 10px">Sebelum — M2d-31 (.cache/tangkapan/m2d31/1280-09-akhir-diagram.png)</figcaption><img width="1280" height="800" style="display:block;border:1px solid #14213d" src="${b64(SEBELUM)}"></figure>
      <figure style="margin:0"><figcaption style="padding:0 0 10px">Sesudah — M2d-32 (${FOLDER}1280-08b-akhir-diagram-dengan-bilah.png)</figcaption><img width="1280" height="800" style="display:block;border:1px solid #14213d" src="${b64(`${KELUAR}1280-08b-akhir-diagram-dengan-bilah.png`)}"></figure>
    </div></body>`);
  await page.screenshot({ path: `${KELUAR}banding-diagram-1280.png`, fullPage: true });
  berkas.push(`${FOLDER}banding-diagram-1280.png`);
  await ctx.close();
} else {
  merah(`gambar sebelum tidak ada: ${SEBELUM}`);
}

await peramban.close();
console.log(`\n${berkas.length} gambar:\n${berkas.join('\n')}`);
process.exitCode = gagal ? 1 : 0;
