/**
 * M2a T-04 (RQ-04): tiga aturan gerbang — R25, R12, R22.
 *
 * Disebut gerbang karena hasilnya dipakai aturan lain: R12 memberi kunci urut,
 * R22 memberi nama yang disatukan, R25 menentukan apakah bukti negatif boleh
 * dipakai sama sekali.
 */
import { describe, expect, it } from 'vitest';
import {
  normalkanNama,
  r12TanggalNamaBerkas,
  r22NamaPemegang,
  r25KelengkapanHalaman,
  tanggalTerbit,
  urutR12,
} from './aturan-v2.ts';
import { dataEmiten, konteks, laporan } from './contoh.ts';
import type { BerkasLaporan, DataEmiten, KonteksGudang, Laporan, Paginasi } from './tipe.ts';

const PAGINASI: Paginasi = {
  total_count: 1,
  showing: 1,
  limit: 30,
  offset: 0,
  has_next: false,
  has_previous: false,
};

function konteksGudang(data: DataEmiten, berkas_kosong: string[] = []): KonteksGudang {
  return { ...konteks({ laporan: data.laporan, simbol: data.simbol }), data, berkas_kosong };
}

function berkasLaporan(ubah: Partial<BerkasLaporan> & { berkas: string }): BerkasLaporan {
  return { simbol: 'AA', paginasi: { ...PAGINASI }, baris: 1, ...ubah };
}

// --- R12 ---------------------------------------------------------------------

describe('R12 — tanggal di nama berkas laporan', () => {
  const dariNamaBerkas = (tanggalBerkas: string, waktu: string): Laporan =>
    laporan({
      laporan_id: `l-${tanggalBerkas}`,
      sumber_dokumen: `https://idx/ANNOUNCEMENTSTOCK/LK-${tanggalBerkas}-7952-00.pdf-0.pdf`,
      dilaporkan_pada: waktu,
    });

  it('membaca tanggal dari pola berjangkar, bukan dari angka mana pun di alamat', () => {
    expect(tanggalTerbit('https://x/LK-20052026-7952-00.pdf', '2026-05-22T07:19:00')).toEqual({
      tanggal: '2026-05-20',
      dari_nama_berkas: true,
    });
    // `From_EREP/202601/<hash>.pdf` memuat 202601 tetapi bukan tanggal terbit.
    expect(tanggalTerbit('https://x/From_EREP/202601/ab12.pdf', '2026-01-14T09:00:00')).toEqual({
      tanggal: '2026-01-14',
      dari_nama_berkas: false,
    });
  });

  it('tidak membaca angka acak di nama berkas sebagai tanggal', () => {
    // Alamat nyata dari gudang: nama berkasnya memuat sepuluh angka berurutan
    // (6066536717). Pola yang tidak berjangkar pada `/LK-` dan `-` akan
    // membacanya sebagai tanggal 60-66-5367 dan mengurutkan rantai dengannya.
    const nyata =
      'https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/' +
      'From_EREP/202508/0d1828e30b_6066536717.pdf';
    expect(tanggalTerbit(nyata, '2025-08-25T17:00:51')).toEqual({
      tanggal: '2025-08-25',
      dari_nama_berkas: false,
    });
  });

  it('hijau kalau tanggal nama berkas sama dengan hari terbitnya', () => {
    const h = r12TanggalNamaBerkas(konteks({ laporan: [dariNamaBerkas('20052026', '2026-05-20T07:19:00')] }));
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.hijau).toBe(1);
  });

  it('merah, berkeparahan peringatan, kalau keduanya berbeda', () => {
    const h = r12TanggalNamaBerkas(konteks({ laporan: [dariNamaBerkas('20052026', '2026-05-22T07:19:00')] }));
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.angka[0]).toEqual({ label: 'selisih hari', nilai: 2, satuan: 'hari' });
  });

  it('melewati laporan yang alamatnya tidak memuat tanggal, dengan alasan', () => {
    const tanpa = laporan({ sumber_dokumen: 'https://x/From_EREP/202601/ab12.pdf' });
    const h = r12TanggalNamaBerkas(konteks({ laporan: [tanpa] }));
    expect(h.hitungan.diperiksa).toBe(0);
    expect(h.hitungan.dilewati).toBe(1);
    expect(h.hitungan.alasan_dilewati[0]).toContain('LK-DDMMYYYY');
  });

  it('melewati laporan yang pemuatnya tidak menyimpan alamat sama sekali', () => {
    const h = r12TanggalNamaBerkas(konteks({ laporan: [laporan({ sumber_dokumen: undefined })] }));
    expect(h.hitungan.dilewati).toBe(1);
  });

  it('menjadi kunci urut yang memindahkan pangkal rantai ke depan', () => {
    // Pola nyata uji lawan 2.2: laporan ber-`before` 0 adalah pangkal rantai,
    // tetapi jam terbitnya menaruhnya di tengah.
    const pangkal = dariNamaBerkas('20052026', '2026-05-22T07:19:00');
    const tengah = dariNamaBerkas('21052026', '2026-05-21T10:00:00');
    const urutWaktu = [tengah, pangkal].map((l) => l.laporan_id);
    const urutTerbit = urutR12([tengah, pangkal]).map((l) => l.laporan_id);
    expect(urutWaktu).toEqual(['l-21052026', 'l-20052026']);
    expect(urutTerbit).toEqual(['l-20052026', 'l-21052026']);
  });
});

// --- R22 ---------------------------------------------------------------------

describe('R22 — ejaan nama pemegang saham', () => {
  it('menyatukan bentuk badan hukum Indonesia, bukan hanya huruf dan angka', () => {
    expect(normalkanNama('PT Estika Tata Tiara Tbk')).toBe('estikatatatiara');
    expect(normalkanNama('Estika Tata Tiara')).toBe('estikatatatiara');
    expect(normalkanNama('PT Pusaka Citra Djokosoetono')).toBe(
      normalkanNama('Pusaka Citra Djokosoetono'),
    );
  });

  it('tidak menyatukan dua pemegang yang memang berbeda', () => {
    expect(normalkanNama('Sabana Prawirawidjaja')).not.toBe(normalkanNama('Suhendra Prawirawidjaja'));
  });

  it('tidak memakan nama yang kebetulan berakhiran seperti bentuk badan hukum', () => {
    // "Ltd" sebagai seluruh nama tidak boleh menguap jadi kosong.
    expect(normalkanNama('Ltd')).toBe('ltd');
    expect(normalkanNama('')).toBe('');
  });

  it('hijau kalau setiap pemegang hanya punya satu ejaan', () => {
    const data = dataEmiten({
      laporan: [laporan({ pemegang: 'PT Alfa Sentosa Tbk' })],
      pemegang: [{ nama: 'Publik', lembar: 10 }],
    });
    const h = r22NamaPemegang(konteksGudang(data));
    expect(h.hitungan.diperiksa).toBe(2);
    expect(h.hitungan.merah).toBe(0);
  });

  it('merah, berkeparahan peringatan, kalau satu pemegang punya dua ejaan di dalam laporan', () => {
    const data = dataEmiten({
      laporan: [
        laporan({ laporan_id: 'a', pemegang: 'PT Estika Tata Tiara Tbk' }),
        laporan({ laporan_id: 'b', pemegang: 'Estika Tata Tiara' }),
      ],
    });
    const h = r22NamaPemegang(konteksGudang(data));
    expect(h.hitungan.merah).toBe(2);
    expect(h.temuan).toHaveLength(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('2 ejaan berbeda');
  });

  it('menangkap juga ejaan yang berbeda antara laporan dan potret kepemilikan', () => {
    const data = dataEmiten({
      laporan: [laporan({ pemegang: 'PT Samuel Sekuritas Indonesia' })],
      pemegang: [{ nama: 'Samuel Sekuritas Indonesia', lembar: 1 }],
    });
    const h = r22NamaPemegang(konteksGudang(data));
    expect(h.hitungan.merah).toBe(2);
    expect(h.temuan[0]?.rujukan).toEqual(['sumber nama: laporan', 'sumber nama: potret kepemilikan']);
  });

  it('dilewati dengan alasan kalau tidak ada nama sama sekali', () => {
    const h = r22NamaPemegang(konteksGudang(dataEmiten()));
    expect(h.dijalankan).toBe(false);
    expect(h.hitungan.diperiksa).toBe(0);
  });
});

// --- R25 ---------------------------------------------------------------------

describe('R25 — kelengkapan halaman laporan', () => {
  it('dilewati kalau tidak ada berkas laporan yang bisa dialamatkan ke emiten ini', () => {
    const h = r25KelengkapanHalaman(konteksGudang(dataEmiten()));
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toContain('dialamatkan');
  });

  it('merah kalau satu halaman menjanjikan sambungan yang tidak ada di gudang', () => {
    const data = dataEmiten({
      berkas_laporan: [
        berkasLaporan({
          berkas: 'aa-filings.json',
          baris: 20,
          paginasi: { ...PAGINASI, total_count: 44, showing: 20, limit: 20, has_next: true },
        }),
      ],
    });
    const h = r25KelengkapanHalaman(konteksGudang(data));
    expect(h.hitungan.merah).toBe(1);
    expect(h.hitungan.tidak_lengkap).toBe(0);
    expect(h.temuan[0]?.ringkasan).toContain('belum utuh');
  });

  it('tidak merah kalau sambungannya ada, dengan total_count yang sama', () => {
    const data = dataEmiten({
      berkas_laporan: [
        berkasLaporan({
          berkas: 'aa-filings.json',
          baris: 20,
          paginasi: { ...PAGINASI, total_count: 44, showing: 20, limit: 20, has_next: true },
        }),
        berkasLaporan({
          berkas: 'aa-filings-p20.json',
          baris: 24,
          paginasi: { ...PAGINASI, total_count: 44, showing: 24, offset: 20, has_previous: true },
        }),
      ],
    });
    const h = r25KelengkapanHalaman(konteksGudang(data));
    expect(h.hitungan.merah).toBe(0);
  });

  it('menjawab TIDAK_LENGKAP, bukan hijau, karena parameter permintaan tidak tersimpan', () => {
    const data = dataEmiten({
      berkas_laporan: [berkasLaporan({ berkas: 'aa-filings.json' })],
    });
    const h = r25KelengkapanHalaman(konteksGudang(data, ['kosong-1.json', 'kosong-2.json']));
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.hijau).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('catatan');
    expect(h.temuan[0]?.ringkasan).toContain('parameter permintaannya tidak tersimpan');
  });

  /*
   * M3.13 D-3: sampai M3.13 angka ini menghitung respons kosong SELURUH gudang
   * ("tidak bisa dialamatkan ke emiten mana pun") untuk setiap emiten — kasus
   * ULTJ tayang menyebut 3 berkas milik COCO, MERK, dan berita DADA, dan
   * menambah data emiten lain mengubah temuan ULTJ (audit M4a:
   * `docs/bukti/audit-gudang.md`). Sekarang yang dihitung hanya respons kosong
   * yang endpoint asalnya (manifest) menyebut simbol emiten ini.
   */
  it('M3.13 D-3: hanya menghitung respons kosong yang endpoint asalnya menyebut emiten ini', () => {
    const data = dataEmiten({ berkas_laporan: [berkasLaporan({ berkas: 'aa-filings.json' })] });
    const k: KonteksGudang = {
      ...konteksGudang(data, ['AA-m4a-filings-p0.json', 'COCO-filings.json', 'MERK-filings.json', 'BB-p1.json']),
      asal_kosong: {
        'AA-m4a-filings-p0.json': '/v2/filings/?symbol=AA&start=2025-01-01&end=2026-09-28&limit=30',
        'BB-p1.json': '/v2/filings/?symbol=BB&start=2025-01-01&end=2026-09-28&limit=30',
        'MERK-filings.json': null,
      },
    };
    const h = r25KelengkapanHalaman(k);
    const angka = h.temuan[0]?.angka.find((a) => a.label.startsWith('respons kosong'));
    expect(angka?.nilai).toBe(1);
    expect(angka?.label).toContain('AA');
    expect(h.temuan[0]?.rujukan).toEqual(['aa-filings.json', 'AA-m4a-filings-p0.json']);
  });

  it('M3.13 D-3: respons kosong tanpa asal (atau milik emiten lain) tidak dihitung untuk emiten ini', () => {
    const data = dataEmiten({ berkas_laporan: [berkasLaporan({ berkas: 'aa-filings.json' })] });
    const h = r25KelengkapanHalaman(konteksGudang(data, ['MERK-filings.json', 'COCO-filings.json']));
    const angka = h.temuan[0]?.angka.find((a) => a.label.startsWith('respons kosong'));
    expect(angka?.nilai).toBe(0);
    expect(h.temuan[0]?.rujukan).toEqual(['aa-filings.json']);
    expect(JSON.stringify(h)).not.toContain('MERK');
  });

  it('M3.13 D-3: simbol endpoint dibaca dari ?symbol= maupun dari segmen path, dengan atau tanpa .JK', () => {
    const data = dataEmiten({ berkas_laporan: [berkasLaporan({ berkas: 'aa-filings.json' })] });
    const k: KonteksGudang = {
      ...konteksGudang(data, ['a.json', 'b.json', 'c.json', 'd.json']),
      asal_kosong: {
        'a.json': '/v2/filings/?symbol=aa.jk&limit=30',
        'b.json': '/v2/company/corporate-actions/AA/',
        'c.json': '/v2/company/corporate-actions/AAB/',
        'd.json': '/v2/filings/?symbol=AAB',
      },
    };
    const angka = r25KelengkapanHalaman(k).temuan[0]?.angka.find((a) => a.label.startsWith('respons kosong'));
    expect(angka?.nilai).toBe(2);
  });
});
