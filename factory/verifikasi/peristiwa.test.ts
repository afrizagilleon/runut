/**
 * M2b T-08 (RQ-04, RQ-05): urutan jalan, pembatalan, dan tabel peristiwa.
 *
 * Satu cacat data tidak boleh melahirkan dua temuan. Berkas ini mengunci tiga
 * tempat di mana itu bisa terjadi di kelompok keuangan dan peristiwa korporasi.
 */
import { describe, expect, it } from 'vitest';
import { harga, konteksGudang } from './contoh.ts';
import type { DataEmiten } from './tipe.ts';
import { ATURAN_V2 } from './v2.ts';
import {
  penyesuaianSplitDividen,
  r21SahamBedaSumber,
  r26PembagianLaba,
  r29HargaDiTanggalEx,
  r31DividenRupsVersusMedan,
  r32PerubahanSahamVsAksi,
  tahunTerjelaskan,
} from './aturan-keuangan.ts';
import { keparahanTemuan } from '../skema/tipe.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PENOLAK_PERISTIWA, PERISTIWA, susunDokumenBukti, susunLaporanGudang } from '../gudang.ts';
import { salinGudangBeku } from '../muat/gudang-beku.ts';

const ktx = (ubah: Partial<DataEmiten> = {}) => konteksGudang(ubah);

const denganBasis = (daftar: Array<[number, number]>): Partial<DataEmiten> => ({
  keuangan_tahunan: daftar.map(([t]) => ({
    tahun: t,
    laba: 1_000_000_000,
    pendapatan: null,
    ekuitas: null,
    aset: null,
    laba_kotor: null,
    lembar: null,
  })),
  eps_tahunan: daftar.map(([t, lembar]) => ({ tahun: t, eps: 1_000_000_000 / lembar })),
});

describe('urutan jalan kelompok keuangan dan peristiwa', () => {
  const urutan = new Map(ATURAN_V2.map((e) => [e.kode, e.urutan]));

  it('menjalankan R32 sebelum R21, karena R32 yang membatalkan merah R21', () => {
    // Uji lawan menaruh R32 sesudah R21. Menaruhnya sebelum R21 memberi akibat
    // yang sama — R21 bisa langsung membaca tahun yang sudah terjelaskan —
    // tanpa membuat ketergantungan yang menunjuk ke belakang.
    expect(urutan.get('R32')).toBeLessThan(urutan.get('R21') ?? 0);
    expect(urutan.get('R20')).toBeLessThan(urutan.get('R32') ?? 0);
  });

  it('menjalankan R31 sebelum R26 dan R29, karena keduanya memakai hasilnya', () => {
    expect(urutan.get('R31')).toBeLessThan(urutan.get('R26') ?? 0);
    expect(urutan.get('R31')).toBeLessThan(urutan.get('R29') ?? 0);
  });

  it('menjalankan R34 paling akhir, sebagai penanda kelengkapan', () => {
    const nomor = ATURAN_V2.map((e) => e.urutan);
    expect(urutan.get('R34')).toBe(Math.max(...nomor));
  });

  it('menjalankan R20 sebelum R26, karena basis saham tahunan yang dipakai keduanya', () => {
    expect(urutan.get('R20')).toBeLessThan(urutan.get('R26') ?? 0);
  });
});

describe('satu cacat data, satu temuan (RQ-04)', () => {
  it('R32 membatalkan merah R21 untuk tahun buku yang perubahannya sudah terjelaskan', () => {
    // COCO 2025: basis saham naik empat kali lipat, dijelaskan penerbitan saham
    // baru 1 : 3. Jumlah saham akhir tahun dari dua sumber karena itu memang
    // berbeda — dan cerita itu sudah diceritakan R32.
    const dasar: Partial<DataEmiten> = {
      simbol: 'COCO',
      ...denganBasis([
        [2024, 889_863_981],
        [2025, 3_559_455_924],
      ]),
      saham_tahunan: [{ tahun: 2025, lembar: 3_583_687_879 }],
      harga: [
        harga({
          tanggal: '2025-12-30',
          tutup: 100,
          buka: 100,
          tertinggi: 100,
          terendah: 100,
          nilai_pasar: 100 * 3_559_455_924,
        }),
      ],
    };

    const dijelaskan = ktx({
      ...dasar,
      right_issue: [{ ex_date: '2025-10-09', rasio_lama: 1, rasio_baru: 3, sumber: 'x', harga: 100 }],
    });
    expect(tahunTerjelaskan(dijelaskan)).toEqual([2025]);
    expect(r32PerubahanSahamVsAksi(dijelaskan).hitungan.merah).toBe(0);
    const r21Dijelaskan = r21SahamBedaSumber(dijelaskan);
    expect(r21Dijelaskan.hitungan.merah).toBe(0);
    expect(r21Dijelaskan.hitungan.alasan_dilewati.join(' ')).toContain('sudah dijelaskan aksi korporasi di R32');

    // Tanpa aksi korporasi yang menjelaskannya, R32 merah dan R21 tetap memeriksa.
    const tanpa = ktx(dasar);
    expect(r32PerubahanSahamVsAksi(tanpa).hitungan.merah).toBe(1);
    expect(r21SahamBedaSumber(tanpa).hitungan.merah).toBe(1);
  });

  it('cacat pemecahan saham MLPT melahirkan satu temuan R31, bukan tambahan merah R26 dan R29', () => {
    const mlpt = ktx({
      simbol: 'MLPT',
      stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x' }],
      rups: [
        {
          tanggal: '2026-04-29',
          ringkasan: 'approved a total cash dividend of Rp133.50 per share for the 2025 fiscal year',
        },
      ],
      dividen: [
        { ex_date: '2025-11-07', tanggal_bayar: null, nilai_per_lembar: 2.14 },
        { ex_date: '2026-05-11', tanggal_bayar: null, nilai_per_lembar: 3.2 },
      ],
      harga: [
        harga({ tanggal: '2025-11-06', buka: 3170, tutup: 3180, tertinggi: 3180, terendah: 3170 }),
        harga({ tanggal: '2025-11-07', buka: 3192, tutup: 3200, tertinggi: 3200, terendah: 3192 }),
        harga({ tanggal: '2026-05-08', buka: 840, tutup: 845, tertinggi: 845, terendah: 840 }),
        harga({ tanggal: '2026-05-11', buka: 846, tutup: 850, tertinggi: 850, terendah: 846 }),
      ],
      keuangan_tahunan: [
        { tahun: 2025, laba: 1_000_000_000_000, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
      ],
      eps_tahunan: [{ tahun: 2025, eps: 1_000 }],
    });

    expect(penyesuaianSplitDividen(mlpt).lipat).toBe(25);
    expect(r31DividenRupsVersusMedan(mlpt).hitungan.merah).toBe(1);
    // R29 dan R26 memakai hasil R31, jadi keduanya hijau: cacatnya sudah
    // diceritakan sekali.
    expect(r29HargaDiTanggalEx(mlpt).hitungan.merah).toBe(0);
    expect(r26PembagianLaba(mlpt).hitungan.merah).toBe(0);
  });

  it('selisih basis saham ULTJ melahirkan temuan R20 dan R32, tetapi bukan merah R21', () => {
    const ultj = ktx({
      simbol: 'ULTJ',
      ...denganBasis([
        [2024, 11_553_528_000],
        [2025, 10_398_175_200],
      ]),
      saham_tahunan: [{ tahun: 2025, lembar: 10_398_175_200 }],
    });
    expect(r32PerubahanSahamVsAksi(ultj).hitungan.merah).toBe(1);
    expect(r21SahamBedaSumber(ultj).hitungan.merah).toBe(0);
  });
});

describe('D-4 — tabel peristiwa di dokumen bukti', () => {
  // Angka di bawah (6 dividen berharga, 5 lolos, MTLA, RAJA) dikunci atas
  // gudang beku M4a A-1 — 111 berkas yang sidiknya dibekukan — bukan atas
  // seluruh isi `.cache/sectors/`, yang bertambah setiap ada audit baru.
  const laporan = susunLaporanGudang(salinGudangBeku(mkdtempSync(join(tmpdir(), 'peristiwa-beku-'))));
  const dokumen = susunDokumenBukti(laporan);

  it('memuat tiap jenis peristiwa kurikulum, termasuk yang nol kejadian', () => {
    expect(laporan.peristiwa.map((p) => p.jenis)).toEqual(PERISTIWA.map((p) => p.jenis));
    expect(dokumen).toContain('## Peristiwa perusahaan: apa yang boleh jadi kartu');
    for (const p of PERISTIWA) expect(dokumen).toContain('| ' + p.jenis + ' |');
  });

  it('tidak pernah melaporkan lebih banyak yang lolos daripada yang punya harga', () => {
    for (const p of laporan.peristiwa) {
      expect(p.lolos, p.jenis).toBeLessThanOrEqual(p.berharga);
      expect(p.berharga, p.jenis).toBeLessThanOrEqual(p.kejadian);
    }
  });

  it('memakai hanya aturan penolak yang mengenai peristiwa sebagai penghalang', () => {
    expect([...PENOLAK_PERISTIWA]).toEqual(['R23', 'R31', 'R35']);
    for (const kode of PENOLAK_PERISTIWA) {
      expect(ATURAN_V2.some((e) => e.kode === kode), kode).toBe(true);
    }
  });

  it('tidak menolak kartu dividen hanya karena rantai laporan emiten itu putus', () => {
    // MTLA punya satu temuan berkeparahan konflik dari R14 — rantai kepemilikan
    // putus — dan tidak satu pun dari R23, R31, atau R35. Dividennya
    // 2025-06-12 punya harga di kedua sisi, jadi ia harus tetap terhitung
    // lolos. Kalau seluruh aturan penolak dipakai sebagai penghalang, kartu
    // yang benar ini ikut tertolak.
    const mtla = laporan.emiten.find((e) => e.simbol === 'MTLA');
    expect(mtla).toBeDefined();
    const konflikDiLuarPeristiwa = (mtla?.pemeriksaan ?? []).filter(
      (p) =>
        !PENOLAK_PERISTIWA.includes(p.aturan) &&
        p.temuan.some((t) => keparahanTemuan(t) === 'konflik'),
    );
    expect(konflikDiLuarPeristiwa.map((p) => p.aturan)).toContain('R14');
    const konflikPeristiwa = (mtla?.pemeriksaan ?? []).filter(
      (p) =>
        PENOLAK_PERISTIWA.includes(p.aturan) &&
        p.temuan.some((t) => keparahanTemuan(t) === 'konflik'),
    );
    expect(konflikPeristiwa).toHaveLength(0);

    // Enam dividen di gudang punya harga di kedua sisinya: DADA, MLPT dua
    // kali, MTLA, RAJA, dan ULTJ. Lima di antaranya lolos; yang tidak adalah
    // RAJA, yang R31-nya berkeparahan konflik (dividen Rp28 di keputusan RUPS
    // tidak ada di medan dividen). Kalau seluruh aturan penolak dipakai sebagai
    // penghalang, MTLA dan ULTJ ikut tertolak dan angka ini turun.
    const dividen = laporan.peristiwa.find((p) => p.jenis === 'dividen tunai');
    expect(dividen?.emiten).toContain('MTLA');
    expect(dividen?.berharga).toBe(6);
    expect(dividen?.lolos).toBe(5);

    const raja = laporan.emiten.find((e) => e.simbol === 'RAJA');
    expect(
      (raja?.pemeriksaan ?? [])
        .filter((p) => p.temuan.some((t) => keparahanTemuan(t) === 'konflik'))
        .map((p) => p.aturan),
    ).toContain('R31');
  });

  it('memberi tiap jenis peristiwa satu kalimat tentang apa yang wajib dijelaskan', () => {
    // Bukan sekadar "ada kalimatnya": tiap kalimat harus menyebut hal yang
    // memang membedakan jenis peristiwa itu dari yang lain.
    const harusMenyebut: Record<string, RegExp> = {
      'dividen tunai': /tanggal ex — hari pertama pembeli baru tidak lagi kebagian/,
      'penerbitan saham baru': /tidak bisa dibandingkan langsung/,
      'pemecahan saham': /tidak boleh melintasi tanggal pemecahan saham/,
      'saham bonus': /jumlah lembar bertambah tanpa uang baru masuk/,
      'pembelian kembali saham': /tanpa jumlah dan tanpa tanggal/,
      'keluar dari bursa': /tidak bisa diperiksa sama sekali/,
    };
    for (const p of laporan.peristiwa) {
      expect(p.wajib.length, p.jenis).toBeGreaterThan(40);
      expect(p.wajib, p.jenis).toMatch(harusMenyebut[p.jenis] ?? /$^/);
      expect(dokumen).toContain('**' + p.jenis + '** — ' + p.wajib);
    }
  });

  it('tidak memuat satu pun kata penilaian saham di bagian peristiwa', () => {
    const bagian = dokumen.split('## Peristiwa perusahaan')[1]?.split('## Hasil per aturan')[0] ?? '';
    expect(bagian).not.toMatch(/\b(bagus|jelek|sehat|buruk|murah|mahal|menarik|prospek)\b/i);
    expect(bagian.length).toBeGreaterThan(200);
  });
});
