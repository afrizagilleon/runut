# Pra-registrasi M2d-10 Amandemen A-1: satu jalan TIRT lagi

Berkas ini di-commit **sebelum panggilan berbayar pertama Amandemen A-1** dan tidak diubah sesudahnya. Keadaan ledger OpenRouter saat ditulis: 1.180 entri, entri terakhir `2026-09-30T17:43:57.523Z`, total US$8,638053; biaya milestone M2d-10 (tag `m2d10/` + `penyusun/m2d10-`) US$0,372825. Tidak ada entri bertag `penyusun/m2d10-tirt-a1/`. Siapa pun bisa memeriksanya: entri `penyusun/m2d10-tirt-a1/` pertama di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini.

Dasar: Amandemen A-1 reviewer (kontrak M2d-10 §10). **Tidak diubah:** `docs/bukti/m2d10-praregistrasi.md` dan `docs/bukti/m2d7-praregistrasi.md`. Patokan layak tayang tetap pra-registrasi M2d-7 (empat syarat a–d, prosedur penguji luar).

## 1. Setelan tumpukan (aturan kalibrasi yang benar)

Aturan §4 pra-registrasi M2d-10 cacat urutannya: pembaca kartu baru boleh dilonggarkan sesudah penebak turun ke S7, padahal penebak tidak menolak satu pun soal tayang. Aturan A-1: **longgarkan hanya gerbang yang menolak soal tayang** — di data kalibrasi yang sudah ada (tanpa panggilan baru), satu-satunya gerbang yang menolak soal tayang dan bisa dilonggarkan adalah pembaca kartu. Setelan = **S1 + pembaca kartu "dicatat"** (`SETELAN_TEMPLAT_A1`):

- penebak keluarga campur (Haiku → DeepSeek → GLM) **MENOLAK** bila ≥ 2/3 memilih kunci ATAU Haiku memilih kunci dengan yakin ≥ 60 (tak terbaca = kunci, yakin 100); henti dini seperti §3 pra-registrasi M2d-10;
- pembaca kartu **dicatat** (dijalankan, tidak menolak);
- kritikus makna GLM tingkat 1 (`kunci`, `makna`, `aturan` menolak).

Pada data kalibrasi M2d-10 (`eval/keluaran-m2d10/kalibrasi/mentah.json`, dites): soal tayang diterima **5/6** (ULTJ siapa-yang-membeli ditolak kritikus, keberatan `kunci`); soal bocor terukur tertangkap sebelum kritikus **3/3**.

## 2. Kritikus dikunci ke penyedia yang terbukti berpikir

Bukti ledger (semua panggilan kritikus GLM `effort: "high"` M2d-6…M2d-10): **Wafer 57/57** berpikir ≥ 1.000 token (median 12.983); SiliconFlow 0/7, Phala 1/9, Cloudflare 0/1, AtlasCloud 0/2, Parasail 0/1, Friendli 0/1, Fireworks 1/2, PrimeIntellect 1/1, Alibaba 1/1. Maka untuk panggilan **kritikus** saja:

- `provider.order: ["wafer"]`, `allow_fallbacks: false`, tanpa `provider.ignore` (ulangan penjaga penalaran tetap ke Wafer); kuantisasi, `max_price`, `require_parameters`, `data_collection` sama dengan pagar M2d-7 (`pagarKritikusTerkunci`).
- Bila panggilan kritikus gagal (Wafer tidak tersedia atau galat penyedia): diulang paling banyak **3 percobaan dengan jeda 60 detik**; bila tetap gagal, atau bila respons datang dari penyedia selain Wafer, **jalan BERHENTI** dan dilaporkan (`PenyediaTidakTersedia`) — tidak pernah dialihkan.
- Setelan kritikus lain tetap: `max_tokens` 40.000, ambang penalaran 1.000.
- Panggilan GLM lain (penebak ke-3) tetap pagar M2d-7 (Wafer lebih dulu, fallback boleh); penebak GLM yang tak terbukti berpikir tetap dihitung "tak terbaca = kunci".

## 3. Mesin

Mesin templat yang sudah diperbaiki (commit `7348cec`): kritikus tidak menjawab dua kali = versi itu ditolak, rencana TIDAK dibuang; paling banyak 4 versi per rencana (≤ 2 penyempurnaan), 3 rencana per posisi (pra-registrasi M2d-10 §3). Penulis, penyempurna, templat, pemilih pola, dan gerbang kode tidak berubah.

## 4. Satu jalan

- Tepat **satu** jalan: `npm run templat:jalan -- --id m2d10-tirt-a1 --pagu 0.45` → pintu penyusun, mesin `templat`, TIRT, 10 Desember 2025, jendela 10; log tahapan di `eval/penyusun/m2d10-tirt-a1/`.
- **Pagu jalan US$0,45** (biaya nyata, ditegakkan kode; ±US$0,4 sisa pagu milestone untuk rekaman demo).
- Draf tidak disunting tangan dan tidak dipasang ke produk.

## 5. Uji luar dan putusan

Persis pra-registrasi M2d-7: bila **terbit**, ketiga omongan diuji — 3 penguji tebak buta + 3 penguji kartu, subagent Claude opus **baru**, **sinkron**, masing-masing hanya menerima isi satu berkas bahan (`npm run templat:penguji -- --bahan`, benih tetap), jawaban mentah disimpan; kealamian dilaporkan bila dijalankan, bukan syarat; putusan mekanis `putusanTayang`. Bila **tidak terbit**, syarat (a) gagal dan putusannya TIDAK; omongan yang dikunci diuji luar hanya untuk laporan.
