# Pra-registrasi M2d-7: patokan "layak tayang" untuk simulasi TIRT buatan agen

Berkas ini di-commit **sebelum panggilan berbayar pertama M2d-7** dan tidak diubah sesudahnya (kontrak M2d-7 D-0). Keadaan ledger OpenRouter saat berkas ini ditulis: 517 entri (tag `m2d5/` dan `m2d6/` saja), entri terakhir `2026-09-29T10:01:40.937Z`, total US$3,209874. Tidak ada entri bertag `m2d7/`. Siapa pun bisa memeriksanya: entri `m2d7/` pertama di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini.

Patokannya keputusan pemilik (29 Sep malam, dikutip kontrak M2d-7 §0): **setara soal manusia**. Putusan akhir diturunkan secara mekanis dari patokan di bawah oleh kode (`factory/llm/pengecoh-putusan.ts`, dites sama dengan berkas ini). Tidak ada penilaian tangan yang bisa mengubah putusan.

## Draf yang diuji

- Jalan TIRT M2d-7 paling banyak dua (kontrak D-7). **Jalan 2 hanya dijalankan bila jalan 1 tidak terbit**, supaya tidak ada pemilihan draf terbaik dari beberapa jalan yang terbit.
- Bila ada jalan yang terbit: yang diuji adalah ketiga omongan draf terbit dari jalan PERTAMA yang terbit.
- Bila tidak ada jalan yang terbit: syarat (a) gagal dan putusannya TIDAK. Omongan yang dikunci dari jalan TERAKHIR yang dijalankan tetap diuji di luar, hanya untuk laporan.
- Draf tidak disunting tangan dan tidak dipasang ke produk.

## Empat syarat (semuanya harus terpenuhi)

**(a) Terbit.** Lingkar menerbitkan simulasi: ketiga omongan lolos semua gerbang di dalam lingkar dan draf akhir lolos validator (`hasil.lolos === true` di `riwayat.json`).

**(b) Tebak buta luar setara soal manusia.** Proporsi omongan yang lolos tebak buta luar **≥ proporsi soal manusia yang lolos, 2/6** (`docs/bukti/uji-tanding-model.md`, kalibrasi penguji bundel BM: 2 dari 6 omongan DADA/ULTJ yang hidup lolos, prosedur yang sama). Untuk tiga omongan: **≥ 1 dari 3**.
- Prosedur: **3 penguji** subagent Claude model **opus** yang **baru** (tanpa konteks eksekutor), dijalankan **sinkron**, masing-masing hanya menerima isi satu berkas bahan `tebak.md`; urutan soal diacak dengan benih tetap; petunjuk PERSIS `PETUNJUK_TEBAK` (sama dengan M2d-1…M2d-6).
- Satu omongan lolos bila `lolosTebakLuar`: tepat 3 jawaban, ≤ 1 dari 3 penguji memilih kunci, DAN rata-rata keyakinan penguji yang memilih kunci < 40.

**(c) Jawab-dengan-kartu penuh 3/3.** Ketiga omongan lolos K-05 kartu (`lolosKartuLuar`): tiap omongan dijawab benar oleh 3 dari 3 penguji kartu, dan masing-masing menunjuk sedikitnya satu kartu penentu.
- Prosedur: **3 penguji** subagent opus baru yang lain, sinkron, masing-masing hanya menerima isi `kartu.md` (pesan + kartu + empat pilihan, tanpa kunci), petunjuk di bawah.

**(d) Nol masalah makna.** Tidak ada satu pun masalah makna di ketiga omongan, menurut penguji kartu (daftar periksa di bawah) DAN daftar periksa tertulis yang dijalankan kode.

Kealamian bahasa (3 penilai opus baru, `PETUNJUK_ALAMI` yang sama dengan M2d-6) **dilaporkan, bukan syarat**.

## Daftar periksa makna

Empat butir, per omongan. Satu masalah makna tercatat bila sumber mana pun di kolom kanan menemukannya.

| butir | penguji kartu (≥ 2 dari 3 menjawab tidak kosong) | kode (daftar periksa tertulis) |
|---|---|---|
| M1 kunci tunggal | `kunci_lain` | — |
| M2 setiap bagian klaim tercek kartu | `tak_tercek` | — |
| M3 tanpa penilaian investasi | `penilaian` | `gPenilaian(pesan)` menolak (`gerbang-penilaian.ts`) |
| M4 tanpa pengecoh kembar | `kembar` | `gKembar(pilihan)` menolak (`gerbang-kembar.ts`) |

Selain itu, bila simulasi terbit, `validasiDraf` atas draf akhir harus kosong (sudah menjadi bagian syarat (a)).

Kenapa ambang penguji ≥ 2 dari 3 (mayoritas), bukan satu penguji: sama dengan ambang K-05 tebak buta (≥ 2 dari 3 benar menolak), dan satu penguji yang berbeda sendiri tidak cukup menjadi bukti — di M2d-6 satu kalimat kartu ditandai membingungkan oleh 2 dari 3 penguji, bukan 3. Mayoritas pada butir yang SAMA, di omongan yang SAMA.

Jawaban "tidak kosong" = teks yang sesudah dipangkas dan diubah ke huruf kecil bukan salah satu dari: `""`, `"-"`, `"—"`, `"tidak ada"`, `"tidak"`, `"none"`, `"n/a"`.

## Petunjuk penguji kartu (dipakai persis; kode dites sama dengan teks ini)

```
Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.
Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang
sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.
Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,
sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —
kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.
Satu pertanyaan tambahan untuk tiap soal: Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu? Tulis bagian itu di "penilaian" — kosongkan kalau tidak ada.
Daftar periksa untuk tiap soal, dijawab dari kartu saja:
- "kunci_lain": menurut kartu, adakah pilihan LAIN selain pilihanmu yang juga benar? Tulis hurufnya; kosongkan kalau tidak ada.
- "tak_tercek": adakah bagian klaim teman yang tidak bisa dicek (dibenarkan atau dibantah) dari kartu? Kutip bagian itu; kosongkan kalau tidak ada.
- "kembar": adakah dua pilihan yang isinya sama walau kata-katanya berbeda? Tulis kedua hurufnya, misalnya "a,c"; kosongkan kalau tidak ada.
Balas HANYA dengan JSON berbentuk:
{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "...", "penilaian": "...", "kunci_lain": "", "tak_tercek": "", "kembar": ""}, ...]}
```

Tujuh baris pertama = petunjuk kartu M2d-5/M2d-6 (`PETUNJUK_KARTU_M2D5` tanpa dua baris bentuk JSON); yang baru hanya daftar periksa dan bentuk JSON-nya.

## Aturan prosedur

- Tiap penguji/penilai adalah subagent baru; tidak ada yang dipakai ulang antar-berkas bahan. Jawaban mentah disimpan apa adanya di `eval/keluaran-m2d7/penguji/jawaban/`.
- Bila jawaban satu penguji tidak bisa diurai sebagai JSON atau tidak memuat semua `id`, penguji itu diganti SATU subagent baru dengan bahan yang sama; kedua jawaban mentah disimpan dan yang dipakai adalah jawaban pengganti. Bila pengganti juga gagal, butir itu dihitung GAGAL untuk syarat yang bergantung padanya.
- Label dan urutan soal diacak dengan benih tetap yang ditulis di `kunci.json`.
- Putusan: **LAYAK TAYANG** bila (a), (b), (c), dan (d) semuanya terpenuhi; selain itu **TIDAK**. Laporan menyebut tiap syarat dengan angkanya.

## Yang BUKAN bagian pra-registrasi

Ambang gerbang DI DALAM lingkar (choices-only, meresmikan, keseimbangan, penjaga penalaran) boleh disetel di D-1/D-4/D-6 menurut kontrak, sebelum jalan TIRT, dan dicatat di laporan. Patokan tayang di atas tidak ikut berubah.
