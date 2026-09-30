# M3.14 D-5 — uji pemahaman pemandu (pra-registrasi)

Ditulis dan di-commit SEBELUM penguji pertama dijalankan.

## Pertanyaan
Apakah pengunjung baru paham tugasnya sebelum menjawab soal 1 DADA, dengan pemandu dibanding tanpa pemandu?

## Rancangan
- 10 subagent Claude Opus baru, sinkron, tanpa konteks percakapan ini. 5 lengan **dengan** pemandu, 5 lengan **tanpa**.
- Bahan: tangkapan layar ponsel 360 × 640, terang, build produksi M3.14 (`node e2e/bantu/potret-m314.ts uji`), simulasi DADA.
  - `bahan/dengan/`: layar pertama → pemandu langkah 1–4 → soal 1 digulir (3 layar).
  - `bahan/tanpa/`: layar pertama → soal 1 digulir (3 layar yang SAMA dengan lengan dengan).
  Satu-satunya beda kedua lengan: empat layar pemandu.
- Peran penguji: orang Indonesia usia 20-an, belum pernah membeli saham, membuka tautan dari story Instagram di ponsel, malas membaca petunjuk. Hanya boleh membaca gambar yang disebut; tidak boleh membuka berkas lain.
- Urutan jawaban diminta: (1) TUGAS — dengan kata sendiri, apa yang diminta layar ini SEBELUM memilih; (2) JAWAB — satu huruf a–d; (3) ALASAN; (4) BINGUNG — apa yang membingungkan (boleh "tidak ada"); (5) PEMANDU (lengan dengan saja) — membantu/mengganggu, satu kalimat.

## Ukuran (rubrik, ditetapkan sekarang)
- **paham-tugas** (0/1), dinilai dari jawaban TUGAS saja: bernilai 1 bila menyebut ketiganya — (i) omongan/klaim teman (Bayu) yang diperiksa, (ii) terhadap dokumen/kartu, (iii) memutuskan betul/keliru (atau memilih jawaban yang cocok dengan kartu). Kurang satu = 0.
- **benar** (0/1): JAWAB = b (kunci soal 1 DADA).
- **jebakan-c** (hitung): JAWAB = c ("Betul … naik 22 kali"), jebakan terbesar pemain sungguhan (16/40).
- **dua-klaim** (eksploratif, 0/1): ALASAN memisahkan bagian yang benar ("naik 22 kali") dari bagian yang keliru (pengumuman/investor asing).
- **keluhan**: dikutip apa adanya.
Penilaian dilakukan eksekutor menurut rubrik ini, dicatat per penguji di `hasil.md`, jawaban mentah di `jawaban/`.

## Aturan tafsir (ditetapkan sekarang)
1. Ini laporan, bukan gerbang: tidak ada perubahan produk yang otomatis mengikuti hasilnya, KECUALI lengan dengan lebih buruk dari tanpa sebesar ≥ 2/5 pada paham-tugas atau benar — maka ditandai sebagai keraguan untuk reviewer.
2. Hasil seri di 5/5 dilaporkan sebagai "tidak diskriminatif" (Opus yang memerankan orang awam menjawab V0 soal 1 5/5 di M3.13, pemain sungguhan 2/11). Data alpha sesudah deploy yang menentukan.
3. Keluhan tentang pemandu (terlalu panjang, menutupi, membingungkan) yang muncul pada ≥ 2 penguji lengan dengan diteruskan ke putaran perbaikan D-6.
