# Amandemen teknis T1 M2d-15 — penalaran penulis dibatasi 8.000 token

Amandemen ini memakai aturan yang **sudah tertulis** di pra-registrasi `docs/bukti/m2d15-praregistrasi.md` §9, butir kedua: "bila parameter diterima tetapi tidak dipatuhi — dua panggilan penulis pertama jalan 1 sama-sama berhenti di `max_tokens` tanpa JSON terbaca — setelan diganti sama seperti di atas untuk sisa milestone". Teks pra-registrasi dan amandemen pra-data A1–A3 tidak diubah.

## Bukti (ledger `.cache/llm/ledger.jsonl`, jalan `m2d15-opus-1`)

Setelan yang diminta: `reasoning: { effort: "medium" }`, `max_tokens` 16.000, penyedia Azure.

| tag | token masuk | token keluar | token penalaran | finish | biaya nyata | hasil |
|---|---|---|---|---|---|---|
| `p1/tulis-bebas` | 11.688 | 16.000 | 16.000 | length | US$0,366752 | tidak ada objek JSON |
| `p1/tulis-bebas/u1` | 11.688 | 16.000 | 14.372 | length | US$0,366752 | JSON terpotong (tak terurai) |

Kedua panggilan penulis pertama jalan 1 berhenti di `max_tokens` tanpa JSON terbaca. Syarat §9 terpenuhi.

**Tafsiran.** Di effort "medium", Opus 5.5 memakai hampir seluruh 16.000 token untuk berpikir. Di effort "low" pada M2d-13 angkanya 2,6–4,6 rb token. Ini sejenis dengan kasus DeepSeek di M2d-13: parameter diterima, tetapi panjang penalaran tidak dibatasi.

## Setelan baru (sisa milestone)

- `reasoning: { max_tokens: 8.000 }`, yaitu 0,5 × `max_tokens`, padanan "medium" di dokumentasi OpenRouter.
- `max_tokens` 16.000, suhu 1,0, prompt v2, bank sudut A1, pra-periksa, dan semua gerbang **sama**.
- Kode: `SETELAN_PENULIS_M2D15_T1` dan `PROFIL_M2D15` di `factory/llm/bebas/mesin.ts`, dites di `factory/llm/bebas/amandemen-t1.test.ts`.

Bila setelan ini juga tidak membuahkan JSON terbaca, tidak ada amandemen lain yang terdaftar. Jalan berlanjut menurut aturan tulis-gagal, dan hasilnya dilaporkan apa adanya.

## Nasib jalan 1

- **Penghentian.** Proses jalan 1 (PID 10544, milik eksekutor) dihentikan eksekutor sesudah panggilan kedua. Tujuannya mencegah panggilan berikutnya dengan setelan yang terbukti gagal.
- **Panggilan versi 2.** Saat proses dihentikan, panggilan versi 2 kemungkinan sudah dikirim, dan responsnya tidak pernah diterima. Panggilan itu dicatat di ledger dengan **perkiraan maksimum** US$0,414208 (`dasar_biaya: perkiraan-maksimum`, `tanpa_cost: true`). Ini sama dengan aturan `PencatatBiaya` untuk respons tanpa `usage`. Tagihan sebenarnya tidak diketahui dan paling banyak sebesar itu.
- **Hitungan jalan.** Jalan 1 dihitung sebagai jalan yang **tidak terbit**: 0 omongan terbaca, versi 1 tulis-gagal untuk ketiga omongan, dihentikan. Biayanya US$0,733504 nyata + US$0,414208 perkiraan = US$1,147712, dan masuk D-4.
- **Jalan 2.** Jalan 2 dijalankan menurut §6 + A2. Pagunya = min(US$2,00; US$2,70 − US$1,147712) = US$1,5522. Tidak ada jalan ke-3 (maks 2 jalan).
- **Folder dan catatan.** Folder `eval/penyusun/m2d15-opus-1/` berisi log sampai penghentian. `dihentikan.json` mencatat keputusan ini. Pintu tidak sempat menulis `hasil.json`.
