# M3.13 D-5 — satu putaran perbaikan atas kritik `kritik-desain-r0.txt`

Tangkapan layar sebelum perbaikan: `.cache/e2e/m313/sesudah-r0/`; sesudah: `.cache/e2e/m313/sesudah/`;
dasar `80df1eb`: `.cache/e2e/m313/sebelum/` (360×640 dan 390×844, terang dan gelap; tidak ter-commit).

| # | prioritas | tindakan |
|---|---|---|
| Pintu | — | **Keduanya**, sesuai putusan kritikus: A (terima kasih, tab sama) pintu utama; B (jejak verifikasi, tab baru) diturunkan bobotnya. |
| 1 | tinggi | Dikerjakan: dua baris ringkas di bawah pengantar ("Data Perusahaan U: Draf — …", "Data Perusahaan T: Ditolak — …"), tiap nama bertaut ke jalannya; bagian peran dipindah ke bawah kedua jalan. |
| 2 | tinggi | Dikerjakan: judul bagian "Lima peran di tiap draf: satu menulis, empat menjaga"; kalimat "keempat penjaga"; perencana tetap catatan meta. |
| 3 | tinggi | Diperiksa: tidak ada bagian ganda di DOM (render tes: judul bagian peran muncul sekali). Yang terlihat berulang adalah artefak tangkapan `fullPage` setinggi ±28.000 px. Pemotongan kutipan (`line-clamp`) TIDAK dikerjakan: yang tampil tanpa dibuka kini hanya dua contoh terpendek (butir 4), sisanya di lipatan. |
| 4 | sedang | Dikerjakan sebagian: kutipan tanpa latar (CSS kutipan tidak pernah memberi latar; asal kesan "panel" di tangkapan r0 tidak diselidiki lebih jauh), garis kiri `--garis-tegas`, label putaran·peran sebagai meta, kutipan 14 px `--tinta` jarak baris 1,45; dua contoh terpendek + "Lihat semua n penolakan, urut waktu". |
| 5 | sedang | Dikerjakan: status *isi* 600 tanpa kotak dan tanpa aksen warna. |
| 6 | sedang | Dikerjakan: judul "Jalan agen: data Perusahaan U"; tanggal ditulis "Tanggal data 4 Mei 2026" (tanggal usulan kritikus "Jalan agen 4 Mei 2026" keliru: 4 Mei 2026 tanggal data, bukan tanggal jalan); "Draf ini tidak tayang sebagai simulasi; belum ada yang memainkannya." |
| 7 | sedang | Dikerjakan: peran + hitungan di baris 1, id model di baris 2 (meta, `overflow-wrap: anywhere`), kalimat bingkai "Nama model ditulis persis seperti tercatat di jejak; kedua jalan memakai penyedia berbeda." Huruf mesin tik tidak dipakai (desain.md: hanya keping kalender dan rincian teknis). |
| 8 | sedang | Dikerjakan: kalimat meta bergaris kiri; tautan di baris sendiri, rupa pintu lipatan (500 14 px `--stempel`, ≥ 44 px), "↗" dan `aria-label` "(buka di tab baru)". |
| 9 | sedang | Dikerjakan: tautan kembali ≥ 44 px, 16 px ke judul; judul bagian peran turun ke *isi* 600; jarak antarjalan 40 px. |
| 10 | rendah | Dikerjakan: daftar tanpa bulatan (jarak 12 px); angka jalan satu baris meta; kode milestone pindah ke Rincian teknis; "biaya nyata tidak tercatat" untuk jalan M2d-4. |
| 11 | rendah | Dikerjakan: `text-wrap: balance` pada `.terima-kalimat`. |
| 12 | rendah | Tidak ada perubahan (kritikus: tidak ada masalah rupa di soal 1). |
