#!/usr/bin/env node
/**
 * Perekam proses pembuatan soal (M2d-12 D-4): `node alat/penyusun/rekam.mjs --jalan eval/penyusun/<id>`.
 *
 * Memutar MODE TAYANG ULANG pintu penyusun (log jalan nyata, tanpa panggilan
 * model) di Chromium 1920×1080 (deviceScaleFactor 1) dan menangkap bingkai
 * dengan WAKTU VIRTUAL: server dijalankan dengan `--jam-virtual`; tiap bingkai
 * perekam memajukan jam tepat 1/30 detik (POST /api/tayang/maju), menunggu
 * halaman selesai menggambar peristiwa yang jatuh tempo, lalu memotret.
 * Bingkai PNG dialirkan ke ffmpeg → H.264 yuv420p CRF 16, 30 fps. Karena waktu
 * tidak berjalan sendiri, laptop yang lambat tidak membuat bingkai hilang
 * (bukan `recordVideo`, yang memotret waktu nyata dan berkualitas rendah).
 * Bingkai yang isinya pasti sama (tidak ada peristiwa, gulir, atau permintaan
 * baru) memakai ulang potret sebelumnya.
 *
 * Sesudah rekaman selesai: lembar kontak (bingkai tiap 2 d, 4×4) seperti
 * `.context/videos/penjurian/pasca.sh`, dan ringkasan ffprobe.
 *
 * `--tangkap`: hanya tangkapan layar (1920×1080 dan 375 px) untuk kritikus desain.
 *
 * Proses yang dinyalakan skrip ini (server penyusun + satu Chromium) dicatat
 * PID-nya dan dimatikan di akhir — hanya proses milik skrip ini.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const FPS = 30;
const LEBAR = 1920;
const TINGGI = 1080;

function urai(argv) {
  const a = { jalan: null, keluaran: join(AKAR, '.context', 'videos', 'penyusun'), tangkap: false, crf: 16, batasDetik: 90 };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--jalan') a.jalan = argv[++i];
    else if (x === '--keluaran') a.keluaran = argv[++i];
    else if (x === '--tangkap') a.tangkap = true;
    else if (x === '--crf') a.crf = Number(argv[++i]);
    else throw new Error(`Argumen tidak dikenal: ${x}`);
  }
  if (a.jalan === null) throw new Error('Pakai: --jalan eval/penyusun/<id> [--keluaran <folder>] [--tangkap]');
  if (!(a.crf >= 0 && a.crf <= 18)) throw new Error('--crf harus 0–18.');
  return a;
}

const tunda = (ms) => new Promise((s) => setTimeout(s, ms));

/** Nyalakan server penyusun (tayang ulang, jam virtual) di port bebas 127.0.0.1. */
function nyalakanServer(jalan) {
  const anak = spawn(process.execPath, ['--experimental-strip-types', join(AKAR, 'alat', 'penyusun', 'server.ts'), '--port', '0', '--tayang-ulang', jalan, '--jam-virtual'], { cwd: AKAR, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((selesai, gagal) => {
    let teks = '';
    const waktu = setTimeout(() => gagal(new Error(`server tidak siap: ${teks}`)), 30_000);
    const baca = (b) => {
      teks += b.toString('utf8');
      const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(teks);
      if (m) {
        clearTimeout(waktu);
        selesai({ anak, asal: `http://127.0.0.1:${m[1]}` });
      }
    };
    anak.stdout.on('data', baca);
    anak.stderr.on('data', (b) => { teks += b.toString('utf8'); });
    anak.on('exit', (k) => gagal(new Error(`server keluar (${k}): ${teks}`)));
  });
}

async function maju(asal, ms) {
  const r = await fetch(`${asal}/api/tayang/maju`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ms }) });
  if (!r.ok) throw new Error(`maju gagal: ${r.status} ${await r.text()}`);
  return r.json();
}

/** Tunggu halaman menggambar sampai nomor `n` dan tidak ada permintaan yang berjalan. */
async function tungguGambar(page, n, batasMs = 20_000) {
  const awal = Date.now();
  for (;;) {
    const k = await page.evaluate(() => ({ nomor: Number(document.documentElement.dataset.nomor || 0), tunggu: Number(document.documentElement.dataset.tunggu || 0) }));
    if (k.nomor >= n && k.tunggu === 0) break;
    if (Date.now() - awal > batasMs) throw new Error(`halaman tidak menggambar peristiwa ${n} (nomor ${k.nomor}, tunggu ${k.tunggu})`);
    await tunda(15);
  }
  // dua bingkai animasi: tata letak dan lukisan selesai
  await page.evaluate(() => new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s))));
}

/** Gulir sasaran selama tayang: dasar bagian tahapan (termasuk kotak persetujuan) terlihat. */
async function sasaranGulir(page) {
  return page.evaluate(() => {
    const b = document.getElementById('langkah-tahap');
    if (!b || b.hidden) return 0;
    const r = b.getBoundingClientRect();
    const bawah = r.bottom + window.scrollY;
    return Math.max(0, Math.round(bawah - window.innerHeight + 24));
  });
}

async function posisiElemen(page, selektor, jarak = 96) {
  return page.evaluate(([s, j]) => {
    const e = document.querySelector(s);
    if (!e) return null;
    return Math.max(0, Math.round(e.getBoundingClientRect().top + window.scrollY - j));
  }, [selektor, jarak]);
}

async function tandaHalaman(page) {
  return page.evaluate(() => [
    document.documentElement.dataset.nomor || '0',
    document.documentElement.dataset.tunggu || '0',
    Math.round(window.scrollY),
    document.documentElement.scrollHeight,
    (document.getElementById('rekaman-jeda') || {}).textContent || '',
  ].join('|'));
}

/** Pemeriksaan kejujuran atas teks halaman yang tampil. */
async function periksaKejujuran(page, terbit) {
  const t = await page.evaluate(() => {
    const r = document.getElementById('rekaman');
    const k = r ? r.getBoundingClientRect() : null;
    return { teks: document.body.innerText, rekamanTerlihat: Boolean(r && !r.hidden && k && k.bottom > 0 && k.top < window.innerHeight) };
  });
  const masalah = [];
  if (!t.rekamanTerlihat) masalah.push('penanda rekaman tidak terlihat');
  if (/ditulis\s+(oleh\s+)?manusia/i.test(t.teks)) masalah.push('ada "ditulis manusia"');
  if (!terbit) {
    if (/lulus/i.test(t.teks)) masalah.push('jalan tidak terbit menampilkan "lulus"');
    for (const m of t.teks.matchAll(/terbit/gi)) {
      const sebelum = t.teks.slice(Math.max(0, m.index - 6), m.index).toLowerCase();
      if (!/tidak\s$/.test(sebelum)) masalah.push(`jalan tidak terbit menampilkan "terbit" tanpa "tidak": …${t.teks.slice(Math.max(0, m.index - 30), m.index + 10)}…`);
    }
  }
  return masalah;
}

async function bukaHalaman(browser, asal, viewport, dsf = 1) {
  const konteks = await browser.newContext({ viewport, deviceScaleFactor: dsf, colorScheme: 'light', reducedMotion: 'no-preference' });
  await konteks.addInitScript(() => { window.PENYUSUN_GULIR_LUAR = true; });
  const page = await konteks.newPage();
  const galat = [];
  page.on('pageerror', (e) => galat.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') galat.push(m.text()); });
  await page.goto(`${asal}/`);
  await page.waitForFunction(() => document.documentElement.dataset.mode === 'tayang-ulang');
  // Beri waktu EventSource tersambung; jam virtual belum maju, jadi tidak ada yang terlewat.
  await tunda(800);
  return { konteks, page, galat };
}

/* ---------------------------------------------------------------------- */
/* rekam video                                                             */
/* ---------------------------------------------------------------------- */

async function rekamVideo(browser, asal, a, status) {
  const id = status.rekaman.id;
  mkdirSync(a.keluaran, { recursive: true });
  const berkas = join(a.keluaran, `penyusun-${id}.mp4`);
  const { konteks, page, galat } = await bukaHalaman(browser, asal, { width: LEBAR, height: TINGGI });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf), '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', berkas], { stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(`ffmpeg PID ${ff.pid}`);
  const selesaiFf = new Promise((s, g) => ff.on('exit', (k) => (k === 0 ? s() : g(new Error(`ffmpeg keluar ${k}`)))));
  const tulis = (buf) => new Promise((s) => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', s); else s(); });

  let terakhir = null;
  let tandaLama = '';
  let bingkai = 0;
  let dipotret = 0;
  const masalah = new Set();
  const potret = async (paksa = false) => {
    const tanda = await tandaHalaman(page);
    if (paksa || terakhir === null || tanda !== tandaLama) {
      terakhir = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
      tandaLama = tanda;
      dipotret++;
    }
    await tulis(terakhir);
    bingkai++;
    if (bingkai % FPS === 0) for (const m of await periksaKejujuran(page, status.terbit)) masalah.add(m);
  };
  const gulirKe = async (y) => page.evaluate((v) => window.scrollTo(0, v), y);
  const posisi = async () => page.evaluate(() => window.scrollY);

  // 1) tayang: tiap bingkai = 1/30 d waktu virtual.
  let t = 0;
  let k = { terkirim: 0, selesai: false, jumlah: status.rekaman.jumlah_peristiwa };
  await potret(true);
  while (!k.selesai) {
    const ms = Math.round(((bingkai + 1) * 1000) / FPS) - t;
    t += ms;
    k = await maju(asal, ms);
    await tungguGambar(page, k.terkirim);
    const sasaran = await sasaranGulir(page);
    const kini = await posisi();
    if (Math.abs(sasaran - kini) > 1) await gulirKe(kini + Math.round((sasaran - kini) * 0.2) || (sasaran > kini ? 1 : -1));
    await potret();
    if (bingkai > a.batasDetik * FPS) throw new Error('rekaman melewati batas durasi');
  }
  const detikTayang = bingkai / FPS;
  console.log(`tayang selesai: ${k.terkirim}/${k.jumlah} peristiwa dalam ${detikTayang.toFixed(1)} d (${bingkai} bingkai)`);

  // 2) sesudah tayang: tahan, lalu gulir halus ke hasil dan penyetuju.
  const tahan = async (detik) => { for (let i = 0; i < Math.round(detik * FPS); i++) await potret(); };
  const meluncur = async (ke, detik) => {
    const dari = await posisi();
    const n = Math.max(1, Math.round(detik * FPS));
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      await gulirKe(Math.round(dari + (ke - dari) * e));
      await potret();
    }
  };
  await page.evaluate(() => new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s))));
  await tahan(2);
  const sisa = Math.max(10, Math.min(26, a.batasDetik - 2 - detikTayang - 2));
  const hasilY = await posisiElemen(page, '#langkah-hasil');
  const maksY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  if (hasilY !== null) {
    await meluncur(Math.min(hasilY, maksY), 1.5);
    await tahan(Math.min(5, sisa * 0.25));
    // telusuri draf / versi terakhir pelan-pelan sampai bagian penyetuju (atau dasar halaman)
    const ujung = (await posisiElemen(page, '#langkah-penyetuju:not([hidden])', 120)) ?? maksY;
    const jarak = Math.min(ujung, maksY) - (await posisi());
    const detikTelusur = Math.max(4, sisa - 1.5 - Math.min(5, sisa * 0.25) - 3);
    await meluncur(Math.min(ujung, maksY), Math.min(detikTelusur, Math.max(4, jarak / 180)));
    await tahan(3);
  } else {
    await tahan(4);
  }
  for (const m of await periksaKejujuran(page, status.terbit)) masalah.add(m);
  ff.stdin.end();
  await selesaiFf;
  await konteks.close();
  return { berkas, bingkai, dipotret, detik: bingkai / FPS, detikTayang, masalah: [...masalah], galat };
}

/* ---------------------------------------------------------------------- */
/* tangkapan layar untuk kritikus                                          */
/* ---------------------------------------------------------------------- */

async function majuSampai(asal, page, n) {
  let k = { terkirim: 0, selesai: false };
  while (k.terkirim < n && !k.selesai) k = await maju(asal, 250);
  await tungguGambar(page, k.terkirim);
  return k;
}

async function tangkapLayar(browser, asal, a, status) {
  const id = status.rekaman.id;
  const folder = join(a.keluaran, 'tangkap', id);
  mkdirSync(folder, { recursive: true });
  const n = status.rekaman.jumlah_peristiwa;
  const titik = [
    ['01-awal', 2],
    ['02-persetujuan', 4],
    ['03-agen-tengah', Math.round(n * 0.55)],
    ['04-akhir-tayang', n],
  ];
  const berkas = [];
  for (const [lebar, tinggi, label] of [[LEBAR, TINGGI, '1920'], [375, 812, '375']]) {
    // tiap sambungan baru memutar rekaman dari awal, relatif terhadap jam virtual saat itu
    const { konteks, page } = await bukaHalaman(browser, asal, { width: lebar, height: tinggi }, label === '375' ? 2 : 1);
    for (const [nama, no] of titik) {
      await majuSampai(asal, page, no);
      const y = await sasaranGulir(page);
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.evaluate(() => new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s))));
      const j = join(folder, `${label}-${nama}.png`);
      await page.screenshot({ path: j });
      berkas.push(j);
    }
    for (const [nama, sel] of [['05-hasil', '#langkah-hasil'], ['06-omongan-2', 'article.omongan[data-omongan="2"]'], ['07-penyetuju', '#langkah-penyetuju:not([hidden])']]) {
      const y = await posisiElemen(page, sel);
      if (y === null) continue;
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.evaluate(() => new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s))));
      const j = join(folder, `${label}-${nama}.png`);
      await page.screenshot({ path: j });
      berkas.push(j);
    }
    if (label === '375') {
      const j = join(folder, `${label}-penuh.png`);
      await page.screenshot({ path: j, fullPage: true });
      berkas.push(j);
    }
    await konteks.close();
  }
  return berkas;
}

/* ---------------------------------------------------------------------- */

function jalankan(perintah, argumen) {
  return new Promise((s, g) => {
    const p = spawn(perintah, argumen, { stdio: ['ignore', 'pipe', 'inherit'] });
    let keluar = '';
    p.stdout.on('data', (b) => { keluar += b.toString('utf8'); });
    p.on('exit', (k) => (k === 0 ? s(keluar) : g(new Error(`${perintah} keluar ${k}`))));
  });
}

async function pascaVideo(berkas) {
  const nama = basename(berkas, '.mp4');
  const folderKontak = join(resolve(berkas, '..'), `kontak-${nama}`);
  mkdirSync(folderKontak, { recursive: true });
  const font = 'C\\:/Windows/Fonts/consola.ttf';
  const tulisan = existsSync('C:/Windows/Fonts/consola.ttf') ? `,drawtext=fontfile='${font}':text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=4` : '';
  await jalankan('ffmpeg', ['-v', 'error', '-y', '-i', berkas, '-vf', `select='not(mod(n\\,60))',scale=480:270${tulisan},tile=4x4:padding=6:margin=6:color=0x202020`, '-fps_mode', 'passthrough', join(folderKontak, 'lembar-%02d.png')]);
  const probe = await jalankan('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,nb_frames', '-of', 'json', berkas]);
  writeFileSync(join(resolve(berkas, '..'), `${nama}.ffprobe.json`), probe, 'utf8');
  return { folderKontak, probe: JSON.parse(probe) };
}

async function utama() {
  const a = urai(process.argv.slice(2));
  const jalan = resolve(AKAR, a.jalan);
  const { anak, asal } = await nyalakanServer(jalan);
  console.log(`server penyusun PID ${anak.pid} (${asal})`);
  let browser = null;
  let serverBrowser = null;
  try {
    const status = await (await fetch(`${asal}/api/status`)).json();
    const akhir = await fetch(`${asal}/api/jalan/${status.rekaman.id}`).then((r) => r.json());
    status.terbit = Boolean(akhir.hasil && akhir.hasil.terbit);
    // launchServer: satu proses Chromium yang PID-nya diketahui (hanya proses ini yang dimatikan).
    serverBrowser = await chromium.launchServer({ headless: true });
    console.log(`Chromium PID ${serverBrowser.process().pid}`);
    browser = await chromium.connect(serverBrowser.wsEndpoint());
    if (a.tangkap) {
      const berkas = await tangkapLayar(browser, asal, a, status);
      console.log(berkas.join('\n'));
      return;
    }
    const h = await rekamVideo(browser, asal, a, status);
    const p = await pascaVideo(h.berkas);
    const s = p.probe.streams?.[0] ?? {};
    console.log(`video: ${h.berkas}`);
    console.log(`  ${h.detik.toFixed(2)} d (${h.bingkai} bingkai @ ${FPS} fps; tayang ${h.detikTayang.toFixed(1)} d; ${h.dipotret} potret unik)`);
    console.log(`  ffprobe: ${s.codec_name} ${s.profile} ${s.pix_fmt} ${s.width}×${s.height} r=${s.r_frame_rate} avg=${s.avg_frame_rate} durasi ${p.probe.format?.duration} d`);
    console.log(`  lembar kontak: ${p.folderKontak}`);
    console.log(`  kejujuran: ${h.masalah.length === 0 ? 'bersih' : h.masalah.join(' | ')}`);
    console.log(`  galat halaman: ${h.galat.length === 0 ? 'tidak ada' : h.galat.join(' | ')}`);
    if (h.masalah.length > 0 || h.galat.length > 0) process.exitCode = 2;
  } finally {
    if (browser) await browser.close();
    if (serverBrowser) await serverBrowser.close();
    anak.kill();
    console.log(`dihentikan: server PID ${anak.pid}${serverBrowser ? `, Chromium PID ${serverBrowser.process().pid}` : ''}`);
  }
}

utama().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exitCode = 1;
});
