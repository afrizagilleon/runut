/**
 * Posisi kunci diatur KODE (M2d-5 D-4).
 *
 * Di M2d-4 omongan 2 TIRT ditolak `KUNCI_SERAGAM` lima kali: penulis menaruh
 * kunci di huruf yang sama dengan dua omongan yang sudah dikunci, putaran demi
 * putaran. Huruf kunci bukan keputusan isi — ia hanya harus tidak seragam dan
 * tidak bisa ditebak. Maka sesudah penulis menjawab, kode:
 *
 * 1. menentukan huruf kunci tiap omongan secara DETERMINISTIK dari id paket +
 *    nomor omongan (`hurufKunciKode`): satu dari 60 pola tiga huruf yang tidak
 *    seragam, dipilih dengan sha256 id paket — jadi ketiga omongan satu paket
 *    tidak pernah berhuruf kunci sama, dan jalan ulang memberi huruf yang sama;
 * 2. memindahkan pilihan kunci ke huruf itu dan menggeser pilihan lain dengan
 *    urutan relatif tetap (`aturPosisiKunci`).
 *
 * **Rujukan huruf.** Pilihan yang dipermutasi merusak kalimat seperti "pilihan
 * b benar karena…". Dari dua jalan di kontrak (sesuaikan semua rujukan, ATAU
 * larang rujukan huruf), yang dipilih: **penjelasan dan pilihan DILARANG
 * merujuk huruf** — pemeriksa menolaknya (`rujukanHuruf`), prompt penulis
 * menyebutnya. Menyesuaikan rujukan otomatis butuh menebak mana "a" yang
 * huruf pilihan dan mana yang bukan; larangan bisa dites persis. Umpan balik
 * lain (pemeriksa, pembaca kartu, kritikus) dibuat SESUDAH permutasi, atas
 * versi yang juga ditampilkan ulang ke penulis, jadi huruf di dalamnya sudah
 * cocok.
 *
 * `KUNCI_SERAGAM` di validator tetap ada sebagai penjaga.
 */
import { createHash } from 'node:crypto';
import { teksPolos } from '../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';

export const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** Semua pola huruf kunci tiga omongan yang TIDAK seragam (64 − 4 = 60), urut leksikal. */
export const POLA_KUNCI: ReadonlyArray<readonly [KunciOpsi, KunciOpsi, KunciOpsi]> = HURUF.flatMap((x) =>
  HURUF.flatMap((y) => HURUF.map((z) => [x, y, z] as const)),
).filter(([x, y, z]) => !(x === y && y === z));

/** Pola huruf kunci satu paket: sha256(id paket) mod 60. */
export function polaKunci(paketId: string): readonly [KunciOpsi, KunciOpsi, KunciOpsi] {
  const h = createHash('sha256').update(`posisi-kunci:${paketId}`).digest();
  const pola = POLA_KUNCI[h.readUInt32BE(0) % POLA_KUNCI.length];
  if (pola === undefined) throw new Error('pola kunci tidak ada');
  return pola;
}

/** Huruf kunci omongan `no` (1–3) di paket `paketId`, ditentukan kode. */
export function hurufKunciKode(paketId: string, no: number): KunciOpsi {
  const h = polaKunci(paketId)[no - 1];
  if (h === undefined) throw new Error(`Nomor omongan ${String(no)} di luar 1–3.`);
  return h;
}

export interface HasilPosisi {
  omongan: OmonganDraf;
  /** Huruf kunci tulisan penulis → huruf sesudah diatur kode. */
  dari: KunciOpsi;
  ke: KunciOpsi;
  /** Peta huruf lama → huruf baru untuk keempat pilihan. */
  peta: Record<KunciOpsi, KunciOpsi>;
}

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

/**
 * Pindahkan pilihan kunci ke huruf `ke`; pilihan lain mengisi huruf sisanya
 * dengan urutan relatif tetap. `null` bila bentuk omongan tidak memungkinkan
 * (pilihan bukan a–d, kunci bukan a–d) — validator yang akan menolaknya.
 */
export function aturPosisiKunci(o: unknown, ke: KunciOpsi): HasilPosisi | null {
  if (!adalahObyek(o) || !adalahObyek(o['pilihan'])) return null;
  const pilihan = o['pilihan'];
  const kunci = o['kunci'];
  if (typeof kunci !== 'string' || !HURUF.includes(kunci as KunciOpsi)) return null;
  if (!HURUF.every((h) => typeof pilihan[h] === 'string')) return null;
  const dari = kunci as KunciOpsi;
  const lainLama = HURUF.filter((h) => h !== dari);
  const lainBaru = HURUF.filter((h) => h !== ke);
  const peta = { [dari]: ke } as Record<KunciOpsi, KunciOpsi>;
  lainLama.forEach((h, i) => {
    peta[h] = lainBaru[i] as KunciOpsi;
  });
  const baru: Record<string, string> = {};
  for (const h of HURUF) baru[peta[h]] = pilihan[h] as string;
  const urut = Object.fromEntries(HURUF.map((h) => [h, baru[h]])) as Record<KunciOpsi, string>;
  return { omongan: { ...(o as unknown as OmonganDraf), pilihan: urut, kunci: ke }, dari, ke, peta };
}

/**
 * Rujukan ke huruf pilihan di teks (penjelasan atau pilihan): "pilihan b",
 * "opsi (c)", "jawaban d", "huruf a", "(b)", "c)" di tengah kalimat. Kosong =
 * tidak ada. Huruf tunggal "a" sebagai kata biasa tidak dihitung kecuali
 * didahului kata penunjuk pilihan atau berbentuk "(a)"/"a)".
 */
export function rujukanHuruf(teks: string): string[] {
  const polos = teksPolos(teks);
  const hasil: string[] = [];
  const pola = [
    /(?<![\p{L}])(pilihan|opsi|jawaban|huruf|option)\s*\(?\s*[a-d]\s*\)?(?![\p{L}\p{N}])/giu,
    /\(\s*[a-d]\s*\)/giu,
    /(?:^|\s)[a-d]\)(?=\s|$)/giu,
  ];
  for (const p of pola) for (const m of polos.matchAll(p)) hasil.push(m[0].trim());
  return [...new Set(hasil)];
}

/** Butir umpan balik pemeriksa untuk rujukan huruf di penjelasan/pilihan; kosong bila tidak ada. */
export function periksaRujukanHuruf(o: OmonganDraf): string[] {
  const butir: string[] = [];
  const bagian: Array<[string, string]> = [['Penjelasan', o.penjelasan], ...HURUF.map((h): [string, string] => [`Pilihan ${h}`, o.pilihan[h]])];
  for (const [tempat, teks] of bagian) {
    const r = rujukanHuruf(typeof teks === 'string' ? teks : '');
    if (r.length > 0) {
      butir.push(
        `[pemeriksa: HURUF_PILIHAN] ${tempat} merujuk huruf pilihan (${r.map((x) => `"${x}"`).join(', ')}). ` +
          'Huruf kunci diatur ulang kode, jadi urutan pilihan bisa berubah: sebut ISI pilihannya, bukan hurufnya.',
      );
    }
  }
  return butir;
}
