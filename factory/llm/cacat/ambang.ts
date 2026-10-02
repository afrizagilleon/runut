/**
 * Ambang detektor cacat M2d-11 HASIL kalibrasi mekanis (pra-registrasi §2) atas
 * 6 soal tayang — `eval/keluaran-m2d11/cacat/kalibrasi.json`, dites sama dengan
 * `kalibrasiAmbang`. Tidak disetel tangan; dibekukan sebelum panggilan berbayar.
 *
 * Jalur kalibrasi (2 Okt): awal 4/6 soal tayang ditandai (D6 ×3, D5 ×2, D2 ×1)
 * → D6 L1 → D5 L1 → D6 L2 → D2 L1 → 1/6 (DADA s2: "cuma" hanya di kunci, D6).
 */
import type { AmbangCacat } from './detektor.ts';

export const AMBANG_M2D11: AmbangCacat = { D1: 0, D2: 1, D3: 0, D4: 0, D5: 1, D6: 2, D7: 0, D8: 0, D9: 0 };
