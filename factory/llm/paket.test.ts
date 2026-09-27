/**
 * M2d T-03: paket fakta untuk LLM.
 *
 * Yang dijaga: (1) hanya fakta TERVERIFIKASI oleh V2 atas data ≤ T, terbit
 * ≤ T, tanpa tanggal sesudah T di kalimatnya; (2) temuan berkeparahan konflik
 * sungguh menyingkirkan fakta yang disebutnya — hal yang TIDAK terjadi di jalur
 * `bangunKasusUmum` karena fakta gudang tidak punya `sumber.berkas`; (3) angka
 * turunan dihitung ulang di sini dari JSON mentah `.cache/sectors/`, dengan
 * rumus yang ditulis terpisah; (4) tanpa kode saham, nama emiten, atau nama
 * orang, dan tanpa JSON mentah.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sesudahT, tanggalDalam } from './angka.ts';
import { AKAR } from './env.ts';
import { DEFINISI_PAKET, bangunPaket, faktaHariNaik, type PaketFakta } from './paket.ts';
import { pesanPaket } from './susun.ts';

const GUDANG = `${AKAR}.cache/sectors`;
const adaCache = existsSync(`${GUDANG}/ULTJ-filings.json`) && existsSync(`${GUDANG}/TIRT-filings.json`);

interface BarisHargaMentah {
  date: string;
  close: number;
  open: number;
  volume: number;
}

function hargaMentah(berkas: string, tanggal: string): BarisHargaMentah {
  const isi = JSON.parse(readFileSync(`${GUDANG}/${berkas}`, 'utf8')) as BarisHargaMentah[];
  const baris = isi.find((b) => b.date === tanggal);
  if (baris === undefined) throw new Error(`${tanggal} tidak ada di ${berkas}`);
  return baris;
}

const paket: Partial<Record<string, PaketFakta>> = {};
function ambil(id: 'dada' | 'ultj' | 'tirt'): PaketFakta {
  const ada = paket[id];
  if (ada !== undefined) return ada;
  const baru = bangunPaket(DEFINISI_PAKET[id]);
  paket[id] = baru;
  return baru;
}

function nilai(p: PaketFakta, id: string): unknown {
  const f = p.fakta.find((x) => x.fact_id === id);
  if (f === undefined) throw new Error(`${id} tidak ada di paket ${p.paket_id}`);
  return f.nilai;
}

describe.skipIf(!adaCache)('paket fakta — hanya yang lolos V2 dan terbit ≤ T', () => {
  for (const id of ['dada', 'ultj', 'tirt'] as const) {
    it(`${id}: tiap fakta terbit ≤ T, kalimatnya tanpa tanggal sesudah T`, () => {
      const p = ambil(id);
      expect(p.fakta.length).toBeGreaterThanOrEqual(10);
      for (const f of p.fakta) {
        expect(f.terbit <= p.tanggal_t, `${f.fact_id} terbit ${f.terbit}`).toBe(true);
        const lewat = tanggalDalam(f.klaim).filter((t) => sesudahT(t, p.tanggal_t));
        expect(lewat.map((t) => t.teks), f.fact_id).toEqual([]);
      }
    });

    it(`${id}: tanpa kode saham, nama emiten, nama orang, atau JSON mentah di teks yang dikirim ke model`, () => {
      const p = ambil(id);
      const teks = pesanPaket(p);
      for (const kata of p.kata_terlarang) {
        expect(teks.toLowerCase().includes(kata.toLowerCase()), `"${kata}" bocor`).toBe(false);
      }
      for (const medan of ['"symbol"', 'transaction_type', 'holder_name', 'market_cap', '{"', 'pdf_url']) {
        expect(teks.includes(medan), medan).toBe(false);
      }
      expect(teks).toContain(p.nama_samaran);
    });
  }

  it('DADA: laporan yang tersangkut temuan konflik V2 (R14, R17B) tersingkir, dan tidak ikut dijumlahkan', () => {
    const p = ambil('dada');
    const tersingkir = p.disingkirkan.map((d) => d.fact_id).sort();
    expect(tersingkir).toEqual(
      ['div-2025-09-16-bayar', 'fil-2025-08-25-01', 'fil-2025-08-25-02', 'fil-2025-09-29-01'].sort(),
    );
    expect(p.disingkirkan.find((d) => d.fact_id === 'fil-2025-08-25-01')?.alasan).toMatch(/^KONFLIK: temuan R14/);
    expect(p.disingkirkan.find((d) => d.fact_id === 'fil-2025-09-29-01')?.alasan).toMatch(/^KONFLIK: temuan R17B/);
    expect(p.disingkirkan.find((d) => d.fact_id === 'div-2025-09-16-bayar')?.alasan).toMatch(/9 Oktober 2025/);
    // 70.000.000 + 179.500.000 + 50.000.000 — sama dengan kartu kasus DADA yang hidup.
    expect(nilai(p, 'jumlah-jual-terverifikasi')).toBe(299_500_000);
    expect(nilai(p, 'laporan-jual-terverifikasi')).toBe(3);
  });

  it('ULTJ: tanggal bayar dividen (22 Mei 2026, sesudah T) tidak masuk paket', () => {
    const p = ambil('ultj');
    expect(p.disingkirkan.map((d) => d.fact_id)).toEqual(['div-2026-05-04-bayar']);
    expect(p.fakta.some((f) => f.fact_id === 'div-2026-05-04-bayar')).toBe(false);
  });

  it('TIRT: harga di hari bervolume nol (R19a) tersingkir; harga hari naik membawa catatan R19b', () => {
    const p = ambil('tirt');
    expect(p.disingkirkan.map((d) => d.fact_id).sort()).toEqual(['harga-2025-11-25', 'harga-2025-12-10']);
    for (const d of p.disingkirkan) expect(d.alasan).toMatch(/^TIDAK_LENGKAP: temuan R19a/);
    expect(p.fakta.find((f) => f.fact_id === 'harga-2025-12-09')?.catatan.join(' ')).toMatch(/R19b/);
    expect(p.pemeriksaan.temuan.filter((t) => t.keparahan === 'konflik')).toEqual([]);
  });

  it('angka turunan dihitung ulang dari JSON mentah', () => {
    const d1 = hargaMentah('dada-daily-2025q3.json', '2025-08-01').close;
    const d2 = hargaMentah('dada-daily-2025q3.json', '2025-10-08').close;
    expect(nilai(ambil('dada'), 'kelipatan-2025-08-01-2025-10-08')).toBe(Math.round((d2 / d1) * 100) / 100);

    const u1 = hargaMentah('ULTJ-daily-2026q2.json', '2026-04-30').close;
    const u2 = hargaMentah('ULTJ-daily-2026q2.json', '2026-05-04').open;
    expect(nilai(ambil('ultj'), 'turun-2026-05-04')).toBe(u1 - u2);

    const t1 = hargaMentah('TIRT-daily-2025q4a.json', '2025-11-26').close;
    const t2 = hargaMentah('TIRT-daily-2025q4a.json', '2025-12-09').close;
    expect(nilai(ambil('tirt'), 'naik-2025-11-26-2025-12-09')).toBe(t2 - t1);
    expect(hargaMentah('TIRT-daily-2026q1.json', '2025-12-10').volume).toBe(0);
  });

  it('suspensi TIRT: alasan resmi dari data, kode saham di dalamnya disamarkan', () => {
    const p = ambil('tirt');
    const s = p.fakta.find((f) => f.fact_id === 'susp-2025-12-10');
    expect(s?.klaim).toContain('peningkatan harga kumulatif yang signifikan pada saham Perusahaan T');
    expect(s?.klaim).not.toMatch(/TIRT/);
  });
});

describe('faktaHariNaik — kalimat "naik tiap hari" harus benar', () => {
  const f = (id: string, n: number, t: string) => ({
    fact_id: id,
    klaim: '',
    nilai: n,
    satuan: 'rupiah per lembar',
    sumber: { jenis: 'api' as const, endpoint: '/x', berkas: null, parameter: {}, diambil_pada: null, keterangan: null },
    turunan_dari: [],
    tersedia_sejak: t,
    status: 'TERVERIFIKASI' as const,
    awam: null,
  });
  it('melempar kalau ada satu hari yang tidak naik', () => {
    const pustaka = [f('a', 10, '2025-01-01'), f('b', 12, '2025-01-02'), f('c', 12, '2025-01-03')];
    expect(() => faktaHariNaik(pustaka, 'x', ['a', 'b', 'c'])).toThrow(/tidak lebih tinggi/);
    expect(faktaHariNaik(pustaka, 'x', ['a', 'b']).nilai).toBe(1);
  });
});
