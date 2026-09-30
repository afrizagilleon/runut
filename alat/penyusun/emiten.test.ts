/**
 * M2d-9 T-02: rute usulan hari dan pengambilan data (D-2). Kredit Sectors
 * hanya dipakai sesudah persetujuan di layar.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { Pengambil } from '../sectors.ts';
import { deretHarga } from './bantu-data.ts';
import { akarSementara, minta, mulaiServer, tulisGudangUji, type ServerUji } from './bantu-uji.ts';

let s: ServerUji | null = null;
afterEach(async () => {
  await s?.tutup();
  s = null;
});

function akarDenganUjix(): string {
  const akar = akarSementara();
  const harga = deretHarga('2026-03-02', 60);
  tulisGudangUji(akar, 'UJIX', harga, [{ tanggal: harga[20]?.tanggal as string, alasan: 'Peningkatan harga kumulatif yang signifikan' }]);
  return akar;
}

function pengambilPenghitung(akar: string): { p: Pengambil; panggilan: string[] } {
  const panggilan: string[] = [];
  const folder = join(akar, '.cache', 'sectors');
  return {
    panggilan,
    p: {
      kunci: 'k', pagu: 613, folder, bukuKas: join(folder, 'kredit.csv'),
      fetch: (url) => {
        panggilan.push(url);
        return Promise.resolve({ status: 404, text: () => Promise.resolve('{}'), headers: { get: () => null } });
      },
      jam: () => new Date('2026-09-30T00:00:00Z'), tidur: () => Promise.resolve(), jedaMs: 0,
    },
  };
}

describe('GET /api/emiten', () => {
  it('emiten di cache → usulan + catatan kebocoran + aturan urut', async () => {
    s = await mulaiServer({ akar: akarDenganUjix() });
    const r = await minta(s.port, 'GET', '/api/emiten?kode=ujix&jendela=10');
    expect(r.status).toBe(200);
    const j = r.json() as { ada_data: boolean; usulan: Array<{ tanggal: string; jenis: string[] }>; catatan_kebocoran: string; aturan_urut: string[]; data: { harga: { hari: number } } };
    expect(j.ada_data).toBe(true);
    expect(j.usulan.map((u) => u.jenis)).toEqual([['suspensi']]);
    expect(j.catatan_kebocoran).toMatch(/sesudah T/);
    expect(j.aturan_urut).toHaveLength(6);
    expect(j.data.harga.hari).toBe(60);
  });

  it('emiten belum ada → perkiraan kredit (paket tetap 5, maks 10), tanpa memanggil Sectors', async () => {
    const akar = akarDenganUjix();
    const { p, panggilan } = pengambilPenghitung(akar);
    s = await mulaiServer({ akar, buatPengambil: () => p });
    const j = (await minta(s.port, 'GET', '/api/emiten?kode=ZZZZ')).json() as { ada_data: boolean; perkiraan_kredit: { kredit_tetap: number; kredit_maks: number; tetap: Array<{ biaya: number }> } };
    expect(j.ada_data).toBe(false);
    expect(j.perkiraan_kredit.kredit_tetap).toBe(5);
    expect(j.perkiraan_kredit.kredit_maks).toBe(10);
    expect(j.perkiraan_kredit.tetap.map((x) => x.biaya)).toEqual([1, 1, 1, 2]);
    expect(panggilan).toEqual([]);
  });

  it('kode/jendela tidak sah → 400', async () => {
    s = await mulaiServer({ akar: akarDenganUjix() });
    expect((await minta(s.port, 'GET', '/api/emiten?kode=AB')).status).toBe(400);
    expect((await minta(s.port, 'GET', '/api/emiten?kode=UJIX&jendela=30')).status).toBe(400);
  });
});

describe('POST /api/ambil-data', () => {
  it('tanpa persetujuan → 400, Sectors tidak dipanggil', async () => {
    const akar = akarDenganUjix();
    const { p, panggilan } = pengambilPenghitung(akar);
    s = await mulaiServer({ akar, buatPengambil: () => p });
    const r = await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ZZZZ' } });
    expect(r.status).toBe(400);
    expect(r.teks).toMatch(/setujui perkiraan kredit/);
    expect((await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ZZZZ', setuju: 'ya' } })).status).toBe(400);
    expect(panggilan).toEqual([]);
  });

  it('dengan persetujuan → paket audit lewat alat/sectors.ts; 404 aksi korporasi = simbol tak dikenal, sisa paket tidak dikirim', async () => {
    const akar = akarDenganUjix();
    const { p, panggilan } = pengambilPenghitung(akar);
    s = await mulaiServer({ akar, buatPengambil: () => p });
    const r = await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ZZZZ', setuju: true } });
    expect(r.status).toBe(200);
    const j = r.json() as { tidak_dikenal: boolean; kredit_dipakai: number; ada_data: boolean };
    expect(j).toMatchObject({ tidak_dikenal: true, kredit_dipakai: 1, ada_data: false });
    expect(panggilan).toEqual(['https://api.sectors.app/v2/company/corporate-actions/ZZZZ/']);
  });

  it('data sudah ada → 409 tanpa memanggil; kunci Sectors kosong → 400 dengan nama variabel', async () => {
    const akar = akarDenganUjix();
    const { p, panggilan } = pengambilPenghitung(akar);
    s = await mulaiServer({ akar, buatPengambil: () => p });
    expect((await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'UJIX', setuju: true } })).status).toBe(409);
    expect(panggilan).toEqual([]);
    await s.tutup();
    s = await mulaiServer({ akar: akarSementara({ LLM_API_KEY: 'x' }) });
    const r = await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ZZZZ', setuju: true } });
    expect(r.status).toBe(400);
    expect(r.teks).toContain('SECTORS_API_KEY');
  });
});
