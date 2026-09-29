// Menyusun teks layar soal 1 DADA per versi, persis seperti tampil di ponsel 360x640
// (teks diambil dari layar sungguhan: .cache/m313/teks-layar.mjs atas 80df1eb).
// Keluaran: layar-<versi>-{penuh,buta}.txt — "penuh" untuk penguji awam & pembaca kartu,
// "buta" tanpa isi kedua kartu untuk penebak buta.
import { writeFileSync } from 'node:fs';

const VERSI = {
  V0: { petunjuk: null, tanya: 'Omongan Bayu cocok dengan dokumennya?' },
  V1: { petunjuk: null, tanya: 'Menurut dokumennya, omongan Bayu betul atau keliru?' },
  V2: { petunjuk: null, tanya: 'Apakah semua yang Bayu bilang betul menurut dokumennya?' },
  V3: {
    petunjuk: 'Pesan teman bisa memuat lebih dari satu hal; cek semuanya ke dokumen.',
    tanya: 'Menurut dokumennya, omongan Bayu betul atau keliru?',
  },
};

const pembuka = [
  '=== LAYAR 1 (layar pertama) ===',
  '[kalender kecil: OKTOBER 2025 · 8 · RABU]',
  '(judul besar) Cek omongan saham di grup ke dokumen resminya.',
  '[gelembung obrolan hijau] Bayu: Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.',
  'Betul atau keliru?',
  '[tombol] Mulai simulasi',
  '(teks kecil) 3 soal · sekitar 5 menit · tanpa akun, tanpa skor',
  '',
  '(kamu mengetuk "Mulai simulasi")',
  '',
];

function layar(v, buta) {
  const { petunjuk, tanya } = VERSI[v];
  const b = [...pembuka, '=== LAYAR 2 (soal 1 dari 3) ===', '(pita atas) HARI INI RABU · 8 OKT 2025   ● ○ ○'];
  if (petunjuk !== null) b.push(`(teks kecil abu-abu) ${petunjuk}`);
  b.push(
    '[gelembung obrolan hijau] Bayu · Rabu, 8 Okt 2025',
    '   Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.',
    '   19.38',
    '',
    '(teks kecil) Betul atau keliru? Cek ke dua dokumen ini:',
  );
  if (buta) {
    b.push('[DUA KARTU DOKUMEN — DISEMBUNYIKAN DARIMU DI UJI INI]');
  } else {
    b.push(
      '[kartu 1, garis atas utuh] Pengumuman bursa · 30 Jun 2025',
      '   Bursa menyetop sementara jual-beli saham ini: laporan keuangan tahunannya belum diserahkan. Per **1 Agustus** dibuka lagi.',
      '   [tombol] Buka dokumennya ›',
      '[kartu 2, garis atas putus-putus] Dihitung dari data harga',
      '   **Rp8** pada **1 Agustus**, **Rp178** hari ini: naik **22 kali**.',
      '   [tombol] Lihat hitungannya ›',
    );
  }
  b.push(
    '',
    '(di ponsel, bagian di bawah ini baru terlihat sesudah menggulir atau mengetuk tombol "↓ Pilih jawaban")',
    '',
    `(judul besar, tebal) ${tanya}`,
    '( ) a  Betul, pengumuman bursanya soal investor asing.',
    '( ) b  Keliru, pengumumannya soal laporan keuangan telat.',
    '( ) c  Betul, pengumuman itu yang bikin harganya naik 22 kali.',
    '( ) d  Keliru, pengumumannya soal harga yang naik terlalu cepat.',
    '↑ Kembali ke dokumen',
    '(sesudah memilih, tombol di bawah berubah menjadi "Cek jawabanku")',
  );
  return b.join('\n') + '\n';
}

for (const v of Object.keys(VERSI)) {
  writeFileSync(`layar-${v}-penuh.txt`, layar(v, false));
  writeFileSync(`layar-${v}-buta.txt`, layar(v, true));
}
writeFileSync('versi.json', JSON.stringify(VERSI, null, 2) + '\n');
console.log('ok');
