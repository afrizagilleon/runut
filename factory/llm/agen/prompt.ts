/** Prompt agen penulis (M2d-18): `prompt-agen.md` + dua isian. Tanpa aturan tambahan dari kode. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { UKURAN_SIMULASI } from '../bebas/bank.ts';
import { teksTeladanV3 } from '../bebas/prompt-v3.ts';
import { kontrakBentuk } from './bentuk.ts';

const JALUR = fileURLToPath(new URL('./prompt-agen.md', import.meta.url));

const BARIS_SULIT = '\nSimulasi ini bertingkat SULIT. Dua syarat tambahan, dua-duanya wajib: (1) bagi orang yang belum membaca kartu, kembaran harus terasa LEBIH masuk akal daripada kunci — penebak tanpa kartu memilih kunci paling banyak 3 dari 12 kali; (2) penguji yang lebih kuat tidak boleh menebak jawaban satu kali pun. Cari kartu yang isinya berlawanan dengan dugaan wajar (misalnya dua tanggal atau dua angka yang mudah tertukar), bukan angka sewenang-wenang yang tinggal dicocokkan. Bank yang kamu lihat hanya memuat omongan yang sudah bertingkat sulit.\n';

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
