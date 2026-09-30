/**
 * Panel penyetuju (M2d-9 D-5) — aturan murni.
 *
 * Pemilik adalah PENYETUJU: ia memeriksa draf yang terbit, lalu setujui, tolak
 * (dengan alasan), atau perbaiki KATA. Yang boleh disunting hanya teks pesan,
 * empat pilihan, dan penjelasan; yang DIKUNCI:
 * - setiap rujukan fakta `[[fact_id|teks]]` (sama persis, tidak boleh
 *   ditambah atau dibuang);
 * - setiap angka (himpunan-ganda token angka sama);
 * - label pilihan "Betul,"/"Keliru," (label menentukan jawaban);
 * - di pesan: setiap potongan `angka_pesan` tetap tertulis.
 * Setiap suntingan dicatat (penyunting "manusia", waktu, dari → ke) dan draf
 * WAJIB diuji ulang oleh gerbang yang sama (`ujiUlangDraf`) sebelum boleh
 * disetujui.
 */
import type { KeadaanOmongan } from '../../factory/llm/agen-pengecoh.ts';
import type { KunciOpsi, OmonganDraf } from '../../factory/llm/draf.ts';
import type { DataJalan, Suntingan } from './jalan.ts';

export type LokasiSunting = 'pesan' | 'pilihan-a' | 'pilihan-b' | 'pilihan-c' | 'pilihan-d' | 'penjelasan';
export const LOKASI_SUNTING: readonly LokasiSunting[] = ['pesan', 'pilihan-a', 'pilihan-b', 'pilihan-c', 'pilihan-d', 'penjelasan'];

const POLA_RUJUKAN = /\[\[[^\]|]+\|[^\]]+\]\]/g;
const POLA_ANGKA = /\d+(?:[.,]\d+)*/g;

function rujukan(teks: string): string[] {
  return (teks.match(POLA_RUJUKAN) ?? []).sort();
}

function angka(teks: string): string[] {
  return (teks.match(POLA_ANGKA) ?? []).sort();
}

function label(teks: string): string | null {
  return /^\s*(betul|keliru)\s*,/i.exec(teks)?.[1]?.toLowerCase() ?? null;
}

function sama(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Teks lama pada lokasi itu. */
export function teksDi(o: OmonganDraf, lokasi: LokasiSunting): string {
  if (lokasi === 'pesan') return o.pesan;
  if (lokasi === 'penjelasan') return o.penjelasan;
  return o.pilihan[lokasi.slice(-1) as KunciOpsi];
}

/**
 * Periksa suntingan terhadap bagian yang dikunci. `null` = boleh; selain itu
 * kalimat awam kenapa ditolak.
 */
export function periksaSuntingan(o: OmonganDraf, lokasi: LokasiSunting, baru: string): string | null {
  const lama = teksDi(o, lokasi);
  const t = baru.trim();
  if (t === '') return 'Teks tidak boleh kosong.';
  if (t === lama) return 'Tidak ada yang berubah.';
  if (t.length > 600) return 'Teks terlalu panjang.';
  if (!sama(rujukan(lama), rujukan(t))) {
    return 'Rujukan fakta [[…|…]] dikunci: semuanya harus tetap ada persis sama, dan tidak boleh ada rujukan baru.';
  }
  if (!sama(angka(lama), angka(t))) {
    return `Angka dikunci: teks lama memuat ${angka(lama).join(', ') || 'tanpa angka'}, teks baru ${angka(t).join(', ') || 'tanpa angka'}.`;
  }
  if (lokasi.startsWith('pilihan-') && label(lama) !== label(t)) {
    return 'Label pilihan ("Betul," / "Keliru,") dikunci: label itulah yang menentukan jawaban.';
  }
  if (lokasi === 'pesan') {
    const hilang = o.angka_pesan.filter((a) => !t.includes(a.teks)).map((a) => `"${a.teks}"`);
    if (hilang.length > 0) return `Potongan angka pesan dikunci dan harus tetap tertulis: ${hilang.join(', ')}.`;
  }
  return null;
}

/** Terapkan suntingan ke omongan draf DAN keadaan omongan (bahan uji ulang). Mengubah di tempat. */
export function terapkanSuntingan(o: OmonganDraf, k: KeadaanOmongan | undefined, lokasi: LokasiSunting, baru: string): void {
  const t = baru.trim();
  if (lokasi === 'pesan') {
    o.pesan = t;
    if (k !== undefined) {
      k.pesan = { ...k.pesan, pesan: t };
      k.omongan = o;
    }
    return;
  }
  if (lokasi === 'penjelasan') {
    o.penjelasan = t;
    if (k !== undefined) {
      k.penjelasan = t;
      k.omongan = o;
    }
    return;
  }
  const h = lokasi.slice(-1) as KunciOpsi;
  o.pilihan = { ...o.pilihan, [h]: t };
  if (k !== undefined) {
    k.pilihan = { ...k.pilihan, [h]: { ...k.pilihan[h], teks: t } };
    k.omongan = o;
  }
}

/** Uji ulang lolos terakhir mencakup suntingan sampai nomor berapa (0 = belum ada). */
function lolosSampai(d: DataJalan): number {
  return d.uji_ulang.filter((u) => u.lolos === true).reduce((a, u) => Math.max(a, u.sampai_suntingan), 0);
}

/** Omongan yang disunting sejak uji ulang lolos terakhir — yang harus diuji ulang. */
export function omonganDiuji(d: DataJalan): number[] {
  const batas = lolosSampai(d);
  return [...new Set(d.suntingan.filter((s) => s.ke > batas).map((s) => s.omongan))].sort((a, b) => a - b);
}

/** Boleh disetujui: terbit, belum diputuskan, dan tidak ada suntingan yang belum lolos uji ulang. */
export function bolehSetujui(d: DataJalan): { boleh: boolean; alasan: string | null } {
  if (d.hasil?.terbit !== true || d.draf === null) return { boleh: false, alasan: 'Hanya draf yang terbit yang bisa disetujui.' };
  if (d.putusan !== null) return { boleh: false, alasan: `Draf ini sudah di${d.putusan.putusan === 'setujui' ? 'setujui' : 'tolak'}.` };
  if (omonganDiuji(d).length > 0) return { boleh: false, alasan: 'Ada suntingan yang belum lolos uji ulang oleh gerbang yang sama.' };
  return { boleh: true, alasan: null };
}

export function catatSuntingan(d: DataJalan, omongan: number, lokasi: LokasiSunting, dari: string, ke: string, waktu: string): Suntingan {
  const s: Suntingan = { ke: d.suntingan.length + 1, penyunting: 'manusia', waktu, omongan, lokasi, dari, ke_teks: ke.trim() };
  d.suntingan.push(s);
  return s;
}
