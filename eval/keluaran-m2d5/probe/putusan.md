# Probe batas penalaran M2d-5 (D-3, T-07a) — putusan

Dua putaran probe (`npm run tirt:probe`, lalu `npm run tirt:probe -- --putaran-2`), tag `m2d5/probe/`, pagu probe US$0,40 ditegakkan kode. **Biaya nyata (usage.cost): US$0,0636 dalam 16 panggilan.** Data mentah: `probe-penalaran.json`, `probe-penalaran-2.json`; konsol: `../probe-konsol.txt`, `../probe-konsol-2.txt`.

Bahan: penulis = omongan 1 TIRT (paket M2d-5, sudut pertama, prompt M2d-5); kritikus, penebak, pembaca kartu = omongan 2 TIRT M2d-4 yang terakhir diperiksa ("Aku hafal polanya, saham begini naiknya beruntun terus, minggu lalu juga gitu kan?", kunci b).

| panggilan | max_tokens | badan | penyedia | finish | keluar | penalaran | US$ | s | terurai / mutu |
|---|---:|---|---|---|---:|---:|---:|---:|---|
| kartu/bawaan | 8000 | — | AtlasCloud | stop | 5351 | 5293 | 0.002514 | 38 | ya: b (= kunci); 0 membingungkan |
| penebak-deepseek/bawaan | 16000 | — | Relace | stop | 988 | 863 | 0.000600 | 27 | ya: b/60 |
| penebak-glm/r1500 | 3500 | reasoning 1500 | Sail Research | stop | 70 | 1 | 0.000308 | 1 | ya: a/45 |
| penebak-glm/r3000 | 5000 | reasoning 3000 | Morph | stop | 522 | 425 | 0.001708 | 6 | ya: c/35 |
| penulis/tanpa-berpikir | 8000 | reasoning enabled=false | Together | stop | 442 | 0 | 0.002288 | 2 | TIDAK: JSON rusak (kurung penutup berlebih) |
| penulis/r8000 | 14000 | reasoning 8000 | AtlasCloud | length (kosong) | 14000 | 14000 | 0.007055 | 105 | TIDAK: penalaran tidak dibatasi, habis |
| penulis/r16000 | 22000 | reasoning 16000 | Together | stop | 11261 | 10866 | 0.015278 | 39 | ya: lolos validator |
| kritikus/r4000 | 7000 | reasoning 4000 | Wafer | stop | 481 | 199 | 0.003050 | 3 | ya: 1 keberatan; 1 bagian tak tercek |
| kritikus/r8000 | 11000 | reasoning 8000 | Wafer | stop | 471 | 326 | 0.002595 | 4 | ya: 0 keberatan |
| kritikus/r12000 | 15000 | reasoning 12000 | Wafer | stop | 494 | 183 | 0.002696 | 3 | ya: 2 keberatan; 1 bagian tak tercek |
| p2/kartu/r6000 | 12000 | reasoning 6000 | AtlasCloud | stop | 2963 | 2901 | 0.001425 | 23 | ya: b; 0 membingungkan |
| p2/kartu/r6000-b | 12000 | reasoning 6000 | DeepInfra | stop | 1102 | 1037 | 0.000554 | 10 | ya: b; 0 membingungkan |
| p2/penulis/r16000-b | 24000 | reasoning 16000 | AtlasCloud | length (kosong) | 24000 | 24000 | 0.011024 | 183 | TIDAK: penalaran tidak dibatasi, habis |
| p2/penulis/r16000-c | 24000 | reasoning 16000 | AtlasCloud | stop | 11379 | 10978 | 0.005269 | 87 | ya: lolos validator |
| p2/kritikus/r8000-b | 12000 | reasoning 8000 | Wafer | stop | 537 | 305 | 0.002885 | 4 | ya: 1 keberatan |
| p2/kritikus/r8000-c | 12000 | reasoning 8000 | Wafer | stop | 775 | 608 | 0.004343 | 5 | ya: 0 keberatan |

## Temuan

1. **`usage.cost` dan nama penyedia ada di setiap respons** (16/16); tidak ada entri "tanpa cost".
2. **DeepSeek berpikir secara bawaan** di OpenRouter (pembaca kartu tanpa medan `reasoning`: 5.293 token penalaran dari batas 8.000 — nyaris terpotong; penebak DeepSeek 863).
3. **AtlasCloud tidak mematuhi `reasoning.max_tokens` untuk DeepSeek**: batas 8.000 → berpikir 14.000 sampai `max_tokens` habis; batas 16.000 → 24.000 sampai habis (2 dari 3 panggilan penulis di AtlasCloud kosong, `finish_reason: length`, tetap ditagih). Penyedia lain (Together, DeepInfra) berhenti di bawah batas. Jadi `max_tokens` adalah batas keras yang sesungguhnya; penulis yang selesai memakai 10.866–10.978 token penalaran.
4. **GLM (Wafer) berpikir pendek** sebagai kritikus: 183–608 token di semua batas (4.000–12.000); tidak ada yang terpotong. Isi keberatannya berubah antar-sampel (0, 1, 2 keberatan pada soal yang sama) — itu keragaman model pada suhu 0,2, bukan akibat batas penalaran (penalarannya jauh di bawah batas).
5. **Penebak GLM pada 1.500 hampir tidak berpikir** (1 token) — penebak "kuat" D-5 M2d-4 kehilangan penalarannya; pada 3.000 ia berpikir 425 token.
6. Cadangan penulis tanpa berpikir (`reasoning.enabled: false`) menjawab dalam 2 detik tetapi JSON-nya rusak sekali (1 sampel) — tetap cadangan, sama dengan M2d-4.

## Putusan (ditulis di `factory/llm/penalaran.ts`, dites)

| peran | reasoning.max_tokens | max_tokens | alasan |
|---|---:|---:|---|
| penulis (DeepSeek) | 12.000 | 20.000 | menampung penalaran yang selesai (±11.000); penyedia yang tidak patuh tetap bisa selesai di bawah 20.000; putaran macet dibatasi ≤ US$0,024 (harga batas); terpotong → cadangan tanpa berpikir |
| kritikus (GLM) | 8.000 | 12.000 | >10× penalaran terukur; perkiraan maksimum per panggilan ±US$0,06 (M2d-4: 24.576 token, 14/44 terpotong) |
| penebak GLM | 3.000 | 5.000 | pada 1.500 GLM tidak berpikir; 3.000 cukup (425) |
| pembaca kartu (DeepSeek) | 6.000 | 12.000 | tanpa batas 5.293/8.000 — nyaris terpotong; dengan 6.000: 1.037–2.901 |
| penebak DeepSeek | — | 16.000 (tetap) | 863 token, jauh di bawah batas |

Setelan ini ditetapkan SEBELUM jalan TIRT dan tidak diubah di tengah jalan.
