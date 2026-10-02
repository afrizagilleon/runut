# Audit luar Opus M2d-11 — reviewer (2 Okt 2026)

> **KOREKSI (2 Okt malam): cara audit "tanpa kartu" di bawah cacat.** Paket memuat beberapa soal sekaligus (3 omongan TIRT-7 satu berkas; 3 soal ULTJ satu berkas), sehingga pilihan soal lain membocorkan jawaban (mis. "9 Desember Rp106" di omongan 1 menjawab omongan 2). Diulang **satu soal per subagent** — lihat bagian "Ulang: satu soal per penguji" di akhir. Angka "6/8 tertebak" di bawah TIDAK berlaku; yang berlaku 3/8. Pemilik menemukan gejalanya: Opus di claude.ai salah menjawab omongan 1 bila diberi satu soal saja.

Lampiran untuk `docs/bukti/lingkar-agen-pemula.md` (§2 H3, §5 draf TIRT, §8). Ditulis reviewer, bukan eksekutor. Audit ini **bukan bagian patokan** M2d-11 (pra-registrasi `docs/bukti/m2d11-praregistrasi.md`: Opus = audit akhir; "tanpa kartu benar" = sinyal ditinjau, bukan otomatis gagal).

## Cara
- 16 subagent Claude Opus baru, masing-masing hanya membaca SATU berkas `bahan/<kondisi>-r<n>.md`. Berkas disalin dulu ke folder terpisah tanpa `kunci.json`. Subagent tidak memakai web atau alat lain dan tidak melihat jawaban subagent lain.
- Jawaban mentah apa adanya ada di `eval/keluaran-m2d11/audit-opus/{tirt-7,uji-ulang}/jawaban/`. Skor dihitung kode dengan `npm run patokan:audit -- --nilai <folder>`, hasilnya di `nilai.json`.
- "Tanpa kartu" = pesan teman + pertanyaan + 4 pilihan, tanpa kartu. Ini kondisi yang sama dengan kondisi "pesan+pilihan" di protokol rotasi tiga keluarga. Tiap soal diuji di 4 rotasi siklik, sehingga kunci muncul tepat sekali di a, b, c, dan d.

## Hasil

| soal | Opus dengan kartu | Opus tanpa kartu | kunci lain (dengan kartu) | Haiku / DeepSeek / GLM tanpa kartu (rotasi M2d-11) |
|---|---|---|---|---|
| m2d11-tirt-7-o1 (angka-lain-waktu) | 4/4 | **4/4** | — | 1/4 · 1/4 · 2/4 |
| m2d11-tirt-7-o2 (arah-kali-tingkat) | 4/4 | **4/4** | — | 0/4 · 0/4 · 0/4 |
| m2d11-tirt-7-o3 (besaran-hitungan) | 4/4 | **4/4** | — | 2/4 · 2/4 · 1/4 |
| tayang DADA s3 (siapa yang menjual) | 4/4 | 0/4 | — | 0/4 · 0/4 · 0/4 |
| tayang ULTJ (turun di tanggal ex) | 4/4 | **4/4** | — | 1/4 · 0/4 · 1/4 |
| M2d-3 tirt-o1 | 4/4 | 0/4 | — | 0/4 · 2/4 · 1/4 |
| M2d-3 ultj-o2 | 4/4 | **4/4** | — | 0/4 · 0/4 · 2/4 |
| M2d-3 ultj-o1 | 4/4 | 3/4 | r0: d · r2: b | 0/4 · 0/4 · 0/4 |

Angka tiga keluarga dihitung dari jawaban terbaca yang isinya kunci, kondisi pesan+pilihan, versi yang lulus. Sumber: `eval/keluaran-m2d11/uji-ulang/mentah.json` dan `eval/penyusun/m2d11-tirt-7/hasil.json`.

## Temuan (fakta)
1. **Dengan kartu, Opus menjawab benar di 8/8 soal × 4/4 rotasi.** Kedelapan soal bisa dijawab dari kartu, dan jawabannya tidak bergantung pada letak kunci. Satu pengecualian: di soal lama M2d-3 ultj-o1, Opus menandai pilihan lain sebagai "juga benar" di 2 rotasi. Itu sinyal "lebih dari satu benar" untuk soal lama tersebut. Draf TIRT-7 tidak punya tanda serupa.
2. **Tanpa kartu, Opus memilih kunci ≥ 3/4 rotasi di 6/8 soal.** Ini mencakup ketiga omongan draf TIRT-7 (masing-masing 4/4) dan soal tayang ULTJ "turun di tanggal ex". Hanya DADA s3 dan M2d-3 tirt-o1 yang 0/4.
3. **H3 (eksploratif):** di 6 soal yang ditebak Opus tanpa kartu, tiga keluarga murah hanya mengenai kunci 0–2/4. Haiku tidak lebih dekat ke Opus daripada DeepSeek atau GLM; di soal-soal ini Haiku justru paling jarang mengenai kunci. **Bias seleksi:** kedelapan soal terpilih justru karena lolos tebak rotasi tiga keluarga. Karena itu tabel ini tidak bisa mengukur kesepakatan secara adil, dan H3 belum terjawab. Yang dibutuhkan adalah matriks penulis × penguji pada soal yang tidak disaring (rencana paper).

## Tafsiran reviewer (bukan fakta)
- **Draf TIRT-7 lulus patokan pra-registrasi M2d-11. Lulusnya tidak berarti "tidak tertebak oleh model kuat".** Penyaring rotasi tiga keluarga murah tidak membuang petunjuk yang dipakai pembaca kuat. Contohnya: kecocokan nada pesan dengan pilihan, kecurigaan pada teman yang terlalu yakin ("Gw yakin banget…", "santai aja wkwk"), dan pengecoh "nyaris-benar" yang terlalu dekat ambang (2,02 untuk "lebih dari dua kali lipat").
- Apakah **pemula** memakai petunjuk itu belum diketahui. Riset (Li dkk. 2025, ρ ≈ 0,28) dan data alpha menunjukkan tebakan LLM tidak mewakili pemain. Contohnya, soal tayang ULTJ "turun di tanggal ex" ditebak Opus 4/4 tanpa kartu, padahal di ringkasan 29 Sep pemain menjawabnya benar 11/15. Sebaliknya, DADA s3 tidak tertebak Opus (0/4), dan pemain menjawabnya benar 3/6. Jumlah pemain terlalu kecil untuk kesimpulan apa pun. Keputusan soal mana yang "terlalu mudah" butuh data pemain dengan n ≥ 30 per soal.
- **Catatan untuk penyetuju (pemilik), draf TIRT-7:**
  - (a) Omongan 1 memakai kata "kemarin". Kata itu hanya benar bila tanggal simulasi (10 Desember 2025) terlihat di layar. Di produk tanggal itu tampil; di paket audit tidak, tetapi Opus tetap 4/4 dengan kartu.
  - (b) Pengecoh Rp89 tidak ada di kartu, catatan kritikus.
  - (c) Ketiga omongan relatif mudah bagi pembaca yang teliti. Untuk latihan pemula ini wajar (tujuannya membiasakan membaca kartu), tetapi bukan bukti "sulit".

## Ulang: satu soal per penguji (2 Okt malam) — MENGGANTIKAN kolom "tanpa kartu" di atas
32 subagent Opus baru, masing-masing SATU soal × SATU rotasi, tanpa kartu, instruksi sama. Mentah: `eval/keluaran-m2d11/audit-opus/satu-soal/` (`bahan/`, `jawaban/`, `nilai.json`).

| soal | dibundel (cacat) | satu soal | tertebak (≥ 3/4)? |
|---|---|---|---|
| m2d11-tirt-7-o1 | 4/4 | 1/4 | tidak |
| m2d11-tirt-7-o2 | 4/4 | 4/4 | **ya** |
| m2d11-tirt-7-o3 | 4/4 | 2/4 | tidak |
| tayang DADA s3 | 0/4 | 1/4 | tidak |
| tayang ULTJ turun di tanggal ex | 4/4 | 2/4 | tidak |
| M2d-3 tirt-o1 | 0/4 | 2/4 | tidak |
| M2d-3 ultj-o2 | 4/4 | 4/4 | **ya** |
| M2d-3 ultj-o1 | 3/4 | 4/4 | **ya** |

**Fakta:** tertebak Opus tanpa kartu turun dari 6/8 (dibundel) menjadi **3/8** (satu soal). Tiga soal yang "tertebak" hanya karena dibundel: TIRT-7 o1, TIRT-7 o3, ULTJ tanggal ex. Keyakinan Opus 30–55 di semua jawaban.
**Tafsiran:** draf TIRT-7 omongan 1 dan 3 tidak tertebak model kuat; omongan 2 ("masih puluhan rupiah… santai aja wkwk") tertebak — kandidat ditulis ulang. Pelajaran metode: uji tebak harus satu soal per panggilan (protokol rotasi tiga keluarga M2d-11 sudah begitu; paket audit Opus yang tidak).
