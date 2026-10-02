/**
 * Putusan hipotesis M2d-13 (pra-registrasi `docs/bukti/m2d13-praregistrasi.md`
 * §2), murni: ambang ditulis di sini PERSIS seperti pra-registrasi dan dites.
 */
export type Putusan = 'mendukung' | 'tidak mendukung' | 'tak bisa disimpulkan';

/**
 * H1a: penebak berbias huruf (satu huruf ≥ 0,32, n ≥ 200); ≥ 2 dari 3
 * mendukung, 0 dari 3 tidak. Penebak dengan n < 200 tidak bisa dinyatakan
 * berbias ATAU tidak → bila ada, putusan "tak bisa disimpulkan" kecuali
 * ≥ 2 penebak lain sudah berbias.
 */
export function putusanH1a(xs: ReadonlyArray<{ bias: boolean; n: number }>): Putusan {
  const n = xs.filter((x) => x.bias).length;
  if (n >= 2) return 'mendukung';
  if (xs.some((x) => x.n < 200)) return 'tak bisa disimpulkan';
  return n >= 2 ? 'mendukung' : n === 0 ? 'tidak mendukung' : 'tak bisa disimpulkan';
}

/** H1b: gabungan ≥ 0,40 dan ≥ 2 dari 3 penulis ≥ 0,35 → mendukung; gabungan ≤ 0,30 → tidak. */
export function putusanH1b(gabungan: number | null, perPenulis: ReadonlyArray<number | null>, butirMin: number): Putusan {
  if (gabungan === null || butirMin < 4) return 'tak bisa disimpulkan';
  if (gabungan >= 0.4 && perPenulis.filter((x) => x !== null && x >= 0.35).length >= 2) return 'mendukung';
  if (gabungan <= 0.3) return 'tidak mendukung';
  return 'tak bisa disimpulkan';
}

/** H2: Δ_DS ≤ −0,10 dan Δ_H ≤ −0,10 → mendukung; keduanya ≥ 0 → tidak. */
export function putusanH2(deltaDs: number | null, deltaH: number | null, butirMin: number): Putusan {
  if (deltaDs === null || deltaH === null || butirMin < 4) return 'tak bisa disimpulkan';
  if (deltaDs <= -0.1 && deltaH <= -0.1) return 'mendukung';
  if (deltaDs >= 0 && deltaH >= 0) return 'tidak mendukung';
  return 'tak bisa disimpulkan';
}

export interface UkuranH4 {
  L: number;
  vRata: number;
  /** Rata-rata mutu per penilai (null = penilai belum ada). */
  q: { glm: number | null; opus: number | null };
  versiPerLulus: number | null;
}

/**
 * H4 (pra-registrasi §2): mendukung bila L_Opus ≥ max(L lain) + 1, V̄_Opus ≤
 * min(V̄ lain), Q_Opus ≥ max(Q lain) + 1,0 dan ≥ Q_templat + 1,0 menurut KEDUA
 * penilai, dan versi/omongan lulus < 9,7. Tidak mendukung bila L_Opus ≤
 * max(L lain) − 1 atau Q_Opus ≤ max(Q lain) − 1,0 menurut kedua penilai.
 * Satu penilai saja tidak pernah cukup untuk "mendukung".
 */
export function putusanH4(opus: UkuranH4, lain: readonly UkuranH4[], qTemplat: { glm: number | null; opus: number | null }): { putusan: Putusan; sementara: boolean; alasan: string[] } {
  const alasan: string[] = [];
  const maxL = Math.max(...lain.map((x) => x.L));
  const minV = Math.min(...lain.map((x) => x.vRata));
  const penilai = (['glm', 'opus'] as const).filter((p) => opus.q[p] !== null && lain.every((x) => x.q[p] !== null) && qTemplat[p] !== null);
  const keduanya = penilai.length === 2;
  const qLebih = (p: 'glm' | 'opus'): boolean => (opus.q[p] as number) >= Math.max(...lain.map((x) => x.q[p] as number)) + 1 && (opus.q[p] as number) >= (qTemplat[p] as number) + 1;
  const qKurang = (p: 'glm' | 'opus'): boolean => (opus.q[p] as number) <= Math.max(...lain.map((x) => x.q[p] as number)) - 1;
  if (opus.L <= maxL - 1) {
    alasan.push(`L_Opus ${String(opus.L)} ≤ max(L lain) ${String(maxL)} − 1`);
    return { putusan: 'tidak mendukung', sementara: false, alasan };
  }
  if (keduanya && penilai.every(qKurang)) {
    alasan.push('Q_Opus ≤ max(Q lain) − 1,0 menurut kedua penilai');
    return { putusan: 'tidak mendukung', sementara: false, alasan };
  }
  const syaratL = opus.L >= maxL + 1;
  const syaratV = opus.vRata <= minV;
  const syaratVL = opus.versiPerLulus !== null && opus.versiPerLulus < 9.7;
  alasan.push(`L_Opus ${String(opus.L)} vs max lain ${String(maxL)} (${syaratL ? 'ya' : 'tidak'} ≥ +1)`, `V̄_Opus ${opus.vRata.toFixed(2)} vs min lain ${minV.toFixed(2)} (${syaratV ? 'ya' : 'tidak'})`, `versi/omongan lulus ${opus.versiPerLulus === null ? '—' : opus.versiPerLulus.toFixed(2)} < 9,7: ${syaratVL ? 'ya' : 'tidak'}`);
  for (const p of penilai) alasan.push(`mutu ${p}: Q_Opus ${(opus.q[p] as number).toFixed(2)}, max lain ${Math.max(...lain.map((x) => x.q[p] as number)).toFixed(2)}, templat ${(qTemplat[p] as number).toFixed(2)} → ${qLebih(p) ? 'ya' : 'tidak'} (+1,0)`);
  if (!keduanya) {
    alasan.push('mutu hanya dari satu penilai → bagian mutu sementara; "mendukung" tidak mungkin');
    return { putusan: 'tak bisa disimpulkan', sementara: true, alasan };
  }
  if (syaratL && syaratV && syaratVL && penilai.every(qLebih)) return { putusan: 'mendukung', sementara: false, alasan };
  return { putusan: 'tak bisa disimpulkan', sementara: false, alasan };
}

/** H3a / H2-Opus: ≤ ambang → mendukung, ≥ 0 → tidak. */
export function putusanSelisih(d: number | null, ambang: number, butirMin: number): Putusan {
  if (d === null || butirMin < 4) return 'tak bisa disimpulkan';
  return d <= ambang ? 'mendukung' : d >= 0 ? 'tidak mendukung' : 'tak bisa disimpulkan';
}

/** H3b: S ≥ +1,0 mendukung; S ≤ 0 tidak. */
export function putusanH3b(s: number | null, butirMin: number): Putusan {
  if (s === null || butirMin < 4) return 'tak bisa disimpulkan';
  return s >= 1 ? 'mendukung' : s <= 0 ? 'tidak mendukung' : 'tak bisa disimpulkan';
}
