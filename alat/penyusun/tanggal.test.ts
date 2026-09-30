/**
 * M2d-9 T-03: validasi tanggal ketikan (D-3) — satu tes per alasan penolakan.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { dataKosong, deretHarga } from './bantu-data.ts';
import { akarSementara, minta, mulaiServer, tulisGudangUji, type ServerUji } from './bantu-uji.ts';
import { batasDekat, formatSah, periksaTanggal } from './tanggal.ts';

const HARI_INI = '2026-09-30';
const o = { jendela: 10, hariIni: HARI_INI };

/** Harga hari kerja 2 Mar–(60 hari) 2026, tanpa Jumat Agung 3 Apr 2026 (libur). */
function data(): DataEmiten {
  return { ...dataKosong(), harga: deretHarga('2026-03-02', 61).filter((h) => h.tanggal !== '2026-04-03'), suspensi: [{ tanggal: '2026-03-20', alasan: 'Peningkatan harga kumulatif' }] };
}
const KALENDER = [...deretHarga('2025-01-01', 450).map((h) => h.tanggal).filter((t) => t !== '2026-04-03')];

describe('penolakan beralasan', () => {
  it('bentuk salah', () => {
    const h = periksaTanggal('10/12/2025', data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'FORMAT' });
    expect(h.alasan).toMatch(/TTTT-BB-HH/);
    expect(formatSah('2026-02-30')).toBeNull();
  });

  it('masa depan (pekan depan)', () => {
    const h = periksaTanggal('2026-10-07', data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'MASA_DEPAN' });
    expect(h.alasan).toContain('masa depan (hari ini 30 September 2026)');
  });

  it('hari ini', () => {
    const h = periksaTanggal(HARI_INI, data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'HARI_INI' });
    expect(h.alasan).toMatch(/belum ada "sesudahnya"/);
  });

  it('terlalu dekat dengan hari ini: menyebut batas paling lambat', () => {
    const h = periksaTanggal('2026-09-25', data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'TERLALU_DEKAT' });
    expect(batasDekat(HARI_INI, 10)).toBe('2026-09-15');
    expect(h.alasan).toContain('paling lambat 15 September 2026');
  });

  it('akhir pekan → hari bursa terdekat sebelum/sesudahnya ditawarkan', () => {
    const h = periksaTanggal('2026-03-21', data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'BUKAN_HARI_BURSA' });
    expect(h.alasan).toContain('hari Sabtu');
    expect(h.tawaran).toEqual([
      { tanggal: '2026-03-20', arah: 'sebelum', sah: true },
      { tanggal: '2026-03-23', arah: 'sesudah', sah: true },
    ]);
  });

  it('libur bursa (hari kerja tanpa harga di seluruh gudang)', () => {
    const h = periksaTanggal('2026-04-03', data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'BUKAN_HARI_BURSA' });
    expect(h.alasan).toMatch(/hari libur bursa/);
    expect(h.tawaran.map((x) => x.tanggal)).toEqual(['2026-04-02', '2026-04-06']);
  });

  it('hari bursa tetapi emiten tidak punya harga hari itu', () => {
    const h = periksaTanggal('2026-01-15', data(), KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'TANPA_HARGA' });
    expect(h.tawaran[0]).toEqual({ tanggal: '2026-03-02', arah: 'sesudah', sah: true });
  });

  it('data sesudahnya kurang dari jendela: menyebut jumlahnya dan batas paling lambat', () => {
    const d = data();
    const akhir = d.harga.at(-1)?.tanggal as string;
    const h = periksaTanggal(d.harga.at(-4)?.tanggal as string, d, KALENDER, o);
    expect(h).toMatchObject({ sah: false, kode: 'DATA_SESUDAH' });
    expect(h.alasan).toContain('hanya 3 hari bursa');
    expect(h.alasan).toContain(`paling lambat`);
    expect(akhir > (h.tanggal as string)).toBe(true);
  });
});

describe('tanggal sah', () => {
  it('hari suspensi = hari bursa; peristiwanya disebut', () => {
    const h = periksaTanggal('2026-03-20', data(), KALENDER, o);
    expect(h.sah).toBe(true);
    expect(h.peristiwa[0]).toMatch(/^penghentian sementara oleh bursa: Bursa menghentikan/);
    expect(h.status?.sesudah_cukup).toBe(true);
  });

  it('hari tanpa peristiwa tetap sah, dengan catatan bahan tipis', () => {
    const h = periksaTanggal('2026-03-10', data(), KALENDER, o);
    expect(h.sah).toBe(true);
    expect(h.alasan).toMatch(/bahan soalnya mungkin tipis/);
  });
});

describe('rute POST /api/periksa-tanggal', () => {
  let s: ServerUji | null = null;
  afterEach(async () => {
    await s?.tutup();
    s = null;
  });

  it('menjawab dengan hasil validasi; emiten tanpa data → 404', async () => {
    const akar = akarSementara();
    tulisGudangUji(akar, 'UJIX', deretHarga('2026-03-02', 60), []);
    s = await mulaiServer({ akar });
    const r = (await minta(s.port, 'POST', '/api/periksa-tanggal', { badan: { kode: 'UJIX', tanggal: '2026-03-21', jendela: 10 } })).json() as { sah: boolean; kode: string; tawaran: unknown[] };
    expect(r).toMatchObject({ sah: false, kode: 'BUKAN_HARI_BURSA' });
    expect(r.tawaran).toHaveLength(2);
    const ok = (await minta(s.port, 'POST', '/api/periksa-tanggal', { badan: { kode: 'UJIX', tanggal: '2026-03-20' } })).json() as { sah: boolean };
    expect(ok.sah).toBe(true);
    expect((await minta(s.port, 'POST', '/api/periksa-tanggal', { badan: { kode: 'ZZZZ', tanggal: '2026-03-20' } })).status).toBe(404);
  });
});
