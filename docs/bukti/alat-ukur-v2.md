# Alat ukur & pemanggil v2 (M2d-16)

Milestone ini memperbaiki alat ukur dan pemanggil model sesudah audit 3 Oktober 2026. **Tidak ada satu pun panggilan berbayar**: ledger 3.370 baris sebelum dan sesudah; semua tes memakai pemanggil palsu, `fetch` palsu, atau data tersimpan. Gerbang, pra-registrasi, laporan, dan data lama tidak diubah — yang baru berdiri di sampingnya.

Yang BELUM terbukti: semua jalur berbayar baru (penebak kuat, penulis v3, penyedia terkunci, teks berpikir) belum pernah menyentuh model sungguhan. Langkah berbayar pertama harus `--uji-satu-panggilan` (§5).

## 1. Apa yang berubah

| bagian | lama (tetap ada) | baru (berdampingan) |
|---|---|---|
| agregasi tebak rotasi | `agregasiRotasi` — satu model ≥ 3/4 menolak; tak terbaca dihitung kunci | `agregasiRotasiV2` — binomial p < 0,01 atas pesan+pilihan; tak terbaca dibuang; > 1/3 tak terbaca → tak-terukur |
| pencocok salinan | `petakanSalinan` — Dice, unggul ≥ 0,05 | `petakanSalinanV2` — cocok persis dulu, baru Dice |
| penebak kuat | — (audit Opus dijalankan reviewer sebagai subagent) | `tebakKuat` — Opus effort "low", satu soal × 4 rotasi, tolak bila kunci ≥ 3 rotasi terbaca |
| urutan gerbang | kode → tebak rotasi → kartu r0+r2 → kritikus | kode → saringan murah v2 → kartu r0+r2 → penebak kuat → kritikus |
| penyedia | hanya kritikus dikunci (Wafer) | semua peran dikunci lewat satu tabel (`PENYEDIA_PERAN`) |
| jawaban mentah | hanya jumlah token di `hasil.json` | `mentah-panggilan.jsonl`: jawaban + teks berpikir tiap panggilan |
| profil penulis Opus | effort "low", `max_tokens` 16.000 (M2d-15 T2) | effort "medium", `max_tokens` 128.000 |
| perkiraan pra-kirim | maksimum teoretis (`max_tokens` × harga) | wajar untuk Opus: US$0,37864; maksimum tetap dicatat |
| prompt penulis | v1 (±10,4 rb karakter sistem), v2 (±17,6 rb karakter sistem) + paket | v3: 8.773 karakter SELURUHNYA untuk paket TIRT-7, satu pesan pengguna |
| satuan kerja | tiga omongan sekaligus, lulus/gagal per simulasi | omongan dinilai satu per satu; yang lolos masuk bank; simulasi disusun dari bank |

Berkas baru: `factory/llm/rotasi/{rotasi-v2,jalan-v2,penebak-kuat,plasebo}.ts`, `factory/llm/pemanggil-v2.ts`, `factory/llm/bebas/{prompt-penulis-v3.md,teladan-dada-s3.json,prompt-v3,bank,mesin-v3,palsu-v3}.ts`, `alat/penyusun/{pemanggil-v3,jalan-v3}.ts`, `eval/bank-omongan/README.md`. Berkas lama yang disentuh (tambahan saja; tes lama tetap lulus): `factory/llm/klien.ts` (membaca `reasoning_details`), `factory/llm/pagu.ts` (opsi `perkiraanWajar`), `factory/llm/templat/penulis.ts` (jenis panggilan `gerbang-tebak-kuat`).

## 2. Uji plasebo gerbang tebak

Rincian, cara, dan batas: `docs/bukti/gerbang-tebak-v2.md` (dibuat `npm run rotasi:plasebo -- --tulis`, dites sama dengan keluaran skrip). 70 butir berdata rotasi, 210 kunci palsu (tiap pengecoh diperlakukan sebagai kunci):

| aturan | kunci asli ditolak | kunci palsu ditolak | soal tayang tidak ditolak |
|---|---|---|---|
| lama | 51/70 (72,9 %) | 94/210 (44,8 %) | 3/6 |
| v2 | 16/70 (22,9 %) | 18/210 (8,6 %) | 6/6 |

- Cocok dengan angka acuan reviewer (72 % / 44 % dan 22 % / 8 %, dibulatkan ke bawah).
- v2 tak-terukur: 1 kunci asli, 3 kunci palsu (aturan tak-terukur hanya atas kondisi pesan+pilihan — keputusan reviewer).
- Angka memakai pemetaan salinan yang TERSIMPAN. Dengan pencocok v2, 23 jawaban tak terbaca `m2d15-opus-3` omongan 2 versi 2 menjadi terbaca (21 kunci, 2 pengecoh) dan butir itu berubah dari tak-terukur menjadi tolak.
- Audit Opus satu-soal tersimpan (M2d-13 + M2d-15, 15 butir): konsisten kunci 10, konsisten satu pengecoh 3, tak konsisten 2. Plasebo penebak kuat: 3/45.
- **Batas:** aturan v2 dipilih SESUDAH melihat 70 butir ini. Ia harus dikonfirmasi pada soal baru sebelum dijadikan dasar klaim.

## 3. Penyedia terkunci per peran

Satu tabel: `PENYEDIA_PERAN` (`factory/llm/pemanggil-v2.ts`). Tiap panggilan mesin v3 membawa `provider.order = [slug]` + `allow_fallbacks: false` (pagar lama tetap: kuantisasi, `max_price` = harga daftar, `require_parameters`, `data_collection: deny`). Pasangan jenis × model di luar tabel ditolak sebelum kirim. Respons dari penyedia lain menghentikan jalan; tidak pernah dialihkan.

| peran | model | penyedia | alasan |
|---|---|---|---|
| penulis | Opus 5.5 | `anthropic` | Kontrak. Azure melayani 10/10 panggilan penulis Opus dan mengabaikan effort "medium" serta `reasoning.max_tokens` (16.000 token penalaran, 3 panggilan tanpa jawaban). Anthropic BELUM pernah melayani kita. |
| penebak kuat | Opus 5.5 | `anthropic` | Keputusan reviewer: sama dengan penulis. Belum ada panggilan penebak kuat di ledger. |
| penebak rotasi | Haiku 4.5 | `amazon-bedrock` | 642/642 panggilan, 0 token penalaran. |
| penebak rotasi | DeepSeek V4.1 Flash | `relace` | 22 penyedia, 599 panggilan; Relace terbanyak (219), 0 token penalaran saat penalaran dimatikan. GMICloud: 7 dari 12 panggilan menghabiskan 600 token untuk berpikir. |
| penebak rotasi | GLM-5.3 | `wafer` | 574/575 panggilan (effort "minimal", median 33 token penalaran). |
| pembaca kartu | DeepSeek V4.1 Flash | `wafer` | Keputusan reviewer (per peran). Batas penalaran 6.000 dilewati: Wafer 0 kali, Relace dan InferenceNet beberapa kali (tabel bawah). |
| kritikus | GLM-5.3 | `wafer` | Tetap (amandemen A-1 M2d-10): 57/57 panggilan berpikir ≥ 1.000 token; di M2d-11/13/15 7 panggilan, median 6.164. |

Bukti ledger (entri status 200 bertag M2d-11/13/15; `buktiPenyedia`, 3 Okt, 3.370 baris — ledger tidak terlacak git, angka ini salinan tangan dari keluaran fungsi itu):

| peran | penyedia | panggilan | median penalaran | maks penalaran | berpikir saat dimatikan | lewat batas diminta |
|---|---|---|---|---|---|---|
| penulis | Azure | 10 | 4.286,5 | 16.000 | 0 | 1 |
| penebak-haiku | Amazon Bedrock | 642 | 0 | 0 | 0 | 0 |
| penebak-deepseek | Relace | 219 | 0 | 0 | 0 | 0 |
| penebak-deepseek | InferenceNet | 107 | 0 | 0 | 0 | 0 |
| penebak-deepseek | Wafer | 90 | 0 | 0 | 0 | 0 |
| penebak-deepseek | GMICloud | 12 | 600 | 600 | 7 | 0 |
| penebak-glm | Wafer | 574 | 33 | 3.001 | 0 | 0 |
| pembaca-kartu | Relace | 39 | 1.013 | 11.724 | 0 | 3 |
| pembaca-kartu | InferenceNet | 21 | 720 | 11.856 | 0 | 1 |
| pembaca-kartu | Wafer | 8 | 502 | 2.643 | 0 | 0 |
| kritikus | Wafer | 7 | 6.164 | 10.565 | 0 | 0 |

Pembaca kartu atas SELURUH ledger kini (semua tag `gerbang-kartu`, batas 6.000): Wafer 0/20, Relace 4/61, InferenceNet 2/35 melewati batas — itulah angka "0/20" di keputusan reviewer. Bukti Wafer untuk peran ini tipis (8–20 panggilan).

## 4. Jawaban mentah + teks berpikir

Tiap panggilan mesin v3 menulis satu baris ke `<folder jalan>/mentah-panggilan.jsonl` SEBELUM jawabannya diperiksa apa pun (jadi jawaban terpotong atau dari penyedia yang salah tetap tersimpan):

```
{"waktu","tag","peran","jenis","model","penyedia","token_masuk","token_keluar","token_penalaran",
 "finish_reason","biaya_usd","latensi_ms","penalaran_diminta","max_tokens","prompt","isi","penalaran","ada_penalaran"}
```

- `prompt` = pesan yang dikirim, apa adanya (tambahan di luar daftar medan kontrak, supaya tiap prompt bisa dibaca reviewer); `isi` = jawaban mentah; `penalaran` = teks berpikir yang dikembalikan penyedia (`null` bila tidak ada).
- Teks berpikir diminta dengan `reasoning: {effort, exclude: false}` dan dibaca dari `message.reasoning` / `reasoning_content`, atau — bila keduanya kosong — dari `message.reasoning_details` (bagian `summary`/`text`; bagian terenkripsi tidak punya teks). Untuk Opus ini RINGKASAN berpikir, bukan pikiran mentah.
- Kunci API tidak pernah ditulis: `prompt`, `isi`, dan `penalaran` dilewatkan `samarkan()`; header tidak pernah disalin.
- Panggilan tanpa respons sama sekali (galat jaringan/batas waktu) tidak punya baris mentah; ia hanya ada di ledger.

## 5. Uji satu panggilan

```
npm run penyusun:v3 -- --uji-satu-panggilan --id <id> --pagu <usd> --setuju-berbayar
```

TEPAT satu panggilan penulis Opus (prompt v3, profil v3), lalu berhenti. Menyimpan `mentah-panggilan.jsonl` + `uji-satu-panggilan.json` di `eval/penyusun/<id>/` dan mencetak: token masuk/keluar/penalaran, penyedia, biaya nyata, `finish_reason`, ADA/TIDAK ADA teks berpikir, jumlah omongan terbaca, dan hasil gerbang kode gratis tiap omongan. Tanpa gerbang berbayar, tanpa bank.

- Tanpa `--uji-satu-panggilan`: jalan penuh mesin v3.
- `--palsu`: model palsu, tanpa jaringan; keluaran di folder sementara, bank palsu di dalam folder jalan (mode palsu ditolak menulis ke `eval/bank-omongan`).
- Mode sungguhan menolak tanpa `--setuju-berbayar`, `--pagu`, `--id`. Folder jalan lama tidak pernah ditimpa.

Yang harus dibaca dari uji pertama sebelum jalan penuh: (a) apakah penyedianya Anthropic; (b) berapa token penalaran pada effort "medium" dengan jendela 128.000; (c) apakah teks berpikir kembali; (d) apakah jawabannya JSON yang terurai; (e) biayanya.

## 6. Profil penulis Opus v3 dan penjaga biaya

- `SETELAN_PENULIS_OPUS_V3`: effort "medium", `max_tokens` 128.000, suhu 1, `reasoning.exclude: false`. Tidak ada `reasoning.max_tokens` (terbukti diabaikan di M2d-15; model ini tidak punya anggaran berpikir).
- Panduan resmi Opus 5.5: berpikir selalu aktif dan adaptif, `effort` pengatur utamanya, berpikir dihitung ke `max_tokens` walau teksnya tidak dikembalikan, 128.000 adalah maksimum model.
- **Kemungkinan terburuk, dengan jujur:** bila satu panggilan memakai seluruh jendela, biayanya 128.000 × US$20/juta ≈ US$2,56 (ditambah masukan). `max_tokens` 128.000 adalah keputusan pemilik (jangan batasi token Opus), bukan pembatas praktis. Karena itu uji satu panggilan ada untuk MENGUKUR pemakaian nyata lebih dulu.
- Perkiraan pra-kirim wajar = **US$0,37864** = 2 × median (US$0,18932) dari 10 panggilan penulis Opus tersimpan (M2d-13: 4, M2d-15: 6, termasuk 3 panggilan terpotong US$0,366752); dites terhadap `jejak-agen.json`. Dipakai juga untuk penebak kuat Opus (berlebih untuk panggilan satu soal effort "low").
- Sebelum SETIAP panggilan: biaya nyata tercatat + perkiraan wajar > pagu (pagu jalan, pagu milestone, `LLM_PAGU_USD`) → tidak dikirim. Jadi pagu bisa terlampaui paling banyak oleh selisih antara biaya nyata satu panggilan dan perkiraan wajarnya; panggilan berikutnya tidak akan dikirim.
- Biaya yang dicatat = `usage.cost` setiap kali ada respons — juga respons terpotong atau tak terbaca. Perkiraan MAKSIMUM teoretis hanya dicatat untuk panggilan tanpa respons sama sekali (galat jaringan, batas waktu), dan — aturan lama M2d-5 yang tidak diubah — untuk respons 200 tanpa `usage.cost`.

## 7. Prompt penulis v3, bank omongan, mesin v3

- `factory/llm/bebas/prompt-penulis-v3.md` = berkas reviewer, disalin apa adanya (sha256 dites). Kode hanya mengisi `{PAKET}`, `{JUMLAH}`, `{SUDUT_TERPAKAI}`, `{TELADAN}`; tidak ada aturan yang ditambahkan. Dikirim sebagai SATU pesan pengguna.
- Teladan = `teladan-dada-s3.json` (berkas reviewer: soal tayang DADA s3 tanpa kalimat pembuka berangka; label pengecoh, umpan balik, pertanyaan cek ditulis reviewer; pilihan dan penjelasan = soal tayang). Lolos `periksaKodeBebas` terhadap paket DADA dengan tepat dua pengecualian: `NAMA_TERLARANG` dan `anti-salin` (keduanya menyala untuk soal tayang mana pun dan menjaga keluaran penulis, bukan teladan). Teks teladan masuk himpunan anti-salin 5 kata untuk keluaran penulis.
- Tulis ulang tanpa keadaan: satu pesan pengguna baru = prompt v3 yang sama (`{JUMLAH}` = jumlah butir), lalu per butir "Draf sebelumnya" (JSON) dan "Belum bisa dipakai karena" (alasan gerbang yang menolak, apa adanya).
- Bank: `eval/bank-omongan/<paket-sha>/<id>.json` (draf + jejak gerbang + asal jalan). Omongan bersudut sama tetap disimpan sebagai alternatif. Penyusun simulasi mengambil tiga omongan berkartu-penentu saling lepas, lalu validator seluruh draf. Bank awal sengaja kosong.
- Mesin v3 (`jalankanV3`): baca bank → penulis menulis hanya yang kurang → tiap omongan dinilai sendiri lewat urutan gerbang baru → lolos masuk bank → paling banyak 3 putaran → simulasi disusun dari bank.

## 8. Keputusan reviewer 3 Oktober (sesudah eksekutor berhenti dan melapor)

Eksekutor berhenti sebelum menulis kode karena `{TELADAN}` tidak bisa dipenuhi seperti tertulis (ketiga soal tayang DADA gagal `periksaKodeBebas`). Keputusan reviewer:

1. Teladan = berkas reviewer `teladan-dada-s3.json`; dua pengecualian terdokumentasi; teks teladan masuk anti-salin keluaran.
2. Aturan tak-terukur hanya atas kondisi pesan+pilihan.
3. Penyedia dikunci per PERAN, bukan per model (tabel §3).
4. Profil penulis Opus v3 tetap effort "medium", `max_tokens` 128.000; kemungkinan terburuk didokumentasikan; tanpa `reasoning.max_tokens`.
5. Biaya = `usage.cost` setiap kali ada respons; maksimum hanya untuk panggilan tanpa respons; perkiraan pra-kirim = 2 × median panggilan penulis Opus tersimpan.
6. Prompt v3 = satu pesan pengguna; tulis ulang tanpa keadaan.
7. Omongan lolos tetap masuk bank walau kartu penentunya sudah ada; penyusun mengambil satu per kartu penentu.
8. Teks berpikir: `reasoning: {effort, exclude: false}`, dibaca dari `reasoning` / `reasoning_details`, disimpan di `mentah-panggilan.jsonl`; mode uji mencetak apakah teks berpikir kembali.

## 9. Keraguan dan hal yang belum terbukti

Uang dan penyedia:

1. Dokumentasi OpenRouter menyebut effort untuk model Anthropic dipetakan ke anggaran berpikir = rasio × `max_tokens` (medium 50 % → 64.000 dari 128.000). Opus 5.5 tidak punya anggaran berpikir. Perilaku nyata tidak diketahui; kemungkinan terburuk ±US$2,56 per panggilan. Dua halaman OpenRouter itu dibaca lewat ringkasan alat ambil-web, bukan dikutip kata demi kata.
2. `anthropic` belum pernah melayani kita. Belum diketahui apakah ia menerima `max_tokens` 128.000 pada permintaan tanpa streaming, apakah lolos pagar `require_parameters` + `max_price` 4/20, dan apakah effort dipatuhi. Bila tidak ada penyedia yang lolos, permintaan gagal tanpa biaya.
3. Batas waktu HTTP Opus dinaikkan ke 30 menit. Panggilan yang kehabisan waktu dicatat perkiraan maksimum (±US$2,6) dan menghentikan jalan berpagu kecil.
4. Respons 200 tanpa `usage.cost` dicatat perkiraan maksimum (aturan lama); dengan jendela 128.000 angka itu besar.
5. Perkiraan wajar Opus juga dipakai untuk penebak kuat (4–8 panggilan per omongan). Itu berlebih, jadi pemeriksaan pra-kirim bisa menolak panggilan penebak kuat saat sisa pagu < US$0,38 walau biaya nyatanya kecil.
6. Bukti Wafer untuk pembaca kartu DeepSeek tipis (0/8 di M2d-11/13/15; 0/20 seluruh ledger). Tanpa fallback, Wafer tidak tersedia = jalan berhenti.
7. Slug `amazon-bedrock` cocok dengan semua wilayah; wilayah yang lebih mahal seharusnya tersaring `max_price`. Belum diuji.

Alat ukur:

8. Aturan v2 dipilih sesudah melihat data (§2).
9. Perkiraan tolak-palsu penebak kuat (3/45; atau ±15 % dengan anggapan lain) berasal dari 15 butir audit subagent Opus dengan prompt audit, bukan dari jalur API effort "low" dengan prompt penebak rotasi.
10. Penebak kuat mengulang sekali jawaban tak terbaca (satu panggilan Opus tambahan) — keputusan eksekutor.
11. Sabotase "tak terbaca dihitung kunci" tidak mengubah hitungan plasebo v2 (16/70, 18/210); ia hanya tertangkap tes satuan D-1 dan tes kesamaan laporan.

Prompt, mesin, bank:

12. `mentah-panggilan.jsonl` juga menyimpan teks prompt tiap panggilan (medan `prompt`) — tambahan eksekutor di luar daftar medan kontrak D-4 (b), karena prompt tulis ulang bergantung pada keadaan jalan dan tidak bisa dibangun ulang dari sha saja. Berkasnya jadi lebih besar (±9 rb karakter per panggilan penulis).
13. Prompt v3 tidak menyebut aturan yang ditegakkan gerbang kode: nilai `jenis` yang sah (teladan hanya memperlihatkan dua), umpan balik wajib memuat nama jenis kesalahan + "kartu N", bentuk `angka_pesan`, nama terlarang, batas panjang. Penulis hanya bisa menirunya dari satu teladan; penolakan gerbang kode di putaran pertama patut diduga. Dilaporkan, tidak diubah.
14. Kartu penentu teladan (`fil-2025-08-25-03`) berbeda dari soal tayangnya (`jumlah-jual-terverifikasi`) — begitu di berkas reviewer.
15. Omongan tak-terukur tidak masuk bank dan tidak dikirim balik ke penulis (dibuang) — keputusan eksekutor.
16. Panggilan penulis tanpa satu pun omongan terurai menghentikan jalan (tanpa ulangan) — keputusan eksekutor.
17. `{JUMLAH}` tulis ulang = min(butir ditolak, yang masih kurang).
18. Penyusun simulasi hanya menjalankan validator seluruh draf; kemiripan antar omongan (G-mirip) tidak diperiksa lagi karena omongan dinilai sendiri-sendiri.
19. Pesan `PaguTercapai` masih berbunyi "perkiraan maksimum" walau angka yang dipakai perkiraan wajar.

Proses:

20. Merah-dulu: hanya tes D-2 dan D-4 (bagian murni) yang benar-benar dijalankan merah sebelum kodenya ada. Untuk D-1, D-3, D-5, D-6, dan D-4 (e) tes dan kode ditulis berurutan lalu dijalankan bersama. Tiap aturan baru disabotase (55 sabotase; semuanya membuat tes merah).
21. Satu sabotase D-4 (e) — pengaman "mode palsu tidak menulis ke bank sungguhan" dimatikan — menulis 3 berkas palsu ke `eval/bank-omongan/`. Berkasnya dihapus saat itu juga; sesudahnya entri mode palsu ditandai `penulis: "PALSU (tanpa model)"`.
22. e2e penyusun tidak dijalankan: halaman penyusun tidak berubah.
