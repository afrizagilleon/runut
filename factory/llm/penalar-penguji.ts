/**
 * `npm run penalar:penguji -- --jalan <n>` — bahan uji luar TIRT M2d-6
 * (kontrak D-7 = prosedur M2d-5 D-10): tebak buta K-05, jawab-dengan-kartu
 * (dengan pertanyaan penilaian M2d-5), kealamian buta. Dibangun dengan
 * `bangunBahanTirt` yang sama; hanya benih, label, dan pembanding berbeda:
 * kelompok kealamian TIRT = draf M2d-6, M2d-5, M2d-4; jangkar ULTJ tetap.
 *
 * Penguji dan penilai: subagent Claude opus BARU, masing-masing hanya
 * menerima isi satu berkas bahan; jawaban mentah di `penguji/jawaban/`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { FOLDER_M2D4 } from './gaya-susun.ts';
import { FOLDER_M2D6 } from './penalar-susun.ts';
import { bangunBahanTirt, type BahanPengujiM2d5, type OpsiBahanTirt } from './tirt-penguji.ts';
import { FOLDER_M2D5 } from './tirt-susun.ts';

export const FOLDER_PENGUJI_M2D6 = `${FOLDER_M2D6}/penguji`;
export const BENIH_M2D6 = 20261002;
export const OPSI_BAHAN_M2D6: OpsiBahanTirt = { benih: BENIH_M2D6, label: 'agen-m2d6', pembanding: [[FOLDER_M2D5, 'agen-m2d5'], [FOLDER_M2D4, 'agen-m2d4']] };

export function folderJalan(n: number): string {
  return `${FOLDER_M2D6}/jalan-${String(n)}`;
}

export function bangunBahanM2d6(jalan: number): BahanPengujiM2d5 & { jalan: number } {
  return { ...bangunBahanTirt(folderJalan(jalan), OPSI_BAHAN_M2D6), jalan };
}

function utama(argumen: string[]): number {
  const i = argumen.indexOf('--jalan');
  const jalan = i >= 0 ? Number(argumen[i + 1]) : NaN;
  if (!Number.isInteger(jalan) || !existsSync(`${folderJalan(jalan)}/tirt/riwayat.json`)) {
    console.error('Pakai: npm run penalar:penguji -- --jalan <n> (jalan yang sudah ada).');
    return 1;
  }
  const { tebak, kartu, alami, kunci } = bangunBahanM2d6(jalan);
  if (kunci.tebak.length === 0) {
    console.error('Tidak ada omongan TIRT M2d-6 yang dikunci; bahan tidak ditulis.');
    return 1;
  }
  mkdirSync(`${FOLDER_PENGUJI_M2D6}/jawaban`, { recursive: true });
  writeFileSync(`${FOLDER_PENGUJI_M2D6}/tebak.md`, tebak, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D6}/kartu.md`, kartu, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D6}/alami.md`, alami, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D6}/kunci.json`, JSON.stringify({ ...kunci, jalan }, null, 2) + '\n', 'utf8');
  console.log(`jalan ${String(jalan)} — tebak.md: ${String(kunci.tebak.length)} soal · kartu.md: ${String(kunci.kartu.length)} soal · alami.md: ${String(kunci.alami.length)} kelompok`);
  return 0;
}

if (/(^|[\\/])penalar-penguji\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama(process.argv.slice(2));
