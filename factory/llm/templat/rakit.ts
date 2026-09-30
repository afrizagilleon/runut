/**
 * Merakit omongan dari rencana templat + kata-kata penulis (M2d-10 D-1/D-2),
 * dan pemeriksaan kode yang khusus templat:
 *
 * - `angka_pesan` DIHITUNG kode: setiap angka di pesan harus salah satu angka
 *   yang diizinkan templat (teks persis); angka lain = pesan ditolak;
 * - kata wajib klaim (penanda waktu) harus tertulis di pesan;
 * - penjelasan hanya memakai rujukan yang diizinkan templat (persis) dan
 *   merujuk sedikitnya satu kartu penentu;
 * - anti-salin: tidak ada potongan 5 kata dari soal tayang.
 */
import { ambilRujukan } from '../../skema/rujukan.ts';
import type { AngkaPesan, KunciOpsi, OmonganDraf } from '../draf.ts';
import { kasusTayang, potongan } from '../kalibrasi-pemanasan.ts';
import type { KlaimTemplat, NamaSlot, RencanaSoal, VarianPilihan } from './pola.ts';

export const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
export const SLOT: readonly NamaSlot[] = ['kunci', 'p1', 'p2', 'p3'];

/** Varian yang sedang dipakai per slot (teksnya bisa dirangkai ulang penyempurna; id & proposisi tetap). */
export type PilihanAktif = Record<NamaSlot, VarianPilihan>;

export function pilihanBawaan(r: RencanaSoal): PilihanAktif {
  return Object.fromEntries(r.slot.map((s) => [s.slot, s.varian[0] as VarianPilihan])) as PilihanAktif;
}

export interface TulisanPesan {
  nama: string;
  jam: string;
  pesan: string;
}

/** `angka_pesan` dari angka yang diizinkan klaim; angka lain di pesan → masalah. Murni. */
export function angkaPesanDari(pesan: string, klaim: KlaimTemplat): { angka_pesan: AngkaPesan[]; masalah: string[] } {
  const tertutup = new Array<boolean>(pesan.length).fill(false);
  const angka_pesan: AngkaPesan[] = [];
  const urut = [...klaim.angka].sort((a, b) => b.teks.length - a.teks.length);
  for (const a of urut) {
    let dari = 0;
    let ada = false;
    for (;;) {
      const i = pesan.indexOf(a.teks, dari);
      if (i < 0) break;
      if (!tertutup.slice(i, i + a.teks.length).some(Boolean)) {
        ada = true;
        for (let x = i; x < i + a.teks.length; x++) tertutup[x] = true;
      }
      dari = i + a.teks.length;
    }
    if (ada) angka_pesan.push(a.andaian === true ? { teks: a.teks, andaian: true } : { teks: a.teks, ...(a.fact_id === undefined ? {} : { fact_id: a.fact_id }) });
  }
  const lepas: string[] = [];
  for (const m of pesan.matchAll(/\d[\d.,]*/g)) {
    const t = m[0].replace(/[.,]+$/, '');
    if (!tertutup.slice(m.index, m.index + t.length).every(Boolean)) lepas.push(t);
  }
  const masalah = lepas.length === 0 ? [] : [`angka di pesan yang tidak diizinkan templat: ${lepas.join(', ')} (yang boleh: ${klaim.angka.map((a) => `"${a.teks}"`).join(', ') || 'tidak ada angka'})`];
  return { angka_pesan, masalah };
}

export function periksaWajib(pesan: string, klaim: KlaimTemplat): string[] {
  const kecil = pesan.toLowerCase();
  return klaim.wajib.filter((g) => !g.some((x) => kecil.includes(x.toLowerCase()))).map((g) => `pesan harus menyebut ${g.map((x) => `"${x}"`).join(' atau ')} supaya jelas hari mana yang dibicarakan`);
}

export function periksaPenjelasan(penjelasan: string, r: RencanaSoal): string[] {
  const boleh = new Set(r.rujukan_penjelasan);
  const m: string[] = [];
  const dipakai = ambilRujukan(penjelasan);
  for (const x of dipakai) {
    const t = `[[${x.fact_id}|${x.teks}]]`;
    if (!boleh.has(t)) m.push(`penjelasan memakai rujukan ${t} yang tidak ada di daftar rujukan yang diizinkan`);
  }
  if (!dipakai.some((x) => r.kartu_penentu.includes(x.fact_id))) m.push(`penjelasan harus merujuk kartu penentu (${r.kartu_penentu.join(', ')})`);
  return m;
}

/** Huruf per slot: kunci di `hurufKunci`, pengecoh p1–p3 mengisi huruf lain berurutan. Murni. */
export function hurufSlot(hurufKunci: KunciOpsi): Record<NamaSlot, KunciOpsi> {
  const sisa = HURUF.filter((h) => h !== hurufKunci);
  return { kunci: hurufKunci, p1: sisa[0] as KunciOpsi, p2: sisa[1] as KunciOpsi, p3: sisa[2] as KunciOpsi };
}

export function slotDariHuruf(hurufKunci: KunciOpsi, h: KunciOpsi): NamaSlot {
  const peta = hurufSlot(hurufKunci);
  return SLOT.find((s) => peta[s] === h) as NamaSlot;
}

export function rakitOmonganTemplat(r: RencanaSoal, pilihan: PilihanAktif, tulisan: TulisanPesan, penjelasan: string, hurufKunci: KunciOpsi): OmonganDraf {
  const peta = hurufSlot(hurufKunci);
  const p = {} as Record<KunciOpsi, string>;
  for (const s of SLOT) p[peta[s]] = pilihan[s].teks;
  return {
    nama: tulisan.nama,
    jam: tulisan.jam,
    pesan: tulisan.pesan,
    angka_pesan: angkaPesanDari(tulisan.pesan, r.klaim).angka_pesan,
    kartu: [...r.kartu],
    kartu_penentu: [...r.kartu_penentu],
    pilihan: p,
    kunci: hurufKunci,
    penjelasan,
  };
}

/* ---------------------------------------------------------------------- */
/* anti-salin                                                              */
/* ---------------------------------------------------------------------- */

let SUMBER: Map<string, string> | null = null;

/** Potongan 5 kata soal tayang → asalnya (dibaca sekali dari cases/*.json). */
export function potonganTayang(): Map<string, string> {
  if (SUMBER !== null) return SUMBER;
  const peta = new Map<string, string>();
  for (const k of kasusTayang()) {
    for (const x of k.soal) {
      const bagian: Array<[string, string]> = [['pesan', x.pesan.isi], ...x.pilihan.map((p, i): [string, string] => [`pilihan ${String(i + 1)}`, p.teks]), ['penjelasan', x.penjelasan], ['petunjuk', x.petunjuk ?? '']];
      for (const [b, t] of bagian) for (const p of potongan(t)) if (!peta.has(p)) peta.set(p, `${k.berkas} ${b}`);
    }
  }
  SUMBER = peta;
  return peta;
}

/** Potongan 5 kata di `teks` yang juga ada di soal tayang. Kosong = bersih. */
export function salinanTayang(teks: string): string[] {
  const s = potonganTayang();
  return [...potongan(teks)].filter((p) => s.has(p)).map((p) => `"${p}" (dari ${s.get(p) ?? '?'})`);
}
