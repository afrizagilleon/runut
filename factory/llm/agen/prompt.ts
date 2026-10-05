/** Prompt agen penulis (M2d-18): `prompt-agen.md` + dua isian. Tanpa aturan tambahan dari kode. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { UKURAN_SIMULASI } from '../bebas/bank.ts';
import { teksTeladanV3 } from '../bebas/prompt-v3.ts';
import { kontrakBentuk } from './bentuk.ts';

const JALUR = fileURLToPath(new URL('./prompt-agen.md', import.meta.url));

const BARIS_SULIT = '\nSimulasi ini bertingkat SULIT. Dua syarat tambahan, dua-duanya wajib: (1) bagi orang yang belum membaca kartu, kembaran harus terasa LEBIH masuk akal daripada kunci — penebak tanpa kartu memilih kunci paling banyak 3 dari 12 kali; (2) penguji yang lebih kuat tidak boleh menebak jawaban satu kali pun. Cari kartu yang isinya berlawanan dengan dugaan wajar (misalnya dua tanggal atau dua angka yang mudah tertukar), bukan angka sewenang-wenang yang tinggal dicocokkan. Bank yang kamu lihat hanya memuat omongan yang sudah bertingkat sulit.\n';

/** M2d-26: agen mulai dari kode saham — memilih hari dan meminta kartu faktanya sendiri. */
const ALAT_DATA = [
  '- `usulkan_hari`: hari-hari yang layak dibekukan untuk saham yang diminta penyusun, beserta peristiwanya dan jumlah kartu fakta yang lolos pemeriksaan. Gratis.',
  '- `periksa_saham`: menerima satu `tanggal` dari daftar itu. Data Sectors untuk hari itu diperiksa 33 aturan verifikasi; hanya fakta yang lolos menjadi kartu. Hasilnya memuat kartu-kartunya dan apa yang disingkirkan. Gratis. Hari boleh diganti selama belum ada draf yang diajukan.',
  '',
].join('\n');
const MULAI_BAWAAN = 'Mulailah dengan `lihat_fakta` dan `lihat_bank`.';
const MULAI_KODE = 'Mulailah dengan `usulkan_hari`. Pilih satu hari — utamakan hari yang kartunya datang dari beberapa jenis dokumen, karena tiga omongan butuh tiga kartu penentu berbeda — lalu panggil `periksa_saham` untuk hari itu dan `lihat_bank`.';

function isiPrompt(jalur: string, isi: Record<string, string>): string {
  return readFileSync(jalur, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\{([A-Z_]+)\}/g, (utuh, nama: string) => {
      const v = isi[nama];
      if (v === undefined) throw new Error(`prompt agen: isian ${utuh} tidak dikenal`);
      return v;
    })
    .trimEnd();
}

export function instruksiAgen(target: number = UKURAN_SIMULASI, maksDitolak: number = 5, tingkat: 'biasa' | 'sulit' = 'biasa', dariKode: boolean = false): string {
  return isiPrompt(JALUR, {
    TARGET: String(target), TELADAN: teksTeladanV3(), BENTUK: kontrakBentuk(), MAKS_DITOLAK: String(maksDitolak), TINGKAT: tingkat === 'sulit' ? BARIS_SULIT : '',
    ALAT_DATA: dariKode ? ALAT_DATA : '', MULAI: dariKode ? MULAI_KODE : MULAI_BAWAAN,
  });
}

/** Petunjuk tahap "lengkapi kasus" (M2d-29): agent menulis lampiran untuk tiga omongan yang sudah terkunci. */
export function instruksiLengkapi(maksDitolak: number, kartuKonsep: ReadonlyArray<{ kode: string; judul: string }>): string {
  return isiPrompt(fileURLToPath(new URL('./prompt-lengkapi.md', import.meta.url)), {
    MAKS_DITOLAK: String(maksDitolak),
    KARTU_KONSEP: kartuKonsep.map((k) => `${k.kode} (${k.judul})`).join(', '),
  });
}

/** Petunjuk langkah "tingkatkan" (M2d-26): menaikkan kesulitan simulasi yang sudah jadi, satu omongan demi satu omongan. */
export function instruksiTingkatkan(): string {
  return isiPrompt(fileURLToPath(new URL('./prompt-tingkatkan.md', import.meta.url)), { TELADAN: teksTeladanV3(), BENTUK: kontrakBentuk() });
}
