/**
 * M2d-9 T-02: usulan hari (D-2). Aturan urut tertulis & dites; usulan tanpa
 * kandidat palsu; alasan tidak memakai data sesudah T.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOLDER_GUDANG, muatGudang } from '../../factory/muat/gudang.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { dataKosong, deretHarga } from './bantu-data.ts';
import {
  ATURAN_URUT,
  bandingUsulan,
  hariKerjaAntara,
  jendelaSah,
  kodeSah,
  peristiwaKandidat,
  usulkanHari,
  type Usulan,
} from './usulan.ts';

const HARI_INI = '2026-09-30';
const opsi = { jendela: 10, hariIni: HARI_INI };

/** 60 hari kerja mulai 2 Mar 2026, harga datar 100. */
function dasar(): DataEmiten {
  return { ...dataKosong(), harga: deretHarga('2026-03-02', 60) };
}

describe('tanpa peristiwa → tanpa usulan (tidak ada kandidat palsu)', () => {
  it('harga datar tanpa peristiwa apa pun', () => {
    const h = usulkanHari('UJIX', dasar(), opsi);
    expect(h.usulan).toEqual([]);
    expect(h.jumlah_kandidat).toBe(0);
  });

  it('kenaikan 4 hari beruntun belum peristiwa; 5 hari = peristiwa pada hari kelima', () => {
    const empat = { ...dataKosong(), harga: deretHarga('2026-03-02', 60, (i) => (i >= 10 && i <= 13 ? 100 + (i - 9) * 5 : i > 13 ? 120 : 100)) };
    expect(peristiwaKandidat(empat).peristiwa).toEqual([]);
    const lima = { ...dataKosong(), harga: deretHarga('2026-03-02', 60, (i) => (i >= 10 && i <= 16 ? 100 + (i - 9) * 5 : i > 16 ? 135 : 100)) };
    const p = peristiwaKandidat(lima).peristiwa;
    expect(p.map((x) => [x.jenis, x.t])).toEqual([['lonjakan', lima.harga[14]?.tanggal]]);
  });

  it('kenaikan tanpa volume tidak dihitung', () => {
    const d = { ...dataKosong(), harga: deretHarga('2026-03-02', 60, (i) => 100 + i, () => 0) };
    expect(peristiwaKandidat(d).peristiwa).toEqual([]);
  });

  it('penghentian tanpa baris harga di hari itu (atau 5 hari sesudahnya) dilewati, dengan alasan', () => {
    const d = { ...dasar(), suspensi: [{ tanggal: '2025-01-21', alasan: 'Keraguan kelangsungan usaha' }] };
    const h = usulkanHari('UJIX', d, opsi);
    expect(h.usulan).toEqual([]);
    expect(h.dilewati[0]?.alasan).toMatch(/tidak ada baris harga/);
  });
});

describe('satu peristiwa', () => {
  it('penghentian → usulan dengan alasan resmi, salah kaprah, status data', () => {
    const d = { ...dasar(), suspensi: [{ tanggal: '2026-04-01', alasan: 'Peningkatan harga kumulatif yang signifikan' }] };
    const h = usulkanHari('UJIX', d, opsi);
    expect(h.usulan).toHaveLength(1);
    const u = h.usulan[0] as Usulan;
    expect(u.tanggal).toBe('2026-04-01');
    expect(u.jenis).toEqual(['suspensi']);
    expect(u.alasan[0]).toContain('Alasan resmi: Peningkatan harga kumulatif yang signifikan.');
    expect(u.salah_kaprah[0]).toMatch(/hukuman/);
    expect(u.status).toMatchObject({ harga_t: true, sesudah_cukup: true, suspensi_lalu: 0 });
    expect(u.status.sesudah).toBe(60 - 1 - d.harga.findIndex((x) => x.tanggal === '2026-04-01'));
    expect(h.catatan_kebocoran).toMatch(/HANYA untuk menghitung/);
  });

  it('data sesudahnya < jendela → tidak diusulkan, dilewati dengan jumlahnya', () => {
    const t = dasar().harga[55]?.tanggal as string;
    const d = { ...dasar(), suspensi: [{ tanggal: t, alasan: 'x' }] };
    const h = usulkanHari('UJIX', d, opsi);
    expect(h.usulan).toEqual([]);
    expect(h.dilewati[0]?.alasan).toBe('data harga sesudahnya hanya 4 hari bursa (perlu ≥ 10)');
    expect(usulkanHari('UJIX', d, { ...opsi, jendela: 5 }).usulan).toEqual([]);
    expect(usulkanHari('UJIX', { ...d, suspensi: [{ tanggal: dasar().harga[50]?.tanggal as string, alasan: 'x' }] }, { ...opsi, jendela: 5 }).usulan).toHaveLength(1);
  });

  it('hari ini dan terlalu dekat dengan hari ini ditolak walau datanya ada', () => {
    const d = { ...dataKosong(), harga: deretHarga('2026-08-03', 45), suspensi: [{ tanggal: '2026-09-24', alasan: 'x' }] };
    const h = usulkanHari('UJIX', d, { jendela: 5, hariIni: '2026-09-28' });
    expect(h.usulan).toEqual([]);
    expect(h.dilewati[0]?.alasan).toMatch(/terlalu dekat dengan hari ini: baru 1 hari kerja/);
    expect(hariKerjaAntara('2026-09-24', '2026-09-28')).toBe(1);
    const hariIni = usulkanHari('UJIX', d, { jendela: 5, hariIni: '2026-09-24' });
    expect(hariIni.dilewati[0]?.alasan).toMatch(/hari ini atau sesudahnya/);
  });

  it('ex dividen dan laporan orang dalam (terbit akhir pekan → hari bursa berikutnya)', () => {
    const d: DataEmiten = {
      ...dasar(),
      dividen: [{ ex_date: '2026-04-15', tanggal_bayar: null, nilai_per_lembar: 12 }],
      laporan: [
        {
          laporan_id: 'l1', simbol: 'UJIX', pemegang: 'Budi Pemilik', dilaporkan_pada: '2026-05-02T19:00:00', jenis: 'jual', jumlah: 1_000_000,
          harga: 100, sebelum: 5e6, sesudah: 4e6, persen_sebelum: 5, persen_sesudah: 4, transaksi: [], teks: '', berkas: 'x',
        },
      ],
    };
    const h = usulkanHari('UJIX', d, opsi);
    const perT = new Map(h.usulan.map((u) => [u.tanggal, u]));
    expect(perT.get('2026-04-15')?.alasan[0]).toBe('Tanggal ex dividen tunai Rp12 per lembar: pembeli mulai hari ini tidak kebagian dividen itu.');
    expect(perT.get('2026-05-04')?.alasan[0]).toBe('1 laporan kepemilikan terbit 2 Mei 2026 (hari bursa berikutnya 4 Mei 2026): Budi Pemilik melaporkan jual 1.000.000 lembar.');
  });
});

describe('aturan urut (tertulis = dites)', () => {
  it('enam aturan tertulis', () => {
    expect(ATURAN_URUT).toHaveLength(6);
  });

  it('1: dua jenis di hari yang sama mengalahkan satu jenis; 2: penghentian > kenaikan > ex dividen > laporan; 4: terbaru', () => {
    const h = dasar().harga;
    const t = (i: number): string => h[i]?.tanggal as string;
    const d: DataEmiten = {
      ...dasar(),
      suspensi: [{ tanggal: t(10), alasan: 'a' }, { tanggal: t(30), alasan: 'b' }],
      dividen: [{ ex_date: t(30), tanggal_bayar: null, nilai_per_lembar: 5 }, { ex_date: t(45), tanggal_bayar: null, nilai_per_lembar: 5 }],
    };
    const u = usulkanHari('UJIX', d, opsi).usulan;
    expect(u.map((x) => [x.tanggal, x.jenis.join('+')])).toEqual([
      [t(30), 'suspensi+ex-dividen'],
      [t(10), 'suspensi'],
      [t(45), 'ex-dividen'],
    ]);
  });

  it('3: konteks lebih kaya mengalahkan yang lebih baru', () => {
    const a = { tanggal: '2026-04-01', jenis: ['suspensi'], alasan: [], salah_kaprah: [], status: {} as never, skor: { jumlah_jenis: 1, prioritas: 1, kekayaan: 3 } } as Usulan;
    const b = { ...a, tanggal: '2026-05-01', skor: { ...a.skor, kekayaan: 2 } };
    expect([b, a].sort(bandingUsulan).map((x) => x.tanggal)).toEqual(['2026-04-01', '2026-05-01']);
    expect([a, { ...b, skor: a.skor }].sort(bandingUsulan).map((x) => x.tanggal)).toEqual(['2026-05-01', '2026-04-01']);
  });

  it('0: penghentian lanjutan ≤ 5 hari bursa dibuang (awal episode dipakai); 5: usulan berdekatan dilewati', () => {
    const h = dasar().harga;
    const t = (i: number): string => h[i]?.tanggal as string;
    const d: DataEmiten = {
      ...dasar(),
      suspensi: [{ tanggal: t(20), alasan: 'awal' }, { tanggal: t(22), alasan: 'lanjutan' }],
      dividen: [{ ex_date: t(18), tanggal_bayar: null, nilai_per_lembar: 5 }],
    };
    const r = usulkanHari('UJIX', d, opsi);
    expect(r.usulan.map((x) => x.tanggal)).toEqual([t(20)]);
    expect(r.dilewati.map((x) => x.alasan)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^lanjutan penghentian/), expect.stringMatching(/^terlalu dekat dengan usulan/)]),
    );
  });

  it('paling banyak tiga usulan', () => {
    const h = dasar().harga;
    const d: DataEmiten = { ...dasar(), suspensi: [5, 15, 25, 35, 45].map((i) => ({ tanggal: h[i]?.tanggal as string, alasan: 'x' })) };
    expect(usulkanHari('UJIX', d, opsi).usulan).toHaveLength(3);
  });
});

describe('tanpa kebocoran masa depan: alasan dan jenis untuk T tidak berubah bila data sesudah T diganti', () => {
  it('mengganti harga, penghentian, dividen, dan laporan sesudah T hanya mengubah jumlah "sesudahnya"', () => {
    const h = dasar().harga;
    const t = (i: number): string => h[i]?.tanggal as string;
    const asli: DataEmiten = {
      ...dataKosong(),
      harga: deretHarga('2026-03-02', 60, (i) => (i >= 20 && i <= 26 ? 100 + (i - 19) * 7 : i > 26 ? 150 : 100)),
      suspensi: [{ tanggal: t(12), alasan: 'awal tahun' }],
    };
    const semula = usulkanHari('UJIX', asli, opsi);
    expect(semula.usulan.length).toBeGreaterThan(0);
    for (const u of semula.usulan) {
      const sesudahDiganti: DataEmiten = {
        ...asli,
        harga: asli.harga.map((x) => (x.tanggal > u.tanggal ? { ...x, tutup: x.tutup * 3 + 7, volume: 0 } : x)),
        suspensi: [...asli.suspensi.filter((s) => s.tanggal <= u.tanggal), { tanggal: t(58), alasan: 'masa depan' }],
        dividen: [{ ex_date: t(57), tanggal_bayar: null, nilai_per_lembar: 99 }],
      };
      const lagi = usulkanHari('UJIX', sesudahDiganti, { ...opsi, jendela: 5 });
      const sama = lagi.usulan.find((x) => x.tanggal === u.tanggal) ?? null;
      expect(sama?.alasan).toEqual(u.alasan);
      expect(sama?.jenis).toEqual(u.jenis);
    }
  });
});

describe('masukan', () => {
  it('kode empat huruf, sufiks .JK dilepas', () => {
    expect(kodeSah(' tirt ')).toBe('TIRT');
    expect(kodeSah('TIRT.JK')).toBe('TIRT');
    expect(kodeSah('TIR')).toBeNull();
    expect(kodeSah('../x')).toBeNull();
    expect(kodeSah(5)).toBeNull();
  });

  it('jendela 5–20 bilangan bulat, bawaan 10', () => {
    expect(jendelaSah(undefined)).toBe(10);
    expect(jendelaSah('7')).toBe(7);
    expect(jendelaSah(4)).toBeNull();
    expect(jendelaSah(21)).toBeNull();
    expect(jendelaSah(7.5)).toBeNull();
  });
});

describe.skipIf(!existsSync(`${FOLDER_GUDANG}/suspensions-all.json`))('gudang sungguhan (butuh .cache/)', () => {
  it('TIRT: 10 Des 2025 (penghentian cooling down, T M2d-5…M2d-8) termasuk tiga usulan; 12 Des = lanjutan', () => {
    const d = muatGudang().emiten.get('TIRT');
    expect(d).toBeDefined();
    const h = usulkanHari('TIRT', d as DataEmiten, opsi);
    expect(h.usulan.map((u) => u.tanggal)).toContain('2025-12-10');
    expect(h.dilewati.find((x) => x.tanggal === '2025-12-12')?.alasan).toMatch(/^lanjutan penghentian/);
  });
});
