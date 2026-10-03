# Penilai mutu Opus buta M2d-15 (D-5) — petunjuk untuk reviewer

Disiapkan kode eksekutor; eksekutor TIDAK menjalankan penilai Opus dan tidak menulis hasilnya. Mutu = laporan, bukan syarat (pra-registrasi §2).

1. Untuk tiap berkas `bahan/<mNN>.md` (satu butir; rubrik sama dengan penilai GLM dan M2d-13), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu. Asal butir ada di `../kunci-mutu.json` — jangan diberikan ke subagent.
2. Simpan jawaban mentahnya apa adanya di `jawaban/<mNN>.txt`.
3. `npm run opus:mutu -- --nilai-opus` → `nilai.json`; lalu `npm run opus:laporan`.
