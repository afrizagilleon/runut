/**
 * Slot soal pemanasan (M3.14 D-1): satu nama berkas yang tetap, bukan glob
 * folder — alasan yang sama dengan impor kasus yang eksplisit di `kasus.ts`.
 *
 * `import.meta.glob` dengan jalur harfiah dipakai karena impor biasa atas
 * berkas yang TIDAK ADA menggagalkan build, dan slot ini memang kosong sampai
 * soal pemanasan M2d-8 disetujui. Glob tanpa kecocokan = objek kosong =
 * `PEMANASAN` bernilai `null` = pemandu berjalan di soal pertama simulasi.
 *
 * Fixture uji di `web/src/pemanasan/uji/` tidak cocok dengan jalur ini, jadi
 * tidak pernah ikut ke bundel produksi (dijaga E-08m314 di
 * `e2e/jaringan-dengan.spec.ts`).
 */
import { bacaPemanasan, type Pemanasan } from './pemanasan.ts';

const slot = import.meta.glob<unknown>('./pemanasan/soal-pemanasan.json', {
  eager: true,
  import: 'default',
});

export const PEMANASAN: Pemanasan | null = bacaPemanasan(Object.values(slot)[0] ?? null);
