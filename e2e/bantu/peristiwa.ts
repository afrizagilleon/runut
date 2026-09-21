/**
 * Membaca berkas pengumpul yang sungguhan (M3.3 D-6).
 *
 * Rangkaian e2e tidak menyadap `fetch` dan tidak memalsukan pengumpul: ia
 * menjalankan `server/kolektor.mjs` yang sama dengan produksi, lalu **membaca
 * berkas JSONL yang ditulisnya**. Itulah satu-satunya cara membuktikan bahwa
 * peristiwa benar-benar sampai ke cakram — bukan hanya sampai ke jaringan.
 *
 * Tes boleh berjalan paralel karena tiap tes membuka `/?k=<penanda acak>`:
 * peristiwa `mulai` membawa penanda itu, dan dari situ id sesinya diketahui.
 * Semua penyaringan berikutnya memakai id sesi, bukan penanda, sehingga dua tes
 * yang kebetulan menulis ke berkas yang sama tidak pernah melihat baris
 * milik yang lain.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { DIR_DATA } from './jalur.ts';

export type NilaiIsi = string | number | boolean | null;

export interface BarisPeristiwa {
  nama: string;
  sesi: string;
  kasus_id: string;
  t_ms: number;
  urut: number;
  isi: Record<string, NilaiIsi>;
  diterima_pada: string;
}

function baris(mentah: unknown): BarisPeristiwa | null {
  if (typeof mentah !== 'object' || mentah === null) return null;
  const o = mentah as Record<string, unknown>;
  if (typeof o.nama !== 'string' || typeof o.sesi !== 'string') return null;
  if (typeof o.urut !== 'number' || typeof o.t_ms !== 'number') return null;
  if (typeof o.isi !== 'object' || o.isi === null) return null;
  return {
    nama: o.nama,
    sesi: o.sesi,
    kasus_id: typeof o.kasus_id === 'string' ? o.kasus_id : '',
    t_ms: o.t_ms,
    urut: o.urut,
    isi: o.isi as Record<string, NilaiIsi>,
    diterima_pada: typeof o.diterima_pada === 'string' ? o.diterima_pada : '',
  };
}

/**
 * Semua baris di `.cache/e2e/data`, apa adanya.
 *
 * Baris yang gagal diurai **dilewati diam-diam**, dan itu disengaja: pengumpul
 * bisa sedang menulis baris berikutnya tepat ketika berkasnya dibaca, jadi ekor
 * yang belum utuh adalah keadaan normal, bukan cacat. Pemanggilnya selalu
 * berada di dalam `expect.poll`, jadi baris itu akan terbaca utuh sesaat lagi.
 */
export function semuaBaris(): BarisPeristiwa[] {
  const keluar: BarisPeristiwa[] = [];
  let berkas: string[];
  try {
    berkas = readdirSync(DIR_DATA).filter((n) => n.endsWith('.jsonl'));
  } catch {
    return keluar;
  }
  for (const nama of berkas) {
    let isi: string;
    try {
      isi = readFileSync(join(DIR_DATA, nama), 'utf8');
    } catch {
      continue;
    }
    for (const teks of isi.split('\n')) {
      if (teks.trim() === '') continue;
      let mentah: unknown;
      try {
        mentah = JSON.parse(teks);
      } catch {
        continue;
      }
      const satu = baris(mentah);
      if (satu !== null) keluar.push(satu);
    }
  }
  return keluar;
}

/** Peristiwa `mulai` yang membawa penanda ini. Boleh lebih dari satu (E-06f). */
export function mulaiDenganPenanda(penanda: string): BarisPeristiwa[] {
  return semuaBaris().filter((p) => p.nama === 'mulai' && p.isi.penanda === penanda);
}

/** Semua peristiwa satu sesi, urut menurut `urut`. */
export function peristiwaSesi(sesi: string): BarisPeristiwa[] {
  return semuaBaris()
    .filter((p) => p.sesi === sesi)
    .sort((a, b) => a.urut - b.urut);
}

/**
 * Tunggu sampai tepat `jumlah` peristiwa `mulai` berpenanda ini tiba, lalu
 * kembalikan id sesinya.
 *
 * `toBe`, bukan `toBeGreaterThanOrEqual`: kalau `mulai` lahir dua kali — yang
 * memang pernah terjadi karena `StrictMode` menjalankan efek dua kali — tes ini
 * harus merah, bukan diam-diam memilih yang pertama.
 */
export async function tungguSesi(penanda: string, jumlah = 1): Promise<string[]> {
  await expect
    .poll(() => mulaiDenganPenanda(penanda).length, {
      timeout: 20_000,
      message: `menunggu ${String(jumlah)} peristiwa "mulai" berpenanda ${penanda}`,
    })
    .toBe(jumlah);
  return mulaiDenganPenanda(penanda).map((p) => p.sesi);
}

/** Id sesi tunggal untuk penanda ini; merah kalau jumlahnya bukan satu. */
export async function tungguSatuSesi(penanda: string): Promise<string> {
  const daftar = await tungguSesi(penanda, 1);
  const satu = daftar[0];
  expect(satu, `sesi untuk penanda ${penanda}`).toBeDefined();
  return satu ?? '';
}

/** Tunggu sampai sebuah sesi punya paling sedikit `jumlah` peristiwa bernama ini. */
export async function tungguPeristiwa(
  sesi: string,
  nama: string,
  jumlah = 1,
): Promise<BarisPeristiwa[]> {
  await expect
    .poll(() => peristiwaSesi(sesi).filter((p) => p.nama === nama).length, {
      timeout: 20_000,
      message: `menunggu ${String(jumlah)} peristiwa "${nama}" di sesi ${sesi}`,
    })
    .toBeGreaterThanOrEqual(jumlah);
  return peristiwaSesi(sesi).filter((p) => p.nama === nama);
}

/**
 * Tunggu sampai sebuah sesi punya peristiwa yang memenuhi syarat ini.
 * Dipakai ketika yang ditunggu bukan sekadar namanya, melainkan isinya.
 */
export async function tungguCocok(
  sesi: string,
  cocok: (p: BarisPeristiwa) => boolean,
  pesan: string,
): Promise<BarisPeristiwa[]> {
  await expect
    .poll(() => peristiwaSesi(sesi).filter(cocok).length, { timeout: 20_000, message: pesan })
    .toBeGreaterThanOrEqual(1);
  return peristiwaSesi(sesi).filter(cocok);
}
