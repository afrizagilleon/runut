/**
 * Membangun satu bundel produksi untuk rangkaian e2e (M3.3 D-3).
 *
 * Dijalankan sebagai perintah, bukan dari `globalSetup`: Playwright menyalakan
 * `webServer` **sebelum** `globalSetup`, dan `vite preview` menolak berjalan
 * kalau direktori hasil buildnya belum ada. Jadi build harus menjadi bagian dari
 * perintah servernya sendiri.
 *
 *   node e2e/bantu/bangun.ts dengan   -> .cache/e2e/dist-dengan  (VITE_KOLEKTOR_URL=/e)
 *   node e2e/bantu/bangun.ts tanpa    -> .cache/e2e/dist-tanpa   (tanpa variabel itu)
 *
 * Nilai `/e` diset **di dalam Node**, bukan di baris perintah: Git Bash mengubah
 * `/e` menjadi `E:/`, dan bundel yang memuat `E:/` akan mengirim peristiwa ke
 * tempat yang tidak ada. E-08 memeriksa isi bundelnya, bukan niat berkas ini.
 */
import { build } from 'vite';
import { AKAR, DIR_DIST_DENGAN, DIR_DIST_TANPA } from './jalur.ts';

const NAMA_VARIABEL = 'VITE_KOLEKTOR_URL';

/** Alamat pengumpul yang ditanam ke bundel "dengan pengumpul". */
export const ALAMAT_PENGUMPUL = '/e';

export async function bangun(keluaran: string, alamatPengumpul: string | null): Promise<void> {
  if (alamatPengumpul === null) delete process.env[NAMA_VARIABEL];
  else process.env[NAMA_VARIABEL] = alamatPengumpul;
  await build({
    root: `${AKAR}web`,
    configFile: `${AKAR}vite.config.ts`,
    logLevel: 'warn',
    build: { outDir: keluaran, emptyOutDir: true },
  });
}

const ragam = process.argv[2] ?? '';
if (ragam !== 'dengan' && ragam !== 'tanpa') {
  console.error('pemakaian: node e2e/bantu/bangun.ts <dengan|tanpa>');
  process.exit(2);
}
await bangun(
  ragam === 'dengan' ? DIR_DIST_DENGAN : DIR_DIST_TANPA,
  ragam === 'dengan' ? ALAMAT_PENGUMPUL : null,
);
