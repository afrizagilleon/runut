# Pra-registrasi M2d-8: kalibrasi gerbang terhadap soal manusia

Berkas ini di-commit **sebelum panggilan berbayar pertama M2d-8** dan tidak diubah sesudahnya (kontrak M2d-8 D-0). Keadaan ledger OpenRouter saat berkas ini ditulis: 790 entri (tag `m2d5/`, `m2d6/`, `m2d7/` saja), entri terakhir `2026-09-29T20:52:34.451Z`, total US$5,517401. Tidak ada entri bertag `m2d8/`. Siapa pun bisa memeriksanya: entri `m2d8/` pertama di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini. Pra-registrasi M2d-7 (`docs/bukti/m2d7-praregistrasi.md`) tidak diubah; ia tetap patokan tayang untuk jalan TIRT M2d-8.

Prinsip pemilik (kontrak §0): **gerbang yang menolak soal manusia yang tayang adalah gerbang yang salah kalibrasi.** GLM memakai `reasoning.effort: "high"` (keputusan pemilik 30 Sep), bukan `"max"`.

## 1. Himpunan kalibrasi beku

Kode yang membangunnya: `factory/llm/kalibrasi-soal.ts` (`himpunanBeku()`), di-commit bersama berkas ini.

**Soal manusia (6)** — teks tayang di commit `ad0bf21`: `cases/dada-2025-10-08.json` (blob `29b4a3ba5550660ea6b6282380fd4aecdc4a8174`) soal `s1-kata-bursa`, `s2-dividen-pemilik-kecil`, `s3-siapa-yang-menjual`; `cases/ultj-2026-05-04.json` (blob `7b9703a8d24395b3c4e2fab986acb2534db9cb55`) soal `turun-di-tanggal-ex`, `riwayat-dividen`, `siapa-yang-membeli`.
- Bentuk `OmonganDraf`: pesan, pilihan, kunci, penjelasan, kartu, dan kartu penentu persis dari kasus. Paketnya dibangun dari **fakta kasus itu sendiri** (`paketDariKasus`): kalimat kartu yang dibaca pembaca kartu dan kritikus = `klaim` fakta kasus.
- `angka_pesan` dipetakan kode (`angkaPesanManusia`): tiap angka di pesan menunjuk fakta pertama (kartu soal dulu, lalu fakta kasus lain) yang memuat angka itu; bila tidak ada, andaian.

**Soal bocor (4, syarat)** dan **aman (6, dilaporkan)** — himpunan M2d-6 (`SOAL_KALIBRASI`, label dari jawaban mentah penguji luar; versi = versi yang dikirim ke penguji luar), dengan paket jalan asalnya (`paket.json` tersimpan): bocor `m2d5-tirt-o2`, `m2d5-tirt-o3`, `m2d4-tirt-o3`, `m2d4-tirt-o1`; aman `m2d4-ultj-o1`, `m2d4-ultj-o2`, `m2d4-ultj-o3`, `m2d4-dada-o2`, `m2d4-dada-o1`, `m2d5-tirt-o1`. **Tambahan (2, dilaporkan terpisah, tidak masuk syarat):** TIRT M2d-6 o1 (bocor 3/3 di luar) dan o2 (aman).

Urutan jalan: manusia → bocor → aman → tambahan (pagu kalibrasi bisa berhenti di tengah; yang tidak terukur tidak dilengkapi tangan). Soal yang tidak terukur di SEMUA gerbang tidak ikut dihitung.

## 2. Tumpukan gerbang

Semua gerbang dijalankan pada semua soal (tanpa berhenti di penolakan pertama), supaya matriksnya per gerbang lengkap.

1. **kode** — `gerbangKode`: validator (`validasiDraf` atas soal itu sendirian; kode seluruh-draf tidak dinilai per soal), G-angka-cukup, G-kaku, G-panjang, G-satu-klausa, G-register, rujukan huruf, G-penilaian, G-pilihan-kembar. `KATA_PENILAIAN` validator dihitung dengan pengecualian `PENGECUALIAN_PENILAIAN` yang sudah ada sejak M2d-5 (commit `35b30a0`: "kabar buruk" menilai kabar, bukan saham).
   - **Tidak dinilai (tidak berlaku menurut bangunnya):** `NAMA_TERLARANG` (nama di kasus tayang sengaja dicadangkan untuk kasus tayang), G-ikatan-bank (pilihan manusia tidak berasal dari bank pengecoh), G-mirip dan kode seluruh-draf (menilai simulasi, bukan soal).
   - **Kode PELINDUNG — tidak pernah dilonggarkan atau diturunkan:** `SKEMA`, `FAKTA_DI_LUAR_PAKET`, `ANGKA_TAK_COCOK`, `ANGKA_TANPA_RUJUKAN`, `ANGKA_PESAN_TAK_ADA`, `ANGKA_PESAN_TANPA_JEJAK`, `ANDAIAN_DI_OMONGAN_BETUL`, `HARI_INI_TAK_COCOK`, `TANGGAL_SESUDAH_T`, `EMITEN_TERBUKA`, `KATA_PENILAIAN`, `AJAKAN_TRANSAKSI`, `KUNCI_TAK_ADA`, `KUNCI_TAK_TERBUKTI_KARTU`, `KARTU_JUMLAH`, `KARTU_KEMBAR`, `PENENTU_JUMLAH`, `PENENTU_BUKAN_KARTU`, `OPSI_TANPA_LABEL`, `OPSI_TAK_DUA_DUA`, `PESAN_KOSONG`, `G-penilaian`. Alasannya: fakta, rujukan, tanggal, emiten, penilaian/ajakan, dan bentuk K-05 bukan selera. Bila kode pelindung menolak soal manusia, itu temuan tentang soal itu dan dilaporkan; ia tetap dihitung menolak.
   - Kode lain (bentuk/gaya) boleh diturunkan (§3). `ANDAIAN_DI_PENJELASAN` termasuk kode lain: `[[misal|…]]` tampil sebagai pengandaian bertanda, bukan fakta dokumen, dan validator sendiri membolehkannya di pilihan.
2. **meresmikan** (kode) — tolak bila ≥ 1 angka atau ≥ 2 kata isi pesan muncul lagi hanya di pilihan kunci.
3. **keseimbangan** (kode) — tolak bila panjang kunci > 1,3 × median pengecoh.
4. **pilihan-saja** — DeepSeek ×2, hanya empat pilihan (setelan M2d-7); tolak bila keduanya memilih kunci (tak terbaca = memilih kunci).
5. **pembaca kartu** — DeepSeek ×1 dengan kartu, tanpa kunci, `tandaiBingung` (setelan M2d-7); tolak bila jawabannya bukan kunci ATAU ia menandai kalimat tulisan penulis membingungkan.
6. **kritikus** — GLM `effort: "high"`, dengan cek makna (`prompt-kritikus-makna.md`), konteks jawaban pembaca kartu; tolak bila tidak menjawab (dua kali terpotong/tak terbaca/tak terbukti berpikir) atau ada keberatan apa pun.
7. **penebak** — GLM ×3 `effort: "high"`, tanpa kartu, petunjuk "pemburu soal bocor" (`PETUNJUK_PENEBAK_TAJAM`); tolak menurut K-05 penuh: ≥ 2/3 memilih kunci ATAU rata-rata yakin yang memilih kunci ≥ 40 (tak terbaca = kunci, yakin 100).

Kritikus dan penebak dijaga penjaga penalaran (`max_tokens` dan ambang dari aturan §5). `provider.order` GLM tetap `["wafer"]` (bukti ledger M2d-7, fallback tetap).

## 3. Syarat dan aturan penyesuaian (mekanis, `putusanKalibrasi`)

**Syarat tumpukan:** menerima **≥ 5 dari 6** soal manusia, dan menolak **≥ 3 dari 4** soal bocor. (Bila pagu membuat soal manusia terukur < 6: ≥ 5/6 sebagai porsi; bocor sama.)

**Langkah pelonggaran per gerbang** (tingkat 0 = setelan §2; tingkat terakhir = batas; "—" = tingkat 1 sudah batas):

| gerbang | tingkat 1 | tingkat 2 (batas) |
|---|---|---|
| kode | tiap kode bukan-pelindung yang menolak soal manusia diturunkan satu per satu (terbanyak soal manusia dulu, lalu urut abjad) | — |
| penebak | hanya ≥ 2/3 memilih kunci | hanya 3/3 memilih kunci |
| pilihan-saja | juga rata-rata yakin ≥ 60 | — |
| meresmikan | kata 2 → 3 | — |
| keseimbangan | 1,3 → 1,5 | — |
| kritikus | hanya keberatan `kunci`, `makna`, `aturan` (+ tidak menjawab) | hanya `kunci`, `makna` (+ tidak menjawab) |
| pembaca kartu | kalimat membingungkan tidak menolak (jawaban salah tetap menolak) | — |

**Urutan:** kode → penebak → pilihan-saja → meresmikan → keseimbangan → kritikus → pembaca kartu. Kode dulu karena hasilnya pasti (tanpa sampel) dan penolakannya atas soal manusia sudah diketahui (§6); penebak berikutnya karena ketidaksesuaiannya dengan penguji luar sudah terukur (M2d-7: GLM menebak benar 3 dari 4 soal aman, penguji Opus 0/3); pembaca kartu terakhir karena ia padanan langsung syarat (c) K-05 pra-registrasi M2d-7.

**Aturan** (dihitung ulang dari data mentah, tanpa panggilan baru):
```
S = setelan §2
untuk g dalam urutan:
  berhenti bila tumpukan S menerima ≥ 5/6 soal manusia
  lewati g bila g tidak menolak satu pun soal manusia di S
  naikkan tingkat g satu per satu selama tumpukan < 5/6 DAN g masih menolak soal manusia, sampai batas
  bila di batas tumpukan masih < 5/6 DAN g masih menolak soal manusia → g DITURUNKAN menjadi "dicatat"
```
Gerbang "dicatat" tetap dijalankan dan hasilnya dicatat di jejak dan laporan, tetapi tidak menolak. Tiap langkah dicatat dengan angkanya (matriks sebelum/sesudah).

**Bila syarat bocor (≥ 3/4) gagal sesudah penyesuaian:** dilaporkan sebagai "syarat tumpukan tidak terpenuhi" dengan datanya; setelan hasil aturan tetap dipakai untuk soal pemanasan dan jalan TIRT (prinsip pemilik mendahulukan soal manusia; patokan tayang M2d-7 — uji luar — tetap penjaga terakhir). Tidak ada penyesuaian lain.

## 4. Yang dipakai sesudah kalibrasi

Setelan hasil §3 (tingkat per gerbang, gerbang "dicatat", kode yang diturunkan) dipakai **persis** oleh lingkar TIRT M2d-8 dan dites sama dengan keluaran `putusanKalibrasi` atas data mentah kalibrasi. Ambang tidak disetel sesudah melihat hasil TIRT.

## 5. Penalar GLM `effort: "high"` (D-1, `putusanPenalar`)

Probe (≤ US$0,25): kritikus ×3 (`max_tokens` 32.000) atas tiga versi omongan jalan 2 TIRT M2d-7 yang kritikus `"max"`-nya tidak menjawab (yang pertama menurut putaran, lalu omongan); penebak ×4 (`max_tokens` 8.000, petunjuk tajam) atas empat versi pertama yang sampai kritikus di jalan itu. Tanpa penjaga dan tanpa ulangan (angka mentah). Data tambahan: entri ledger M2d-6 GLM `effort: "high"`.
- effort tetap `"high"`. Bila penyedia menolak `"high"` (4xx) → berhenti dan lapor (tidak kembali ke `"max"`).
- **Kritikus:** ambang 1.000 (tetap; M2d-6: kritikus Wafer "high" ≥ 1.800, penyedia lain ≤ 1.538). `max_tokens` = min(40.000, max(24.000, 1,5 × keluaran kritikus "high" terpanjang yang SELESAI — M2d-6 + probe — dibulatkan ke atas ke ribuan)); 40.000 bila ada kritikus probe yang habis di 32.000. Target (dilaporkan, bukan syarat): ≤ 1/10 panggilan kritikus habis token di kalibrasi dan jalan TIRT.
- **Penebak:** kumpulan = penebak GLM "high" M2d-6 yang dilayani Wafer (penyedia pertama `order`) + penebak probe; yang habis token (penalaran ≥ 7.990) dikeluarkan. Ambang = max(50, ½ × kuartil bawah token penalaran kumpulan itu, dibulatkan ke bawah ke puluhan) — rumus M2d-7. `max_tokens` 8.000 bila porsi yang habis token (M2d-6 Wafer + probe) ≤ 1/10, selain itu 12.000.

## 6. Yang sudah diketahui saat berkas ini ditulis (tanpa jaringan)

Gerbang kode dan artefak dijalankan atas himpunan beku sebelum berkas ini ditulis (gratis, pasti). Soal manusia: DADA s1 `PENJELASAN_TANPA_PENENTU`; DADA s2 `ANDAIAN_DI_PENJELASAN` + `G-register` ("gue"); ULTJ s2 `G-register`; ULTJ s3 `G-register`; ULTJ s1 hanya `KATA_PENILAIAN` dari "kabar buruk" (pengecualian M2d-5 berlaku → tidak menolak); DADA s3 bersih. Meresmikan dan keseimbangan: keenam soal manusia lolos (sudah dites di M2d-7). Hasil gerbang LLM belum diketahui.

## 7. Soal pemanasan (D-3, mode dipandu)

- Paket TIRT (`bangunPaket(DEFINISI_PAKET.tirt)`), bukan DADA/ULTJ. Kartu: `susp-2025-12-10` (penentu) + `susp-2025-01-21`; klaim teman **Keliru** (salah kaprah: alasan penghentian Januari dikira alasan hari ini). Alasan pilihan: peristiwa hari itu, alasan resmi tertulis di kartu, bisa dicek dari tepat dua kartu tanpa berhitung.
- Satu penulis DeepSeek per percobaan (prompt `factory/llm/prompt-penulis-pemanasan.md`), huruf kunci dari kode, paling banyak **4 percobaan**, pagu **US$0,25**; umpan balik = alasan gerbang, tanpa penyuntingan tangan.
- Gerbang (menolak): validator (semua kode per soal, termasuk `NAMA_TERLARANG`) + nama pengirim bukan nama di kasus tayang; G-penilaian; G-pilihan-kembar; **pembaca kartu 3/3** (tiga pembaca DeepSeek, masing-masing memilih kunci dan menunjuk kartu penentu); **kritikus makna** (GLM "high", cek makna) — menolak bila tidak menjawab atau ada keberatan `kunci`/`makna`; **pemeriksa anti-bocor**: tidak ada potongan 5 kata berurutan dari pesan/pilihan/penjelasan/petunjuk soal DADA/ULTJ tayang, tidak ada `fact_id` kasus DADA/ULTJ yang tidak ada di paket TIRT. Keberatan kritikus lain, gerbang gaya, dan gerbang artefak dicatat, tidak menolak.
- **Tebak buta TIDAK disyaratkan:** soal dipandu memberi tahu pemain di kartu mana jawabannya; yang dilatih adalah gerakan mencocokkan omongan dengan kartu, bukan ketahanan terhadap tebakan tanpa kartu. Tebak buta akan mengukur sifat yang sengaja dilepas bentuk ini.
- Keluaran `eval/keluaran-m2d8/pemanasan/soal.json` (bentuk `Soal` kasus; `petunjuk` = kalimat pemandu dari templat kode) + `jejak.json`. TIDAK dipasang ke produk.

## 8. Satu jalan TIRT (D-4)

- Satu jalan, lingkar pengecoh M2d-7 (penulis dipecah, bank pengecoh) dengan setelan §4 dan penalar §5; pagu = sisa pagu milestone US$2,30.
- **Bila terbit:** uji luar dan putusan mekanis persis menurut `docs/bukti/m2d7-praregistrasi.md` (penguji subagent Claude opus baru, sinkron, jawaban mentah disimpan; kode `pengecoh-putusan.ts`).
- **Bila tidak terbit:** putusan TIDAK (syarat (a)). Omongan yang dikunci (bila ada) diuji di luar dengan prosedur yang sama, hanya untuk laporan. **Draf terbaik** untuk penyetuju: per posisi omongan, versi yang dikunci; bila tidak ada, versi yang sampai paling jauh di urutan tumpukan (kode → artefak → pilihan-saja → pembaca kartu → kritikus → penebak), seri → butir penolakan paling sedikit → putaran paling akhir. Tidak disunting.

## 9. Pagu (biaya nyata, ditegakkan kode)

Milestone US$2,30 atas semua tag `m2d8/`; bagian: probe US$0,25, kalibrasi US$0,70, pemanasan US$0,25, jalan TIRT = sisa milestone. Pagu kumulatif `LLM_PAGU_USD` bisa berhenti lebih dulu; bila itu terjadi, kerja berhenti dan dilaporkan.
