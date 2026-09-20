import { describe, expect, it } from 'vitest';
import {
  cariBlokUlangan,
  r1Aritmetika,
  r2Kontinuitas,
  r3LaporanGanda,
  r4TanggalKetersediaan,
  r5Rekonsiliasi,
  r6SubjekLaporan,
  r7PersenDihitungUlang,
  r8TandaRepo,
  r9TeksVersusField,
  r10HariTanpaVolume,
  verifikasi,
} from './aturan.ts';
import { bersihkanRantai, harga, konteks, konteksRantai, laporan, suspensi } from './contoh.ts';
import { SAHAM_BEREDAR_DADA, rantaiDada2025 } from './rantai-dada.ts';
import type { Temuan } from '../skema/tipe.ts';

function angkaTemuan(temuan: Temuan, label: string): number {
  const cocok = temuan.angka.find((a) => a.label === label);
  if (cocok === undefined) {
    throw new Error(
      `Temuan ${temuan.temuan_id} tidak menyebut angka "${label}"; yang ada: ${temuan.angka
        .map((a) => a.label)
        .join(', ')}.`,
    );
  }
  return cocok.nilai;
}

describe('rantai DADA yang sebenarnya', () => {
  const hasil = verifikasi(konteksRantai(rantaiDada2025()));

  it('menemukan laporan ganda R3: 6 transaksi, 586.000.000 lembar, 7,89 persen', () => {
    const r3 = hasil.temuan.filter((t) => t.aturan === 'R3');
    expect(r3).toHaveLength(1);
    const temuan = r3[0]!;
    expect(angkaTemuan(temuan, 'transaksi yang berulang')).toBe(6);
    expect(angkaTemuan(temuan, 'lembar pada set ulangan')).toBe(586_000_000);
    expect(angkaTemuan(temuan, 'bagian dari saham beredar')).toBe(7.89);
    // Set pertama dilaporkan 22:50–22:54, ulangannya 22:55–23:01.
    expect(temuan.ringkasan).toContain('2025-10-26T22:50:48');
    expect(temuan.ringkasan).toContain('2025-10-26T22:55:13');
    // Kedua PDF yang ada di .cache/idx menjadi bukti blok ini.
    expect(temuan.rujukan.join(' ')).toContain('784cc1c104_45040f8000.pdf');
    expect(temuan.rujukan.join(' ')).toContain('5774cd02a8_1b8dfda15c.pdf');
  });

  it('menemukan lompatan R2 +79.272.900 lembar pada 19 Okt malam', () => {
    const cocok = hasil.temuan.filter(
      (t) => t.aturan === 'R2' && angkaTemuan(t, 'lompatan') === 79_272_900,
    );
    expect(cocok).toHaveLength(1);
    expect(cocok[0]!.ringkasan).toContain('2025-10-19T01:10:41');
    expect(cocok[0]!.ringkasan).toContain('2025-10-19T23:09:20');
  });

  it('menemukan lompatan R2 −1.660.008.900 lembar pada 19 Okt tengah malam', () => {
    const cocok = hasil.temuan.filter(
      (t) => t.aturan === 'R2' && angkaTemuan(t, 'lompatan') === -1_660_008_900,
    );
    expect(cocok).toHaveLength(1);
    expect(cocok[0]!.ringkasan).toContain('2025-10-19T23:10:27');
    expect(cocok[0]!.ringkasan).toContain('2025-10-19T23:44:58');
  });

  it('menemukan satu lompatan lagi yang tidak disebut kontrak: −10.000.000 lembar pada 25 Agu', () => {
    // Laporan 17:00:51 berakhir di 4.692.137.600, laporan 17:03:44 mulai dari
    // 4.682.137.600. Selisih ini ada di data mentah dan di teks laporannya.
    const cocok = hasil.temuan.filter(
      (t) => t.aturan === 'R2' && angkaTemuan(t, 'lompatan') === -10_000_000,
    );
    expect(cocok).toHaveLength(1);
    expect(cocok[0]!.ringkasan).toContain('2025-08-25T17:03:44');
  });

  it('menghasilkan empat temuan: tiga yang diminta kontrak ditambah lompatan 25 Agu', () => {
    expect(hasil.temuan.map((t) => t.aturan)).toEqual(['R2', 'R2', 'R2', 'R3']);
    expect(hasil.temuan.filter((t) => t.aturan === 'R2').map((t) => angkaTemuan(t, 'lompatan')))
      .toEqual([-10_000_000, 79_272_900, -1_660_008_900]);
  });

  it('tidak melewati satu aturan pun tanpa menyebut alasannya', () => {
    for (const p of hasil.pemeriksaan) {
      if (!p.dijalankan) expect(p.alasan_lewat).not.toBeNull();
    }
    const dilewati = hasil.pemeriksaan.filter((p) => !p.dijalankan).map((p) => p.aturan);
    // Konteks rantai tidak memuat harga, potret, teks laporan, maupun tanda repo.
    expect(dilewati).toEqual(['R5', 'R8', 'R9', 'R10']);
  });
});

describe('fixture negatif: rantai DADA yang sudah dibersihkan', () => {
  const bersih = bersihkanRantai(rantaiDada2025());

  it('membuang enam laporan ulangan dan menyisakan 38 laporan', () => {
    expect(bersih).toHaveLength(38);
  });

  it('tidak menghasilkan satu temuan pun', () => {
    const hasil = verifikasi(konteksRantai(bersih));
    expect(hasil.temuan).toEqual([]);
  });
});

describe('R1 aritmetika per laporan', () => {
  it('diam kalau sebelum dikurangi jumlah sama dengan sesudah', () => {
    expect(r1Aritmetika(konteks({ laporan: [laporan()] })).temuan).toEqual([]);
  });

  it('menangkap contoh KRYA 561.322.772 − 80.000.000 ≠ 522.207.800', () => {
    const hasil = r1Aritmetika(
      konteks({
        laporan: [
          laporan({ sebelum: 561_322_772, jumlah: 80_000_000, sesudah: 522_207_800 }),
        ],
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(angkaTemuan(hasil.temuan[0]!, 'selisih')).toBe(522_207_800 - 481_322_772);
  });

  it('menyebut alasan kalau tidak ada laporan sama sekali', () => {
    const hasil = r1Aritmetika(konteks());
    expect(hasil.dijalankan).toBe(false);
    expect(hasil.alasan_lewat).toContain('Tidak ada laporan');
  });
});

describe('R2 kontinuitas rantai', () => {
  it('diam kalau saldo akhir laporan sebelumnya sama dengan saldo awal berikutnya', () => {
    const a = laporan({ laporan_id: 'a', sebelum: 1_000, jumlah: 100, sesudah: 900 });
    const b = laporan({
      laporan_id: 'b',
      dilaporkan_pada: '2025-08-26T10:00:00',
      sebelum: 900,
      jumlah: 100,
      sesudah: 800,
    });
    expect(r2Kontinuitas(konteks({ laporan: [a, b] })).temuan).toEqual([]);
  });

  it('tidak menyambungkan rantai dua pemegang saham yang berbeda', () => {
    const a = laporan({ laporan_id: 'a', sebelum: 1_000, jumlah: 100, sesudah: 900 });
    const b = laporan({
      laporan_id: 'b',
      pemegang: 'Pemegang Lain',
      dilaporkan_pada: '2025-08-26T10:00:00',
      sebelum: 500,
      jumlah: 100,
      sesudah: 400,
    });
    expect(r2Kontinuitas(konteks({ laporan: [a, b] })).temuan).toEqual([]);
  });
});

describe('R3 laporan ganda', () => {
  it('tidak menuduh satu transaksi yang kebetulan mirip', () => {
    const a = laporan({ laporan_id: 'a' });
    const b = laporan({ laporan_id: 'b', dilaporkan_pada: '2025-08-25T17:10:00' });
    // Satu transaksi berulang saja belum cukup: blok minimal dua laporan.
    expect(r3LaporanGanda(konteks({ laporan: [a, b] })).temuan).toEqual([]);
    expect(cariBlokUlangan([a, b])).toEqual([]);
  });
});

describe('R4 tanggal ketersediaan', () => {
  it('menandai laporan tanpa tanggal laporan', () => {
    const hasil = r4TanggalKetersediaan(konteks({ laporan: [laporan({ dilaporkan_pada: '' })] }));
    expect(hasil.temuan).toHaveLength(1);
    expect(hasil.temuan[0]!.ringkasan).toContain('tidak punya tanggal laporan');
  });

  it('menandai transaksi yang bertanggal sesudah laporannya sendiri', () => {
    const hasil = r4TanggalKetersediaan(
      konteks({
        laporan: [
          laporan({
            transaksi: [{ tanggal: '2025-09-01', jenis: 'jual', harga: 12, jumlah: 1_000 }],
          }),
        ],
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(hasil.temuan[0]!.ringkasan).toContain('2025-09-01');
  });

  it('diam kalau transaksi mendahului laporan', () => {
    expect(r4TanggalKetersediaan(konteks({ laporan: [laporan()] })).temuan).toEqual([]);
  });
});

describe('R5 rekonsiliasi dengan sumber kedua', () => {
  it('menyebut alasan kalau tidak ada sumber kedua', () => {
    const hasil = r5Rekonsiliasi(konteks({ laporan: [laporan()] }));
    expect(hasil.dijalankan).toBe(false);
    expect(hasil.alasan_lewat).toContain('sumber kedua');
  });

  it('menangkap contoh KRYA: rantai 374.014.400 versus potret 362.207.800', () => {
    const hasil = r5Rekonsiliasi(
      konteks({
        laporan: [laporan({ sebelum: 474_014_400, jumlah: 100_000_000, sesudah: 374_014_400 })],
        potret: { sumber: 'potret pemegang saham', pada: '2026-01-31', lembar: 362_207_800 },
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(angkaTemuan(hasil.temuan[0]!, 'selisih')).toBe(362_207_800 - 374_014_400);
  });

  it('diam kalau saldo akhir rantai cocok dengan potret', () => {
    const hasil = r5Rekonsiliasi(
      konteks({
        laporan: [laporan()],
        potret: { sumber: 'potret pemegang saham', pada: '2025-09-30', lembar: 4_692_137_600 },
      }),
    );
    expect(hasil.temuan).toEqual([]);
  });
});

describe('R6 subjek laporan dan rentang harga', () => {
  it('menangkap contoh LPLI: laporan di satu emiten tetapi isinya emiten lain', () => {
    const hasil = r6SubjekLaporan(
      konteks({ simbol: 'LPLI.JK', laporan: [laporan({ simbol: 'NOBU.JK' })] }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(hasil.temuan[0]!.ringkasan).toContain('NOBU.JK');
  });

  it('menandai harga transaksi di luar rentang harga hari itu', () => {
    const hasil = r6SubjekLaporan(
      konteks({
        laporan: [
          laporan({
            transaksi: [{ tanggal: '2025-08-07', jenis: 'jual', harga: 232, jumlah: 1_000 }],
          }),
        ],
        harga: [harga({ tanggal: '2025-08-07', terendah: 12, tertinggi: 12 })],
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(angkaTemuan(hasil.temuan[0]!, 'harga pasar tertinggi hari itu')).toBe(12);
  });

  it('diam kalau harga transaksi berada di dalam rentang hari itu', () => {
    const hasil = r6SubjekLaporan(
      konteks({ laporan: [laporan()], harga: [harga({ terendah: 12, tertinggi: 14 })] }),
    );
    expect(hasil.temuan).toEqual([]);
  });

  it('menyebut kalau pemeriksaan harga dilewati karena tidak ada data harga', () => {
    const hasil = r6SubjekLaporan(konteks({ laporan: [laporan()] }));
    expect(hasil.alasan_lewat).toContain('tidak ada data harga harian');
  });
});

describe('R7 persen dihitung ulang', () => {
  it('menangkap contoh COCO: laporan menulis 44,69 persen padahal 51,32 persen', () => {
    const hasil = r7PersenDihitungUlang(
      konteks({
        saham_beredar: 889_863_981,
        laporan: [
          laporan({
            sebelum: 556_716_151,
            jumlah: 100_000_000,
            sesudah: 456_716_151,
            persen_sebelum: 62.56,
            persen_sesudah: 44.69,
          }),
        ],
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(angkaTemuan(hasil.temuan[0]!, 'persen hasil hitung ulang')).toBe(51.32);
  });

  it('diam kalau persen di laporan cocok dengan hitungan ulang', () => {
    const hasil = r7PersenDihitungUlang(
      konteks({ saham_beredar: SAHAM_BEREDAR_DADA, laporan: [laporan()] }),
    );
    expect(hasil.temuan).toEqual([]);
  });

  it('menyebut alasan kalau saham beredar tidak diketahui', () => {
    const hasil = r7PersenDihitungUlang(konteks({ laporan: [laporan()] }));
    expect(hasil.dijalankan).toBe(false);
    expect(hasil.alasan_lewat).toContain('saham beredar');
  });
});

describe('R8 tanda repo', () => {
  it('menyebut alasan selama tanda repo belum diurai dari PDF', () => {
    const hasil = r8TandaRepo(konteks({ laporan: [laporan()] }));
    expect(hasil.dijalankan).toBe(false);
    expect(hasil.alasan_lewat).toContain('repurchase agreement');
  });

  it('menandai penjualan yang di dokumennya bertanda repo', () => {
    const hasil = r8TandaRepo(
      konteks({ laporan: [laporan()], tanda_repo: { 'contoh-1': true } }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(hasil.temuan[0]!.ringkasan).toContain('repurchase agreement');
  });

  it('diam kalau dokumennya tidak bertanda repo', () => {
    expect(
      r8TandaRepo(konteks({ laporan: [laporan()], tanda_repo: { 'contoh-1': false } })).temuan,
    ).toEqual([]);
  });
});

describe('R9 field terstruktur versus teks', () => {
  it('menangkap contoh KRYA: teks laporan tidak sama dengan field', () => {
    const hasil = r9TeksVersusField(
      konteks({
        laporan: [
          laporan({
            sebelum: 561_322_772,
            jumlah: 80_000_000,
            sesudah: 481_322_772,
            teks: 'changing its holding from 561,322,772 to 522,207,800 shares.',
          }),
        ],
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(angkaTemuan(hasil.temuan[0]!, 'sesudah menurut teks')).toBe(522_207_800);
    expect(angkaTemuan(hasil.temuan[0]!, 'sesudah menurut field')).toBe(481_322_772);
  });

  it('menangkap total kumulatif di teks yang tidak sama dengan penjumlahan rantai', () => {
    const hasil = r9TeksVersusField(
      konteks({
        laporan: [
          laporan({
            teks: "This is the holder's 1st insider disposal in the last 6 months, totaling a distribution of 686,000,000 shares transacted at an average price of IDR 12.",
          }),
        ],
      }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(angkaTemuan(hasil.temuan[0]!, 'selisih')).toBe(686_000_000 - 100_000_000);
  });

  it('diam kalau teks dan field sepakat', () => {
    const hasil = r9TeksVersusField(
      konteks({
        laporan: [
          laporan({
            teks: "This is the holder's 1st insider disposal in the last 6 months, totaling a distribution of 100,000,000 shares. Holding changed from 4,792,137,600 to 4,692,137,600 shares.",
          }),
        ],
      }),
    );
    expect(hasil.temuan).toEqual([]);
  });
});

describe('R10 hari tanpa volume', () => {
  it('menandai hari bervolume nol yang tidak ada di daftar suspensi', () => {
    const hasil = r10HariTanpaVolume(
      konteks({ harga: [harga({ tanggal: '2025-12-22', volume: 0 })] }),
    );
    expect(hasil.temuan).toHaveLength(1);
    expect(hasil.temuan[0]!.ringkasan).toContain('2025-12-22');
  });

  it('diam kalau hari bervolume nol memang hari suspensi', () => {
    const hasil = r10HariTanpaVolume(
      konteks({
        harga: [harga({ tanggal: '2025-10-09', volume: 0 })],
        suspensi: [suspensi({ tanggal: '2025-10-09' })],
      }),
    );
    expect(hasil.temuan).toEqual([]);
  });
});
