/**
 * Setelan tumpukan mesin templat hasil kalibrasi singkat M2d-10 (pra-registrasi
 * §4): `eval/keluaran-m2d10/kalibrasi/setelan.json` = `putusanKalibrasiTemplat(mentah.json)`,
 * dites sama. Diisi dari keluaran kalibrasi, tidak disetel tangan.
 *
 * Hasil (1 Okt): S1…S7 menerima 4/6 soal tayang — yang menolak adalah pembaca
 * kartu (ULTJ riwayat-dividen memilih b, kunci a; ULTJ siapa-yang-membeli
 * memilih b, kunci d), bukan penebak (0/6). Aturan pra-registrasi mencoba
 * keadaan penebak S1…S7 LEBIH DULU, jadi keadaan pertama yang memenuhi
 * syarat adalah "S7 + pembaca kartu dicatat": penebak DAN pembaca kartu
 * dijalankan dan dicatat, tidak menolak; kritikus tingkat 1 (menolak ULTJ s3,
 * keberatan `kunci`) → 5/6. Cacat urutan aturan ini dilaporkan
 * (`docs/bukti/lingkar-agen-templat.md`); aturannya tidak diubah sesudah data.
 */
import { KRITIKUS_TINGKAT_1, type SetelanTumpukan } from './gerbang.ts';

/**
 * Amandemen A-1 (`docs/bukti/m2d10-praregistrasi-a1.md` §1): aturan kalibrasi yang
 * benar = S1 + pembaca kartu "dicatat"; penebak tetap MENOLAK (≥ 2/3 atau Haiku
 * yakin ≥ 60); kritikus tingkat 1. Dipakai mesin templat sejak A-1.
 */
export const SETELAN_TEMPLAT_A1: SetelanTumpukan = {
  penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 60 },
  kartu: 'dicatat',
  kritikus: { jenis: KRITIKUS_TINGKAT_1, dicatat: false },
};

export const SETELAN_TEMPLAT_M2D10: SetelanTumpukan = {
  penebak: { aturan: 'dicatat', ambangHaiku: null },
  kartu: 'dicatat',
  kritikus: { jenis: KRITIKUS_TINGKAT_1, dicatat: false },
};
