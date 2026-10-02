# Audit luar Opus M2d-11 — petunjuk untuk reviewer

Disiapkan kode eksekutor; eksekutor TIDAK menjalankan audit dan tidak menulis hasilnya.

1. Untuk tiap berkas `bahan/<nama>.md` (8 berkas: 4 rotasi × tanpa/dengan kartu), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu.
2. Simpan jawaban mentahnya apa adanya di `jawaban/<nama>.txt`.
3. `npm run patokan:audit -- --nilai <folder>` → `nilai.json` (benar per rotasi; "tanpa kartu benar" = sinyal ditinjau, bukan otomatis gagal; data H3).

Soal: m2d11-tirt-7-o1, m2d11-tirt-7-o2, m2d11-tirt-7-o3
