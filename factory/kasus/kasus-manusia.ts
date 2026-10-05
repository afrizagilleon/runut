/**
 * Berkas kasus yang soalnya tulisan manusia — yang dibaca gerbang lingkar LLM.
 *
 * Batas G-panjang, ambang G-mirip dan G-kembar, pembanding laporan gaya, dan
 * anti-bocor semuanya didefinisikan atas "soal manusia" / "soal tayang" di
 * `cases/*.json`. Begitu soal tulisan agent ikut masuk `cases/`, membaca
 * seluruh folder berarti keluaran agent ikut menyetel gerbang yang menilai
 * agent, dan anti-bocor melarang agent memakai nama pemeran tetapnya sendiri
 * (Bayu, Dimas, Rara) serta kalimat yang ia tulis sendiri. Kelima pembaca itu
 * karena itu membaca fungsi di bawah: himpunannya tetap DADA dan ULTJ, sama
 * seperti sebelum kasus agent pertama ada, jadi tidak ada ambang yang bergeser.
 */
import { readdirSync } from 'node:fs';
import { kasusDariAgen } from './asal-agen.ts';

/** Nama berkas `*.json` di `folder` yang soalnya tulisan manusia, terurut. */
export function berkasKasusManusia(folder: string): string[] {
  return readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !kasusDariAgen(f.replace(/\.json$/, '')))
    .sort();
}
