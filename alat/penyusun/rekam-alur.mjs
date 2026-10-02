#!/usr/bin/env node
/**
 * Perekam ALUR PENUH pintu penyusun (M2d-14 D-4):
 * `node alat/penyusun/rekam-alur.mjs --demo eval/penyusun/<jalan> --suntingan <berkas> [--tangkap]`.
 *
 * Satu ambilan: ketik kode saham → usulan hari → bekukan → tahap 1–4 hidup →
 * perkiraan biaya → klik setuju → bagian agen diputar dari log jalan nyata
 * (penanda Rekaman + "Dipercepat ×N") → hasil + catatan sesudah jalan →
 * penyetuju mengetik suntingan dari berkas (seperti manusia: blok teks dipilih,
 * dihapus, lalu diketik huruf demi huruf) → gerbang kode diuji ulang langsung →
 * gerbang AI (hasil uji ulang sungguhan tersimpan, diputar tanpa panggilan) →
 * setujui (menulis persetujuan-demo.json) atau tetap ditolak.
 *
 * Perekam bingkai M2d-12: server `--jam-virtual`; tiap bingkai memajukan jam
 * tepat 1/30 d, menunggu halaman menggambar, lalu memotret. PNG → ffmpeg
 * H.264 yuv420p CRF 16, 30 fps. Laptop lambat tidak menghilangkan bingkai.
 * Sesudahnya: potongan per tahap (input, agen, penyetuju), lembar kontak,
 * ffprobe, dan transkrip kejadian per detik (`alur-penuh-waktu.json`).
 *
 * Tanpa `--pagu-uji-ulang`: perekam TIDAK PERNAH memicu panggilan berbayar.
 * Proses yang dinyalakan (server + satu Chromium + ffmpeg) dicatat PID-nya dan
 * dimatikan di akhir — hanya milik skrip ini.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const FPS = 30;
const LEBAR = 1920;
const TINGGI = 1080;

function urai(argv) {
  const a = { demo: null, suntingan: null, keluaran: join(AKAR, '.context', 'videos', 'penyusun'), nama: 'alur-penuh', tangkap: false, crf: 16, batasDetik: 150, kode: 'TIRT', tanggal: '2025-12-10' };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--demo') a.demo = argv[++i];
    else if (x === '--suntingan') a.suntingan = argv[++i];
    else if (x === '--keluaran') a.keluaran = argv[++i];
    else if (x === '--nama') a.nama = argv[++i];
    else if (x === '--tangkap') a.tangkap = true;
    else if (x === '--crf') a.crf = Number(argv[++i]);
    else throw new Error(`Argumen tidak dikenal: ${x}`);
  }
  if (a.demo === null || a.suntingan === null) throw new Error('Pakai: --demo eval/penyusun/<id> --suntingan <berkas> [--tangkap] [--nama alur-penuh]');
  if (!(a.crf >= 0 && a.crf <= 18)) throw new Error('--crf harus 0–18.');
  return a;
}

const tunda = (ms) => new Promise((s) => setTimeout(s, ms));

function nyalakanServer(a) {
  const anak = spawn(process.execPath, ['--experimental-strip-types', join(AKAR, 'alat', 'penyusun', 'server.ts'), '--port', '0', '--demo', a.demo, '--suntingan', a.suntingan, '--jam-virtual'], { cwd: AKAR, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((selesai, gagal) => {
    let teks = '';
    const waktu = setTimeout(() => gagal(new Error(`server tidak siap: ${teks}`)), 30_000);
    const baca = (b) => {
      teks += b.toString('utf8');
      const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(teks);
      if (m) {
        clearTimeout(waktu);
        selesai({ anak, asal: `http://127.0.0.1:${m[1]}`, log: () => teks });
      }
    };
    anak.stdout.on('data', baca);
    anak.stderr.on('data', (b) => { teks += b.toString('utf8'); });
    anak.on('exit', (k) => gagal(new Error(`server keluar (${k}): ${teks}`)));
  });
}

/* ---------------------------------------------------------------------- */
/* beda teks untuk mengetik seperti manusia                                */
/* ---------------------------------------------------------------------- */

/** Token: rujukan [[…]] utuh, spasi, kata/tanda baca. */
function token(t) {
  return t.match(/\[\[[^\]]*\]\]|\s+|[^\s[]+|\[/g) ?? [];
}

/**
 * Potongan suntingan kiri-ke-kanan dari `lama` ke `baru` (LCS atas token):
 * [{ mulai, hapus, sisip }] dengan `mulai` = indeks huruf di teks SAAT itu.
 */
export function potonganSunting(lama, baru) {
  const A = token(lama);
  const B = token(baru);
  const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hasil = [];
  let i = 0;
  let j = 0;
  let pos = 0;
  let cur = null;
  const tutup = () => {
    if (cur !== null && (cur.hapus !== '' || cur.sisip !== '')) {
      hasil.push(cur);
      pos += cur.sisip.length;
    }
    cur = null;
  };
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) {
      tutup();
      pos += A[i].length;
      i++;
      j++;
    } else if (j < B.length && (i >= A.length || L[i][j + 1] >= L[i + 1][j])) {
      cur ??= { mulai: pos, hapus: '', sisip: '' };
      cur.sisip += B[j];
      j++;
    } else {
      cur ??= { mulai: pos, hapus: '', sisip: '' };
      cur.hapus += A[i];
      i++;
    }
  }
  tutup();
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* perekam                                                                 */
/* ---------------------------------------------------------------------- */

function acak(benih) {
  let x = benih >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

async function rekam(a) {
  const berkasSunting = JSON.parse(readFileSync(resolve(AKAR, a.suntingan), 'utf8'));
  const { anak, asal, log: logServer } = await nyalakanServer(a);
  console.log(`server penyusun PID ${anak.pid} (${asal})`);
  const pid = { server: anak.pid, chromium: null, ffmpeg: null };
  const serverBrowser = await chromium.launchServer({ headless: true });
  pid.chromium = serverBrowser.process().pid;
  console.log(`Chromium PID ${pid.chromium}`);
  const browser = await chromium.connect(serverBrowser.wsEndpoint());
  mkdirSync(a.keluaran, { recursive: true });
  const berkasVideo = join(a.keluaran, `penyusun-${a.nama}.mp4`);
  const folderTangkap = join(a.keluaran, 'tangkap', a.nama);
  if (a.tangkap) mkdirSync(folderTangkap, { recursive: true });
  let ff = null;
  let selesaiFf = Promise.resolve();
  const waktu = [];
  const masalah = new Set();
  const galat = [];
  let bingkai = 0;
  let dipotret = 0;
  try {
    const konteks = await browser.newContext({ viewport: { width: LEBAR, height: TINGGI }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'no-preference', bypassCSP: true });
    await konteks.addInitScript(() => { window.PENYUSUN_GULIR_LUAR = true; });
    const page = await konteks.newPage();
    page.on('pageerror', (e) => galat.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') galat.push(m.text()); });
    await page.goto(`${asal}/`);
    await page.waitForFunction(() => document.documentElement.dataset.mode === 'demo');
    const status = await (await fetch(`${asal}/api/status`)).json();
    const d = status.demo;

    if (!a.tangkap) {
      ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(a.crf), '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', berkasVideo], { stdio: ['pipe', 'inherit', 'inherit'] });
      pid.ffmpeg = ff.pid;
      console.log(`ffmpeg PID ${ff.pid}`);
      selesaiFf = new Promise((s, g) => ff.on('exit', (k) => (k === 0 ? s() : g(new Error(`ffmpeg keluar ${k}`)))));
    }
    const tulis = (buf) => new Promise((s) => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', s); else s(); });

    const detik = () => bingkai / FPS;
    const tandai = (peristiwa, rincian = null) => {
      waktu.push({ detik: Math.round(detik() * 100) / 100, peristiwa, ...(rincian === null ? {} : { rincian }) });
      console.log(`  ${detik().toFixed(2)} d  ${peristiwa}`);
    };

    const maju = async (ms) => {
      const r = await fetch(`${asal}/api/tayang/maju`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ms }) });
      if (!r.ok) throw new Error(`maju gagal: ${r.status} ${await r.text()}`);
      return r.json();
    };
    const tungguTenang = async () => {
      const awal = Date.now();
      for (;;) {
        const t = await page.evaluate(() => Number(document.documentElement.dataset.tunggu || 0));
        if (t === 0) break;
        if (Date.now() - awal > 20_000) throw new Error('permintaan halaman tidak selesai');
        await tunda(10);
      }
      await page.evaluate(() => new Promise((s) => requestAnimationFrame(() => requestAnimationFrame(s))));
    };

    // Penunjuk klik (alat bantu perekam, bukan bagian halaman): cincin di titik klik.
    await page.addStyleTag({ content: '#penunjuk-perekam{position:fixed;z-index:99;width:52px;height:52px;margin:-26px 0 0 -26px;border:4px solid #4b3fa7;border-radius:50%;background:rgba(75,63,167,.12);pointer-events:none;opacity:0}' });
    await page.evaluate(() => { const e = document.createElement('div'); e.id = 'penunjuk-perekam'; document.body.append(e); });
    let penunjuk = 0;

    let tandaLama = '';
    let terakhir = null;
    let pemutar = { terkirim: 0, selesai: false, uji: { terkirim: 0, selesai: false } };
    const potret = async (paksa = false) => {
      pemutar = await maju(Math.round(((bingkai + 1) * 1000) / FPS) - Math.round((bingkai * 1000) / FPS));
      await tungguTenang();
      if (penunjuk > 0) {
        penunjuk--;
        await page.evaluate((o) => { const e = document.getElementById('penunjuk-perekam'); if (e) e.style.opacity = String(o); }, Math.min(1, penunjuk / 10));
      }
      if (!a.tangkap) {
        const tanda = await page.evaluate(() => [document.documentElement.dataset.nomor, document.documentElement.dataset.nomorUji, document.documentElement.dataset.demoSunting, Math.round(window.scrollY), document.documentElement.scrollHeight, (document.getElementById('rekaman') || {}).textContent, (document.activeElement || {}).value, (document.getElementById('penunjuk-perekam') || { style: {} }).style.opacity].join('|'));
        if (paksa || terakhir === null || tanda !== tandaLama) {
          terakhir = await page.screenshot({ type: 'png', caret: 'initial' });
          tandaLama = tanda;
          dipotret++;
        }
        await tulis(terakhir);
      }
      bingkai++;
      if (bingkai % FPS === 0) for (const m of await periksaKejujuran(page, d)) masalah.add(`${detik().toFixed(0)} d: ${m}`);
      if (bingkai > a.batasDetik * FPS) throw new Error(`rekaman melewati batas ${a.batasDetik} d`);
    };
    const tangkap = async (nama) => {
      if (!a.tangkap) return;
      await page.screenshot({ path: join(folderTangkap, `${String(waktu.length).padStart(2, '0')}-${nama}.png`) });
    };
    const tahan = async (s) => { for (let i = 0; i < Math.round(s * FPS); i++) await potret(); };
    const posisi = () => page.evaluate(() => window.scrollY);
    const maksY = () => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const atasElemen = (sel, jarak) => page.evaluate(([s, j]) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const bar = document.getElementById('rekaman');
      const tinggiBar = bar && !bar.hidden ? bar.getBoundingClientRect().height + 8 : 0;
      return Math.max(0, Math.round(e.getBoundingClientRect().top + window.scrollY - tinggiBar - j));
    }, [sel, jarak]);
    const meluncur = async (ke, s) => {
      const dari = await posisi();
      const tujuan = Math.min(Math.max(0, ke), await maksY());
      const n = Math.max(1, Math.round(s * FPS));
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        await page.evaluate((v) => window.scrollTo(0, v), Math.round(dari + (tujuan - dari) * e));
        await potret();
      }
    };
    const keElemen = async (sel, s = 1, jarak = 24) => {
      const y = await atasElemen(sel, jarak);
      if (y === null) throw new Error(`tidak ada ${sel}`);
      await meluncur(y, s);
    };
    const tunjuk = async (sel) => {
      const kotak = await page.locator(sel).first().boundingBox();
      if (kotak === null) throw new Error(`tidak terlihat: ${sel}`);
      await page.evaluate(([px, py]) => { const e = document.getElementById('penunjuk-perekam'); if (e) { e.style.left = `${px}px`; e.style.top = `${py}px`; e.style.opacity = '1'; } }, [kotak.x + kotak.width / 2, kotak.y + kotak.height / 2]);
      penunjuk = 16;
      await tahan(0.15);
    };
    const klik = async (sel) => {
      const kotak = await page.locator(sel).first().boundingBox();
      if (kotak === null) throw new Error(`tidak terlihat: ${sel}`);
      const x = kotak.x + kotak.width / 2;
      const y = kotak.y + kotak.height / 2;
      await page.evaluate(([px, py]) => { const e = document.getElementById('penunjuk-perekam'); if (e) { e.style.left = `${px}px`; e.style.top = `${py}px`; e.style.opacity = '1'; } }, [x, y]);
      penunjuk = 16;
      await tahan(0.15);
      await page.locator(sel).first().click();
      await potret(true);
    };
    const rnd = acak(1410);
    const ketik = async (teks) => {
      for (const ch of teks) {
        await page.keyboard.type(ch);
        const n = 2 + (/[\s,.]/.test(ch) && rnd() < 0.15 ? 1 : 0);
        for (let i = 0; i < n; i++) await potret(i === 0);
      }
    };

    /* ---- 1 · input ---------------------------------------------------- */
    tandai('Halaman mode demo terbuka: penanda "Langsung · tahap 1–4 dijalankan sekarang"');
    await tangkap('awal');
    await tahan(1.6);
    await klik('#kode');
    tandai('Penyetuju mengetik kode saham TIRT');
    await ketik(a.kode);
    await tahan(0.4);
    await klik('#form-kode button[type="submit"]');
    await tungguTenang();
    tandai('Usulan hari dari cache gudang (tanpa biaya)');
    await keElemen('#langkah-hari', 1.2);
    await tangkap('usulan');
    await tahan(2.6);
    const tombolHari = `#usulan article[data-tanggal="${a.tanggal}"] button`;
    await keElemen(`#usulan article[data-tanggal="${a.tanggal}"]`, 0.8, 40);
    await tahan(0.5);
    await klik(tombolHari);
    tandai(`Bekukan ${a.tanggal}: data → 33 aturan → paket fakta → perkiraan biaya (hidup, tanpa biaya model)`);
    for (let i = 0; i < 300; i++) {
      const n = await page.evaluate(() => Number(document.documentElement.dataset.nomor || 0));
      if (n >= d.no_perkiraan) break;
      await potret();
    }
    await keElemen('#langkah-tahap', 1, 16);
    await tahan(0.6);
    await keElemen('#persetujuan-biaya', 1, 24);
    tandai('Perkiraan biaya maksimum + persetujuan (catatan: klik tidak memanggil model)');
    await tangkap('perkiraan');
    await tahan(3.5);
    await klik('#setujui-biaya');
    const detikSetuju = detik();
    tandai(`Klik setuju → transisi: "Bagian agen diputar dari jalan nyata ${d.id} (biaya asli …)"; penanda Rekaman menyala`);

    /* ---- 2 · agen (tayang ulang) -------------------------------------- */
    await page.waitForFunction(() => document.documentElement.dataset.fase === 'agen');
    await tangkap('transisi');
    let nomorLama = d.no_perkiraan;
    for (let i = 0; i < 120 * FPS; i++) {
      const n = await page.evaluate(() => Number(document.documentElement.dataset.nomor || 0));
      if (n !== nomorLama) {
        const judul = await page.evaluate((no) => { const li = document.querySelector(`#tahap li[data-no="${no}"] .judul-tahap`); return li ? li.textContent : ''; }, n);
        tandai(`Log peristiwa ${n}: ${judul.slice(0, 140)}`);
        nomorLama = n;
      }
      const fase = await page.evaluate(() => document.documentElement.dataset.fase);
      if (fase !== 'agen') break;
      const sasaran = await page.evaluate(() => {
        const b = document.getElementById('langkah-tahap');
        const r = b.getBoundingClientRect();
        return Math.max(0, Math.round(r.bottom + window.scrollY - window.innerHeight + 24));
      });
      const kini = await posisi();
      if (Math.abs(sasaran - kini) > 1) await page.evaluate((v) => window.scrollTo(0, v), kini + Math.round((sasaran - kini) * 0.2) || (sasaran > kini ? 1 : -1));
      await potret();
      if (i === Math.round(8 * FPS)) await tangkap('agen-tengah');
    }
    await tungguTenang();
    const detikAgenSelesai = detik();
    tandai('Log selesai diputar: TIDAK TERBIT (omongan 2 ditolak gerbang kode; versi 3 tidak dikirim karena pagu)');
    await tahan(0.6);
    await keElemen('#langkah-hasil', 1, 16);
    await tangkap('hasil');
    await tahan(1.2);
    await keElemen('#catatan-sesudah', 0.8, 16);
    tandai('Catatan sesudah jalan: audit Opus satu soal (o1 4/4 sinyal, o3 1/4) dan penilai mutu Opus 8,83 (sekeluarga)');
    await tangkap('catatan');
    await tahan(3.2);

    /* ---- 3 · penyetuju (langsung) ------------------------------------- */
    await keElemen('#langkah-penyetuju', 1.2, 8);
    await page.waitForFunction(() => document.documentElement.dataset.fase === 'penyetuju');
    const detikPenyetuju = detik();
    tandai('Panel penyetuju (langsung): status tiga omongan; suntingan ke-1 dari reviewer');
    await tangkap('penyetuju');
    await tahan(1.5);
    for (const p of berkasSunting.putaran) {
      await keElemen('#putaran-demo', 0.7, 12);
      tandai(`Suntingan ke-${p.ke} (${p.oleh})`, p.alasan);
      await tahan(p.ke === 1 ? 1.2 : 2.0);
      for (const u of p.ubah) {
        if (u.tukar) {
          await tunjuk(`#tukar-x-${u.omongan}`);
          await page.selectOption(`#tukar-x-${u.omongan}`, u.tukar[0]);
          await potret(true);
          await tahan(0.4);
          await tunjuk(`#tukar-y-${u.omongan}`);
          await page.selectOption(`#tukar-y-${u.omongan}`, u.tukar[1]);
          await potret(true);
          await tahan(1);
          await klik(`#tukar-demo-${u.omongan}`);
          tandai(`Tukar isi pilihan ${u.tukar[0]} ↔ ${u.tukar[1]} → gerbang kode diuji ulang`);
        } else {
          // Pilihan bagian: cincin penunjuk di kotak pilihan, lalu nilainya diganti (tanpa membuka daftar bawaan peramban).
          await tunjuk(`#lokasi-demo-${u.omongan}`);
          await page.selectOption(`#lokasi-demo-${u.omongan}`, u.lokasi);
          await potret(true);
          await tahan(0.3);
          const area = `#teks-demo-${u.omongan}`;
          await page.focus(area);
          const lama = await page.inputValue(area);
          tandai(`Mengetik ${u.lokasi}`, { dari: lama, ke: u.teks });
          for (const h of potonganSunting(lama, u.teks)) {
            await page.evaluate(([s, m, n]) => { const e = document.querySelector(s); e.focus(); e.setSelectionRange(m, n); }, [area, h.mulai, h.mulai + h.hapus.length]);
            await potret(true);
            if (h.hapus !== '') {
              await tahan(0.2);
              await page.keyboard.press('Backspace');
              await potret(true);
            }
            await ketik(h.sisip);
          }
          const akhir = await page.inputValue(area);
          if (akhir !== u.teks) throw new Error(`hasil ketikan beda dengan berkas: ${JSON.stringify(akhir)} ≠ ${JSON.stringify(u.teks)}`);
          await tahan(0.2);
          await klik(`#simpan-demo-${u.omongan}`);
          tandai(`Simpan ${u.lokasi} → gerbang kode diuji ulang langsung`);
        }
        await tungguTenang();
        await tahan(0.6);
      }
      const ringkasKode = await page.evaluate(() => (document.querySelector('[data-gerbang="kode"]') || {}).innerText || '');
      tandai(`Gerbang kode sesudah suntingan ke-${p.ke}`, ringkasKode.slice(0, 600));
      await keElemen('[data-gerbang="kode"]', 0.6, 20);
      await tangkap(`kode-${p.ke}`);
      await tahan(p.ke === 1 ? 4 : 1.4);
      // gerbang AI: hanya bila gerbang kode lolos (tombolnya ada)
      if ((await page.$('[id^="uji-ai-"]')) !== null) {
        await keElemen('[data-gerbang="ai"]', 0.6, 20);
        await tahan(0.5);
        await klik('[id^="uji-ai-"]');
        tandai(`Uji ulang gerbang AI sesudah suntingan ke-${p.ke}: hasil uji ulang sungguhan tersimpan diputar (penanda Rekaman uji ulang), tanpa panggilan baru`);
        await page.waitForFunction(() => document.documentElement.dataset.uji === 'berjalan');
        let ujiLama = 0;
        for (let i = 0; i < 60 * FPS; i++) {
          const n = await page.evaluate(() => Number(document.documentElement.dataset.nomorUji || 0));
          if (n !== ujiLama) {
            const judul = await page.evaluate((no) => { const li = document.querySelector(`#uji-daftar li[data-no="${no}"] .judul-tahap`); return li ? li.textContent : ''; }, n);
            tandai(`Uji ulang peristiwa ${n}: ${judul.slice(0, 140)}`);
            ujiLama = n;
          }
          if (await page.evaluate(() => document.documentElement.dataset.uji === 'selesai')) break;
          await potret();
        }
        await tungguTenang();
        await keElemen('[data-gerbang="ai"]', 0.8, 20);
        const ringkasAi = await page.evaluate(() => (document.querySelector('[data-gerbang="ai"]') || {}).innerText || '');
        tandai(`Hasil gerbang AI sesudah suntingan ke-${p.ke}`, ringkasAi.slice(0, 700));
        await tangkap(`ai-${p.ke}`);
        await tahan(p.ke === 2 ? 4 : 3);
      } else if ((await page.$('#ai-belum')) !== null) {
        const belum = await page.evaluate(() => (document.getElementById('ai-belum') || {}).textContent || '');
        tandai('Gerbang AI tidak diuji ulang', belum);
        await keElemen('[data-gerbang="ai"]', 0.8, 20);
        await tahan(3);
      }
    }
    // putusan penyetuju
    await keElemen('#status-omongan-demo', 0.8, 16);
    await tahan(1.2);
    const boleh = await page.evaluate(() => document.documentElement.dataset.demoBoleh === '1');
    if (boleh) {
      await keElemen('#baris-setujui', 1, 360);
      await tahan(1);
      await klik('#setujui-demo');
      await tungguTenang();
      tandai(`Disetujui (demo): ditulis eval/penyusun/${d.id}/persetujuan-demo.json — bukan cases/`);
    } else {
      const alasan = await page.evaluate(() => (document.getElementById('alasan-belum') || {}).textContent || '');
      tandai('Masih ditolak: tombol Setujui tidak aktif', alasan);
      await keElemen('#baris-setujui', 1, 300);
      await tangkap('masih-ditolak');
      await tahan(2);
      await klik('#tolak-demo');
      await tungguTenang();
      tandai(`Penyetuju menolak dengan alasan; putusan ditulis ke eval/penyusun/${d.id}/persetujuan-demo.json — bukan cases/`);
    }
    await keElemen('#putusan-demo', 1, 16);
    await tangkap('putusan');
    tandai('Ringkasan alur: jalan agen nyata (biaya asli, tidak terbit), penyetuju diperankan agen Claude, biaya uji ulang & total, putusan, batas gerbang');
    await tahan(8);
    for (const m of await periksaKejujuran(page, d)) masalah.add(`akhir: ${m}`);
    tandai('Selesai');
    if (ff !== null) {
      ff.stdin.end();
      await selesaiFf;
    }
    await konteks.close();
    return { berkasVideo, bingkai, dipotret, detik: bingkai / FPS, potong: { input: [0, detikSetuju + 1], agen: [detikSetuju - 0.5, detikPenyetuju], penyetuju: [detikPenyetuju, bingkai / FPS] }, detikAgenSelesai, waktu, masalah: [...masalah], galat, pid, logServer: logServer() };
  } finally {
    await browser.close().catch(() => undefined);
    await serverBrowser.close().catch(() => undefined);
    anak.kill();
    console.log(`dihentikan: server PID ${pid.server}, Chromium PID ${pid.chromium}${pid.ffmpeg ? `, ffmpeg PID ${pid.ffmpeg} (sudah keluar)` : ''}`);
  }
}

/** Pemeriksaan kejujuran tiap detik video: penanda yang wajib ada di tiap fase. */
async function periksaKejujuran(page, d) {
  const t = await page.evaluate(() => {
    const r = document.getElementById('rekaman');
    const k = r ? r.getBoundingClientRect() : null;
    return {
      fase: document.documentElement.dataset.fase,
      uji: document.documentElement.dataset.uji || '',
      teks: document.body.innerText,
      bar: r && !r.hidden && k && k.bottom > 0 && k.top < window.innerHeight ? r.innerText : null,
      jenis: r ? r.dataset.jenis : null,
      transisi: Boolean(document.getElementById('transisi-demo')),
    };
  });
  const m = [];
  if (t.bar === null) m.push('penanda Langsung/Rekaman tidak terlihat');
  if (t.fase === 'agen') {
    if (t.jenis !== 'rekaman' || !t.bar.includes(`Rekaman jalan ${d.id}`)) m.push('tahap agen tanpa penanda "Rekaman jalan …"');
    if (!t.transisi || !t.teks.includes(`Bagian agen diputar dari jalan nyata ${d.id}`)) m.push('kalimat transisi tidak ada');
  }
  if (t.fase === 'input' && t.jenis !== 'langsung') m.push('tahap 1–4 tanpa penanda Langsung');
  if (t.fase === 'hasil' && t.jenis !== 'rekaman') m.push('hasil & catatan dari log tampil tanpa penanda Rekaman');
  if (t.fase === 'penyetuju' && t.jenis === 'langsung' && t.uji === 'berjalan') m.push('uji ulang tersimpan diputar di bawah penanda Langsung');
  if (t.uji === 'berjalan' && t.jenis !== 'rekaman' && !t.teks.includes('Uji ulang sungguhan sekarang')) m.push('uji ulang tersimpan diputar tanpa penanda Rekaman');
  if (/ditulis\s+(oleh\s+)?manusia/i.test(t.teks)) m.push('ada "ditulis manusia"');
  if (/tanpa kartu pun (?:opus )?memilih kunci 4\/4/i.test(t.teks)) m.push('frasa audit lama "tanpa kartu pun memilih kunci 4/4"');
  if (/✓ draf terbit|DRAF TERBIT/.test(t.teks)) m.push('jalan tidak terbit tampil "draf terbit"');
  return m;
}

function jalankan(perintah, argumen) {
  return new Promise((s, g) => {
    const p = spawn(perintah, argumen, { stdio: ['ignore', 'pipe', 'inherit'] });
    let keluar = '';
    p.stdout.on('data', (b) => { keluar += b.toString('utf8'); });
    p.on('exit', (k) => (k === 0 ? s(keluar) : g(new Error(`${perintah} keluar ${k}`))));
  });
}

async function probe(berkas) {
  const t = await jalankan('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,nb_frames', '-of', 'json', berkas]);
  writeFileSync(berkas.replace(/\.mp4$/, '.ffprobe.json'), t, 'utf8');
  return JSON.parse(t);
}

async function kontak(berkas) {
  const nama = basename(berkas, '.mp4');
  const folder = join(resolve(berkas, '..'), `kontak-${nama}`);
  mkdirSync(folder, { recursive: true });
  const font = 'C\\:/Windows/Fonts/consola.ttf';
  const tulisan = existsSync('C:/Windows/Fonts/consola.ttf') ? `,drawtext=fontfile='${font}':text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=4` : '';
  await jalankan('ffmpeg', ['-v', 'error', '-y', '-i', berkas, '-vf', `select='not(mod(n\\,60))',scale=480:270${tulisan},tile=4x4:padding=6:margin=6:color=0x202020`, '-fps_mode', 'passthrough', join(folder, 'lembar-%02d.png')]);
  return folder;
}

async function potong(berkas, nama, [dari, sampai]) {
  const keluar = join(resolve(berkas, '..'), `penyusun-${nama}.mp4`);
  await jalankan('ffmpeg', ['-v', 'error', '-y', '-ss', dari.toFixed(3), '-to', sampai.toFixed(3), '-i', berkas, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', keluar]);
  return keluar;
}

async function utama() {
  const a = urai(process.argv.slice(2));
  const h = await rekam(a);
  const jalurWaktu = join(a.keluaran, `${a.nama}-waktu.json`);
  writeFileSync(jalurWaktu, `${JSON.stringify({
    keterangan: 'Transkrip kejadian di layar per detik (M2d-14 D-4) untuk penulis naskah narasi. Detik = waktu video. Bagian agen = log jalan nyata yang diputar (dipercepat); bagian lain hidup di rekaman ini.',
    video: basename(h.berkasVideo), fps: FPS, durasi_detik: h.detik, potongan_detik: h.potong, kejadian: h.waktu,
  }, null, 2)}\n`, 'utf8');
  console.log(`transkrip: ${jalurWaktu}`);
  console.log(`  kejujuran: ${h.masalah.length === 0 ? 'bersih' : h.masalah.join(' | ')}`);
  console.log(`  galat halaman: ${h.galat.length === 0 ? 'tidak ada' : h.galat.join(' | ')}`);
  if (a.tangkap) return;
  const p = await probe(h.berkasVideo);
  const s = p.streams?.[0] ?? {};
  console.log(`video: ${h.berkasVideo}`);
  console.log(`  ${h.detik.toFixed(2)} d (${h.bingkai} bingkai @ ${FPS} fps; ${h.dipotret} potret unik)`);
  console.log(`  ffprobe: ${s.codec_name} ${s.profile} ${s.pix_fmt} ${s.width}×${s.height} r=${s.r_frame_rate} avg=${s.avg_frame_rate} durasi ${p.format?.duration} d`);
  console.log(`  lembar kontak: ${await kontak(h.berkasVideo)}`);
  for (const [nama, rentang] of Object.entries(h.potong)) {
    const b = await potong(h.berkasVideo, `${a.nama}-${nama}`, rentang);
    const q = await probe(b);
    console.log(`  potongan ${nama}: ${b} (${q.format?.duration} d)`);
  }
  if (h.masalah.length > 0 || h.galat.length > 0) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  utama().catch((e) => {
    console.error(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exitCode = 1;
  });
}
