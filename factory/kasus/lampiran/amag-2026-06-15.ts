/**
 * Lampiran kasus Perusahaan A, Senin 15 Juni 2026 — SELURUHNYA TULISAN AI AGENT.
 *
 * Asalnya: percobaan tahap 2 "lengkapi kasus" `m2d29-amag-lengkapi-3`
 * (`npm run agen -- --lengkapi`, M2d-29). Di percobaan itu agent menulis judul,
 * urutan soal, judul pertanyaan, istilah, teks kartu, layar pembukaan, penutup,
 * dan pilihan kartu konsep; hasilnya lolos aturan kasus
 * (`periksa_kasus_dengan_aturan`) dan critic, lalu ditulis program ke
 * `eval/penyusun/m2d29-amag-lengkapi-3/lampiran-agen.json`.
 *
 * **Isinya tidak disunting — tidak satu huruf pun.** Berkas ini tidak menyalin
 * tulisan agent; ia MEMBACA berkas percobaan itu apa adanya dan menolak dimuat
 * bila sidik berkasnya bukan sidik yang dicatat di bawah. Jadi tidak ada salinan
 * kedua yang bisa bergeser dari aslinya, dan menyunting berkas percobaan
 * menggagalkan build, bukan mengubah kasus diam-diam. Bagian `sumber` dan
 * `emiten` di berkas itu dilengkapi program percobaan, bukan ditulis agent.
 *
 * Percobaan sebelumnya, `m2d29-amag-lengkapi-2`, sempat terpasang lalu digantikan:
 * lampirannya melanggar dua aturan tampilan yang ditambahkan sesudahnya (jam pesan
 * mundur dari soal ke soal; paragraf pembukaan terakhir dibuka fakta tanggal
 * simulasi). Berkasnya tetap ada di `eval/` dan dipakai `lengkapi.test.ts` sebagai
 * contoh lampiran yang DITOLAK aturan itu.
 *
 * Kasus yang dibangun dari lampiran ini harus byte-identik dengan
 * `kasus.json` di folder percobaan yang sama (dijaga `amag.test.ts`).
 *
 * Lampiran sebelumnya, tulisan tangan penyetuju, tidak dibuang: ia ada di
 * `amag-2026-06-15.penyetuju.ts` dan tidak lagi membangun kasus mana pun.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LampiranPenyetuju } from '../dari-agen.ts';

const AKAR = fileURLToPath(new URL('../../../', import.meta.url));

/** Folder percobaan asal lampiran ini, relatif terhadap akar repo. */
export const PERCOBAAN_LAMPIRAN_AMAG = 'eval/penyusun/m2d29-amag-lengkapi-3';

/** Berkas tulisan agent yang dibaca, relatif terhadap akar repo. */
export const BERKAS_LAMPIRAN_AMAG = `${PERCOBAAN_LAMPIRAN_AMAG}/lampiran-agen.json`;

/** sha256 berkas itu saat dipasang sebagai kasus tayang. */
export const SHA256_LAMPIRAN_AMAG = 'f1e2eaa56accfdb0971a10b872a154bca1ed02b120eeb667e290f7dc14ef420a';

function bacaLampiranAgen(): LampiranPenyetuju {
  const mentah = readFileSync(`${AKAR}${BERKAS_LAMPIRAN_AMAG}`);
  const sidik = createHash('sha256').update(mentah).digest('hex');
  if (sidik !== SHA256_LAMPIRAN_AMAG) {
    throw new Error(
      `Lampiran tulisan agent "${BERKAS_LAMPIRAN_AMAG}" bersidik ${sidik}, bukan ${SHA256_LAMPIRAN_AMAG}: ` +
        'berkas percobaan itu sudah berubah sejak dipasang. Tulisan agent tidak disunting; kembalikan berkasnya.',
    );
  }
  return JSON.parse(mentah.toString('utf8')) as LampiranPenyetuju;
}

export const LAMPIRAN_AMAG_2026_06_15: LampiranPenyetuju = bacaLampiranAgen();
