// Pembaca kunci jawaban beku. HANYA penilai yang boleh mengimpor berkas ini.
//
// Kunci ada di .cache/kunci/folk-2025-10-07.md, di luar repo. Isinya DIBACA
// saat penilaian, tidak pernah disalin ke dalam repo dan tidak pernah masuk ke
// prompt lengan mana pun. Itu sebabnya modul ini mengurai berkas kunci dan
// bukan menuliskan angkanya sebagai konstanta: menuliskannya berarti
// menerbitkan kunci kasus tersembunyi ke repo publik.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AKAR } from './berkas.ts';
import { angkaDalam, tanggalDalam } from './angka.ts';

export const JALUR_KUNCI = join(AKAR, '.cache', 'kunci', 'folk-2025-10-07.md');

export interface BarisKunci {
  id: string;
  deskripsi: string;
  nilai: string;
  /** Angka yang dianggap benar untuk baris ini: yang ditebalkan kalau ada. */
  angka: number[];
  /** Semua angka di baris, termasuk yang tidak ditebalkan. */
  angka_semua: number[];
  tanggal: string[];
}

export interface Kunci {
  baris: Map<string, BarisKunci>;
  /** Jumlah saham beredar dari bagian Identitas. */
  saham_beredar: number | null;
  teks: string;
}

export function adaKunci(): boolean {
  return existsSync(JALUR_KUNCI);
}

export function muatKunci(): Kunci {
  if (!adaKunci()) {
    throw new Error(
      `Kunci jawaban tidak ada di ${JALUR_KUNCI}. Penilaian tidak bisa dijalankan; ` +
        'kunci disediakan pemilik dan tidak boleh dibuat eksekutor (3.3).',
    );
  }
  const teks = readFileSync(JALUR_KUNCI, 'utf8');
  const baris = new Map<string, BarisKunci>();
  for (const b of teks.split(/\r?\n/)) {
    if (!b.startsWith('|')) continue;
    const sel = b.split('|').map((s) => s.trim());
    // sel[0] kosong karena baris diawali '|'
    const id = sel[1] ?? '';
    if (!/^[ABC]\d+$/.test(id)) continue;
    const deskripsi = sel[2] ?? '';
    const nilai = sel[3] ?? '';
    const ditebalkan = [...nilai.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1] ?? '').join(' ');
    baris.set(id, {
      id,
      deskripsi,
      nilai,
      angka: angkaDalam(ditebalkan.length > 0 ? ditebalkan : nilai),
      angka_semua: angkaDalam(`${deskripsi} ${nilai}`),
      tanggal: tanggalDalam(`${deskripsi} ${nilai}`),
    });
  }
  const beredar = /Saham beredar \*\*([\d.]+)\*\*/.exec(teks);
  return {
    baris,
    saham_beredar: beredar?.[1] ? angkaDalam(beredar[1])[0] ?? null : null,
    teks,
  };
}

export function ambilBaris(kunci: Kunci, id: string): BarisKunci {
  const b = kunci.baris.get(id);
  if (!b) throw new Error(`Kunci tidak memuat baris ${id}; rubrik dan kunci tidak sejalan.`);
  return b;
}
