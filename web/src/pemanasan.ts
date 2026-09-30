/**
 * Slot soal pemanasan (M3.14 D-1), sebagai fungsi murni.
 *
 * Pemandu pengguna baru bisa berjalan di atas **soal 0**: satu soal latihan
 * berbentuk soal simulasi (pesan teman, kartu, pertanyaan, pilihan, kunci,
 * penjelasan) yang ditulis agen di M2d-8 dan dipasang SESUDAH disetujui.
 * Milestone ini hanya menyiapkan slotnya; slotnya kosong, dan pemandu berjalan
 * di soal pertama simulasi.
 *
 * Berkas slotnya `web/src/pemanasan/soal-pemanasan.json` (dibaca
 * `pemanasan-slot.ts`). Bentuknya:
 *
 * ```json
 * { "versi": 1, "disetujui": true, "disetujui_oleh": "…", "fakta": [Fakta…], "soal": Soal }
 * ```
 *
 * `fakta` memuat setiap kartu yang disebut `soal.kartu` (bentuk `Fakta` dari
 * `factory/skema/tipe.ts`, dengan `awam` terisi). Berkas yang tidak lolos
 * pemeriksaan di bawah — termasuk `disetujui` yang bukan `true` — dianggap
 * TIDAK ADA: pemandu kembali ke soal pertama simulasi, tanpa galat. Soal
 * latihan yang cacat lebih buruk daripada tidak ada soal latihan.
 */
import type { Fakta, Soal } from '../../factory/skema/tipe.ts';

export interface Pemanasan {
  fakta: Fakta[];
  soal: Soal;
}

function teks(x: unknown): x is string {
  return typeof x === 'string' && x.trim() !== '';
}

function objek(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function daftarTeks(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(teks);
}

function faktaSah(x: unknown): x is Fakta {
  if (!objek(x)) return false;
  if (!teks(x['fact_id']) || !teks(x['klaim'])) return false;
  const sumber = x['sumber'];
  if (!objek(sumber) || !teks(sumber['jenis'])) return false;
  const awam = x['awam'];
  return objek(awam) && teks(awam['kepala']) && teks(awam['isi']);
}

/**
 * Alasan berkas slot ditolak, atau `null` kalau sah. Diekspor untuk tes dan
 * untuk orang yang memasang berkasnya: "kenapa pemanasanku tidak muncul".
 */
export function alasanTolakPemanasan(mentah: unknown): string | null {
  if (!objek(mentah)) return 'bukan objek JSON';
  if (mentah['versi'] !== 1) return 'versi harus 1';
  if (mentah['disetujui'] !== true) return 'belum disetujui (disetujui harus true)';
  const fakta = mentah['fakta'];
  if (!Array.isArray(fakta) || fakta.length === 0) return 'fakta kosong';
  if (!fakta.every(faktaSah)) return 'ada fakta tanpa fact_id/klaim/sumber/awam';
  const soal = mentah['soal'];
  if (!objek(soal)) return 'soal bukan objek';
  if (!teks(soal['soal_id'])) return 'soal_id kosong';
  const pesan = soal['pesan'];
  if (!objek(pesan) || !teks(pesan['nama']) || !teks(pesan['isi']) || !teks(pesan['jam'])) {
    return 'pesan teman tidak lengkap';
  }
  if (!teks(soal['tanya'])) return 'tanya kosong';
  if (!teks(soal['penjelasan'])) return 'penjelasan kosong';
  const kartu = soal['kartu'];
  const penentu = soal['kartu_penentu'];
  if (!daftarTeks(kartu) || kartu.length < 1 || kartu.length > 4) return 'kartu harus 1–4';
  if (!daftarTeks(penentu) || penentu.length < 1) return 'kartu_penentu kosong';
  const ada = new Set(fakta.map((f) => (f as Fakta).fact_id));
  if (!kartu.every((id) => ada.has(id))) return 'kartu menyebut fakta yang tidak ada';
  if (!penentu.every((id) => kartu.includes(id))) return 'kartu_penentu bukan bagian dari kartu';
  const pilihan = soal['pilihan'];
  if (!Array.isArray(pilihan) || pilihan.length < 2) return 'pilihan kurang dari dua';
  if (!pilihan.every((p) => objek(p) && teks(p['kunci']) && teks(p['teks']))) {
    return 'pilihan tanpa kunci/teks';
  }
  const kunci = pilihan.map((p) => (p as { kunci: string }).kunci);
  if (new Set(kunci).size !== kunci.length) return 'kunci pilihan kembar';
  if (!teks(soal['jawaban']) || !kunci.includes(soal['jawaban'])) return 'jawaban bukan salah satu pilihan';
  if (soal['istilah'] !== undefined && !Array.isArray(soal['istilah'])) return 'istilah bukan daftar';
  return null;
}

/** Berkas slot yang sah dan disetujui menjadi `Pemanasan`; selain itu `null`. */
export function bacaPemanasan(mentah: unknown): Pemanasan | null {
  if (mentah === null || mentah === undefined) return null;
  if (alasanTolakPemanasan(mentah) !== null) return null;
  const berkas = mentah as { fakta: Fakta[]; soal: Soal };
  const soal: Soal = {
    ...berkas.soal,
    istilah: Array.isArray(berkas.soal.istilah) ? berkas.soal.istilah : [],
    petunjuk: null,
    fact_ids: Array.isArray(berkas.soal.fact_ids) ? berkas.soal.fact_ids : [...berkas.soal.kartu],
  };
  return { fakta: berkas.fakta, soal };
}

/** Kartu soal pemanasan, dalam urutan `soal.kartu`. */
export function kartuPemanasan(p: Pemanasan): Fakta[] {
  const peta = new Map(p.fakta.map((f) => [f.fact_id, f]));
  return p.soal.kartu.flatMap((id) => {
    const f = peta.get(id);
    return f === undefined ? [] : [f];
  });
}
