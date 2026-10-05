/**
 * Guardrail budget percobaan agen (M2d-28). Murni, supaya bisa diuji dengan angka percobaan nyata.
 *
 * Riwayat cacat yang diperbaiki di sini: cadangan untuk "satu panggilan menulis lagi" dulu = 1,5 × panggilan
 * TERMAHAL. Panggilan termahal selalu panggilan menulis pertama (±US$0,26–0,29); panggilan perbaikan sesudahnya
 * hanya ±US$0,10. Akibatnya agen dihentikan tiga kali dengan uang yang sebenarnya cukup (m2d26-amag-naik-1 sisa
 * US$0,32; m2d27-amag-naik-2 sisa US$0,37; m2d27-amag-naik-3 sisa US$0,31 tanpa satu pun pengajuan).
 *
 * Aturan sekarang:
 * - Budget (pagu) adalah SASARAN. Batas kerasnya pagu × (1 + TOLERANSI_PAGU): satu panggilan atau satu
 *   pengujian yang sudah berjalan boleh melewati sasaran sedikit daripada membuang pekerjaan yang sudah dibayar.
 * - Satu putaran perbaikan = satu panggilan menulis + satu pengujian. Perkiraan panggilan menulis = MEDIAN biaya
 *   panggilan sejauh ini (minimal CADANGAN_MENULIS_MIN_USD), bukan yang termahal.
 * - Bila sisa sasaran tidak cukup untuk satu putaran perbaikan → MODE HEMAT: output model dibatasi pendek, hanya
 *   untuk mengajukan draft yang sudah siap. Mode hemat tanpa draft siap → berhenti.
 */
export const TOLERANSI_PAGU = 0.15;
export const CADANGAN_MENULIS_MIN_USD = 0.1;
/** Biaya terburuk satu panggilan pendek (output dibatasi MAKS_TOKEN_HEMAT). */
export const CADANGAN_HEMAT_USD = 0.1;
export const MAKS_TOKEN_HEMAT = 2_000;

const bulat = (x: number): number => Math.round(x * 1e4) / 1e4;

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const t = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[t] as number) : ((s[t - 1] as number) + (s[t] as number)) / 2;
}

/** Batas keras percobaan: sasaran + toleransi. */
export const paguKeras = (pagu: number): number => bulat(pagu * (1 + TOLERANSI_PAGU));

export interface KeadaanAnggaran {
  /** Sasaran budget percobaan (USD). */
  pagu: number;
  /** Agen + pengujian sejauh ini (USD). */
  terpakai: number;
  /** Biaya tiap panggilan model agen sejauh ini (USD). */
  biayaPanggilan: readonly number[];
  /** Cadangan satu pengujian (USD). */
  cadanganUji: number;
  /** Ada draft lolos-aturan yang belum pernah diuji. */
  adaDrafSiap: boolean;
}

export interface PutusanAnggaran {
  /** Perkiraan satu panggilan menulis berikutnya. */
  cadangan_menulis_usd: number;
  /** Sisa terhadap SASARAN (bisa negatif bila toleransi sudah terpakai). */
  sisa_sasaran_usd: number;
  /** Sisa terhadap batas keras. */
  sisa_keras_usd: number;
  /** Sisa sasaran tidak cukup untuk satu putaran perbaikan (menulis + uji): hanya boleh mengajukan draft siap. */
  hemat: boolean;
  /** Tidak ada lagi yang bisa dikerjakan dengan uang yang ada. */
  habis: boolean;
  /** Panggilan model apa pun harus ditolak sebelum dikirim. */
  tolak_panggilan: boolean;
}

export function putusanAnggaran(k: KeadaanAnggaran): PutusanAnggaran {
  const cadanganMenulis = bulat(Math.max(CADANGAN_MENULIS_MIN_USD, median(k.biayaPanggilan)));
  const sisaSasaran = bulat(k.pagu - k.terpakai);
  const sisaKeras = bulat(paguKeras(k.pagu) - k.terpakai);
  const hemat = sisaSasaran < cadanganMenulis + k.cadanganUji - 1e-9;
  const tolakPanggilan = sisaKeras < CADANGAN_HEMAT_USD - 1e-9;
  // Mengajukan draft siap butuh satu panggilan pendek + satu pengujian, dihitung terhadap batas keras.
  const bisaMengajukan = k.adaDrafSiap && sisaKeras >= CADANGAN_HEMAT_USD + k.cadanganUji - 1e-9;
  return { cadangan_menulis_usd: cadanganMenulis, sisa_sasaran_usd: sisaSasaran, sisa_keras_usd: sisaKeras, hemat, habis: tolakPanggilan || (hemat && !bisaMengajukan), tolak_panggilan: tolakPanggilan };
}
