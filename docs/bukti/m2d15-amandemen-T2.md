# Amandemen teknis T2 M2d-15 — penulis effort "low", penjaga probe dulu, satu jalan tambahan

Amandemen ini diminta reviewer pada 3 Okt sesudah laporan fase 2, dengan izin pemilik. Ia di-commit **sebelum panggilan berbayar berikutnya**.

Pra-registrasi `docs/bukti/m2d15-praregistrasi.md`, amandemen pra-data `m2d15-amandemen-A1.md`, dan amandemen teknis `m2d15-amandemen-teknis-T1.md` **tidak diubah**. Kodenya ada di `factory/llm/bebas/mesin.ts` (`SETELAN_PENULIS_M2D15_T2`, `PROFIL_M2D15`, `putusanPenjaga`), `pagu-m2d15.ts` (`rencanaJalanT2`), dan `alat/penyusun/jalan-opus.ts`. Tesnya di `factory/llm/bebas/amandemen-t2.test.ts`.

## Kenapa

Di Azure lewat OpenRouter, ketiga panggilan penulis Opus 5.5 yang punya respons sama-sama memakai seluruh 16.000 token keluaran untuk penalaran:
- dua panggilan dengan effort "medium";
- satu panggilan dengan `reasoning.max_tokens` 8.000 (T1).

Tidak satu pun menghasilkan JSON terbaca. Batas penalaran yang diminta tidak dipatuhi. Ini **temuan negatif teknis**: effort "medium" pada setelan ini **tidak teruji** untuk mutu soal.

## Isi amandemen

1. **Penulis effort "low"**, yaitu setelan M2d-13 yang terbukti menghasilkan draf Opus terbaca di Azure: 2,6–4,6 rb token penalaran, ±6 rb token keluar, ±US$0,15 per panggilan. Hal-hal berikut **tetap sama**:
   - `max_tokens` 16.000 dan suhu 1,0;
   - prompt v2 dan bank sudut A1;
   - pra-periksa kode (≤ 2 tulis-ulang per versi);
   - aturan versi (maks 3), gerbang, dan patokan §2 (a) + (b).
2. **Penjaga probe dulu (kode, dites).** Dua kondisi menghentikan jalan **seketika, tanpa ulangan**, dan alasannya dicatat di `hasil.berhenti`:
   - panggilan penulis **pertama** jalan tidak menghasilkan JSON terurai (`finish_reason` apa pun);
   - panggilan penulis mana pun (versi, ulangan, atau tulis-ulang pra-periksa) berhenti di `max_tokens` tanpa JSON terurai.
3. **Satu jalan tambahan** `m2d15-opus-3`, hanya bila kedua jalan pra-registrasi tidak terbit.
   - Pagu jalan = US$3,00 − biaya milestone (tag `penyusun/m2d15-` + `m2d15/`, **termasuk** dua entri perkiraan maksimum yang tetap bertanda `tanpa_cost`), dibulatkan ke bawah. Saat amandemen ditulis: US$3,00 − US$1,925892 = US$1,0741.
   - Pagu milestone US$3,00 **tidak berubah**. Batas D-4 US$2,70 tidak dipakai untuk jalan ini.
   - Penilai GLM D-5 hanya memakai sisa sesudah jalan, tanpa minimum US$0,30.
4. **Penyedia dicatat** untuk tiap panggilan penulis (`panggilan_penulis[].penyedia`, ledger `penyedia`), lalu dilaporkan.

## Batas klaim tambahan

- Jalan ini menguji **prompt v2 + pra-periksa + bank sudut pada effort "low"**. Effort "medium" **tidak teruji**.
- Pembanding terdekatnya adalah Opus M2d-13 (effort "low", prompt v1, tanpa pra-periksa). Selisihnya bisa diatribusikan ke prompt v2, pra-periksa, bank sudut, dan pagu jalan sekaligus, tidak ke satu faktor.
- Ini percobaan ke-3 di milestone yang sama. Peluang lulus karena kebetulan bertambah, dan jumlah jalan dilaporkan.
