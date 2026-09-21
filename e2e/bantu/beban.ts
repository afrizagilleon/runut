/**
 * `npm run e2e:beban` — menjalankan rangkaian e2e berulang **di bawah beban CPU
 * buatan**, dan mencatat tiap putaran (D-C2).
 *
 * Kenapa ini ada: rangkaian ini hijau puluhan putaran di tangan eksekutor dan
 * gagal 2 dari 5 di tangan reviewer, pada mesin yang sama. Bedanya keadaan —
 * reviewer menjalankan agent lain, server dev pemilik hidup, laptop. "Tidak
 * terulang di mesin saya" bukan jawaban; yang bisa dijawab adalah "tidak
 * terulang di bawah beban yang sengaja dibuat lebih berat".
 *
 * Nol dependensi baru: hanya `node:child_process`, `node:os`, `node:fs`.
 *
 *   node e2e/bantu/beban.ts [--putaran 15] [--pembakar N] [--workers N] [--grep pola]
 *
 * Pembakar CPU bawaan: `jumlah inti - 1`, menyisakan satu inti supaya mesinnya
 * tidak benar-benar berhenti. Mereka **selalu** dimatikan di akhir, termasuk
 * ketika ditekan Ctrl+C: proses pembakar yatim akan membuat mesin ini panas
 * sampai dipadamkan tangan.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { AKAR, CACHE, DIR_GAGAL } from './jalur.ts';

interface Pilihan {
  putaran: number;
  pembakar: number;
  workers: number | null;
  grep: string | null;
}

function bacaPilihan(argumen: string[]): Pilihan {
  const nilai = (nama: string): string | null => {
    const i = argumen.indexOf(`--${nama}`);
    if (i >= 0) return argumen[i + 1] ?? null;
    const satu = argumen.find((a) => a.startsWith(`--${nama}=`));
    return satu === undefined ? null : satu.slice(nama.length + 3);
  };
  const angka = (nama: string, bawaan: number): number => {
    const n = Number(nilai(nama));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : bawaan;
  };
  return {
    putaran: angka('putaran', 15),
    // Satu inti disisakan: mesin yang benar-benar berhenti tidak mengukur apa pun.
    pembakar: angka('pembakar', Math.max(1, cpus().length - 1)),
    workers: nilai('workers') === null ? null : angka('workers', 1),
    grep: nilai('grep'),
  };
}

/**
 * Satu proses pembakar CPU.
 *
 * Bekerja dalam potongan ~40 ms lalu menyerah ke gelung peristiwa sebentar.
 * Gelung yang benar-benar tak pernah menyerah tidak bisa menerima sinyal dan
 * harus dibunuh paksa; yang menyerah sebentar tetap menghabiskan hampir seluruh
 * inti, dan bisa berhenti sendiri saat diminta.
 */
const KODE_PEMBAKAR = `
let jalan = true;
process.on('SIGTERM', () => { jalan = false; });
process.on('SIGINT', () => { jalan = false; });
function bakar() {
  if (!jalan) { process.exit(0); return; }
  const sampai = Date.now() + 40;
  let x = 0;
  while (Date.now() < sampai) { x += Math.sqrt(Math.random() * 1e6); }
  if (x < 0) console.log(x);
  setImmediate(bakar);
}
bakar();
`;

function nyalakanPembakar(berapa: number): ChildProcess[] {
  const anak: ChildProcess[] = [];
  for (let n = 0; n < berapa; n += 1) {
    anak.push(spawn(process.execPath, ['-e', KODE_PEMBAKAR], { stdio: 'ignore' }));
  }
  return anak;
}

function padamkanPembakar(anak: ChildProcess[]): void {
  for (const a of anak) {
    try {
      a.kill('SIGTERM');
      // Windows tidak menjalankan penangan sinyal di proses yang sibuk; SIGKILL
      // memakai TerminateProcess dan selalu berhasil.
      if (a.exitCode === null) a.kill('SIGKILL');
    } catch {
      /* sudah mati */
    }
  }
}

interface HasilPutaran {
  nomor: number;
  lulus: number;
  gagal: number;
  kodeKeluar: number;
  detik: number;
  tesGagal: string[];
  /**
   * Alasan putaran ini tidak menjalankan satu tes pun — rangkaian gagal
   * **dimuat**, bukan gagal diuji.
   *
   * Ini ditambahkan sesudah kejadian sungguhan: berkas tes menyebut modul yang
   * belum ada, dan empat belas putaran melaporkan `lulus=0 gagal=0` selama 14
   * detik. Di tabel itu terbaca persis seperti kegagalan diam-diam, padahal
   * penyebabnya ada di baris pertama keluaran yang tidak pernah ikut tercatat.
   * Pemburu goyah yang tidak bisa membedakan "rangkaian tidak jalan" dari
   * "tes gagal" akan membuang waktu di jejak yang salah.
   */
  gagalMuat: string | null;
}

/** Beberapa baris terakhir yang berarti dari keluaran — untuk putaran nol tes. */
function ekorKeluaran(teks: string, berapa: number): string {
  return teks
    .split('\n')
    .map((b) => b.trimEnd())
    .filter((b) => b.trim() !== '')
    .slice(-berapa)
    .join(' ⏎ ');
}

/** Baris baru di `catatan.log` sejak panjang tertentu — nama tes yang gagal. */
function tesGagalBaru(panjangSebelum: number): { teks: string; tes: string[] } {
  const berkas = join(DIR_GAGAL, 'catatan.log');
  if (!existsSync(berkas)) return { teks: '', tes: [] };
  const teks = readFileSync(berkas, 'utf8');
  const baru = teks.slice(panjangSebelum);
  const tes = baru
    .split('\n')
    .filter((b) => b.trim() !== '')
    .map((b) => {
      const bagian = b.split('\t');
      return `${bagian[3] ?? '?'} ${bagian[2] ?? '?'} [${bagian[1] ?? '?'}]`;
    });
  return { teks, tes };
}

function panjangCatatan(): number {
  const berkas = join(DIR_GAGAL, 'catatan.log');
  return existsSync(berkas) ? readFileSync(berkas, 'utf8').length : 0;
}

async function satuPutaran(nomor: number, pilihan: Pilihan): Promise<HasilPutaran> {
  const sebelum = panjangCatatan();
  const argumen = [join(AKAR, 'node_modules/@playwright/test/cli.js'), 'test'];
  if (pilihan.workers !== null) argumen.push(`--workers=${String(pilihan.workers)}`);
  if (pilihan.grep !== null) argumen.push('--grep', pilihan.grep);

  const mulai = Date.now();
  const keluaran = await new Promise<{ teks: string; kode: number }>((selesai) => {
    const anak = spawn(process.execPath, argumen, { cwd: AKAR, stdio: ['ignore', 'pipe', 'pipe'] });
    let teks = '';
    anak.stdout.on('data', (potongan: Buffer) => (teks += potongan.toString('utf8')));
    anak.stderr.on('data', (potongan: Buffer) => (teks += potongan.toString('utf8')));
    anak.on('close', (kode) => {
      selesai({ teks, kode: kode ?? -1 });
    });
  });
  const detik = Math.round((Date.now() - mulai) / 100) / 10;

  const lulus = Number(/(\d+) passed/.exec(keluaran.teks)?.[1] ?? '0');
  const gagal = Number(/(\d+) failed/.exec(keluaran.teks)?.[1] ?? '0');
  const { tes } = tesGagalBaru(sebelum);

  // Nol tes lulus DAN nol tes gagal, tetapi keluar bukan nol: Playwright tidak
  // pernah sampai menjalankan apa pun. Keluarannya disimpan supaya penyebabnya
  // (berkas tes tidak bisa dimuat, port terpakai, build gagal) terbaca di tabel.
  const gagalMuat =
    lulus + gagal === 0 && keluaran.kode !== 0 ? ekorKeluaran(keluaran.teks, 3) : null;

  return { nomor, lulus, gagal, kodeKeluar: keluaran.kode, detik, tesGagal: tes, gagalMuat };
}

function tabel(hasil: HasilPutaran[], judul: string): string {
  const baris = [
    `### ${judul}`,
    '',
    '| putaran | lulus | gagal | keluar | detik | tes yang gagal |',
    '|---|---|---|---|---|---|',
  ];
  for (const h of hasil) {
    const sebab =
      h.gagalMuat !== null
        ? `**RANGKAIAN TIDAK JALAN** — ${h.gagalMuat.replace(/\|/g, '\\|')}`
        : h.tesGagal.length === 0
          ? '—'
          : h.tesGagal.join(' · ').replace(/\|/g, '\\|');
    baris.push(
      `| ${String(h.nomor)} | ${String(h.lulus)} | ${String(h.gagal)} | ${String(h.kodeKeluar)} | ` +
        `${h.detik.toFixed(1)} | ${sebab} |`,
    );
  }
  const hijau = hasil.filter((h) => h.kodeKeluar === 0).length;
  const takJalan = hasil.filter((h) => h.gagalMuat !== null).length;
  const detik = hasil.map((h) => h.detik);
  baris.push(
    '',
    `**${String(hijau)}/${String(hasil.length)} hijau.** ` +
      `Lama: min ${Math.min(...detik).toFixed(1)} s · ` +
      `maks ${Math.max(...detik).toFixed(1)} s · ` +
      `rerata ${(detik.reduce((a, b) => a + b, 0) / detik.length).toFixed(1)} s`,
  );
  if (takJalan > 0) {
    baris.push(
      '',
      `⚠ ${String(takJalan)} putaran **tidak menjalankan satu tes pun** — rangkaiannya ` +
        'gagal dimuat, bukan gagal diuji. Putaran itu tidak mengukur kegoyahan apa pun ' +
        'dan tidak boleh dihitung sebagai bukti.',
    );
  }
  return baris.join('\n');
}

async function utama(argumen: string[]): Promise<number> {
  const pilihan = bacaPilihan(argumen);
  mkdirSync(DIR_GAGAL, { recursive: true });
  const berkasHasil = join(CACHE, 'beban.md');

  const judul =
    `${String(pilihan.putaran)} putaran` +
    (pilihan.workers === null ? '' : `, --workers=${String(pilihan.workers)}`) +
    `, ${String(pilihan.pembakar)} pembakar CPU dari ${String(cpus().length)} inti`;

  console.log(`e2e:beban — ${judul}`);
  console.log(`hasil ditulis bertahap ke ${berkasHasil}`);
  writeFileSync(berkasHasil, `# e2e:beban — ${judul}\n\n`, 'utf8');

  const pembakar = nyalakanPembakar(pilihan.pembakar);
  const bereskan = (): void => {
    padamkanPembakar(pembakar);
  };
  process.on('exit', bereskan);
  process.on('SIGINT', () => {
    bereskan();
    process.exit(130);
  });

  const hasil: HasilPutaran[] = [];
  try {
    for (let n = 1; n <= pilihan.putaran; n += 1) {
      const satu = await satuPutaran(n, pilihan);
      hasil.push(satu);
      const ringkas =
        `putaran ${String(n)}/${String(pilihan.putaran)}: ` +
        `${satu.kodeKeluar === 0 ? 'HIJAU' : 'MERAH'} ` +
        `lulus=${String(satu.lulus)} gagal=${String(satu.gagal)} ${satu.detik.toFixed(1)}s` +
        (satu.gagalMuat !== null
          ? ` — RANGKAIAN TIDAK JALAN: ${satu.gagalMuat}`
          : satu.tesGagal.length === 0
            ? ''
            : ` — ${satu.tesGagal.join(' · ')}`);
      console.log(ringkas);
      appendFileSync(berkasHasil, `${ringkas}\n`, 'utf8');
    }
  } finally {
    bereskan();
  }

  const teksTabel = tabel(hasil, judul);
  appendFileSync(berkasHasil, `\n${teksTabel}\n`, 'utf8');
  console.log(`\n${teksTabel}`);
  return hasil.every((h) => h.kodeKeluar === 0) ? 0 : 1;
}

process.exitCode = await utama(process.argv.slice(2));
