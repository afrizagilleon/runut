/** Prompt agen penulis (M2d-18): `prompt-agen.md` + dua isian. Tanpa aturan tambahan dari kode. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { UKURAN_SIMULASI } from '../bebas/bank.ts';
import { teksTeladanV3 } from '../bebas/prompt-v3.ts';
import { kontrakBentuk } from './bentuk.ts';

const JALUR = fileURLToPath(new URL('./prompt-agen.md', import.meta.url));

const BARIS_SULIT = '\nSimulasi ini bertingkat SULIT: penguji yang lebih kuat tidak boleh bisa menebak jawaban satu kali pun tanpa kartu. Hilangkan setiap petunjuk dari nada pesan dan dari susunan pilihan; omongan yang masih tertebak tidak masuk bank.\n';

export function instruksiAgen(target: number = UKURAN_SIMULASI, maksDitolak: number = 5, tingkat: 'biasa' | 'sulit' = 'biasa'): string {
  const isi: Record<string, string> = { TARGET: String(target), TELADAN: teksTeladanV3(), BENTUK: kontrakBentuk(), MAKS_DITOLAK: String(maksDitolak), TINGKAT: tingkat === 'sulit' ? BARIS_SULIT : '' };
  return readFileSync(JALUR, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\{([A-Z_]+)\}/g, (utuh, nama: string) => {
      const v = isi[nama];
      if (v === undefined) throw new Error(`prompt agen: isian ${utuh} tidak dikenal`);
      return v;
    })
    .trimEnd();
}
