# Pra-registrasi M2d-10: mesin penulis "templat" + penyempurna Haiku + penebak keluarga campur

Berkas ini di-commit **sebelum panggilan berbayar pertama M2d-10** dan tidak diubah sesudahnya (kontrak M2d-10 D-0). Keadaan ledger OpenRouter saat berkas ini ditulis: 1.108 entri (tag `m2d5/`, `m2d6/`, `m2d7/`, `m2d8/`, `penyusun/`), entri terakhir `2026-09-30T16:15:15.228Z`, total US$8,265227. Tidak ada entri bertag `m2d10/`. Siapa pun bisa memeriksanya: entri `m2d10/` pertama di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini.

**Patokan layak tayang tidak berubah:** `docs/bukti/m2d7-praregistrasi.md` (empat syarat a–d, prosedur penguji luar, daftar periksa makna). Berkas itu tidak diubah; putusan jalan TIRT M2d-10 diturunkan mekanis darinya. Yang ditambahkan berkas ini hanya: bentuk struktur templat, urutan gerbang, aturan kalibrasi singkat, soal pemanasan, satu jalan TIRT, dan distribusi yang dilaporkan.

Istilah: soal DADA dan ULTJ yang hidup di produk disebut **"soal tayang (Claude + pemilik)"** — disusun Claude (model AI) bersama pemilik, lalu disetujui manusia.

## 1. Struktur soal templat (kode, sebelum panggilan berbayar apa pun)

Setiap soal templat adalah satu klaim teman + empat pilihan yang **nilai kebenarannya dihitung kode dari fakta paket**, bukan ditulis model.

- **Klaim teman** membawa satu proposisi (mis. "alasan resmi penghentian hari ini = keraguan kelangsungan usaha"). Label jawabannya (Betul/Keliru) = nilai kebenaran proposisi itu, dihitung kode.
- **Tiap pilihan** = label (`Betul,`/`Keliru,`) + satu proposisi. Pilihan **benar** bila labelnya sama dengan nilai klaim DAN proposisinya benar.
- **Syarat kunci tunggal (dari keenam soal tayang):** tepat SATU dari empat pilihan berproposisi benar, dan labelnya sama dengan nilai klaim; tiga proposisi lain salah. Keenam soal tayang memenuhi bentuk ini. Label 2 Betul + 2 Keliru.
- **Rujukan lain:** bila proposisi sebuah pengecoh menjadi benar untuk rujukan lain yang sejenis di paket (mis. penghentian Januari, harga hari lain), teks pengecoh itu WAJIB memuat penanda waktunya ("hari ini", tanggal) — ambiguitas rujukan waktu adalah sebab soal M2d-8 punya "pilihan kedua yang benar".
- **Rujukan & angka:** setiap angka di pilihan adalah rujukan `[[fact_id|teks]]` yang dibuat kode; rujukan pilihan kunci hanya ke kartu omongan itu atau angka yang dikutip pesan.
- **Anti-salin:** teks templat (pilihan, inti klaim, salah kaprah, prompt) tidak memuat satu pun potongan 5 kata dari pesan, pilihan, penjelasan, atau petunjuk soal tayang (pemeriksa `potongan()` M2d-8). Yang diturunkan dari soal tayang hanya POLA-nya.
- Pola dipilih kode menurut fakta yang tersedia; urutan pemilihan tertulis di kode dan dites.

Pemeriksaan ini dijalankan kode sebelum setiap gerbang berbayar, dan lagi sesudah setiap perubahan pilihan oleh penyempurna.

## 2. Peran dan model

| peran | model | setelan |
|---|---|---|
| perencana (templat) | kode | — |
| penulis kata: pesan teman + penjelasan | `deepseek/deepseek-v4.1-flash` | penalaran 4.000/8.000; cadangan tanpa berpikir |
| penyempurna struktur | `anthropic/claude-haiku-4.5` | tanpa penalaran, suhu 0,3, `max_tokens` 1.500 |
| penebak 1 (tanpa kartu) | `anthropic/claude-haiku-4.5` | tanpa penalaran, suhu 1,0, `max_tokens` 600 |
| penebak 2 (tanpa kartu) | `deepseek/deepseek-v4.1-flash` | penalaran 4.000/8.000, suhu 1,0 |
| penebak 3 (tanpa kartu) | `z-ai/glm-5.3` | `effort: "high"`, `max_tokens` 8.000, ambang penalaran 250 (setelan M2d-8) |
| pembaca kartu | `deepseek/deepseek-v4.1-flash` | setelan M2d-5/M2d-7, tandai kalimat membingungkan |
| kritikus makna | `z-ai/glm-5.3` | `effort: "high"`, `max_tokens` 40.000, ambang 1.000 (setelan M2d-8) |

Ketiga penebak memakai petunjuk yang sama (`PETUNJUK_PENEBAK_TAJAM`). Tebakan tak terbaca (dua panggilan) = memilih kunci dengan yakin 100.

**Penyempurna** dipanggil HANYA bila gerbang menolak bagian pilihan. Masukannya pendek: empat pilihan kini, kalimat kartu omongan itu, jenis kegagalan + alasan singkat gerbang, dan **alternatif yang diizinkan** per pilihan (varian yang proposisinya sudah diperiksa kode). Keluarannya: untuk tiap pilihan yang diubah, id alternatif + teks. Kode lalu memeriksa ulang: alternatif ada di daftar yang diizinkan untuk pilihan itu, label sama, rujukan `[[…]]` dan angka persis sama dengan alternatif, kata inti ada, panjang, dan syarat kunci tunggal §1. Keluaran yang gagal pemeriksaan dibuang (pilihan lama dipakai). Panggilan penyempurna tercatat di jejak sebagai peran `penyempurna`. Bila Haiku sudah menyempurnakan pilihan sebuah omongan, tebakan penebak Haiku atas omongan itu tetap dihitung, tetapi ditandai **"kemungkinan titik buta"** di jejak dan laporan.

## 3. Urutan gerbang (D-4)

Per versi omongan, berhenti di penolakan pertama:

1. **pemeriksa kode** — §1 (struktur templat) + validator `validasiM2d8` + gerbang kode M2d-8 (G, gaya, penilaian, pilihan kembar, rujukan huruf, mirip, meresmikan, keseimbangan) dengan setelan kalibrasi M2d-8 (`G-register`, `ANDAIAN_DI_PENJELASAN`, `PENJELASAN_TANPA_PENENTU` "dicatat"; meresmikan/keseimbangan tingkat 0) + kunci angka pesan (setiap angka di pesan harus salah satu angka yang diizinkan templat) + kata wajib klaim + anti-salin.
2. **penebak keluarga campur** — tolak bila **≥ 2 dari 3 memilih kunci**, ATAU **penebak Haiku memilih kunci dengan yakin ≥ A** (A dari kalibrasi §4). Urutan panggilan: Haiku → DeepSeek → GLM; panggilan berikutnya **tidak dikirim bila putusan sudah pasti** (Haiku-kunci-yakin-≥A → tolak; dua yang pertama sama-sama kunci → tolak; dua yang pertama sama-sama bukan kunci → lolos tanpa GLM). Putusannya sama persis dengan memanggil ketiganya.
3. **pembaca kartu** — tolak bila jawabannya bukan kunci. Kalimat membingungkan hanya dicatat (tingkat 1 M2d-8).
4. **kritikus makna GLM — paling akhir**, hanya pada versi yang lolos semua gerbang di atas. Tingkat 1 M2d-8: keberatan `kunci`, `makna`, `aturan` menolak; `ambigu`, `tertebak`, `bahasa`, `lain` dicatat. Tidak menjawab → versi yang sama diperiksa kritikus sekali lagi (bila pagu cukup); tidak menjawab lagi = tolak.

**Umpan balik:** penolakan di pilihan (kode pilihan, penebak, pembaca kartu memilih pengecoh, kritikus berlokasi pilihan) → penyempurna Haiku; penolakan di pesan/penjelasan → penulis DeepSeek menulis ulang bagian itu dengan alasan gerbang. Satu rencana soal paling banyak **4 versi** diperiksa (≤ 2 penyempurnaan); lalu rencana berikutnya; paling banyak **3 rencana** per posisi. Posisi yang habis → simulasi tidak terbit.

**Distribusi yang dilaporkan:** untuk setiap versi omongan yang diperiksa — gerbang tempat ia berhenti (kode / penebak / pembaca kartu / kritikus / lolos), dengan jumlah per gerbang; jumlah panggilan penyempurna dan hasilnya (diterima kode / dibuang); jumlah versi yang sampai ke kritikus. Bila gerbang murah menolak semuanya sehingga kritikus tidak pernah dipanggil, itu dilaporkan dengan angkanya.

## 4. Kalibrasi singkat (D-5, pagu US$0,35, tag `m2d10/kalibrasi/`)

**Himpunan beku:**
- **6 soal tayang (Claude + pemilik):** DADA s1–s3, ULTJ s1–s3, bentuk dan paket sama dengan kalibrasi M2d-8 (`soalManusiaM2d8`). `cases/` tidak berubah sejak `ad0bf21`.
- **6 soal bocor terukur M2d-4…M2d-8:** `m2d5-tirt-o2`, `m2d5-tirt-o3`, `m2d4-tirt-o3`, `m2d4-tirt-o1` (bocor M2d-6/M2d-7), `m2d6-tirt-o1` (tambahan M2d-6, 3/3 penguji luar memilih kunci), dan omongan 1 jalan TIRT M2d-8 yang dikunci (3/3 penguji luar memilih kunci; 3/3 penguji kartu menyebut pilihan lain juga benar).

**Yang diukur:** gerbang kode (gratis) dan pembaca kartu pada semua soal; **ketiga penebak pada semua soal tanpa berhenti dini** (supaya ambang A bisa dihitung); kritikus hanya pada soal tayang — **hasil kritikus M2d-8 dipakai ulang** untuk lima soal tayang yang sudah diukurnya (setelan kritikus sama persis, teks soal sama persis — dicek kode dengan membandingkan ringkasan soal di `eval/keluaran-m2d8/kalibrasi/mentah.json`), dan kritikus diukur baru untuk ULTJ s3 (belum pernah terukur). Alasannya: perkiraan maksimum satu panggilan kritikus US$0,18 dicadangkan pagu; mengulang lima kritikus akan menghabiskan pagu kalibrasi tanpa mengubah setelannya. Soal bocor tidak dikirim ke kritikus; yang dilaporkan untuk soal bocor adalah **tangkapan sebelum kritikus**.

**Urutan jalan:** soal tayang (6) → kritikus ULTJ s3 → soal bocor (6). Berhenti di pagu; yang tidak terukur tidak dilengkapi tangan.

**Syarat:** tumpukan menerima **≥ 5 dari 6** soal tayang (porsi, bila terukur < 6).

**Aturan memilih setelan (mekanis, dari data mentah):** keadaan dicoba berurutan, dipakai yang PERTAMA memenuhi syarat:

| keadaan | penebak menolak bila | A (Haiku) |
|---|---|---|
| S1 | ≥ 2/3 kunci ATAU Haiku kunci yakin ≥ 60 | 60 |
| S2 | ≥ 2/3 kunci ATAU Haiku kunci yakin ≥ 70 | 70 |
| S3 | ≥ 2/3 kunci ATAU Haiku kunci yakin ≥ 80 | 80 |
| S4 | ≥ 2/3 kunci ATAU Haiku kunci yakin ≥ 90 | 90 |
| S5 | ≥ 2/3 kunci | tidak dipakai |
| S6 | 3/3 kunci | tidak dipakai |
| S7 | penebak "dicatat" (tidak menolak) | — |

Bila S7 masih di bawah syarat: pembaca kartu → "dicatat"; lalu kritikus → tingkat 2 (`kunci`, `makna`); lalu kritikus → "dicatat". Kode pelindung M2d-8 tidak pernah diturunkan. Setelan hasil aturan ini dipakai PERSIS oleh mesin templat (dites sama dengan keluaran kalibrasi). Tangkapan soal bocor dilaporkan di bawah setelan hasil, bukan dipakai memilih setelan.

## 5. Soal pemanasan (D-7a, pagu US$0,25, tag `m2d10/pemanasan/`)

Satu soal, mode dipandu, dari paket TIRT 10 Des 2025 (`DEFINISI_PAKET.tirt`). Pola = pola soal pertama tayang yang berlaku lebih dulu menurut urutan kode (`sebab-resmi`, lalu `angka-lain-waktu`); 2 kartu, kartu 1 penentu; 4 pilihan dari templat; petunjuk pemandu kalimat kode; pesan + penjelasan ditulis DeepSeek.

Gerbang yang menolak: §1 + validator per soal + G-penilaian + G-pilihan-kembar + anti-bocor DADA/ULTJ (pemeriksa M2d-8) + **pembaca kartu 3/3** (masing-masing memilih kunci DAN menunjuk kartu 1) + **kritikus makna** (tidak menjawab atau keberatan `kunci`/`makna` menolak). **Tebak buta tidak disyaratkan** (soal dipandu: pemain diarahkan ke kartu; alasan sama dengan M2d-8). Paling banyak 4 percobaan; percobaan yang ditolak di pilihan diperbaiki penyempurna Haiku, yang ditolak di pesan/penjelasan ditulis ulang DeepSeek. Tidak dipasang ke produk.

## 6. Satu jalan TIRT lewat pintu penyusun (D-7b)

- Tepat **satu** jalan: `npm run penyusun -- --mesin templat`, emiten TIRT, tanggal 10 Desember 2025, jendela bawaan; log tahapan (SSE) disimpan di `eval/penyusun/<id>/`. Pagu jalan = sisa pagu milestone (US$1,20 dikurangi biaya nyata `m2d10/`), dihitung kode sesaat sebelum mulai.
- Draf tidak disunting tangan dan tidak dipasang ke produk.
- **Uji luar dan putusan persis pra-registrasi M2d-7:** bila terbit, ketiga omongan diuji (3 penguji tebak buta, 3 penguji kartu, subagent Claude opus baru, sinkron, jawaban mentah disimpan; kealamian 3 penilai dilaporkan, bukan syarat). Bila tidak terbit, syarat (a) gagal dan putusannya TIDAK; omongan yang dikunci tetap diuji luar hanya untuk laporan.

## 7. Pagu

Pagu milestone **US$1,20** (biaya nyata `usage.cost`) atas tag `m2d10/` + tag jalan TIRT di bawah `penyusun/`, ditegakkan kode di atas `LLM_PAGU_USD`: kalibrasi ≤ US$0,35, pemanasan ≤ US$0,25, jalan TIRT = sisa. Bila pagu atau limit kunci menghentikan kerja: berhenti dan dilaporkan.

## 8. Yang BUKAN bagian pra-registrasi

Kata-kata templat (selama memenuhi §1), prompt penulis/penyempurna, dan kode mesin boleh diperbaiki sebelum jalan TIRT tanpa melihat hasil TIRT; perubahan dicatat di laporan. Patokan tayang (pra-registrasi M2d-7) dan aturan §3–§4 tidak berubah.
