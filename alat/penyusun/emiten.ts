/**
 * Data emiten untuk pintu penyusun (M2d-9 D-2): dari gudang (cache), atau —
 * bila belum ada — perkiraan kredit Sectors dan pengambilan SESUDAH disetujui
 * di layar, lewat `alat/sectors.ts` (pagu kredit kumulatif) dan paket tetap
 * audit M4a (`alat/audit-ambil.ts`: pagu 10 kredit per emiten).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { muatGudang, type Gudang } from '../../factory/muat/gudang.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { ambilEmiten, type CatatanPanggilan } from '../audit-ambil.ts';
import { PARAMETER_AUDIT, paketTetap, type BarisSuspensi } from '../audit-rencana.ts';
import { bacaBukuKas, biayaPanggilan, kreditTerpakai, SALDO_PEMBUKA, type Pengambil } from '../sectors.ts';

/** Gudang dibaca sekali per proses; dibaca ulang sesudah data baru diambil. */
export class PemuatGudang {
  private isi: Gudang | null = null;
  private readonly folder: string;
  constructor(folder: string) {
    this.folder = folder;
  }
  gudang(): Gudang {
    this.isi ??= muatGudang(this.folder);
    return this.isi;
  }
  lupakan(): void {
    this.isi = null;
  }
  /** Data emiten yang punya deret harga sendiri; `null` = belum ada di cache. */
  emiten(kode: string): DataEmiten | null {
    const d = this.gudang().emiten.get(kode);
    return d !== undefined && d.harga.length > 0 ? d : null;
  }
  /** Tanggal hari bursa seluruh gudang (gabungan deret harga semua emiten). */
  kalender(): string[] {
    const s = new Set<string>();
    for (const d of this.gudang().emiten.values()) for (const h of d.harga) s.add(h.tanggal);
    return [...s].sort();
  }
}

export interface PerkiraanKredit {
  /** Panggilan tetap (paket audit M4a) dan biayanya, dihitung dari path. */
  tetap: Array<{ peran: string; path: string; biaya: number }>;
  kredit_tetap: number;
  /** Halaman kedua laporan kepemilikan (1 kredit, bila ada) + ≤ 4 jendela harga harian (1 kredit per jendela). */
  kredit_tambahan_maks: number;
  /** Pagu kredit per emiten yang ditegakkan kode (audit M4a). */
  kredit_maks: number;
  kredit_terpakai: number;
  pagu_kredit: number;
  rentang: { awal: string; akhir: string };
}

export function perkiraanKredit(kode: string, bukuKas: string, paguKredit: number): PerkiraanKredit {
  const tetap = paketTetap(kode).map((r) => ({ peran: r.peran, path: r.path, biaya: biayaPanggilan(r.path) }));
  const kreditTetap = tetap.reduce((a, x) => a + x.biaya, 0);
  const buku = bacaBukuKas(bukuKas);
  return {
    tetap,
    kredit_tetap: kreditTetap,
    kredit_tambahan_maks: Math.max(0, PARAMETER_AUDIT.pagu_emiten - kreditTetap),
    kredit_maks: PARAMETER_AUDIT.pagu_emiten,
    kredit_terpakai: buku.length === 0 ? SALDO_PEMBUKA : kreditTerpakai(buku),
    pagu_kredit: paguKredit,
    rentang: { awal: PARAMETER_AUDIT.awal, akhir: PARAMETER_AUDIT.akhir },
  };
}

export function bacaSuspensiCache(folder: string): BarisSuspensi[] {
  const jalur = join(folder, 'suspensions-all.json');
  if (!existsSync(jalur)) return [];
  const isi = JSON.parse(readFileSync(jalur, 'utf8')) as unknown;
  return Array.isArray(isi) ? (isi as BarisSuspensi[]) : [];
}

export interface HasilAmbilData {
  catatan: CatatanPanggilan[];
  kredit_dipakai: number;
  kredit_terpakai: number;
  pagu_kredit: number;
  /** Simbol tidak dikenal Sectors (404 aksi korporasi): sisa paket tidak dikirim. */
  tidak_dikenal: boolean;
  /** Pengambilan berhenti di tengah (pagu kredit, 401/403, galat jaringan); `null` = selesai. */
  berhenti: string | null;
}

/** Ambil paket data satu emiten lewat `alat/sectors.ts`. Dipanggil HANYA sesudah persetujuan di layar. */
export async function ambilDataEmiten(p: Pengambil, kode: string): Promise<HasilAmbilData> {
  // Buku kas yang belum ada dibuat `ambil()` dengan saldo pembuka; itu bukan kredit jalan ini.
  const bukuAwal = bacaBukuKas(p.bukuKas);
  const sebelum = bukuAwal.length === 0 ? SALDO_PEMBUKA : kreditTerpakai(bukuAwal);
  let catatan: CatatanPanggilan[] = [];
  let berhenti: string | null = null;
  try {
    catatan = await ambilEmiten(p, kode, bacaSuspensiCache(p.folder));
  } catch (galat) {
    // `ambilEmiten` berhenti dengan pesan berisi simbol, peran, dan alasan Sectors — tanpa kunci.
    berhenti = galat instanceof Error ? galat.message : 'pengambilan berhenti';
  }
  const sesudah = kreditTerpakai(bacaBukuKas(p.bukuKas));
  return {
    catatan,
    kredit_dipakai: sesudah - sebelum,
    kredit_terpakai: sesudah,
    pagu_kredit: p.pagu,
    tidak_dikenal: catatan[0]?.akhir === 'tidak-ada',
    berhenti,
  };
}
