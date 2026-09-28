# Peran di lingkar agen M2d-3

Keputusan pemilik (28 Sep 2026): **tidak ada satu peran "maha kuasa"**. Penulis tidak menilai karyanya sendiri; peninjau memakai model penalaran yang berbeda. Orkestrasinya `factory/llm/agen-peran.ts`; pemetaan peran → model hanya di `factory/llm/model.ts` (`MODEL_PERAN`).

| peran | pelaksana | melihat | wewenang |
|---|---|---|---|
| Perencana | kode (`paket.ts`, `sudut.ts`) | gudang + 31 aturan R | paket fakta; daftar sudut (fakta penentu per posisi omongan) dan nada yang diminta |
| Penulis | `deepseek-ai/DeepSeek-V4.1-Flash` | paket fakta + sudut + 2–3 contoh bank gaya + umpan balik | menulis dan merevisi SATU omongan per panggilan |
| Pemeriksa | kode (`validasi.ts`, `gerbang-g.ts`) | semua | validator deterministik + gerbang G (angka-cukup, kaku) + sudut dipakai |
| Penebak ×3 | `deepseek-ai/DeepSeek-V4.1-Flash` | HANYA pesan + pertanyaan + empat pilihan | tolak bila tertebak (K-05) |
| Pembaca kartu | `deepseek-ai/DeepSeek-V4.1-Flash` | pesan + kartu + empat pilihan, TANPA kunci | tolak bila salah |
| Kritikus | `zai-org/GLM-5.3` | semua, TERMASUK kunci, kartu penentu, penjelasan, dan hasil pemeriksa lain | **hanya** keberatan terstruktur + satu arahan; tidak menulis ulang; tidak bisa meloloskan |

## Putusan

Satu omongan lolos (dikunci) **hanya** bila keempatnya tidak keberatan: pemeriksa, pembaca kartu, penebak, dan kritikus (`putusanAkhir()` di `agen-peran.ts`). Tidak ada peran yang bisa meloloskan sendirian; setiap peran hanya bisa menolak.

- **Urutan** (dari yang gratis ke yang mahal): pemeriksa → pembaca kartu (1 panggilan) → penebak (3) → kritikus (1 panggilan GLM; harga token ±5× DeepSeek untuk masuk dan ±7,7× untuk keluar, menurut `harga.ts`). Peran berikutnya hanya dipanggil bila yang sebelumnya tidak keberatan — penolakan di depan tidak perlu dibayar dua kali.
- **Kritikus yang tidak menjawab = keberatan.** Terpotong batas token, JSON tak terbaca, atau galat penyedia → dicoba ulang sekali; bila tetap gagal, keberatan "kritikus tidak menjawab" dan omongan tidak lolos putaran itu. Karena itu bukan salah penulis, versi yang sama dibawa ke putaran berikutnya tanpa ditulis ulang (tetap melewati semua peran lagi).
- **Kritikus tidak menulis ulang.** Yang diambil dari jawabannya hanya `keberatan` (paling banyak 6 butir: jenis, bagian, alasan ≤ 300 karakter) dan `arahan` (≤ 400 karakter). Medan lain — termasuk versi omongan baru atau `"lolos": true` — dibuang dan dicatat sebagai `diabaikan`. Draf hanya berubah lewat penulis.
- **Penulis tidak menilai.** Keluaran penulis hanya dibaca sebagai omongan; klaim "lolos" atau "jejak" di dalamnya tidak dibaca siapa pun. Umpan balik yang ia terima berasal dari pemeriksa, pembaca kartu, penebak, dan kritikus, masing-masing bertanda sumbernya.

## Informasi per peran (dites di `agen-peran.test.ts`, dari isi pesan yang benar-benar dikirim)

- Penebak: tidak menerima kartu, `fact_id`, kalimat fakta, kunci, penjelasan, contoh bank gaya, maupun keberatan kritikus.
- Pembaca kartu: tidak menerima kunci, penjelasan, tanda kartu penentu, maupun `fact_id`.
- Kritikus: menerima kunci, isi kartu, tanda kartu penentu, penjelasan, jawaban pembaca kartu, dan tebakan ketiga penebak.
- Penulis: menerima paket fakta, sudut, contoh gaya, dan umpan balik; tidak pernah menerima prompt atau jawaban mentah peran lain selain butir umpan balik.

Penghalusan RASA oleh manusia (bukan kebenaran), yang juga tercatat di jejak, disetujui pemilik tetapi **bukan** bagian M2d-3.
