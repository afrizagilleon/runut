# M3.13 D-2 — kalimat kartu ULTJ `dividen-tercatat`

Ditulis sebelum penguji dijalankan.

- **Kalimat lama** (kalimat resmi kartu "Riwayat dividen · 2020–2026", tampil di panel "Buka dokumennya",
  soal 2 ULTJ): "Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang
  pernah terjadi." — ditandai membingungkan oleh ketiga penguji kartu M2d-4 (`eval/keluaran-m2d4/ringkasan.json`).
- **Kalimat baru (K1)**: "Daftar ini belum tentu lengkap: bisa saja ada pembagian yang terjadi tetapi tidak
  tercatat di sini." — kalimat yang sama sudah dipakai paket LLM sejak M2d-5 (`PERJELAS_KLAIM` di
  `factory/llm/paket.ts`), jadi produk dan paket kembali memakai kalimat yang sama. Tanpa angka; kalimat
  pertama (7 pembagian, 3 September 2020 sampai 4 Mei 2026) tidak disentuh.
- **Uji**: 3 pembaca kartu Opus baru, layar soal 2 ULTJ dengan kartu 1 terbuka (teks layar sungguhan
  360 × 640, kalimat lama diganti K1). Ditanya JAWAB, KARTU, ARTI (arti kalimat itu dengan kata sendiri),
  BINGUNG.
- **Lolos** bila: 3/3 JAWAB = a (kunci tidak berubah), dan 3/3 ARTI menyatakan bahwa daftarnya mungkin tidak
  lengkap / bisa ada pembagian yang tidak tercatat, dan tidak ada yang menyebut kalimat K1 di BINGUNG.
- Bila gagal: satu kalimat pengganti lain, diuji dengan 3 penguji baru, aturan sama.
