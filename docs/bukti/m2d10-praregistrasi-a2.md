# Pra-registrasi M2d-10 Amandemen A-2: perbaikan kode dari temuan A-1, lalu satu jalan TIRT

Berkas ini di-commit **sebelum panggilan berbayar pertama Amandemen A-2** dan tidak diubah sesudahnya. Keadaan ledger OpenRouter saat ditulis: 1.222 entri, entri terakhir `2026-09-30T18:24:31.044Z`, total US$8,831988; biaya milestone M2d-10 (tag `m2d10/` + `penyusun/m2d10-`) US$0,566761. Tidak ada entri bertag `penyusun/m2d10-tirt-a2/`. Entri `penyusun/m2d10-tirt-a2/` pertama di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini.

Dasar: Amandemen A-2 reviewer (kontrak M2d-10 §10). **Tidak diubah:** pra-registrasi M2d-7 (patokan layak tayang), M2d-10, dan A-1. Setelan tumpukan tetap A-1 (S1 + pembaca kartu "dicatat"; penebak menolak; kritikus tingkat 1), kritikus tetap dikunci ke Wafer tanpa fallback (A-1 §2), mesin tetap versi yang diperbaiki (≤ 4 versi per rencana, 3 rencana per posisi).

## 1. Empat perbaikan KODE (gratis; tes ditulis merah dulu, lalu sabotase)

Kode: `factory/llm/templat/a2.ts`; tes: `factory/llm/templat/a2.test.ts` (kasus nyata jalan A-1).

1. **G-klaim-tambahan** (pemeriksa kode, lokasi pesan): pesan teman ditolak bila memuat klaim pribadi atau kabar tanpa sumber yang tak bisa dicek kartu. Daftar pola (`POLA_KLAIM_TAMBAHAN`), dari jejak M2d-8…A-1: "hafal"; "dari dulu"; "tau/tahu duluan|polanya"; "pola beginian/gini/begini"; "katanya / kata orang / kata temen"; "temen gw/gue/aku/gua"; "grup sebelah"; "bocoran / insider / rumor / gosip"; "info/kabar (dari) orang dalam"; "udah itung/hitung/cek" atau "itung/hitung/cek sendiri"; "dari semalem/semalam"; "baru sadar/ngeh"; "gila". Keenam pesan soal tayang (Claude + pemilik) lolos tanpa pengecualian; "pasti" tidak masuk daftar (di soal tayang ia bagian klaim yang dicek; "pasti naik" dijaga G-penilaian).
2. **Kebocoran kalender** (pemeriksa kode): bila pilihan kunci menyebut hitungan hari ("N hari"/"N hari bursa") dan ada dua tanggal yang tampil tanpa kartu (pesan + empat pilihan) yang mengapit rentang dengan k hari kerja (Senin–Jumat, inklusif) sehingga N = k atau N = k − 1 → tolak. Dari pilihan saja → rencana templat cacat (ganti rencana); muncul bersama pesan → pesan ditulis ulang. Templat benar-berincian diubah: pilihan tidak lagi menyebut tanggal akhir rangkaian.
3. **Pengecoh besaran dekat tetapi salah** (templat besaran-hitungan): pengecoh angka = rasio dua harga penutupan NYATA di paket (periode lain), dengan aturan jarak **0 < |v − benar| / benar ≤ 15 %** (dibulatkan 2 desimal), bukan nilai fakta mana pun. Urutan pilihan calon: yang tetap cocok dengan klaim teman (v ≥ ambang klaim) lebih dulu, lalu yang paling jauh di dalam jendela, lalu fact_id. Di TIRT: 2,02 (penutupan 8 Des ÷ 26 Nov) menggantikan 3,51.
4. **Anti-ulang pemanasan** (pemilih pola): calon yang berpola sama DAN berkartu penentu sama dengan soal pemanasan paket itu tidak dipakai simulasi, juga tidak sebagai pengganti. Di TIRT posisi menjadi angka-lain-waktu, setengah-benar, besaran-hitungan.

## 2. Satu jalan

- Tepat **satu** jalan: `npm run templat:jalan -- --id m2d10-tirt-a2 --pagu 0.25` → pintu penyusun, mesin `templat`, TIRT 10 Desember 2025, jendela 10; log tahapan di `eval/penyusun/m2d10-tirt-a2/`.
- **Pagu jalan US$0,25** (biaya nyata, ditegakkan kode).
- Draf tidak disunting tangan dan tidak dipasang ke produk.

## 3. Uji luar dan putusan

Persis pra-registrasi M2d-7: bila **terbit**, ketiga omongan diuji — 3 penguji tebak buta + 3 penguji kartu, subagent Claude opus **baru**, **sinkron**, masing-masing hanya menerima isi satu berkas bahan (`npm run templat:penguji -- --bahan --jalan m2d10-tirt-a2 --keluar penguji-a2`), jawaban mentah disimpan; putusan mekanis `putusanTayang`. Bila **tidak terbit**: syarat (a) gagal dan putusannya TIDAK; omongan yang dikunci diuji luar dengan prosedur yang sama **hanya untuk laporan**.
