# Audit Opus satu soal M2d-13 (D-C) — petunjuk untuk reviewer

Disiapkan kode eksekutor; eksekutor TIDAK menjalankan audit dan tidak menulis hasilnya.

1. Untuk tiap berkas `bahan/<bNN>--r<r>.md` (satu soal × satu rotasi, tanpa kartu), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu (tanpa folder lain; `kunci.json` ada di luar `bahan/`).
2. Simpan jawaban mentahnya apa adanya di `jawaban/<bNN>--r<r>.txt`.
3. `npm run penulis:audit -- --nilai` → `nilai.json` (isi kunci per butir dari 4 rotasi; ≥ 3/4 = tertebak Opus). Data H2-Opus (butir penulis Opus) dan H3a (butir penulis Haiku), pra-registrasi §2.
