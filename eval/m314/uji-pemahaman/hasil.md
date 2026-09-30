# M3.14 D-5 — hasil uji pemahaman pemandu

Rubrik dan aturan tafsir: `rencana.md` (di-commit sebelum penguji pertama, `16a2036`). Jawaban mentah: `jawaban/*.txt` (10 subagent Claude Opus baru, sinkron, hanya membaca gambar di `bahan/`). Penilaian oleh eksekutor menurut rubrik.

## Per penguji
| penguji | paham-tugas | JAWAB | benar | jebakan-c | dua-klaim | catatan tentang pemandu |
|---|---|---|---|---|---|---|
| dengan-1 | 1 | b | 1 | 0 | 0 | membantu; panel "nutupin bagian bawah layar, kerasa sempit" |
| dengan-2 | 1 | b | 1 | 0 | 0 | cukup membantu; langkah 2–3 panel "nutupin setengah bawah layar", kartu hitungan terpotong |
| dengan-3 | 1 | b | 1 | 0 | 0 | membantu; langkah 3 "nunjuk tombol yang belum kelihatan di layar" |
| dengan-4 | 1 | b | 1 | 0 | 0 | membantu; langkah 3 "agak kurang penting" |
| dengan-5 | 1 | b | 1 | 0 | 0 | lumayan membantu; langkah 3 "agak kepanjangan"; pilihan sempat tertutup panel |
| tanpa-1 | 1 | b | 1 | 0 | 0 | — |
| tanpa-2 | 1 | b | 1 | 0 | 1 | — ("c kelihatan menggoda") |
| tanpa-3 | 1 | b | 1 | 0 | 0 | — |
| tanpa-4 | 1 | b | 1 | 0 | 1 | — |
| tanpa-5 | 1 | b | 1 | 0 | 1 | — ("sempat kepikiran jawaban c") |

## Ringkasan
| lengan | paham-tugas | benar | jebakan-c | dua-klaim (eksploratif) |
|---|---|---|---|---|
| dengan pemandu | **5/5** | **5/5** | 0 | 0/5 |
| tanpa pemandu | **5/5** | **5/5** | 0 | 3/5 |

## Tafsir (menurut aturan yang ditulis sebelumnya)
1. **Tidak diskriminatif** (aturan 2): kedua lengan 5/5 pada paham-tugas dan benar. Opus yang memerankan orang awam sudah paham tugas tanpa pemandu — seperti di M3.13 (V0 5/5, sedangkan pemain sungguhan 2/11). Uji ini TIDAK membuktikan pemandu menaikkan pemahaman; data alpha sesudah deploy yang menentukan (ukuran yang bisa dibaca dari peristiwa yang ada: `kunci_jawaban.benar` soal 1 untuk sesi `kunjungan_ke` 1 sebelum/sesudah, dan `ketuk` uid `pemandu:lewati:n` / `pemandu:selesai:4`).
2. Aturan 1 (lengan dengan lebih buruk ≥ 2/5) **tidak terpicu**.
3. Di luar rubrik utama, dicatat jujur: penguji tanpa pemandu lebih sering memisahkan dua klaim sendiri ("naik 22 kalinya bener, tapi…": 3/5 lawan 0/5). Dugaan (belum diuji): lengan dengan pemandu sudah diberi tahu kartu mana yang menentukan (langkah 3), jadi tidak perlu menimbang kartu harga. Semua tetap benar; tidak ada yang memilih c.
4. Aturan 3 — keluhan pemandu pada ≥ 2 penguji, diteruskan ke putaran perbaikan D-6:
   - **Panel menutupi separuh bawah layar** (dengan-1, -2, -5): 3/5.
   - **Langkah 3 ("Minta petunjuk") menunjuk tombol yang belum terlihat / kepanjangan / kurang penting** (dengan-3, -4, -5): 3/5.
5. Keluhan di kedua lengan yang BUKAN tentang pemandu (dicatat, di luar batas M3.14): salinan balon melayang ("garis hijau di atas", 5/10 tidak tahu itu apa), kata "Per 1 Agustus" dan "menyetop sementara jual-beli" di kartu (6/10), tombol "↓ Pilih jawaban" menutupi kartu kedua di layar pertama soal.
