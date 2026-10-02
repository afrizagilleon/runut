# Penilai mutu Opus M2d-13 (D-D) — petunjuk untuk reviewer

Disiapkan kode eksekutor; eksekutor TIDAK menjalankan penilai Opus dan tidak menulis hasilnya.

1. Untuk tiap berkas `bahan/<mNN>.md` (satu butir; rubrik yang sama dengan penilai GLM), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu. Asal butir ada di `../kunci-mutu.json` — jangan diberikan ke subagent.
2. Simpan jawaban mentahnya apa adanya di `jawaban/<mNN>.txt`.
3. `npm run penulis:mutu -- --nilai-opus` → `nilai.json`; lalu `npm run penulis:laporan` memperbarui kesepakatan penilai, H3b, dan bagian mutu H4.
