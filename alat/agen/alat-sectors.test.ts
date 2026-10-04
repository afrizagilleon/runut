/** M2d-26: dua alat data agen (`usulkan_hari`, `periksa_saham`). */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../../factory/llm/env.ts';
import { PemuatGudang } from '../penyusun/emiten.ts';
import { buatAlatSectors, samarkanNama } from './alat-sectors.ts';

const CACHE = join(AKAR, '.cache', 'sectors');
const adaCache = existsSync(CACHE);
const pemuatKosong = { emiten: () => null, lupakan: () => undefined } as unknown as PemuatGudang;

describe('samarkanNama', () => {
  it('kode, kode.JK, nama emiten, dan nama orang diganti; kata pendek dibiarkan', () => {
    expect(samarkanNama('saham AGAR.JK milik Asia Sejahtera Mina; Budi Santoso beli AGAR', 'AGAR', ['Asia Sejahtera Mina', 'Budi Santoso', 'PT'])).toBe('saham [disamarkan] milik [disamarkan]; [disamarkan] beli [disamarkan]');
  });
});

describe('emiten belum ada di cache', () => {
  it('tanpa persetujuan kredit: galat yang menjelaskan, tidak ada pengambilan', async () => {
    const a = buatAlatSectors({ kode: 'ZZZZ', pemuat: pemuatKosong, hariIni: '2026-10-04' });
    const u = await a.usulkanHari();
    expect('galat' in u && u.galat).toMatch(/butuh persetujuan pemilik/);
    expect((await a.periksaSaham('2026-01-05')).paket).toBeNull();
  });
  it('dengan persetujuan: diambil SEKALI; kode tak dikenal dilaporkan', async () => {
    let n = 0;
    const ambil = (): Promise<{ berhenti: string | null; tidak_dikenal: boolean; kredit_dipakai: number }> => {
      n += 1;
      return Promise.resolve({ berhenti: null, tidak_dikenal: true, kredit_dipakai: 1 });
    };
    const a = buatAlatSectors({ kode: 'ZZZZ', pemuat: pemuatKosong, hariIni: '2026-10-04', ambil });
    const u = await a.usulkanHari();
    expect('galat' in u && u.galat).toMatch(/tidak dikenal Sectors/);
    await a.usulkanHari();
    expect(n).toBe(1);
  });
});

describe.skipIf(!adaCache)('dengan gudang cache Sectors (dilewati bila cache tidak ada)', () => {
  const buat = () => buatAlatSectors({ kode: 'AMAG', pemuat: new PemuatGudang(CACHE), hariIni: '2026-10-04' });
  it('usulkan_hari: hari + jumlah kartu lolos, tanpa kode atau nama emiten', async () => {
    const u = await buat().usulkanHari();
    if ('galat' in u) throw new Error(u.galat);
    expect(u.hari.length).toBeGreaterThan(0);
    expect(u.hari.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.tanggal) && h.kartu_lolos > 0)).toBe(true);
    expect(JSON.stringify(u)).not.toMatch(/AMAG|Asuransi Multi/);
  });
  it('periksa_saham: paket dari pembangun pintu, laporan aturan, kartu tanpa nama emiten; tanggal di luar usulan ditolak', async () => {
    const a = buat();
    const u = await a.usulkanHari();
    if ('galat' in u) throw new Error(u.galat);
    const p = await a.periksaSaham((u.hari[0] as { tanggal: string }).tanggal);
    if (p.paket === null) throw new Error(p.galat);
    expect(p.paket.simbol).toBe('AMAG');
    expect(p.laporan.aturan_dijalankan + p.laporan.aturan_dilewati).toBe(37);
    expect(p.laporan.kartu_lolos).toBe(p.paket.fakta.length);
    expect(JSON.stringify(p.laporan)).not.toMatch(/AMAG|Asuransi Multi/);
    const x = await a.periksaSaham('2020-01-01');
    expect(x.paket === null && x.galat).toMatch(/bukan salah satu hari yang diusulkan/);
  });
});
