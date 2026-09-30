/**
 * Tahap gratis sebelum agen (M2d-9 D-4): data → 33 aturan → paket fakta.
 * Semua murni terhadap gudang; tidak ada jaringan dan tidak ada biaya.
 */
import { tanggalId } from '../../factory/format.ts';
import { KALIMAT_AWAM } from '../../factory/gudang.ts';
import { dataSampai } from '../../factory/kasus/bangun.ts';
import type { Gudang } from '../../factory/muat/gudang.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { rencanaSudut } from '../../factory/llm/sudut.ts';
import { keparahanTemuan } from '../../factory/skema/tipe.ts';
import { konteksEmiten } from '../../factory/verifikasi/konteks.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { ATURAN_V2, aturanAktif, verifikasiV2 } from '../../factory/verifikasi/v2.ts';
import { ATURAN_CALON, bangunPaketPenyusun, type PilihanPaket } from './paket-otomatis.ts';
import { hariBursaEmiten } from './usulan.ts';

export interface RingkasData {
  judul: string;
  isi: {
    penuh: Record<string, number | string | null>;
    sampai_t: Record<string, number>;
    sesudahnya: number;
    jendela: number;
  };
}

export function ringkasData(kode: string, penuh: DataEmiten, tanggal: string, jendela: number): RingkasData {
  const d = dataSampai(penuh, tanggal);
  const hari = hariBursaEmiten(penuh);
  const sesudahnya = hari.filter((h) => h > tanggal).length;
  return {
    judul:
      `Data ${kode} dimuat dari cache: ${String(hari.length)} hari harga (${tanggalId(hari[0] ?? '')}–${tanggalId(hari.at(-1) ?? '')}), ` +
      `${String(penuh.suspensi.length)} penghentian, ${String(penuh.laporan.length)} laporan kepemilikan, ${String(penuh.dividen.length)} dividen, ${String(penuh.rups.length)} RUPS. ` +
      `Dipotong sampai ${tanggalId(tanggal)}: ${String(d.harga.length)} hari harga ≤ T. Data sesudah T tidak masuk kartu; ` +
      `${String(sesudahnya)} hari bursa sesudahnya hanya dihitung untuk "sesudahnya" (jendela ${String(jendela)}).`,
    isi: {
      penuh: { harga: hari.length, dari: hari[0] ?? null, sampai: hari.at(-1) ?? null, suspensi: penuh.suspensi.length, laporan: penuh.laporan.length, dividen: penuh.dividen.length, rups: penuh.rups.length },
      sampai_t: { harga: d.harga.length, suspensi: d.suspensi.length, laporan: d.laporan.length, dividen: d.dividen.length, rups: d.rups.length },
      sesudahnya,
      jendela,
    },
  };
}

export interface BarisAturan {
  kode: string;
  judul: string;
  awam: string;
  dijalankan: boolean;
  alasan_lewat: string | null;
  satuan: string;
  diperiksa: number;
  merah: number;
  tidak_lengkap: number;
  dilewati: number;
  temuan: number;
}

export interface RingkasAturan {
  judul: string;
  isi: {
    aktif: number;
    dijalankan: number;
    tidak_dijalankan: number;
    digantikan: number;
    diperiksa: number;
    merah: number;
    tidak_lengkap: number;
    temuan_konflik: number;
    aturan: BarisAturan[];
  };
}

/** 33 aturan aktif V2 atas data ≤ T, dengan kalimat awam tiap aturan. */
export function ringkasAturan(penuh: DataEmiten, tanggal: string, kosong: string[]): RingkasAturan {
  const hasil = verifikasiV2(konteksEmiten(dataSampai(penuh, tanggal), kosong));
  const aktif = new Set(aturanAktif().map((e) => e.kode));
  const baris: BarisAturan[] = hasil.pemeriksaan
    .filter((p) => aktif.has(p.aturan))
    .map((p) => ({
      kode: p.aturan,
      judul: p.judul,
      awam: KALIMAT_AWAM[p.aturan] ?? p.judul,
      dijalankan: p.dijalankan,
      alasan_lewat: p.alasan_lewat,
      satuan: p.hitungan.satuan,
      diperiksa: p.hitungan.diperiksa,
      merah: p.hitungan.merah,
      tidak_lengkap: p.hitungan.tidak_lengkap,
      dilewati: p.hitungan.dilewati,
      temuan: p.temuan.length,
    }));
  const jumlah = (f: (b: BarisAturan) => number): number => baris.reduce((a, b) => a + f(b), 0);
  const dijalankan = baris.filter((b) => b.dijalankan).length;
  const konflik = hasil.pemeriksaan.flatMap((p) => p.temuan).filter((t) => keparahanTemuan(t) === 'konflik').length;
  const isi = {
    aktif: baris.length,
    dijalankan,
    tidak_dijalankan: baris.length - dijalankan,
    digantikan: ATURAN_V2.length - aktif.size,
    diperiksa: jumlah((b) => b.diperiksa),
    merah: jumlah((b) => b.merah),
    tidak_lengkap: jumlah((b) => b.tidak_lengkap),
    temuan_konflik: konflik,
    aturan: baris,
  };
  return {
    judul:
      `${String(isi.aktif)} aturan pemeriksa atas data ≤ T: ${String(dijalankan)} berjalan, ${String(isi.tidak_dijalankan)} tidak bisa berjalan karena datanya tidak ada; ` +
      `${isi.diperiksa.toLocaleString('id-ID')} butir diperiksa, ${isi.merah.toLocaleString('id-ID')} ditandai merah, ${isi.tidak_lengkap.toLocaleString('id-ID')} tidak lengkap, ` +
      `${String(konflik)} temuan bertentangan (fakta terkaitnya dibuang dari paket).`,
    isi,
  };
}

export interface RingkasPaket {
  judul: string;
  isi: {
    paket_id: string;
    sumber: PilihanPaket['sumber'];
    keterangan: string;
    aturan_calon: readonly string[] | null;
    nama_samaran: string;
    peristiwa: string;
    fakta: Array<{ fact_id: string; jenis: string; asal: string; terbit: string; klaim: string }>;
    disingkirkan: Array<{ fact_id: string; alasan: string }>;
    sudut: string[];
    kata_terlarang: number;
  };
}

export function ringkasPaket(paket: PaketFakta, pilihan: PilihanPaket): RingkasPaket {
  const sudut = rencanaSudut(paket).map((s) => s.fact_id);
  return {
    judul:
      `Paket fakta ${paket.nama_samaran} (${pilihan.sumber === 'kurasi' ? 'definisi kurasi M2d' : 'definisi otomatis'}): ${String(paket.fakta.length)} fakta lolos, ` +
      `${String(paket.disingkirkan.length)} dibuang dengan alasan; ${String(sudut.length)} calon sudut soal (perlu 3). Nama emiten dan orang disamarkan.`,
    isi: {
      paket_id: paket.paket_id,
      sumber: pilihan.sumber,
      keterangan: pilihan.keterangan,
      aturan_calon: pilihan.sumber === 'otomatis' ? ATURAN_CALON : null,
      nama_samaran: paket.nama_samaran,
      peristiwa: paket.peristiwa,
      fakta: paket.fakta.map((f) => ({ fact_id: f.fact_id, jenis: f.jenis, asal: f.asal, terbit: f.terbit, klaim: f.klaim })),
      disingkirkan: paket.disingkirkan,
      sudut,
      kata_terlarang: paket.kata_terlarang.length,
    },
  };
}

export function bangunTahapGratis(
  kode: string,
  tanggal: string,
  jendela: number,
  g: Gudang,
): { data: RingkasData; aturan: RingkasAturan; paket: PaketFakta; pilihan: PilihanPaket; ringkasPaket: RingkasPaket } {
  const penuh = g.emiten.get(kode);
  if (penuh === undefined) throw new Error(`Emiten ${kode} tidak ada di gudang.`);
  const kosong = g.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas);
  const data = ringkasData(kode, penuh, tanggal, jendela);
  const aturan = ringkasAturan(penuh, tanggal, kosong);
  const { paket, pilihan } = bangunPaketPenyusun(kode, tanggal, g);
  return { data, aturan, paket, pilihan, ringkasPaket: ringkasPaket(paket, pilihan) };
}
