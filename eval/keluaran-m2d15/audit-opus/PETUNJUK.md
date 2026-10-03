# Audit Opus satu soal M2d-15 (D-5, patokan §2 b) — petunjuk untuk reviewer

Disiapkan kode eksekutor; eksekutor TIDAK menjalankan audit dan tidak menulis hasilnya.

1. Untuk tiap berkas `bahan/<bNN>--r<r>.md` (satu soal × satu rotasi, tanpa kartu), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu (tanpa folder lain; `kunci.json` ada di luar `bahan/`).
2. Simpan jawaban mentahnya apa adanya di `jawaban/<bNN>--r<r>.txt`.
3. `npm run opus:audit -- --nilai` → `nilai.json`. Patokan §2 (b): tiap omongan versi lulus ≤ 2/4 rotasi memilih kunci. `npm run opus:jalan` membaca berkas ini untuk syarat jalan 2; `npm run opus:laporan` memperbarui laporan.
