/**
 * Pemanasan M2d-11 (palsu): rencana berlabel sebab-resmi, kartu r0+r2,
 * kritikus terakhir, umpan balik tersimpan; tanpa tebak rotasi; pembaca kartu
 * yang salah di r2 menolak.
 */
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../draf.ts';
import { HURUF_KUNCI_PEMANASAN } from '../kalibrasi-pemanasan.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { panggilTemplatPalsu } from '../templat/palsu.ts';
import { jalankanPemanasanM2d11 } from './pemanasan.ts';

const H: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const kunciR = (ke: number): KunciOpsi => H[(H.indexOf(HURUF_KUNCI_PEMANASAN) + (ke - 1)) % 4] as KunciOpsi;

describe('pemanasan M2d-11', () => {
  it('lolos dengan model palsu; tanpa tebak rotasi; kartu r0+r2; umpan balik sah', async () => {
    const q = panggilTemplatPalsu('tirt', { kartu: (info) => kunciR(info.ke) });
    const h = await jalankanPemanasanM2d11(TIRT, q.panggil);
    expect(h.rencana.startsWith('sebab-resmi')).toBe(true);
    expect(q.log.some((x) => x.jenis === 'gerbang-tebak')).toBe(false);
    expect(q.log.filter((x) => x.jenis === 'gerbang-kartu').map((x) => x.ke)).toEqual([1, 3]);
    expect(q.log.at(-1)?.jenis).toBe('kritikus');
    expect(h.lolos).toBe(true);
    expect(h.umpan_balik?.per_pengecoh).toHaveLength(3);
  });
  it('pembaca kartu salah di r2 → tidak lolos, kritikus tidak dipanggil', async () => {
    const q = panggilTemplatPalsu('tirt', { kartu: () => HURUF_KUNCI_PEMANASAN });
    const h = await jalankanPemanasanM2d11(TIRT, q.panggil);
    expect(h.lolos).toBe(false);
    expect(q.log.some((x) => x.jenis === 'kritikus')).toBe(false);
  });
});
