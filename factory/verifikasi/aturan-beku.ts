/**
 * Aturan beku per kasus tayang (M4b D-1).
 *
 * Berkas kasus menyimpan jejak `pemeriksaan` — satu baris untuk tiap aturan
 * yang dijalankan pembangunnya. Kalau kasus tayang dibangun dengan "apa pun
 * yang sekarang ada di `ATURAN_V2`", mendaftarkan satu aturan baru saja sudah
 * menggeser kasus yang sedang dimainkan orang (M4a: ULTJ `d26683db…` →
 * `a1ce2666…` karena satu baris jejak bertambah). Aturan baru jadi tidak bisa
 * ditambah tanpa menyentuh kasus tayang.
 *
 * Karena itu tiap kasus tayang membawa daftar aturannya sendiri, dibekukan di
 * `docs/bukti/aturan-beku-kasus.json` — diturunkan dari jejak `pemeriksaan`
 * `cases/*.json` pada saat kasus itu tayang. Pembangun kasus tayang hanya
 * **menjalankan** dan mencantumkan aturan di daftar itu, dalam urutan daftar
 * itu; aturan di luar daftar tidak dipanggil sama sekali. Kasus baru (belum
 * ada di daftar) memakai `ATURAN_V2` penuh, lalu dibekukan dengan cara yang
 * sama ketika tayang.
 *
 * Yang dibekukan adalah DAFTAR aturannya, bukan isi kodenya: perbaikan bug di
 * dalam aturan yang sudah ada tetap sampai ke kasus tayang, dan dijaga oleh tes
 * byte-identik kasus (`factory/muat/gudang-beku.test.ts`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { KodeAturan } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

export const JALUR_ATURAN_BEKU = join(AKAR, 'docs', 'bukti', 'aturan-beku-kasus.json');

export interface KasusBeku {
  /** `V1` = pembangun DADA dan `ATURAN_V1`; `V2` = jalur umum dan `ATURAN_V2`. */
  jalur: 'V1' | 'V2';
  /** sha256 berkas `cases/<id>.json` pada saat daftar ini dibekukan. */
  berkas_sha256: string;
  /** Kode aturan, dalam urutan jejak `pemeriksaan` berkas kasus itu. */
  aturan: KodeAturan[];
}

export interface AturanBeku {
  keterangan: string;
  sumber: { commit: string; cara: string };
  kasus: Record<string, KasusBeku>;
}

/**
 * Daftar aturan beku rusak, atau jejak hasil bangun tidak sama dengan daftar
 * itu. Pesannya selalu menyebut kasus dan kode aturannya.
 */
export class AturanBekuRusak extends Error {
  constructor(pesan: string) {
    super(`${pesan} Daftar aturan beku: docs/bukti/aturan-beku-kasus.json.`);
    this.name = 'AturanBekuRusak';
  }
}

export function bacaAturanBeku(jalur: string = JALUR_ATURAN_BEKU): AturanBeku {
  const d = JSON.parse(readFileSync(jalur, 'utf8')) as AturanBeku;
  if (typeof d.kasus !== 'object' || d.kasus === null) {
    throw new AturanBekuRusak(`Daftar aturan beku rusak: ${jalur} tidak punya medan "kasus".`);
  }
  for (const [id, k] of Object.entries(d.kasus)) {
    if (!Array.isArray(k.aturan) || k.aturan.length === 0) {
      throw new AturanBekuRusak(`Daftar aturan beku kasus ${id} kosong atau bukan larik.`);
    }
  }
  return d;
}

/**
 * Jejak hasil bangun harus sama persis dengan daftar beku: kode yang sama,
 * urutan yang sama, tidak lebih dan tidak kurang.
 */
export function periksaJejakBeku(kasus_id: string, jejak: readonly KodeAturan[], beku: readonly KodeAturan[]): void {
  const sama = jejak.length === beku.length && jejak.every((k, i) => k === beku[i]);
  if (sama) return;
  const lebih = jejak.filter((k) => !beku.includes(k));
  const kurang = beku.filter((k) => !jejak.includes(k));
  throw new AturanBekuRusak(
    `Jejak pemeriksaan kasus ${kasus_id} tidak sama dengan daftar aturan bekunya — kasus tidak dibangun. ` +
      `Di luar daftar: ${lebih.length === 0 ? '—' : lebih.join(', ')}; ` +
      `tidak dijalankan: ${kurang.length === 0 ? '—' : kurang.join(', ')}` +
      (lebih.length + kurang.length === 0 ? '; urutannya berbeda.' : '.'),
  );
}
