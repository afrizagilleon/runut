import { appendFileSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { DIR_GAGAL } from './jalur.ts';

/**
 * Menyimpan artefak tiap kegagalan ke tempat yang **tidak dihapus** (D-C1).
 *
 * Kenapa ini ada: kegagalan reviewer dua kali berturut-turut tidak bisa
 * didiagnosis karena artefaknya sudah lenyap sebelum sempat dibaca. Playwright
 * mengosongkan `outputDir` di awal **setiap** putaran, jadi trace dan
 * `error-context.md` dari putaran ke-3 hilang begitu putaran ke-4 mulai — dan
 * `e2e:beban` menjalankan lima belas putaran berturut-turut.
 *
 * Yang disalin ke `.cache/e2e/gagal/<stempel>-<tes>/`: pesan galat lengkap,
 * seluruh lampiran (trace, `error-context.md`, tangkapan layar), dan satu
 * `ringkas.txt` yang bisa dibaca tanpa membuka Playwright sama sekali.
 *
 * Kegagalan yang **diharapkan** (`test.fail()`) tidak ikut disimpan: ia bukan
 * kegagalan, dan menyimpannya akan menenggelamkan yang sungguhan.
 */

/**
 * Buang urutan warna ANSI.
 *
 * Pesan galat Playwright berwarna, dan warnanya ikut tersalin ke berkas.
 * Konsol Windows ber-cp1252 juga bisa tersedak karenanya - dan berkas
 * diagnosis yang sulit dibaca adalah berkas yang tidak dibaca.
 */
const ESC = String.fromCharCode(27);
const POLA_WARNA = new RegExp(ESC + '\\[[0-9;]*m', 'g');

function tanpaWarna(teks: string): string {
  return teks.replace(POLA_WARNA, String());
}

/** Nama direktori yang aman di Windows maupun POSIX. */
function amankan(teks: string): string {
  return teks
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

function stempel(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default class PelaporGagal implements Reporter {
  private jumlah = 0;

  onBegin(): void {
    mkdirSync(DIR_GAGAL, { recursive: true });
  }

  onTestEnd(tes: TestCase, hasil: TestResult): void {
    // `expected` = lulus; `skipped` = dilewati; keduanya bukan kegagalan.
    // Kegagalan yang diharapkan (`test.fail()`) berstatus 'expected' juga.
    if (tes.outcome() !== 'unexpected' && tes.outcome() !== 'flaky') return;
    if (hasil.status === 'passed' || hasil.status === 'skipped') return;

    this.jumlah += 1;
    const dir = join(
      DIR_GAGAL,
      `${stempel()}-${amankan(tes.parent.project()?.name ?? 'tanpa-proyek')}-${amankan(tes.title)}`,
    );
    mkdirSync(dir, { recursive: true });

    const baris: string[] = [
      `tes      : ${tes.title}`,
      `proyek   : ${tes.parent.project()?.name ?? '(tidak diketahui)'}`,
      `berkas   : ${tes.location.file}:${String(tes.location.line)}`,
      `status   : ${hasil.status}`,
      `percobaan: ${String(hasil.retry)}`,
      `lama     : ${String(hasil.duration)} ms`,
      `waktu    : ${new Date().toISOString()}`,
      '',
      '--- galat ---',
      tanpaWarna(hasil.error?.message ?? '(tanpa pesan)'),
      '',
      '--- tumpukan ---',
      tanpaWarna(hasil.error?.stack ?? '(tanpa tumpukan)'),
      '',
      '--- keluaran stdout tes ---',
      tanpaWarna(hasil.stdout.map((b) => (typeof b === 'string' ? b : b.toString('utf8'))).join('')),
    ];

    const lampiran: string[] = [];
    for (const l of hasil.attachments) {
      if (l.path === undefined) continue;
      try {
        const tujuan = join(dir, `${amankan(l.name)}-${basename(l.path)}`);
        copyFileSync(l.path, tujuan);
        lampiran.push(`${l.name} -> ${basename(tujuan)}`);
      } catch (galat) {
        lampiran.push(`${l.name} -> GAGAL DISALIN: ${String(galat)}`);
      }
    }
    baris.push('', '--- lampiran ---', ...(lampiran.length === 0 ? ['(tidak ada)'] : lampiran));

    writeFileSync(join(dir, 'ringkas.txt'), baris.join('\n'), 'utf8');

    /*
     * Satu berkas yang tumbuh lintas putaran. `e2e:beban` menjalankan lima belas
     * putaran, masing-masing proses Playwright sendiri; tanpa catatan bersama
     * ini, "putaran mana yang gagal dan kenapa" harus dirakit ulang dari lima
     * belas keluaran terminal.
     */
    appendFileSync(
      join(DIR_GAGAL, 'catatan.log'),
      `${new Date().toISOString()}\t${tes.parent.project()?.name ?? '-'}\t${tes.title}\t` +
        `${basename(tes.location.file)}:${String(tes.location.line)}\t` +
        `${tanpaWarna((hasil.error?.message ?? '').split('\n')[0] ?? '')}\t${basename(dir)}\n`,
      'utf8',
    );
  }

  onEnd(hasil: FullResult): void {
    if (this.jumlah > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `\n${String(this.jumlah)} kegagalan disimpan di ${DIR_GAGAL} ` +
          `(status akhir: ${hasil.status})`,
      );
    }
  }
}
