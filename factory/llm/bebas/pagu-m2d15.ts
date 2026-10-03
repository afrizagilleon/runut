/**
 * Pagu dan urutan jalan M2d-15 (pra-registrasi `docs/bukti/m2d15-praregistrasi.md`
 * §2, §6), murni:
 *
 * - pagu milestone US$3,00 atas tag `penyusun/m2d15-` + `m2d15/`;
 * - D-4 (jalan) ≤ US$2,70; pagu jalan = min(US$2,00 [amandemen A2; semula 1,40]; US$2,70 − biaya nyata
 *   jalan sebelumnya), dibulatkan ke bawah 4 desimal;
 * - penilai GLM D-5 = US$3,00 − biaya nyata D-4 (≥ US$0,30);
 * - paling banyak 2 jalan; jalan 2 hanya bila jalan 1 tidak terbit, ATAU jalan 1
 *   terbit tetapi audit reviewer (§2 b) gagal di ≥ 1 omongan versi lulus
 *   (Opus tanpa kartu memilih kunci di > 2 dari 4 rotasi). Jalan 1 terbit dan
 *   audit belum ada → berhenti, menunggu reviewer.
 */
export const PAGU_MILESTONE_M2D15 = 3.0;
export const PAGU_D4_M2D15 = 2.7;
/** Amandemen A2 (docs/bukti/m2d15-amandemen-A1.md): US$2,00 (pra-registrasi: 1,40). */
export const PAGU_JALAN_M2D15 = 2.0;
export const PAGU_PENILAI_MIN_M2D15 = 0.3;
export const MAKS_JALAN_M2D15 = 2;
/** Audit (b): Opus tanpa kartu memilih kunci paling banyak 2 dari 4 rotasi. */
export const AUDIT_MAKS_BENAR = 2;

export const idJalanM2d15 = (n: number): string => `m2d15-opus-${String(n)}`;
const bawah4 = (x: number): number => Math.floor(x * 10_000 + 1e-9) / 10_000;

export interface JalanSelesai {
  id: string;
  biaya_usd: number;
  terbit: boolean;
}

/** Hasil audit reviewer atas omongan versi lulus satu jalan: `null` = belum ada. */
export type AuditJalan = 'lulus' | 'gagal' | null;

/** Putusan audit (§2 b) satu jalan dari `nilai.json` audit satu soal. Murni. */
export function auditJalan(nilai: { per_butir: ReadonlyArray<{ jalan: string; lulus: boolean; tanpa_kartu_benar: number; n: number }> } | null, jalan: string): AuditJalan {
  if (nilai === null) return null;
  const butir = nilai.per_butir.filter((b) => b.jalan === jalan && b.lulus);
  if (butir.length === 0) return null;
  if (butir.some((b) => b.n < 4)) return null;
  return butir.some((b) => b.tanpa_kartu_benar > AUDIT_MAKS_BENAR) ? 'gagal' : 'lulus';
}

/** Jalan berikutnya menurut pra-registrasi §6. Murni. */
export function rencanaJalanM2d15(selesai: readonly JalanSelesai[], auditJalan1: AuditJalan): { id: string; pagu: number; alasan: string } | { berhenti: string } {
  const biayaD4 = selesai.reduce((a, j) => a + j.biaya_usd, 0);
  if (selesai.length >= MAKS_JALAN_M2D15) return { berhenti: `sudah ${String(MAKS_JALAN_M2D15)} jalan (maksimum pra-registrasi)` };
  const n = selesai.length + 1;
  if (n === 2) {
    const j1 = selesai[0] as JalanSelesai;
    if (j1.terbit) {
      if (auditJalan1 === null) return { berhenti: `${j1.id} terbit; menunggu audit Opus satu soal oleh reviewer (pra-registrasi §2 b) sebelum memutuskan jalan 2` };
      if (auditJalan1 === 'lulus') return { berhenti: `${j1.id} layak tayang (gerbang + audit); berhenti di simulasi layak tayang pertama` };
    }
  }
  const pagu = bawah4(Math.min(PAGU_JALAN_M2D15, PAGU_D4_M2D15 - biayaD4));
  if (pagu <= 0) return { berhenti: `pagu D-4 habis: biaya jalan US$${biayaD4.toFixed(4)} dari US$${PAGU_D4_M2D15.toFixed(2)}` };
  const sebab = n === 1 ? 'jalan pertama' : (selesai[0] as JalanSelesai).terbit ? 'jalan 1 terbit tetapi audit reviewer gagal di ≥ 1 omongan' : 'jalan 1 tidak terbit';
  return { id: idJalanM2d15(n), pagu, alasan: `${sebab}; pagu jalan = min(US$${PAGU_JALAN_M2D15.toFixed(2)}, US$${PAGU_D4_M2D15.toFixed(2)} − US$${biayaD4.toFixed(4)}) = US$${pagu.toFixed(4)}` };
}

/** Pagu penilai GLM D-5 = US$3,00 − biaya nyata D-4, paling sedikit US$0,30. Murni. */
export function paguPenilaiM2d15(biayaD4: number): number {
  return bawah4(Math.max(PAGU_PENILAI_MIN_M2D15, PAGU_MILESTONE_M2D15 - biayaD4));
}
