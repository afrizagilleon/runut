/** Prompt agen penulis (M2d-18): `prompt-agen.md` + dua isian. Tanpa aturan tambahan dari kode. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { UKURAN_SIMULASI } from '../bebas/bank.ts';
import { teksTeladanV3 } from '../bebas/prompt-v3.ts';

const JALUR = fileURLToPath(new URL('./prompt-agen.md', import.meta.url));

export function instruksiAgen(target: number = UKURAN_SIMULASI): string {
  const isi: Record<string, string> = { TARGET: String(target), TELADAN: teksTeladanV3() };
  return readFileSync(JALUR, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\{([A-Z_]+)\}/g, (utuh, nama: string) => {
      const v = isi[nama];
      if (v === undefined) throw new Error(`prompt agen: isian ${utuh} tidak dikenal`);
      return v;
    })
    .trimEnd();
}
