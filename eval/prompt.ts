// D-8 — Prompt lengan A dan S identik kata per kata, kecuali satu blok aturan.
//
// Keduanya dibangun dari SATU teks di bawah ini. Satu-satunya perbedaan adalah
// `BLOK_ATURAN`, yang isinya docs/aturan-verifikasi.md apa adanya dan hanya
// disisipkan untuk lengan S. Itu sebabnya prompt dibangun oleh kode, bukan
// ditulis dua kali dengan tangan: menulis dua kali membuka pintu untuk membuat
// lengan A lemah tanpa terlihat.
//
// Berkas ini TIDAK BOLEH membaca .cache/kunci/. Lihat eval/pemisahan.test.ts.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AKAR } from './berkas.ts';
import { CONTOH_BENTUK } from './skema-keluaran.ts';

export type Lengan = 'A' | 'S' | 'C';

export const KASUS = {
  kode: 'FOLK',
  nama: 'PT Multi Garam Utama Tbk',
  kasus_id: 'folk-2025-10-07',
  tanggal_t: '2025-10-07',
} as const;

/** Isi docs/aturan-verifikasi.md apa adanya — blok yang hanya dimiliki lengan S. */
export function isiAturan(): string {
  return readFileSync(join(AKAR, 'docs', 'aturan-verifikasi.md'), 'utf8').trimEnd();
}

const BAGIAN_ATAS = `Kamu menyusun satu puzzle edukasi pasar modal Indonesia dari data nyata Bursa Efek Indonesia.

Emiten: ${KASUS.kode} (${KASUS.nama}).
Tanggal beku kasus, selanjutnya disebut T: ${KASUS.tanggal_t}.

Pemain membuka kasus ini seolah-olah hari ini adalah T. Ia melihat sekumpulan fakta, menjawab tiga soal, lalu membaca pembukaan yang menceritakan apa yang sebenarnya terjadi sesudah T.

Yang mengikat kamu:

1. Setiap fakta di "fakta_terlihat" HARUS sudah bisa diketahui publik pada atau sebelum T. Fakta yang baru terbit sesudah T hanya boleh muncul di "pembukaan.fakta_sesudah_t". Yang menentukan adalah tanggal fakta itu terbit ke publik, bukan tanggal peristiwanya.
2. Setiap angka harus punya sumber yang bisa ditelusuri: tulis endpoint API atau nama berkas di field "sumber". Jangan menulis angka yang tidak kamu ambil dari data.
3. Kalau kamu menemukan kejanggalan di datanya — angka yang tidak konsisten, harga yang tidak masuk akal, persentase yang tidak nyambung — catat di "temuan" beserta angkanya. Data resmi pun bisa salah.
4. Jangan menyarankan membeli, menjual, atau menahan saham, dan jangan menyebut target harga. Ini bahan belajar, bukan nasihat investasi.
5. Tulis semua kalimat dalam bahasa Indonesia.`;

const BAGIAN_BAWAH = `Kerjakan:

- Kumpulkan data ${KASUS.kode} yang kamu perlukan lewat alat yang tersedia.
- Susun 8 sampai 15 fakta terlihat yang cukup untuk memahami keadaan emiten pada T.
- Susun tepat tiga soal pilihan ganda. Jawaban tiap soal harus bisa diturunkan dari fakta terlihat.
- Susun pembukaan: beberapa paragraf tentang apa yang terjadi sesudah T, beserta fakta-fakta sesudah T yang mendukungnya.
- Isi "temuan" dengan kejanggalan data yang kamu temukan. Boleh kosong kalau memang tidak ada.

Keluarkan HANYA satu obyek JSON, tanpa kalimat pengantar dan tanpa penutup, dengan bentuk persis seperti ini:

${CONTOH_BENTUK}`;

const PENGANTAR_ATURAN = `Sebelum memakai sebuah angka, jalankan pemeriksaan berikut terhadapnya. Aturan ini diturunkan dari memverifikasi emiten lain dengan tangan; tidak satu pun diturunkan dari ${KASUS.kode}.`;

/**
 * Prompt lengan A (tanpa blok aturan) dan lengan S (dengan blok aturan).
 * Perbedaannya HANYA blok aturan; dibuktikan oleh eval/prompt.test.ts dan
 * oleh diff yang ditempel ke ledger.
 */
export function promptLengan(lengan: 'A' | 'S'): string {
  const blokAturan = lengan === 'S' ? `\n\n${PENGANTAR_ATURAN}\n\n${isiAturan()}\n` : '\n';
  return `${BAGIAN_ATAS}\n${blokAturan}\n${BAGIAN_BAWAH}\n`;
}

/**
 * Prompt lengan C. Lengan C TIDAK memakai prompt di atas: modelnya tidak
 * mengumpulkan data dan tidak memutuskan apa pun, ia hanya menulis kalimat
 * dari fakta yang sudah lolos verifikasi pipeline. Karena itu promptnya
 * memang berbeda, dan itu bagian dari perlakuan yang diukur (D-1).
 */
export function promptLenganC(bahan: string): string {
  return `Kamu menulis kalimat untuk satu puzzle edukasi pasar modal Indonesia.

Seluruh fakta di bawah ini SUDAH diverifikasi oleh pipeline dan sudah disaring sehingga hanya memuat hal yang bisa diketahui publik pada atau sebelum ${KASUS.tanggal_t}. Kamu tidak boleh menambah fakta, angka, atau tanggal apa pun yang tidak ada di bahan ini. Kalau sebuah angka tidak ada di bahan, jangan menyebutnya.

Yang mengikat kamu:

1. Pakai hanya angka yang ada di bahan. Jangan menghitung ulang, jangan membulatkan, jangan menambahkan konteks dari ingatanmu.
2. Salin field "sumber" setiap fakta apa adanya.
3. Fakta yang ditandai SESUDAH-T hanya boleh dipakai di bagian pembukaan.
4. Jangan menyarankan membeli, menjual, atau menahan saham, dan jangan menyebut target harga.
5. Tulis semua kalimat dalam bahasa Indonesia.

Kerjakan:

- Ubah tiap fakta terlihat menjadi satu kalimat yang enak dibaca pemain, tanpa mengubah angkanya.
- Susun tepat tiga soal pilihan ganda yang jawabannya bisa diturunkan dari fakta terlihat.
- Susun pembukaan dari fakta sesudah T.
- Salin temuan verifikasi apa adanya ke "temuan".

Bahan:

${bahan}

Keluarkan HANYA satu obyek JSON, tanpa kalimat pengantar dan tanpa penutup, dengan bentuk persis seperti ini:

${CONTOH_BENTUK}
`;
}
