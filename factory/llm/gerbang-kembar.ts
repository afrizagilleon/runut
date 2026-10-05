/**
 * G-pilihan-kembar (M2d-6 D-4): dua pilihan dalam SATU omongan tidak boleh
 * sama isinya. Milik PEMERIKSA (kode): tanpa jaringan, tanpa acak.
 *
 * Kenapa: TIRT M2d-5 omongan 3 lolos semua gerbang dengan dua pengecoh
 * "Betul, hasil putusannya tercatat di dokumen." / "Betul, hasil putusannya
 * ada di catatan resmi." — isinya sama. Pemain tanpa kartu menyingkirkan
 * keduanya (tidak mungkin dua-duanya benar) dan tinggal memilih di antara dua;
 * ketiga penguji luar menebak kuncinya tanpa kartu, dua penguji kartu
 * menandai pasangan itu membingungkan. G-mirip (M2d-5) membandingkan
 * antar-omongan; kritikus menganggap keduanya sama-sama salah.
 *
 * **Isi pilihan** (`isiPilihan`): teks polos, huruf kecil; label "Betul,"/
 * "Keliru," dilepas; angka dinormalisasi BENTUKNYA saja ("Rp58" = "58 rupiah"
 * = "Rp 58" → `rp58`; "1.000" → `1000`; "16,07" → `16d07`) — nilai yang
 * berbeda tetap berbeda (ULTJ manusia omongan 1: "Rp130, bukan Rp45" vs
 * "Rp160, bukan Rp45" adalah dua pengecoh yang sah); tanda baca dibuang;
 * kata fungsi tanpa isi dibuang (`KATA_FUNGSI`); imbuhan dasar dilepas
 * (`akar`: -nya/-lah/-kah, -kan/-an, me-/di-/ter-/ber-/pe-/ke-); ingkaran
 * disatukan ("tak/ga/gak/nggak" → "tidak"); satu kelas sinonim sumber
 * ("tercatat/dicatat/catatan/dokumen/data/arsip/tertulis" → ‹catat›) — pola
 * parafrasa yang terukur di pilihan agen.
 *
 * **Putusan.** Dua pilihan kembar bila himpunan isi keduanya SAMA, atau
 * kemiripan Jaccard-nya ≥ ambang. Ambang diturunkan dari kasus manusia
 * (`cases/*.json`): titik tengah antara kemiripan terbesar dua pilihan dalam
 * satu soal manusia dan 1. Hari ini: DADA soal 3 "membeli lagi di harga
 * belasan/ratusan rupiah" = 0,778 → ambang 0,889. Semua pasangan pilihan
 * manusia lolos (dites).
 */
import { readFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { KunciOpsi } from './draf.ts';
import { AKAR } from './env.ts';
import { berkasKasusManusia } from '../kasus/kasus-manusia.ts';

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** Kata fungsi yang tidak mengubah isi klaim pilihan. "tidak", "bukan", "hanya", "belum" SENGAJA tidak ada di sini. */
export const KATA_FUNGSI: ReadonlySet<string> = new Set([
  'di', 'ke', 'dari', 'pada', 'yang', 'itu', 'ini', 'ada', 'sudah', 'udah', 'memang', 'emang', 'juga', 'saja', 'aja', 'dan',
  'untuk', 'sebagai', 'oleh', 'dengan', 'sih', 'kok', 'kan', 'ya', 'lah', 'pun', 'resmi', 'nya', 'para', 'si',
]);

const INGKAR: Readonly<Record<string, string>> = { tak: 'tidak', ga: 'tidak', gak: 'tidak', nggak: 'tidak', enggak: 'tidak', ngga: 'tidak', engga: 'tidak' };
const SINONIM: Readonly<Record<string, string>> = { cuma: 'hanya', doang: 'hanya' };
/** Kelas sinonim sumber (sesudah `akar`). */
export const KELAS_CATAT: ReadonlySet<string> = new Set(['catat', 'dokumen', 'data', 'arsip', 'tulis']);

const AWALAN = ['meng', 'meny', 'mem', 'men', 'me', 'peng', 'peny', 'pem', 'pen', 'pe', 'ter', 'ber', 'di', 'ke'] as const;

/** Akar kasar satu kata (tanpa kamus): akhiran lalu awalan, sisa minimal 3–4 huruf. */
export function akar(kata: string): string {
  let w = kata;
  for (const s of ['nya', 'lah', 'kah']) {
    if (w.length > s.length + 3 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  if (w.length > 6 && w.endsWith('kan')) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith('an')) w = w.slice(0, -2);
  for (const p of AWALAN) {
    if (w.startsWith(p) && w.length - p.length >= 4) {
      w = w.slice(p.length);
      break;
    }
  }
  return w;
}

/** Normalisasi BENTUK angka; nilainya tidak diubah. */
export function normalAngka(teks: string): string {
  return teks
    .replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1')
    .replace(/(\d),(\d)/g, '$1d$2')
    .replace(/rp\s?(\d[\da-z]*)/g, ' rp$1 ')
    .replace(/(?<![\p{L}\d])(\d[\da-z]*)\s*rupiah/gu, ' rp$1 ');
}

/** Himpunan isi satu pilihan. */
export function isiPilihan(teks: string): Set<string> {
  const polos = normalAngka(teksPolos(teks).toLowerCase().replace(/^\s*(betul|keliru)\s*,\s*/, ''));
  const hasil = new Set<string>();
  for (const kasar of polos.replace(/[^\p{L}\d\s]/gu, ' ').split(/\s+/)) {
    if (kasar === '') continue;
    let k = INGKAR[kasar] ?? SINONIM[kasar] ?? kasar;
    if (KATA_FUNGSI.has(k)) continue;
    if (!/\d/.test(k)) k = akar(k);
    if (KELAS_CATAT.has(k)) k = '‹catat›';
    if (KATA_FUNGSI.has(k)) continue;
    hasil.add(k);
  }
  return hasil;
}

/** Kemiripan Jaccard isi dua pilihan (0–1). */
export function kemiripanPilihan(a: string, b: string): number {
  const x = isiPilihan(a);
  const y = isiPilihan(b);
  const irisan = [...x].filter((k) => y.has(k)).length;
  const gabung = x.size + y.size - irisan;
  return gabung === 0 ? 1 : irisan / gabung;
}

export interface SoalKembar {
  berkas: string;
  soal: ReadonlyArray<{ pilihan: ReadonlyArray<{ teks: string }> }>;
}

/** Kemiripan terbesar dua pilihan dalam satu soal manusia, dan ambangnya. Murni. */
export function ambangKembarDari(kasus: readonly SoalKembar[]): { maks_manusia: number; ambang: number; pasangan: string } {
  let maks = -1;
  let pasangan = '';
  for (const k of kasus) {
    k.soal.forEach((s, i) => {
      const p = s.pilihan.map((x) => x.teks);
      for (let a = 0; a < p.length; a++) {
        for (let b = a + 1; b < p.length; b++) {
          const m = kemiripanPilihan(p[a] ?? '', p[b] ?? '');
          if (m > maks) {
            maks = m;
            pasangan = `${k.berkas} soal ${String(i + 1)} ${HURUF[a] ?? '?'}–${HURUF[b] ?? '?'}`;
          }
        }
      }
    });
  }
  if (maks < 0) throw new Error('Tidak ada pasangan pilihan manusia untuk menurunkan ambang G-pilihan-kembar.');
  if (maks >= 1) throw new Error(`Pasangan pilihan manusia ${pasangan} sudah kembar menurut ukuran ini; ukuran harus diperbaiki, bukan ambangnya.`);
  return { maks_manusia: Math.round(maks * 1000) / 1000, ambang: Math.round(((1 + maks) / 2) * 1000) / 1000, pasangan };
}

/** Semua soal manusia di `cases/*.json`. */
export function kasusManusia(): SoalKembar[] {
  const folder = `${AKAR}cases`;
  // Kasus dari agent ada di `cases/` tetapi bukan soal manusia (`kasus-manusia.ts`).
  return berkasKasusManusia(folder)
    .map((f) => ({ berkas: `cases/${f}`, soal: (JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as { soal: SoalKembar['soal'] }).soal }));
}

let tersimpan: ReturnType<typeof ambangKembarDari> | null = null;

/** Ambang dari semua `cases/*.json` (dibaca sekali per proses). */
export function ambangKembar(): ReturnType<typeof ambangKembarDari> {
  tersimpan ??= ambangKembarDari(kasusManusia());
  return tersimpan;
}

export interface PutusanKembar {
  tolak: boolean;
  ambang: number;
  /** Pasangan yang kembar (identik atau ≥ ambang). */
  kembar: Array<{ a: KunciOpsi; b: KunciOpsi; kemiripan: number; identik: boolean }>;
  /** Kemiripan terbesar yang terukur di omongan ini. */
  maks: number;
  alasan: string[];
}

/** G-pilihan-kembar untuk keempat pilihan satu omongan. */
export function gKembar(pilihan: Readonly<Record<KunciOpsi, string>> | null | undefined, ambang: number = ambangKembar().ambang): PutusanKembar {
  const kembar: PutusanKembar['kembar'] = [];
  let maks = 0;
  if (pilihan !== null && pilihan !== undefined && typeof pilihan === 'object') {
    for (let i = 0; i < HURUF.length; i++) {
      for (let j = i + 1; j < HURUF.length; j++) {
        const a = HURUF[i] as KunciOpsi;
        const b = HURUF[j] as KunciOpsi;
        const x = isiPilihan(pilihan[a] ?? '');
        const y = isiPilihan(pilihan[b] ?? '');
        const identik = x.size > 0 && x.size === y.size && [...x].every((k) => y.has(k));
        const m = Math.round(kemiripanPilihan(pilihan[a] ?? '', pilihan[b] ?? '') * 1000) / 1000;
        maks = Math.max(maks, m);
        if (identik || m >= ambang) kembar.push({ a, b, kemiripan: m, identik });
      }
    }
  }
  return {
    tolak: kembar.length > 0,
    ambang,
    kembar,
    maks,
    alasan: kembar.map(
      (k) =>
        `Pilihan ${k.a} dan ${k.b} isinya sama (${k.identik ? 'sama persis sesudah dinormalisasi' : `kemiripan ${k.kemiripan.toFixed(2).replace('.', ',')} ≥ ambang ${ambang.toFixed(2).replace('.', ',')}`}): ` +
        'pemain tanpa kartu cukup menyingkirkan keduanya. Ganti salah satunya dengan kekeliruan lain yang masuk akal dan benar-benar berbeda isinya.',
    ),
  };
}
