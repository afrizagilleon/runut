// Bukti wajib DoD: penilai harus bisa memberi nilai buruk.
// Menyuntikkan satu angka salah dan satu fakta bocor ke keluaran lengan C,
// menunjukkan skornya memburuk, lalu membuktikan berkas mentahnya tidak berubah
// (suntikan hanya di memori; sha256 sebelum dan sesudah dicetak).
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { KELUARAN } from './berkas.ts';
import { muatKunci } from './kunci.ts';
import { nilaiKeluaran } from './penilai.ts';
import type { KeluaranLengan } from './skema-keluaran.ts';

const jalur = join(KELUARAN, 'C-1.json');
const cadangan = join(KELUARAN, 'C-1.json.cadangan');
copyFileSync(jalur, cadangan);
const sha = (j: string): string => createHash('sha256').update(readFileSync(j)).digest('hex');
const shaAwal = sha(jalur);
console.log('sha256 C-1.json sebelum:', shaAwal);

const kunci = muatKunci();
const isi = JSON.parse(readFileSync(jalur, 'utf8')) as { keluaran: KeluaranLengan };
const sebelum = nilaiKeluaran(isi.keluaran, 'C', 1, 'C-1.json', kunci);
console.log(
  'SEBELUM suntik: angka_salah=%d bocor=%d konflik_tak=%d skor=%d',
  sebelum.angka_salah, sebelum.kebocoran, sebelum.konflik_tak_terdeteksi, sebelum.skor_total,
);

const rusak = JSON.parse(JSON.stringify(isi.keluaran)) as KeluaranLengan;
// 1) satu angka salah: harga penutupan pada T Rp155 -> Rp999
const hargaT = rusak.fakta_terlihat.find((f) => f.fact_id === 'harga-t');
if (!hargaT) throw new Error('fakta harga-t tidak ada di keluaran C-1');
console.log('angka disuntik pada fakta:', hargaT.fact_id, '| klaim asli:', hargaT.klaim);
hargaT.klaim = hargaT.klaim.replace(/155/g, '999');
hargaT.nilai = 999;
// 2) satu fakta bocor: fakta pembukaan dipindah ke bagian terlihat
const bocor = rusak.pembukaan.fakta_sesudah_t.shift();
if (!bocor) throw new Error('tidak ada fakta pembukaan di keluaran C-1');
console.log('fakta dipindah ke bagian terlihat:', bocor.fact_id, '|', bocor.klaim.slice(0, 90));
rusak.fakta_terlihat.push(bocor);

const sesudah = nilaiKeluaran(rusak, 'C', 1, 'C-1.json', kunci);
console.log(
  'SESUDAH suntik: angka_salah=%d bocor=%d konflik_tak=%d skor=%d',
  sesudah.angka_salah, sesudah.kebocoran, sesudah.konflik_tak_terdeteksi, sesudah.skor_total,
);
console.log('pelanggaran baru:');
for (const p of sesudah.pelanggaran) {
  if (!sebelum.pelanggaran.some((q) => q.keterangan === p.keterangan)) console.log('  [' + p.jenis + ']', p.keterangan);
}
console.log('skor memburuk:', sesudah.skor_total > sebelum.skor_total);

// Keluaran mentah TIDAK pernah diubah di disk; suntikan hanya di memori.
writeFileSync(jalur, readFileSync(cadangan));
console.log('sha256 C-1.json sesudah:', sha(jalur), '| sama:', sha(jalur) === shaAwal);
