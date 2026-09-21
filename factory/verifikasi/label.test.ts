/**
 * M2a T-08 (RQ-04): dua aturan yang keluarannya label, bukan tuduhan.
 *
 * R28 memberi label deret harga di sekitar aksi korporasi dan satu aturan
 * tolak; R35 memeriksa apakah harga ekstrem di ringkasan terjangkau deret
 * hariannya sendiri.
 */
import { describe, expect, it } from 'vitest';
import { r28LabelDeretHarga, r35AllTimePrice } from './aturan-v2.ts';
import { harga, konteks } from './contoh.ts';
import type { BarisHarga, DataEmiten, KonteksGudang, NilaiEkstrem } from './tipe.ts';

function dataEmiten(ubah: Partial<DataEmiten> = {}): DataEmiten {
  return {
    simbol: 'AA',
    laporan: [],
    harga: [],
    suspensi: [],
    berkas_laporan: [],
    stock_split: [],
    right_issue: [],
    bonus: [],
    dividen: [],
    rups: [],
    all_time_price: [],
    pemegang: [],
    saham_tahunan: [],
    ringkasan_pasar: null,
    berkas: [],
    ...ubah,
  };
}

function ktx(ubah: Partial<DataEmiten>): KonteksGudang {
  const data = dataEmiten(ubah);
  return { ...konteks({ harga: data.harga, simbol: 'AA' }), data, berkas_kosong: [] };
}

/** Baris harga dengan jumlah saham tersirat yang ditentukan persis. */
const hari = (tanggal: string, tutup: number, lembar: number): BarisHarga =>
  harga({ tanggal, tutup, buka: tutup, tertinggi: tutup, terendah: tutup, nilai_pasar: tutup * lembar });

describe('R28 — label deret harga di sekitar aksi korporasi', () => {
  it('memberi label "disesuaikan" kalau saham tersirat tidak berubah melintasi aksi', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-20', 1040, 46_784_855), hari('2026-07-21', 1120, 46_875_000)],
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x.json' }],
      }),
    );
    const label = h.temuan.find((t) => t.temuan_id.includes('stock-split'));
    expect(label?.ringkasan).toContain('"disesuaikan"');
    expect(label?.keparahan).toBe('catatan');
  });

  it('memberi label "mentah" kalau saham tersirat berubah sebesar rasio aksinya', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-06', 555, 889_863_981), hari('2026-07-07', 221, 3_559_455_924)],
        right_issue: [{ ex_date: '2026-07-07', rasio_lama: 1, rasio_baru: 3, sumber: 'x.json' }],
      }),
    );
    expect(h.temuan[0]?.ringkasan).toContain('"mentah"');
  });

  it('memberi label "tak-terbaca" kalau bukan keduanya', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2025-10-08', 232, 2_000_000), hari('2025-10-09', 221, 736_000)],
        right_issue: [{ ex_date: '2025-10-09', rasio_lama: 1, rasio_baru: 3, sumber: 'x.json' }],
      }),
    );
    expect(h.temuan[0]?.ringkasan).toContain('"tak-terbaca"');
    expect(h.temuan[0]?.ringkasan).toContain('Penyebabnya tidak diketahui');
  });

  it('tidak pernah mengeluarkan temuan berkeparahan konflik', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-20', 1040, 46_784_855), hari('2026-07-21', 1120, 46_875_000)],
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x.json' }],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    for (const t of h.temuan) expect(t.keparahan).toBe('catatan');
  });

  it('mengeluarkan aturan tolak untuk kartu harga yang melintasi stock split', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-20', 1040, 46_784_855), hari('2026-07-21', 1120, 46_875_000)],
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x.json' }],
      }),
    );
    const tolak = h.temuan.find((t) => t.temuan_id.includes('R28-tolak'));
    expect(tolak?.ringkasan).toContain('tidak boleh melintasi 2026-07-21');
  });

  it('tidak mengeluarkan aturan tolak untuk rights issue, hanya untuk stock split', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-06', 555, 889_863_981), hari('2026-07-07', 221, 3_559_455_924)],
        right_issue: [{ ex_date: '2026-07-07', rasio_lama: 1, rasio_baru: 3, sumber: 'x.json' }],
      }),
    );
    expect(h.temuan.filter((t) => t.temuan_id.includes('R28-tolak'))).toHaveLength(0);
  });

  it('TIDAK_LENGKAP kalau tidak ada harga sehat di kedua sisi tanggal ex', () => {
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-20', 1040, 46_784_855)],
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x.json' }],
      }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.temuan).toHaveLength(0);
  });

  it('membuang baris harga cacat sebelum memilih sisi cum dan ex', () => {
    const cacat: BarisHarga = { ...hari('2026-07-20', 1040, 46_784_855), buka_kosong: true };
    const h = r28LabelDeretHarga(
      ktx({
        harga: [hari('2026-07-17', 1040, 46_784_855), cacat, hari('2026-07-21', 1120, 46_875_000)],
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x.json' }],
      }),
    );
    expect(h.temuan[0]?.rujukan).toContain('harga harian 2026-07-17');
  });

  it('dilewati dengan alasan kalau emiten tidak punya aksi korporasi', () => {
    const h = r28LabelDeretHarga(ktx({ harga: [hari('2026-07-20', 1040, 1000)] }));
    expect(h.dijalankan).toBe(false);
  });
});

describe('R35 — harga ekstrem ringkasan terjangkau deret harian', () => {
  const ekstrem = (label: string, tanggal: string, nilai: number): NilaiEkstrem => ({
    label,
    tanggal,
    nilai,
  });

  it('hijau kalau nilainya ada di antara terendah dan tertinggi hari itu', () => {
    const h = r35AllTimePrice(
      ktx({
        harga: [harga({ tanggal: '2025-10-08', terendah: 7880, tertinggi: 10_315, buka: 8000, tutup: 10_000 })],
        all_time_price: [ekstrem('52_w_high', '2025-10-08', 10_315)],
      }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.hijau).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('merah kalau nilainya tidak terjangkau baris harinya sendiri', () => {
    const h = r35AllTimePrice(
      ktx({
        harga: [harga({ tanggal: '2026-07-01', terendah: 116, tertinggi: 172, buka: 120, tutup: 130 })],
        all_time_price: [ekstrem('ytd_low', '2026-07-01', 66)],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('tidak terjangkau deret harganya sendiri');
    expect(h.temuan[0]?.keparahan).toBeUndefined();
  });

  it('TIDAK_LENGKAP kalau tanggalnya di luar deret harian yang kita punya', () => {
    const h = r35AllTimePrice(
      ktx({
        harga: [harga({ tanggal: '2026-07-01', terendah: 116, tertinggi: 172 })],
        all_time_price: [ekstrem('52_w_high', '2025-09-22', 500)],
      }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.hijau).toBe(0);
  });

  it('memisahkan ketiga keluaran dalam satu emiten', () => {
    const h = r35AllTimePrice(
      ktx({
        harga: [harga({ tanggal: '2026-07-01', terendah: 116, tertinggi: 172, buka: 120, tutup: 130 })],
        all_time_price: [
          ekstrem('ytd_high', '2026-07-01', 172),
          ekstrem('ytd_low', '2026-07-01', 66),
          ekstrem('52_w_low', '2025-09-22', 50),
        ],
      }),
    );
    expect([h.hitungan.hijau, h.hitungan.merah, h.hitungan.tidak_lengkap]).toEqual([1, 1, 1]);
  });

  it('tidak memakai baris harga cacat sebagai pembanding', () => {
    const cacat: BarisHarga = harga({
      tanggal: '2026-07-01',
      buka: 0,
      tertinggi: 0,
      terendah: 0,
      tutup: 0,
      buka_kosong: true,
    });
    const h = r35AllTimePrice(
      ktx({ harga: [cacat], all_time_price: [ekstrem('ytd_low', '2026-07-01', 66)] }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
  });

  it('dilewati dengan alasan kalau ringkasannya tidak memuat all_time_price', () => {
    const h = r35AllTimePrice(ktx({ harga: [harga()] }));
    expect(h.dijalankan).toBe(false);
    expect(h.hitungan.diperiksa).toBe(0);
  });
});
