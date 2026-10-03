# Gerbang tebak v2 — uji plasebo atas data tersimpan (M2d-16 D-1, D-2, D-3)

Dibuat `npm run rotasi:plasebo -- --tulis` (`factory/llm/rotasi/plasebo.ts`). Semua angka dihitung ulang dari berkas tersimpan; tidak ada panggilan model. Tes `factory/llm/rotasi/plasebo.test.ts` menggagalkan build bila berkas ini berbeda dari keluaran skrip.

## 1. Kenapa aturan lama diganti

Aturan lama (`agregasiRotasi`, pra-registrasi M2d-11 §3.4): sebuah soal gagal bila SATU model di SALAH SATU dari dua kondisi memilih isi kunci di ≥ 3 dari 4 rotasi, atau bila proporsi kunci pesan+pilihan > 5/12. Penebak disetel suhu 0, jadi tiap model cenderung memilih isi yang sama di semua rotasi — apa pun isinya. Laju tolak-palsu aturan itu tidak pernah dihitung sebelum dipra-registrasi (audit 3 Okt, Temuan 1). Aturan lama, pra-registrasinya, dan laporannya TIDAK diubah; v2 berdiri di sampingnya.

## 2. Cara uji plasebo

- Data: `eval/keluaran-m2d11/uji-ulang/mentah.json` (33 soal lama) + semua `eval/penyusun/m2d1[135]-*/hasil.json` (37 versi jalan yang sampai ke tebak rotasi) = 70 butir, masing-masing 24 jawaban tersimpan (3 model × 4 rotasi × 2 kondisi).
- Kunci palsu: tiap pengecoh diperlakukan seolah-olah kunci → 210 kunci palsu. Penebak tidak bisa "menebak" jawaban yang salah, jadi aturan yang sehat hampir tidak pernah menolak kunci palsu.
- "Ditolak" aturan lama = putusan bukan `lulus` (gagal, abu-abu, tak-terukur) — begitulah mesin memperlakukannya. "Ditolak" v2 = putusan `tolak`; `tak-terukur` dihitung terpisah (bukan lulus, bukan tolak).
- Jawaban memakai pemetaan salinan yang TERSIMPAN (pencocok lama), supaya angka sebanding dengan skrip acuan reviewer. Pengaruh pencocok v2 dilaporkan terpisah di §5.

## 3. Aturan v2 (saringan murah)

`agregasiRotasiV2` (`factory/llm/rotasi/rotasi-v2.ts`):

- jawaban tak terbaca DIBUANG dari hitungan dan dilaporkan jumlahnya (aturan lama menghitungnya sebagai "memilih kunci");
- tak terbaca lebih dari sepertiga jawaban kondisi pesan+pilihan → `tak-terukur`;
- uji binomial satu sisi atas jawaban pesan+pilihan, semua model digabung, terhadap peluang acak 0,25: tolak bila p < 0,01 (untuk 12 jawaban terbaca: kunci ≥ 8);
- tidak ada aturan "satu model ≥ 3/4" dan tidak ada model yang diabaikan karena bias huruf;
- kondisi pilihan-saja hanya diagnosis yang dicatat, bukan penolak.

## 4. Hasil

| aturan | kunci asli ditolak | kunci palsu ditolak | soal tayang tidak ditolak | tak-terukur |
|---|---|---|---|---|
| lama (M2d-11) | 51/70 (72,9 %) | 94/210 (44,8 %) | 3/6 | 0 asli, 0 palsu |
| v2 (binomial p < 0,01, pesan+pilihan) | 16/70 (22,9 %) | 18/210 (8,6 %) | 6/6 | 1 asli, 3 palsu |

Angka acuan reviewer memakai pembulatan ke bawah: lama 72 % / 44 %, v2 22 % / 8 % — sama dengan hitungan di atas (51/70, 94/210, 16/70, 18/210).

Soal tayang (disusun bersama pemilik) per aturan:

| soal tayang | lama | v2 |
|---|---|---|
| tayang-dada-s1-kata-bursa | gagal | lulus |
| tayang-dada-s2-dividen-pemilik-kecil | gagal | lulus |
| tayang-dada-s3-siapa-yang-menjual | lulus | lulus |
| tayang-ultj-turun-di-tanggal-ex | lulus | lulus |
| tayang-ultj-riwayat-dividen | gagal | lulus |
| tayang-ultj-siapa-yang-membeli | lulus | lulus |

Versi jalan agen yang ditolak aturan lama tetapi tidak ditolak v2: 19.

| butir | lama | v2 | kunci pesan+pilihan (terbaca) |
|---|---|---|---|
| m2d11-tirt-2:o1v1 | gagal | lulus | 7/12 |
| m2d11-tirt-2:o1v2 | gagal | lulus | 6/12 |
| m2d11-tirt-2:o1v3 | gagal | lulus | 5/12 |
| m2d11-tirt-3:o1v1 | abu-abu | lulus | 5/12 |
| m2d11-tirt-4:o1v2 | abu-abu | lulus | 5/12 |
| m2d11-tirt-4:o1v3 | gagal | lulus | 5/12 |
| m2d11-tirt-5:o1v2 | abu-abu | lulus | 5/12 |
| m2d11-tirt-5:o1v3 | abu-abu | lulus | 5/12 |
| m2d11-tirt-5:o1v4 | abu-abu | lulus | 5/12 |
| m2d11-tirt-6:o1v3 | abu-abu | lulus | 5/12 |
| m2d11-tirt-7:o1v1 | abu-abu | lulus | 5/12 |
| m2d11-tirt-7:o1v2 | abu-abu | lulus | 5/12 |
| m2d13-haiku-1:o1v3 | gagal | lulus | 1/12 |
| m2d13-opus-1:o1v1 | gagal | lulus | 5/12 |
| m2d13-opus-1:o1v2 | gagal | lulus | 2/12 |
| m2d13-opus-2:o2v1 | gagal | lulus | 7/12 |
| m2d15-opus-3:o2v1 | gagal | lulus | 6/12 |
| m2d15-opus-3:o1v2 | gagal | lulus | 3/12 |
| m2d15-opus-3:o2v2 | gagal | tak-terukur | 0/1 |

Tak terbaca per model (pencocok lama, 70 butir): anthropic/claude-haiku-4.5 67/560; deepseek/deepseek-v4.1-flash 15/560; z-ai/glm-5.3 13/560.

## 5. Pencocok salinan v2

Pencocok lama (Dice bigram, harus unggul ≥ 0,05 dari opsi kedua) menandai salinan PERSIS sebagai tak terbaca bila pilihan-pilihannya mirip — justru soal berpilihan sejajar yang diminta aturan penulisan. `petakanSalinanV2` mendahulukan cocok persis sesudah normalisasi (rujukan `[[id|teks]]` → teks, huruf kecil, tanda baca → spasi); Dice hanya dipakai bila tidak ada yang persis.

Atas salinan tersimpan butir jalan yang pilihannya ikut tersimpan: 48 jawaban tak terbaca (pencocok lama), 23 di antaranya terbaca oleh pencocok v2. Salinan tersimpan dipotong 300 karakter, jadi ini batas bawah.

Contoh: `m2d15-opus-3` omongan 2 versi 2 — 23 tak terbaca menjadi 23 terbaca (21 memilih kunci, 2 memilih pengecoh); aturan lama menghitung semuanya sebagai kunci. Dengan jawaban yang dipetakan ulang, putusan v2 butir ini: `tolak`.

## 6. Penebak kuat satu-soal (D-3)

Jalur gerbang berbayar baru (`factory/llm/rotasi/penebak-kuat.ts`; belum pernah dijalankan berbayar): Opus 5.5, effort "low", SATU soal per panggilan, 4 rotasi, tanpa kartu, prompt sama dengan penebak rotasi pesan+pilihan. Tolak bila isi kunci dipilih di ≥ 3 rotasi terbaca. Urutan gerbang baru: kode → saringan murah v2 → pembaca kartu r0+r2 → penebak kuat → kritikus GLM.

Dasar dari audit Opus satu-soal tersimpan (`eval/keluaran-m2d13/audit-opus`, `eval/keluaran-m2d15/audit-opus`; 15 butir × 4 rotasi): Opus konsisten (≥ 3/4) memilih KUNCI di 10 butir, konsisten memilih satu PENGECOH di 3, tak konsisten di 2.

Perkiraan laju tolak-palsu, dengan jujur: (a) plasebo — tiap pengecoh diperlakukan sebagai kunci: 3/45 (6,7 %) ditolak; (b) dari 5 butir yang kuncinya tidak dipilih konsisten, Opus tetap konsisten pada satu isi di 3 — bila soal yang tak tertebak membuat Opus "menempel" pada satu isi sesering itu dan isi itu acak di antara empat, kunci terkena kebetulan ±15,0 %. Kedua angka berasal dari 15 butir saja (selang kepercayaannya lebar), dari audit yang memakai subagent Opus dan prompt audit (dengan "yakin 0–100"), BUKAN dari jalur API effort "low" dengan prompt penebak rotasi yang akan dipakai gerbang. Angka sebenarnya baru diketahui sesudah gerbang ini dijalankan pada soal baru.

## 7. Batas

- Aturan v2 dipilih SESUDAH melihat data ini (reviewer mencoba beberapa aturan pada 70 butir yang sama). Angka di atas karena itu optimistis; aturan harus dikonfirmasi pada soal baru sebelum dijadikan dasar klaim.
- Uji plasebo mengukur tolak-palsu, bukan daya tangkap: aturan v2 lebih longgar daripada aturan lama, jadi soal yang memang tertebak lebih mungkin lolos saringan murah. Karena itu saringan murah bukan gerbang terakhir — penebak kuat (§6) berdiri sesudahnya.
- 70 butir bukan sampel acak: 33 soal lama + versi jalan tiga milestone pada satu emiten (TIRT), banyak yang serumpun.
- Kunci palsu bukan soal "tak tertebak" murni: pengecoh ditulis supaya tampak masuk akal, tetapi juga bisa lebih atau kurang menarik daripada kunci yang tak tertebak.
