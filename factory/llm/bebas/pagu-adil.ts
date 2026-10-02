/**
 * Pagu adil M2d-13 (pra-registrasi `docs/bukti/m2d13-praregistrasi.md` §6),
 * dihitung murni dari biaya nyata per jalan:
 *
 * - urutan bergiliran Opus-1, Haiku-1, DeepSeek-1, Opus-2, Haiku-2, DeepSeek-2;
 * - pagu per jalan Opus US$0,60, Haiku US$0,30, DeepSeek US$0,22 (Σ 1,12);
 * - sisa awal putaran r = US$2,10 − biaya nyata semua jalan putaran < r —
 *   keputusan putaran tidak berubah di tengah putaran;
 * - putaran 1 dimulai bila sisa ≥ 1,12; putaran 2 penuh bila sisa ≥ 1,12,
 *   diskalakan sama (pagu × sisa / 1,12) bila sisa ≥ 1,25 × biaya putaran 1,
 *   selain itu TIDAK dijalankan untuk penulis mana pun.
 *
 * Pagu milestone tidak bisa memotong satu penulis di tengah putaran: jumlah
 * pagu jalan satu putaran ≤ sisa awalnya.
 */
export type NamaPenulis = 'opus' | 'haiku' | 'deepseek';

export interface SlotJalan {
  id: string;
  penulis: NamaPenulis;
  putaran: 1 | 2;
}

export interface KeputusanPutaran {
  mulai: boolean;
  pagu: Record<NamaPenulis, number>;
  alasan: string;
}

export const PAGU_DB = 2.1;
export const PAGU_DD = 0.4;
export const PAGU_MILESTONE_M2D13 = 2.5;
export const PAGU_JALAN: Readonly<Record<NamaPenulis, number>> = { opus: 0.6, haiku: 0.3, deepseek: 0.22 };
export const URUTAN_PENULIS: readonly NamaPenulis[] = ['opus', 'haiku', 'deepseek'];
const FAKTOR_PUTARAN2 = 1.25;

const SIGMA = (): number => URUTAN_PENULIS.reduce((a, p) => a + PAGU_JALAN[p], 0);
const tanpa = (): Record<NamaPenulis, number> => ({ opus: 0, haiku: 0, deepseek: 0 });

export function urutanJalan(): SlotJalan[] {
  return ([1, 2] as const).flatMap((putaran) => URUTAN_PENULIS.map((penulis) => ({ id: `m2d13-${penulis}-${String(putaran)}`, penulis, putaran })));
}

export function keputusanPutaran(putaran: 1 | 2, sisaAwal: number, biayaPutaran1: number | null): KeputusanPutaran {
  const total = SIGMA();
  const eps = 1e-9;
  if (sisaAwal + eps >= total) return { mulai: true, pagu: { ...PAGU_JALAN }, alasan: `sisa D-B US$${sisaAwal.toFixed(4)} ≥ Σ pagu jalan US$${total.toFixed(2)}: pagu penuh` };
  if (putaran === 2 && biayaPutaran1 !== null && sisaAwal + eps >= FAKTOR_PUTARAN2 * biayaPutaran1) {
    const f = sisaAwal / total;
    return {
      mulai: true,
      pagu: { opus: PAGU_JALAN.opus * f, haiku: PAGU_JALAN.haiku * f, deepseek: PAGU_JALAN.deepseek * f },
      alasan: `sisa D-B US$${sisaAwal.toFixed(4)} < US$${total.toFixed(2)} tetapi ≥ 1,25 × biaya putaran 1 (US$${biayaPutaran1.toFixed(4)}): pagu jalan diskalakan ×${f.toFixed(4)} untuk semua penulis`,
    };
  }
  return {
    mulai: false,
    pagu: tanpa(),
    alasan:
      putaran === 1
        ? `sisa D-B US$${sisaAwal.toFixed(4)} < Σ pagu jalan US$${total.toFixed(2)}: putaran 1 tidak dimulai`
        : `sisa D-B US$${sisaAwal.toFixed(4)} < Σ pagu jalan dan < 1,25 × biaya putaran 1 (US$${(biayaPutaran1 ?? 0).toFixed(4)}): putaran 2 tidak dijalankan untuk penulis mana pun`,
  };
}

/** Jalan berikutnya dari biaya nyata jalan yang sudah selesai (id → US$). Murni. */
export function rencanaJalanBerikut(selesai: Readonly<Record<string, number>>): { slot: SlotJalan; pagu: number; alasan: string } | { berhenti: string } {
  const urut = urutanJalan();
  const slot = urut.find((s) => !(s.id in selesai));
  if (slot === undefined) return { berhenti: 'keenam jalan sudah selesai' };
  const sebelum = urut.filter((s) => s.putaran < slot.putaran);
  const biayaSebelum = sebelum.reduce((a, s) => a + (selesai[s.id] ?? 0), 0);
  const sisaAwal = PAGU_DB - biayaSebelum;
  const biayaP1 = slot.putaran === 2 ? urut.filter((s) => s.putaran === 1).reduce((a, s) => a + (selesai[s.id] ?? 0), 0) : null;
  const k = keputusanPutaran(slot.putaran, sisaAwal, biayaP1);
  if (!k.mulai) return { berhenti: k.alasan };
  return { slot, pagu: Math.floor(k.pagu[slot.penulis] * 10_000) / 10_000, alasan: k.alasan };
}
