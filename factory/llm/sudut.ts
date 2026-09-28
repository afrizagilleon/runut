/**
 * Perencana sudut (M2d-3 D-4) — peran PERENCANA, dijalankan kode.
 *
 * "Sudut" satu posisi omongan = satu fakta paket yang HARUS menjadi kartu
 * penentunya. Di M2d-2 penulis memilih sendiri dan sering berputar di klaim
 * yang sama lima putaran berturut-turut. Di sini perencana membuat daftar
 * sudut dari paket; omongan yang gagal 5 putaran di satu sudut DIBUANG dan
 * posisinya mendapat sudut berikutnya yang belum dipakai — paling banyak 3
 * sudut per posisi. Bila tetap gagal, simulasi tidak terbit.
 *
 * Urutan daftar (deterministik):
 * 1. fakta yang isinya tidak bisa dikutip ("Teks keputusannya tidak ada di
 *    data") tidak pernah menjadi sudut — ia tidak bisa membuktikan apa pun;
 * 2. per topik (dividen, harga, suspensi, pemilik, laporan), fakta diurutkan:
 *    hitungan dulu (hitungan yang sudah jadi kartu — pemain tidak berhitung),
 *    lalu dokumen selain harga harian, lalu harga/volume harian; di dalamnya
 *    yang terbit paling dekat ke T dulu, lalu urutan paket;
 * 3. topik diurutkan menurut kemunculannya di kalimat peristiwa paket, lalu
 *    sisanya; daftar akhir diambil bergiliran antar-topik supaya tiga posisi
 *    awal menyentuh topik berbeda.
 */
import { topikDariTeks, type Topik } from './bank-gaya.ts';
import type { FaktaPaket, PaketFakta } from './paket.ts';

export const MAKS_PUTARAN_SUDUT = 5;
export const MAKS_SUDUT = 3;

export interface Sudut {
  fact_id: string;
  topik: Topik;
}

/** Topik satu fakta, dari fact_id (bentuk tetap dari paket.ts) lalu asal dokumennya. */
export function topikFakta(f: Pick<FaktaPaket, 'fact_id' | 'asal'>): Topik {
  const id = f.fact_id;
  if (id.startsWith('susp-')) return 'suspensi';
  if (/^(div-|dividen-|tahun-berdividen|andai-)/.test(id)) return 'dividen';
  if (/^laporan-/.test(id)) return 'laporan';
  if (/^(fil-|jumlah-jual|tambahan-)/.test(id)) return 'pemilik';
  if (/^(harga-|volume-|kelipatan-|naik-|turun-|beda-turun|hari-naik)/.test(id)) return 'harga';
  const asal = f.asal.toLowerCase();
  if (asal.includes('dividen')) return 'dividen';
  if (asal.includes('kepemilikan')) return 'pemilik';
  if (asal.includes('penghentian')) return 'suspensi';
  if (asal.includes('harga')) return 'harga';
  return 'laporan';
}

function bisaDikutip(f: FaktaPaket): boolean {
  return !/tidak bisa dikutip|teks keputusannya tidak ada/i.test(f.klaim);
}

function peringkat(f: FaktaPaket): number {
  if (f.jenis === 'hitungan') return 0;
  return /^(harga-|volume-)/.test(f.fact_id) ? 2 : 1;
}

export function rencanaSudut(paket: PaketFakta): Sudut[] {
  const urutPaket = new Map(paket.fakta.map((f, i) => [f.fact_id, i]));
  const calon = paket.fakta
    .filter(bisaDikutip)
    .map((f) => ({ f, topik: topikFakta(f) }))
    .sort(
      (a, b) =>
        peringkat(a.f) - peringkat(b.f) ||
        b.f.terbit.localeCompare(a.f.terbit) ||
        (urutPaket.get(a.f.fact_id) ?? 0) - (urutPaket.get(b.f.fact_id) ?? 0),
    );
  const antrean = new Map<Topik, Sudut[]>();
  for (const { f, topik } of calon) {
    const a = antrean.get(topik) ?? [];
    a.push({ fact_id: f.fact_id, topik });
    antrean.set(topik, a);
  }
  const dariPeristiwa = topikDariTeks(paket.peristiwa).filter((t) => antrean.has(t));
  const sisa = [...antrean.keys()].filter((t) => !dariPeristiwa.includes(t));
  const urutanTopik = [...dariPeristiwa, ...sisa];
  const hasil: Sudut[] = [];
  for (let i = 0; hasil.length < calon.length; i++) {
    for (const t of urutanTopik) {
      const s = antrean.get(t)?.[i];
      if (s !== undefined) hasil.push(s);
    }
  }
  return hasil;
}

/** Keadaan sudut satu posisi omongan di lingkar. */
export interface CatatanSudut {
  ke: number;
  fact_id: string;
  topik: Topik;
  putaran_mulai: number;
  putaran_akhir: number | null;
  hasil: 'berjalan' | 'lolos' | 'dibuang';
}

/**
 * Sudut berikutnya untuk satu posisi: fakta pertama di daftar yang tidak
 * sedang dipakai posisi lain, belum pernah dibuang, dan bukan kartu penentu
 * omongan yang sudah dikunci.
 */
export function sudutBerikutnya(daftar: readonly Sudut[], terpakai: ReadonlySet<string>): Sudut | null {
  return daftar.find((s) => !terpakai.has(s.fact_id)) ?? null;
}
