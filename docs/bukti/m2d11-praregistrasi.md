# Pra-registrasi M2d-11: patokan "melatih pemula membaca kartu"

Berkas ini di-commit **sebelum panggilan berbayar pertama M2d-11** dan tidak diubah sesudahnya (kontrak M2d-11 D-0). Keadaan ledger OpenRouter saat ditulis: 1.263 entri, entri terakhir `2026-09-30T19:00:37.580Z`, total US$8,951440 (`LLM_PAGU_USD` = 20). Tidak ada entri bertag `m2d11/` atau `penyusun/m2d11-`. Siapa pun bisa memeriksanya: entri `m2d11/` atau `penyusun/m2d11-` pertama di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini (dites `factory/llm/patokan/praregistrasi.test.ts`).

**Pra-registrasi lama tidak diubah** (M2d-7, M2d-8, M2d-10, A-1, A-2). Patokan di bawah MENGGANTIKAN patokan "layak tayang" M2d-7 **hanya untuk milestone ini**.

Dasar: keputusan pemilik 1 Okt (patokan = melatih pemula membaca kartu; isi tidak dimudahkan, petunjuk palsu di bentuk pilihan dibuang) dan dua laporan riset (`.contracts/lampiran/M-02d11/`). Ambang di bawah adalah **opini rekayasa dari riset**, bukan nilai yang terbukti; karena itu dikalibrasi pada soal tayang dengan aturan tertulis di §2.

Sebelum berkas ini ditulis, eksekutor sudah membaca teks keenam soal tayang (ada di produk) dan memuat bank omongan lama beserta hasil penguji luarnya (`factory/llm/patokan/bank-lama.ts`), tetapi **belum menjalankan detektor apa pun** pada soal mana pun.

## 1. Patokan baru (enam syarat; soal lulus bila keenamnya terpenuhi)

1. **Bergantung bukti.** Pembaca kartu memilih kunci pada **2 rotasi berbeda** (rotasi r0 dan r2, §3).
2. **Bebas petunjuk bentuk.** **Nol bendera** detektor D-1 yang berstatus menolak sesudah kalibrasi §2. Detektor yang turun ke status "dicatat" tetap dijalankan dan dilaporkan.
3. **Tidak tertebak dari isi.** Protokol rotasi §3, agregasi §3.4: **lulus** bila proporsi kunci di kondisi "pesan+pilihan" ≤ 5/12 DAN tidak ada model (yang tidak diabaikan) yang memilih ISI kunci di ≥ 3/4 rotasi pada kondisi mana pun; **abu-abu** (dicatat, TIDAK lulus) bila proporsi > 5/12 dan ≤ 6/12 tanpa konsistensi isi kunci; **gagal** bila proporsi > 6/12 atau ada konsistensi isi kunci.
4. **Pengecoh diagnostik.** Tiap pengecoh berlabel satu jenis kesalahan dari daftar §5 + satu rujukan kartu; kode memvalidasi label (aturan per jenis, §5) dan rujukan (kartu soal itu); tidak ada pengecoh yang tetap benar untuk pertanyaan itu (bukti kunci tunggal templat: tepat satu proposisi benar).
5. **Umpan balik mengajar.** Tersimpan di draf dan divalidasi kode (§5): penjelasan merujuk kartu penentu; tiap pengecoh punya kalimat umpan balik yang menyebut nama jenis kesalahannya dan nomor kartu rujukannya; satu "pertanyaan cek" (diakhiri "?", ≤ 20 kata) yang bisa dipakai lagi.
6. **Makna.** Kritikus GLM-5.3 `effort: "high"` (penyedia dikunci ke Wafer tanpa fallback, A-1) tidak menolak: keberatan tingkat 1 (`kunci`, `makna`, `aturan`) atau tidak menjawab dua kali = gagal.

Untuk **omongan lama** (D-3) yang diukur hanya syarat **1–3** ("putusan inti"): syarat 4–5 tidak ada di bentuk lama, syarat 6 tidak dibayar ulang. Untuk **soal pemanasan** (mode dipandu) syarat 3 tidak disyaratkan (alasan sama dengan M2d-8/M2d-10: pemain diarahkan ke kartu); syarat 1, 2, 4, 5, 6 berlaku.

## 2. Detektor cacat penulisan soal (D-1, kode, gratis)

Kode: `factory/llm/cacat/`. Semua detektor dihitung pada **teks polos** (rujukan `[[id|teks]]` → teks).

**Praolah.** `alasan` = teks pilihan sesudah awalan `Betul`/`Keliru` (regex `^\s*(Betul|Keliru)\b\s*,?\s*`); tanpa awalan → seluruh teks. `kata` = huruf kecil, dipecah di `[^\p{L}\p{N}]+`, token kosong dibuang. `kata isi` = `kata` tanpa token 1 huruf dan tanpa daftar henti:
`yang dan di ke dari itu ini untuk dengan pada karena tapi tetapi juga sudah udah ada akan atau oleh sebagai dalam saja aja lagi pun nya lah kah kan sih dong deh nih tuh ya yg gue gw gua aku saya kamu lo lu dia ia mereka kita kami jadi bukan tidak nggak gak enggak tak belum memang masih`.

| kode | detektor | aturan menyala (ambang awal dari riset) | tangga pelonggaran |
|---|---|---|---|
| D1 | panjang | panjang karakter `alasan`: kunci terpanjang tunggal DAN > **1,25** × median pengecoh, ATAU terpanjang/terpendek > **1,6** | L1: 1,35 / 1,8 · L2: 1,5 / tanpa klausa rasio · L3: dicatat |
| D2 | spesifisitas unik | jenis token: *tanggal* (`\d{1,2} <bulan>` atau `<bulan> \d{4}`, nama bulan Indonesia lengkap), *angka* (digit di luar tanggal), *persen* (`%`/`persen`), *kode saham* (`\b[A-Z]{4}\b`), *dokumen* (kata berawalan pengumuman, laporan, keterbukaan, prospektus, rups, dokumen, kartu, surat). Menyala bila untuk suatu jenis tepat **1** opsi memuatnya (aturan "0 atau ≥ 2") | L1: menyala hanya bila opsi tunggal itu kunci · L2: dicatat |
| D3 | tumpang-tindih leksikal dengan pesan | Jaccard `kata isi` alasan vs `kata isi` pesan; kunci tertinggi tunggal dengan selisih ke pengecoh tertinggi > **0,15**, atau terendah tunggal dengan selisih ke pengecoh terendah > 0,15 | L1: 0,20 · L2: 0,25 · L3: dicatat |
| D4 | restatement | ada n-gram `kata` pesan (n = **4**) yang muncul di alasan kunci dan tidak di alasan pengecoh mana pun | L1: n = 5 · L2: n = 6 · L3: dicatat |
| D5 | konvergensi | skor opsi = Σ atas opsi lain │`kata isi` ∩ `kata isi` lain│; menyala bila skor kunci − skor pengecoh tertinggi ≥ **m = 1** (kunci "pusat" tunggal) | L1: m = 2 · L2: m = 3 · L3: dicatat |
| D6 | kata absolut | daftar: selalu, pasti, tidak pernah, belum pernah, tak pernah, semua, semuanya, seluruh, seluruhnya, hanya, cuma, satu-satunya, mustahil, 100%, 100 persen, jelas, tentu, sama sekali, sekali pun, sekalipun. Menyala bila ada di kunci tetapi tidak di pengecoh mana pun, ATAU tidak ada di kunci tetapi ada di ≥ **1** pengecoh | L1: …atau tidak di kunci tetapi di ≥ 2 pengecoh · L2: hanya "ada di kunci saja" · L3: dicatat |
| D7 | kata pelunak | daftar: mungkin, bisa jadi, belum tentu, kemungkinan, sepertinya, barangkali, kira-kira, sekitar, agaknya, cenderung, tampaknya. Aturan & tangga sama dengan D6 | sama dengan D6 |
| D8 | keseimbangan label | tiap opsi berawalan label; tepat **2 Betul + 2 Keliru** | **pelindung — tidak pernah dilonggarkan** |
| D9 | urutan numerik | berlaku bila ≥ 3 opsi masing-masing memuat tepat satu nilai angka (format Indonesia: `.` ribuan, `,` desimal; angka tanggal tidak dihitung); nilai opsi-opsi itu menurut urutan huruf a→d tidak naik dan tidak turun | L1: dicatat |

Pencocokan daftar kata (D6/D7) memakai batas kata Unicode pada huruf kecil.

**Aturan kalibrasi (mekanis).** Jalankan semua detektor pada keenam soal tayang dengan ambang saat ini. Selama **lebih dari 1 dari 6** soal tayang punya ≥ 1 bendera menolak: di antara detektor bukan-pelindung yang belum di anak tangga terakhir dan menandai ≥ 1 soal tayang, detektor yang menandai **paling banyak** soal tayang (seri → urutan D1…D9) turun **satu** anak tangga; ulangi. Ambang hasil dibekukan (kode = keluaran kalibrasi, dites sama) sebelum panggilan berbayar mana pun dan dipakai PERSIS oleh uji ulang D-3 dan jalan TIRT. Detektor juga dijalankan (dan dilaporkan) pada semua omongan lama dan soal pemanasan; hasil itu tidak dipakai mengubah ambang.

**Recall.** Himpunan recall = omongan lama yang ditebak benar oleh **≥ 2 dari 3** penguji luar tebak buta (dihitung kode dari jawaban mentah; 12 omongan). Recall = porsi yang punya ≥ 1 bendera menolak di ambang hasil kalibrasi; juga dilaporkan porsi dengan ≥ 1 bendera termasuk "dicatat". Target riset ≥ 80 % — dilaporkan apa adanya; tidak ada detektor baru yang ditambahkan sesudah melihat recall di milestone ini. Laju bendera pada omongan lama yang TIDAK tertebak luar juga dilaporkan.

## 3. Protokol tebak rotasi (D-2)

Kode: `factory/llm/rotasi/`.

### 3.1 Rotasi
Urutan dasar = urutan huruf soal apa adanya (soal lama: urutan yang dulu diuji; templat: urutan keluaran mesin). Rotasi siklik **r = 0…3**: opsi di huruf ke-i = opsi dasar ke-((i − r) mod 4); kunci pindah ke huruf ((k + r) mod 4), sehingga kunci muncul **tepat sekali** di a, b, c, d (dites). Pembaca kartu memakai **r0 dan r2**.

### 3.2 Kondisi dan model
Dua kondisi: **pilihan-saja** (hanya pertanyaan + empat pilihan) dan **pesan+pilihan** (pesan teman + pertanyaan + empat pilihan; tanpa kartu). Tiga keluarga, masing-masing satu panggilan per rotasi per kondisi = **24 panggilan** per soal, percakapan baru tiap panggilan, tanpa penalaran panjang (penjaga penalaran TIDAK berlaku; tujuannya petunjuk permukaan):

| model | setelan |
|---|---|
| `anthropic/claude-haiku-4.5` | suhu 0, `max_tokens` 300 |
| `deepseek/deepseek-v4.1-flash` | suhu 0, `max_tokens` 600, `reasoning.enabled: false` |
| `z-ai/glm-5.3` | suhu 0, `max_tokens` 1.500, `reasoning.enabled: false`, pagar penyedia M2d-7 (tidak dikunci ke Wafer) |

Pembaca kartu: `deepseek/deepseek-v4.1-flash`, setelan M2d-7 (`GENERASI_M2D7.kartu`), gerbang kartu yang sama dengan M2d-10 (kalimat membingungkan dicatat).

### 3.3 Salin teks opsi
Model diminta **menyalin teks opsi** pilihannya (bukan huruf), JSON `{"teks": "...", "alasan": "..."}`. Kode memetakan ke opsi: normalisasi (huruf kecil; awalan huruf seperti `a)`/`(a)`/`a.` dibuang; tanda baca kecuali digit dibuang; spasi dirapatkan), kesamaan **Dice bigram karakter**; dipetakan ke opsi termirip bila kesamaannya **≥ 0,70** dan unggul **≥ 0,05** dari opsi kedua; selain itu tak terpetakan. Tak terbaca/tak terpetakan → diulang sekali dengan panggilan baru; tetap gagal → **dihitung memilih ISI kunci** (konservatif: kegagalan penebak tidak pernah meloloskan soal), tidak dihitung untuk huruf, dan dilaporkan.

### 3.4 Agregasi per soal
Per kondisi dan model: **konsistensi huruf** = satu huruf dipilih di ≥ 3 dari 4 rotasi (jawaban yang dipetakan) → model itu **diabaikan** untuk soal itu di kondisi itu (bias posisi; prior hurufnya dicatat). **Konsistensi isi kunci** = isi kunci dipilih di ≥ 3/4 rotasi. **Proporsi kunci** (kondisi pesan+pilihan) = jawaban kunci (termasuk tak terbaca) / (4 × jumlah model yang tidak diabaikan); bila semua model diabaikan → tak terukur = tidak lulus. Putusan syarat 3: §1. Dilaporkan juga: proporsi kunci pilihan-saja, konsistensi isi per opsi, prior huruf per model atas seluruh bank.

## 4. Uji ulang soal lama (D-3, pagu ≤ US$0,80)

- Bank: 6 soal tayang + 27 omongan lama yang pernah diuji tebak buta luar (M2d-3 8, M2d-4 7, M2d-5 3, M2d-6 2, M2d-8 1, M2d-10 jalan pertama 2 versi + soal pemanasan, A-1 2, A-2 1). Teks dicocokkan kode dengan bahan yang dulu dikirim ke penguji luar.
- Urutan jalan: tayang → himpunan recall → sisanya. Per soal: detektor (gratis), pembaca kartu r0+r2, 24 panggilan rotasi. Berhenti di pagu; yang tidak terukur tidak dilengkapi tangan.
- Tabel putusan lama vs baru: putusan lama = hasil penguji luar tebak buta (tertebak ≥ 2/3 atau tidak; soal tayang: diterima). Putusan baru = syarat 1–3. "**Kemungkinan artefak posisi**" = tertebak luar dulu tetapi syarat 3 lulus sekarang, atau sebaliknya (tidak tertebak luar dulu tetapi gagal sekarang); pasangan A-1 omongan 2 (kunci d) vs A-2 omongan 1 (kunci c) dibandingkan khusus.
- **Audit luar Opus** (paling banyak 10 soal yang lulus putusan inti; soal tayang didahulukan): paket 4 rotasi × (dengan/tanpa kartu) disiapkan kode di `eval/keluaran-m2d11/audit-opus/`; dijalankan **reviewer** (subagent Opus, sinkron, mentah disimpan). Eksekutor tidak bisa memanggil Opus; tidak ada hasil audit yang ditulis eksekutor. "Tanpa kartu benar" = sinyal ditinjau, bukan otomatis gagal.

## 5. Mesin templat M2d-11 (D-4) — pengecoh berlabel + umpan balik

**Urutan gerbang** per versi omongan (berhenti di penolakan pertama): (1) pemeriksa kode lama M2d-10 (struktur templat, validator, gerbang kode, A-2) + detektor D-1 berambang hasil kalibrasi + validasi label & umpan balik → (2) tebak rotasi §3 (24 panggilan, tanpa henti dini) → (3) pembaca kartu r0+r2 (keduanya harus kunci) → (4) kritikus GLM (§1 syarat 6; tidak menjawab → diperiksa sekali lagi). Umpan balik: bendera detektor yang bergantung pada pesan (D3, D4) → penulis menulis ulang pesan; bendera lain → penyempurna Haiku menerima daftar bendera + alternatif yang diizinkan (varian yang sudah diperiksa kode); tebak rotasi gagal → penyempurna (alasan: isi yang dipilih per model). Batas versi/rencana sama dengan M2d-10 (≤ 4 versi per rencana, ≤ 3 rencana per posisi).

**Jenis kesalahan pengecoh** dan aturan validasi kode (P = proposisi pengecoh, selalu SALAH menurut bukti kunci tunggal; K = rujukan kartu, harus kartu soal itu):

| jenis | aturan |
|---|---|
| `salah-periode` | ada bacaan P dengan fakta sekelas lain (`bacaanLain`) yang BENAR, dan K = fakta itu |
| `salah-entitas` | K bukan fakta yang disebut P, K berkelas lain dari fakta P, dan tanggal terbit K = tanggal fakta P |
| `nyaris-benar-angka` | P memuat nilai angka v untuk fakta F dengan nilai sebenarnya t, 0 < │v − t│/│t│ ≤ 0,5; K = F |
| `pertanyaan-lain` | fakta yang disebut P tidak memuat satu pun kartu penentu; K ∈ fakta P atau kartu soal |
| `sebagian-benar` | P konjungsi dengan ≥ 1 bagian BENAR, ATAU label opsi = label jawaban yang benar sedangkan isinya salah |
| `percaya-otoritas` | label opsi `Betul`, klaim teman Keliru, dan P = proposisi klaim atau konjungsi yang memuatnya (membenarkan teman) |

**Umpan balik (syarat 5)** disusun kode per rencana: kartu penentu (nomor + tanggal), per pengecoh satu kalimat `"<huruf>) <nama jenis>: … kartu <n> …"`, satu pertanyaan cek per pola. Disimpan di draf/jejak; tidak dipasang ke produk (milestone terpisah).

## 6. Jalan TIRT (D-5)

- Lewat pintu penyusun, mesin `templat` versi M2d-11, TIRT 10 Desember 2025, jendela 10; id `m2d11-tirt-<n>` (n = 1, 2, …), log di `eval/penyusun/m2d11-tirt-<n>/`.
- **Jalan berulang sampai satu simulasi (3 omongan) lulus patokan §1 atau pagu milestone habis** (sisa < US$0,30 = berhenti). Pagu per jalan = min(US$0,60, sisa pagu milestone), ditegakkan kode.
- **Yang beku sejak commit ini** (tidak diubah sesudah melihat hasil TIRT): patokan §1, ambang detektor hasil kalibrasi §2, protokol & agregasi §3, aturan label & umpan balik §5, model dan setelan gerbang. **Yang boleh diubah antar jalan:** kata-kata dan struktur templat (selama bukti kunci tunggal terpenuhi), prompt penulis/penyempurna; setiap perubahan di-commit tersendiri SEBELUM jalan berikutnya, dengan alasannya, dan dicatat di laporan.
- Draf tidak disunting tangan dan tidak dipasang ke produk. Bila lulus: paket audit Opus (cara §4) + catatan untuk penyetuju (pemilik).

## 7. Soal pemanasan (D-6)

Dinilai ulang di D-3 (`m2d10-pemanasan`, putusan inti tanpa syarat 3). Karena bentuk lama tidak punya label pengecoh dan umpan balik (syarat 4–5), soal pemanasan **ditulis ulang oleh mesin** dengan templat M2d-11: syarat 1, 2, 4, 5, 6 (pembaca kartu r0+r2, detektor, label, umpan balik, kritikus); ≤ 4 percobaan; pagu ≤ US$0,30 (tag `m2d11/pemanasan/`). Tidak dipasang.

## 8. Data hipotesis pemilik (D-6b, tanpa panggilan tambahan)

Dari data rotasi D-3 (+ TIRT): **H2** per keluarga — proporsi kunci per kondisi, laju konsistensi isi (kunci dan opsi mana pun), laju konsistensi huruf, prior huruf (sebaran a/b/c/d), laju tak terbaca. **H3** (petunjuk awal) — kesepakatan "vonis" tiap keluarga (model memilih isi kunci di ≥ 3/4 rotasi pesan+pilihan) dengan audit Opus tanpa kartu (≥ 3/4 rotasi benar): **menunggu audit reviewer**. Dicatat sebagai data eksploratif, bukan kesimpulan.

## 9. Pagu

Pagu milestone **US$5,00** (biaya nyata `usage.cost`) atas tag `m2d11/` + `penyusun/m2d11-`, ditegakkan kode di atas `LLM_PAGU_USD`: uji ulang D-3 ≤ US$0,80 (`m2d11/uji-ulang/`), pemanasan ≤ US$0,30 (`m2d11/pemanasan/`), jalan TIRT = sisa. Bila pagu menghentikan kerja: berhenti dan dilaporkan. US$6 sisanya tidak disentuh.
