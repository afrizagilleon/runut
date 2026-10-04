/**
 * Dua alat data untuk agen penulis (M2d-26): agen mulai dari KODE SAHAM, memilih
 * sendiri hari yang dibekukan, lalu meminta kartu faktanya.
 *
 * - `usulkan_hari`: hari-hari yang layak dibekukan untuk saham itu (pengusul
 *   yang sama dengan pintu penyusun, `alat/penyusun/usulan.ts`).
 * - `periksa_saham`: data Sectors untuk hari pilihan → 33 aturan verifikasi
 *   (`factory/verifikasi/`) → hanya fakta TERVERIFIKASI yang menjadi kartu
 *   (pembangun paket yang sama dengan pintu, `bangunPaketPenyusun`).
 *
 * Yang memutuskan lolos-tidaknya fakta tetap KODE; model hanya memilih hari dan
 * membaca hasilnya. Nama emiten, kode saham, dan nama orang disamarkan di semua
 * keluaran alat (daftar `kata_terlarang` paket), sama seperti di kartu.
 *
 * Data dibaca dari gudang cache Sectors. Emiten yang belum ada di cache hanya
 * diambil dari API Sectors bila `ambil` diberikan (butuh persetujuan kredit
 * pemilik); tanpa itu alat mengembalikan galat yang menjelaskannya.
 */
import { teksPaket } from '../../factory/llm/bebas/prompt.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import type { PemuatGudang } from '../penyusun/emiten.ts';
import { bangunPaketPenyusun } from '../penyusun/paket-otomatis.ts';
import { JENDELA_BAWAAN, NAMA_JENIS, usulkanHari, type Usulan } from '../penyusun/usulan.ts';

export interface OpsiAlatSectors {
  kode: string;
  pemuat: PemuatGudang;
  /** Hari ini (YYYY-MM-DD); hari sesudahnya tidak diusulkan. */
  hariIni: string;
  /** Ambil data emiten dari API Sectors (memakai kredit). Hanya diberikan bila pemilik menyetujui kredit. */
  ambil?: (kode: string) => Promise<{ berhenti: string | null; tidak_dikenal: boolean; kredit_dipakai: number }>;
}

export interface HariUsulan {
  tanggal: string;
  jenis: string[];
  alasan: string[];
  /** Kartu fakta yang lolos 33 aturan untuk hari ini. */
  kartu_lolos: number;
  /** Calon fakta yang disingkirkan (tidak terverifikasi, terbit sesudah hari itu, dsb.). */
  disingkirkan: number;
}

export type HasilUsulkanHari = { hari: HariUsulan[]; jumlah_kandidat: number; dilewati: number; catatan: string } | { galat: string };

export interface LaporanPeriksa {
  hari: string;
  sumber: string;
  aturan_dijalankan: number;
  aturan_dilewati: number;
  temuan_aturan: Array<{ aturan: string; keparahan: string; ringkasan: string }>;
  kartu_lolos: number;
  disingkirkan: Array<{ fact_id: string; alasan: string }>;
  kartu: string;
}

export type HasilPeriksaSaham = { paket: PaketFakta; laporan: LaporanPeriksa } | { paket: null; galat: string };

const MAKS_TEMUAN = 6;

/** Ganti kode saham, nama emiten, dan nama orang dengan "[disamarkan]". Murni. */
export function samarkanNama(teks: string, kode: string, kataTerlarang: readonly string[]): string {
  let hasil = teks;
  for (const k of [`${kode}.JK`, ...[...kataTerlarang].sort((a, b) => b.length - a.length), kode]) {
    if (k.trim().length < 3) continue;
    hasil = hasil.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[disamarkan]');
  }
  return hasil;
}

export function buatAlatSectors(o: OpsiAlatSectors) {
  let diambil = false;
  /** Data emiten dari cache; bila belum ada dan diizinkan, ambil dari Sectors sekali. */
  const siapkan = async (): Promise<string | null> => {
    if (o.pemuat.emiten(o.kode) !== null) return null;
    if (o.ambil === undefined) return 'Data saham ini belum ada di cache lokal. Mengambilnya dari Sectors memakai kredit dan butuh persetujuan pemilik (jalankan ulang dengan --setuju-kredit-sectors).';
    if (diambil) return 'Data saham ini sudah dicoba diambil dari Sectors dan tetap tidak tersedia.';
    diambil = true;
    const h = await o.ambil(o.kode);
    o.pemuat.lupakan();
    if (h.tidak_dikenal) return 'Kode saham tidak dikenal Sectors.';
    if (o.pemuat.emiten(o.kode) === null) return `Pengambilan dari Sectors tidak menghasilkan deret harga${h.berhenti === null ? '' : ` (${h.berhenti})`}.`;
    return null;
  };
  const sumber = (): string => (diambil ? 'API Sectors (baru diambil), disimpan ke cache lokal' : 'data Sectors di cache lokal (diambil sebelumnya dari API Sectors)');
  const usulan = (): Usulan[] => {
    const data = o.pemuat.emiten(o.kode);
    return data === null ? [] : usulkanHari(o.kode, data, { jendela: JENDELA_BAWAAN, hariIni: o.hariIni }).usulan;
  };

  const usulkan = async (): Promise<HasilUsulkanHari> => {
    const galat = await siapkan();
    if (galat !== null) return { galat };
    const data = o.pemuat.emiten(o.kode);
    if (data === null) return { galat: 'Data saham tidak terbaca.' };
    const h = usulkanHari(o.kode, data, { jendela: JENDELA_BAWAAN, hariIni: o.hariIni });
    const hari: HariUsulan[] = [];
    for (const u of h.usulan) {
      try {
        const { paket } = bangunPaketPenyusun(o.kode, u.tanggal, o.pemuat.gudang());
        hari.push({ tanggal: u.tanggal, jenis: u.jenis.map((j) => NAMA_JENIS[j]), alasan: u.alasan.map((a) => samarkanNama(a, o.kode, paket.kata_terlarang)), kartu_lolos: paket.fakta.length, disingkirkan: paket.disingkirkan.length });
      } catch {
        continue;
      }
    }
    if (hari.length === 0) return { galat: 'Tidak ada hari yang layak dibekukan untuk saham ini (tidak ada peristiwa yang datanya cukup).' };
    return { hari, jumlah_kandidat: h.jumlah_kandidat, dilewati: h.dilewati.length, catatan: 'Pilih satu tanggal lalu panggil periksa_saham. Hari dengan kartu dari beberapa jenis dokumen memberi lebih banyak sudut.' };
  };

  const periksa = async (tanggal: string): Promise<HasilPeriksaSaham> => {
    const galat = await siapkan();
    if (galat !== null) return { paket: null, galat };
    const boleh = usulan().map((u) => u.tanggal);
    if (!boleh.includes(tanggal)) return { paket: null, galat: `Tanggal "${tanggal}" bukan salah satu hari yang diusulkan (${boleh.join(', ') || 'tidak ada'}). Panggil usulkan_hari dan pilih dari daftarnya.` };
    let paket: PaketFakta;
    try {
      paket = bangunPaketPenyusun(o.kode, tanggal, o.pemuat.gudang()).paket;
    } catch (g) {
      return { paket: null, galat: samarkanNama(g instanceof Error ? g.message : 'paket tidak bisa dibangun', o.kode, []) };
    }
    const s = (t: string): string => samarkanNama(t, o.kode, paket.kata_terlarang);
    return {
      paket,
      laporan: {
        hari: tanggal,
        sumber: sumber(),
        aturan_dijalankan: paket.pemeriksaan.aturan_dijalankan,
        aturan_dilewati: paket.pemeriksaan.aturan_dilewati,
        temuan_aturan: paket.pemeriksaan.temuan.slice(0, MAKS_TEMUAN).map((t) => ({ aturan: t.aturan, keparahan: t.keparahan, ringkasan: s(t.ringkasan) })),
        kartu_lolos: paket.fakta.length,
        disingkirkan: paket.disingkirkan.map((d) => ({ fact_id: d.fact_id, alasan: s(d.alasan) })),
        kartu: teksPaket(paket),
      },
    };
  };

  return { usulkanHari: usulkan, periksaSaham: periksa };
}

export type AlatSectors = ReturnType<typeof buatAlatSectors>;
