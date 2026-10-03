# Bank omongan (M2d-16 D-6)

Folder ini SENGAJA kosong. Isinya baru ada sesudah jalan mesin v3 berbayar
(`npm run penyusun:v3`) — mengisinya butuh gerbang berbayar, dan itu di luar
M2d-16.

Bentuk:

```
eval/bank-omongan/<sha256 paket.json>/<id omongan>.json
```

- Satu berkas per omongan yang lolos SEMUA gerbang (kode → saringan murah v2 →
  pembaca kartu r0+r2 → penebak kuat → kritikus GLM). Omongan yang ditolak atau
  tak-terukur tidak pernah masuk.
- Isi berkas (`EntriBank`, `factory/llm/bebas/bank.ts`): `id` (16 heksadesimal
  pertama sha256 JSON kanonik draf), `paket_sha`, `kartu_penentu`, `omongan`
  (draf lengkap), `jejak_gerbang` (hasil tiap gerbang), `asal` (jalan, putaran,
  urutan, model penulis, sha256 prompt), `waktu`.
- Omongan yang kartu penentunya sudah ada di bank tetap disimpan sebagai
  alternatif untuk sudut itu.
- Penyusun simulasi (`pilihSimulasi`) mengambil tiga omongan yang kartu
  penentunya saling lepas, lalu menjalankan validator seluruh draf.
- Jalan penulis hanya menulis jumlah yang masih kurang (3 − jumlah sudut di
  bank untuk paket itu).

Berkas di sini ditulis kode; jangan disunting tangan.
