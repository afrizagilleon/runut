# M3.13 D-1 — hasil uji soal 1 DADA

44 subagent Opus baru (4 versi × (5 awam + 3 tebak buta + 3 pembaca kartu)), sinkron, tanpa alat.
Jawaban mentah: `jawaban/V0.txt` … `jawaban/V3.txt`. Rubrik dan aturan pilih: `rencana.md` (di-commit
`61aa7a9` sebelum penguji pertama dijalankan).

## Tabel

| versi | tanya (+ petunjuk) | paham-tugas (P1∧P2) /5 | benar /5 | jelas=ya /5 | tebak buta benar /3 (pilihan) | pembaca kartu b /3 | lolos syarat 1 |
|---|---|---|---|---|---|---|---|
| V0 | Omongan Bayu cocok dengan dokumennya? | 5 | 5 | 5 | 0 (d d d) | 3 | ya |
| **V1** | **Menurut dokumennya, omongan Bayu betul atau keliru?** | 5 | 5 | 5 | 0 (d d d) | 3 | ya |
| V2 | Apakah semua yang Bayu bilang betul menurut dokumennya? | 5 | 5 | 5¹ | 0 (d d d) | 3 | ya |
| V3 | + petunjuk "Pesan teman bisa memuat lebih dari satu hal; cek semuanya ke dokumen." + tanya V1 | 5 | 5 | 5 | 0 (d d d) | 3 | ya |

¹ V2 awam-3 menjawab "JELAS: ya", lalu menambahkan "cuma sempat ragu sebentar" di judul "Apakah semua …".
Dihitung ya menurut format; bila dihitung ragu, V2 = 4 dan keputusan di bawah tidak berubah.

Penilaian per penguji (P1: TUGAS menyebut vonis betul/keliru/benar/salah atas omongan Bayu lewat dokumen;
P2: ALASAN menilai klaim pengumuman/investor asing): semua 20 penguji awam memenuhi P1 dan P2 — tiap ALASAN
menyebut "tidak ada soal investor asing" di pengumuman. V0 awam-5 ("cek apa omongan Bayu bener atau nggak")
dan V1 awam-4 ("betul atau enggak") dihitung P1 = 1.

Pengamatan di luar rubrik (tidak dipakai memilih, dicatat apa adanya): penguji awam yang menyebut sendiri
bahwa "naik 22 kali memang betul" — tanda mereka memisahkan dua klaim — V0 0/5, V1 0/5, V2 4/5, V3 3/5.
Penebak buta V2 dan V3 mengutip kata "semua" / petunjuk sebagai isyarat ke "Keliru" (V2 2/3, V3 2/3), tetapi
tetap memilih d; tidak ada versi yang membuat b tertebak.

## Keputusan menurut aturan (rencana.md §4)

1. Syarat 1: semua versi lolos (pembaca kartu 3/3 b; tebak buta 0/3 = V0 0/3).
2. paham-tugas: seri 5/5 di keempat versi.
3. benar: seri 5/5. jelas: seri 5/5.
4. Perubahan terkecil dari V0: urutan V1, V2, V3 → **V1**.
5. Aturan 4: V0 tidak paling tinggi tanpa seri → varian dipilih.

**Terpilih: V1** — `tanya` soal 1 DADA menjadi "Menurut dokumennya, omongan Bayu betul atau keliru?";
`petunjuk` tetap `null`; fakta, kartu, pilihan, kunci, dan penjelasan tidak berubah.

## Batas bukti ini

Penguji Opus yang memerankan orang awam **tidak mereproduksi kegagalan pemain sungguhan**: V0 dijawab 5/5 di
sini, 2/11 oleh pemain alpha 27–29 Sep. Uji ini hanya menunjukkan bahwa tidak ada varian yang merusak
(membocorkan ke tebak buta, mengubah jawaban pembaca kartu, membingungkan), dan tidak bisa membedakan
varian mana yang paling menolong pemain sungguhan. Pemilihannya karena itu jatuh ke penentu seri yang
ditulis sebelumnya (perubahan terkecil). Ukuran yang sesungguhnya adalah pilihan pemain sesudah tayang.
