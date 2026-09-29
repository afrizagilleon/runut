/**
 * M4a D-5 — bug aturan yang ditemukan penguji independen atas data audit.
 *
 * Tiap fixture di sini disalin dari respons mentah Sectors (baris yang sama,
 * angka yang sama); jawaban penguji ada di `eval/audit-gudang/penguji/`.
 * Ditulis MERAH lebih dulu, sebelum aturannya diperbaiki.
 *
 * 1. R14/R16 — dua laporan satu pemegang dengan cap waktu dan PDF yang SAMA
 *    diurutkan menurut urutan baris respons API, bukan menurut sambungan
 *    saldonya. Respons BCIC menaruh laporan jual (saldo awal 3.237.600) di atas
 *    laporan beli (saldo akhir 3.237.600) → dua "putus rantai" semu (U15, U16);
 *    BAJA sama → satu R14 semu yang juga tampil sebagai R16 (U17).
 * 2. R17B — butir `transfer` berharga 0 (pengalihan saham remunerasi BBMD)
 *    dibandingkan dengan rentang harga pasar. Harga nol bukan harga pasar (U20).
 * 3. R31 — keputusan RUPS BNII menulis Rp7.61 (dua desimal); medan dividend
 *    7,61106. Angka RUPS adalah pembulatan, bukan angka lain (U27).
 */
import { describe, expect, it } from 'vitest';
import { r14RantaiPutus, r16JamTerbit, r17bHargaHariTransaksi } from './aturan-v2.ts';
import { r31DividenRupsVersusMedan } from './aturan-keuangan.ts';
import { harga, konteksGudang, laporan } from './contoh.ts';
import type { Laporan } from './tipe.ts';

function lap(
  simbol: string,
  pemegang: string,
  waktu: string,
  pdf: string,
  jenis: 'beli' | 'jual',
  sebelum: number,
  sesudah: number,
): Laporan {
  return laporan({
    laporan_id: `${simbol}|${waktu}|${pdf}`,
    simbol,
    pemegang,
    dilaporkan_pada: waktu,
    jenis,
    jumlah: Math.abs(sesudah - sebelum),
    sebelum,
    sesudah,
    transaksi: [],
    berkas: pdf,
    sumber_dokumen: `https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/${pdf}`,
    jenis_mentah: jenis === 'beli' ? 'buy' : 'sell',
  });
}

describe('D-5 R14/R16: laporan bercap waktu sama diurutkan menurut sambungan saldonya', () => {
  // BCIC, Helmi Arif Hidayat — urutan persis seperti di respons API.
  const bcic = [
    lap('BCIC', 'Helmi Arif Hidayat', '2026-08-31T16:50:27', 'LK-31082026-4638-00.pdf-0.pdf', 'beli', 3_237_500, 3_314_100),
    lap('BCIC', 'Helmi Arif Hidayat', '2026-07-29T15:57:37', 'LK-29072026-3109-00.pdf-0.pdf', 'jual', 3_237_600, 3_237_500),
    lap('BCIC', 'Helmi Arif Hidayat', '2026-07-29T15:57:37', 'LK-29072026-3109-00.pdf-0.pdf', 'beli', 3_159_100, 3_237_600),
    lap('BCIC', 'Helmi Arif Hidayat', '2026-06-29T16:52:35', 'LK-29062026-0121-00.pdf-0.pdf', 'beli', 3_086_800, 3_159_100),
  ];
  // BAJA, Ibnu Susanto — jual tercantum di atas beli, satu PDF, satu cap waktu.
  const baja = [
    lap('BAJA', 'Ibnu Susanto', '2026-09-14T09:28:40', 'LK-14092026-8980-00.pdf-0.pdf', 'jual', 307_205_500, 307_195_500),
    lap('BAJA', 'Ibnu Susanto', '2026-09-14T09:28:40', 'LK-14092026-8980-00.pdf-0.pdf', 'beli', 296_016_000, 307_205_500),
  ];

  // Pemuat mengurutkan menurut cap waktu lalu laporan_id; untuk cap waktu dan
  // PDF yang sama, urutan baris API bertahan. Tiru itu di sini.
  const urutPemuat = (d: Laporan[]) =>
    [...d].sort((a, b) => a.dilaporkan_pada.localeCompare(b.dilaporkan_pada) || a.laporan_id.localeCompare(b.laporan_id));

  it('BCIC: rantai 06-29 → 07-29 (beli, lalu jual) → 08-31 tidak putus', () => {
    const h = r14RantaiPutus(konteksGudang({ simbol: 'BCIC', laporan: urutPemuat(bcic) }));
    expect(h.hitungan.diperiksa).toBe(3);
    expect(h.hitungan.merah).toBe(0);
    expect(h.temuan).toEqual([]);
  });

  it('BAJA: beli lalu jual pada detik yang sama bukan putus rantai dan bukan jam terbalik', () => {
    const k = konteksGudang({ simbol: 'BAJA', laporan: urutPemuat(baja) });
    expect(r14RantaiPutus(k).hitungan.merah).toBe(0);
    expect(r16JamTerbit(k).hitungan.merah).toBe(0);
  });

  it('putus rantai yang sungguhan tetap merah walau ada cap waktu kembar', () => {
    // Laporan 08-31 mulai dari 3.237.400: 100 lembar hilang tanpa laporan.
    const rusak = bcic.map((l) => (l.dilaporkan_pada.startsWith('2026-08-31') ? { ...l, sebelum: 3_237_400 } : l));
    const h = r14RantaiPutus(konteksGudang({ simbol: 'BCIC', laporan: urutPemuat(rusak) }));
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('2026-08-31T16:50:27');
  });

  it('cap waktu berbeda tidak diurutkan ulang: jam terbit yang terbalik tetap tertangkap R16', () => {
    const terbalik = [
      lap('XX', 'A', '2026-01-02T10:00:00', 'LK-02012026-0001-00.pdf-0.pdf', 'jual', 200, 150),
      lap('XX', 'A', '2026-01-02T11:00:00', 'LK-02012026-0002-00.pdf-0.pdf', 'beli', 100, 200),
    ];
    expect(r16JamTerbit(konteksGudang({ simbol: 'XX', laporan: terbalik })).hitungan.merah).toBe(1);
  });
});

describe('D-5 R17B: harga nol pada butir pengalihan bukan harga pasar', () => {
  const bbmd = laporan({
    laporan_id: 'BBMD|2025-08-07T16:30:49|885d18b338_eeb5442454.pdf',
    simbol: 'BBMD',
    dilaporkan_pada: '2025-08-07T16:30:49',
    jenis: 'jual',
    jenis_mentah: 'others',
    harga: 0,
    sebelum: 193_600,
    sesudah: 243_500,
    jumlah: 49_900,
    transaksi: [{ tanggal: '2025-08-07', jenis: 'jual', harga: 0, jumlah: 49_900 }],
    berkas: '885d18b338_eeb5442454.pdf',
  });
  const hari = harga({ tanggal: '2025-08-07', buka: 2090, tertinggi: 2090, terendah: 2090, tutup: 2090, volume: 1900, nilai_pasar: 8_462_805_219_000 });

  it('BBMD 2025-08-07: butir transfer Rp0 tidak merah, dicatat tidak lengkap dengan alasan', () => {
    const h = r17bHargaHariTransaksi(konteksGudang({ simbol: 'BBMD', laporan: [bbmd], harga: [hari] }));
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.hitungan.alasan_dilewati?.join(' ')).toMatch(/nol/);
  });

  it('harga Rp1 di bawah rentang tetap merah — hanya nol yang dikecualikan', () => {
    const satu = { ...bbmd, transaksi: [{ tanggal: '2025-08-07', jenis: 'jual' as const, harga: 1, jumlah: 49_900 }] };
    const h = r17bHargaHariTransaksi(konteksGudang({ simbol: 'BBMD', laporan: [satu], harga: [hari] }));
    expect(h.hitungan.merah).toBe(1);
  });
});

describe('D-5 R31: angka RUPS yang ditulis dengan dua desimal dibandingkan pada dua desimal', () => {
  const teks =
    'Agenda #2: Shareholders approved allocating 35% of the Rp1.65 trillion net profit as cash dividends at ' +
    'Rp7.61 per share, with the remaining 65% designated as retained earnings.';
  const dividen = [
    { ex_date: '2025-04-23', tanggal_bayar: null, nilai_per_lembar: 5.85691, imbal_hasil: null },
    { ex_date: '2026-04-28', tanggal_bayar: '2026-05-13', nilai_per_lembar: 7.61106, imbal_hasil: null },
  ];

  it('BNII RUPS 2026-04-17: Rp7.61 = 7,61106 dibulatkan dua desimal → hijau', () => {
    const h = r31DividenRupsVersusMedan(
      konteksGudang({ simbol: 'BNII', rups: [{ tanggal: '2026-04-17', ringkasan: teks }], dividen }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('angka yang berbeda di dua desimal tetap merah (Rp7.62)', () => {
    const h = r31DividenRupsVersusMedan(
      konteksGudang({ simbol: 'BNII', rups: [{ tanggal: '2026-04-17', ringkasan: teks.replace('Rp7.61', 'Rp7.62') }], dividen }),
    );
    expect(h.hitungan.merah).toBe(1);
  });

  it('angka bulat di RUPS tidak menelan pecahan: Rp8 ≠ 7,61106', () => {
    const h = r31DividenRupsVersusMedan(
      konteksGudang({ simbol: 'BNII', rups: [{ tanggal: '2026-04-17', ringkasan: teks.replace('Rp7.61', 'Rp8') }], dividen }),
    );
    expect(h.hitungan.merah).toBe(1);
  });
});
