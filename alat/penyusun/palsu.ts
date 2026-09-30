/**
 * Mode palsu pintu penyusun (`npm run penyusun -- --palsu`): Sectors dan agen
 * palsu, TANPA jaringan dan tanpa biaya — untuk spesifikasi Playwright asap
 * dan untuk melihat halaman tanpa kunci. Tidak ada yang ditulis ke buku kas
 * atau ledger sungguhan.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { palsuP, teksKunci } from '../../factory/llm/bantu-uji-pengecoh.ts';
import type { Pengambil } from '../sectors.ts';
import { MesinLingkar } from './mesin.ts';

/**
 * Sectors palsu: setiap panggilan dijawab 404 (simbol tidak dikenal), buku kas
 * di folder sementara. Cukup untuk memperlihatkan perkiraan kredit →
 * persetujuan → hasil, tanpa satu kredit pun.
 */
export function pengambilPalsu(): Pengambil {
  const folder = mkdtempSync(join(tmpdir(), 'penyusun-sectors-palsu-'));
  return {
    kunci: 'palsu',
    pagu: 613,
    folder,
    bukuKas: join(folder, 'kredit.csv'),
    fetch: () => Promise.resolve({ status: 404, text: () => Promise.resolve('{"detail":"palsu: simbol tidak dikenal"}'), headers: { get: () => null } }),
    jam: () => new Date(),
    tidur: () => Promise.resolve(),
    jedaMs: 0,
  };
}

/**
 * Agen palsu: lingkar pengecoh dan SEMUA gerbang kode sungguhan (setelan
 * M2d-8), model dipalsukan dengan tulisan uji TIRT
 * (`factory/llm/bantu-uji-pengecoh.ts`). Untuk TIRT 10 Des 2025 (paket kurasi =
 * paket uji) draf terbit di putaran 1; paket lain ditolak validator sampai
 * batas putaran — penolakan beralasan yang sungguh dihasilkan lingkar.
 * `kunciTambahan` = teks pilihan kunci hasil suntingan (uji ulang).
 */
export function mesinPalsu(): MesinLingkar {
  return new MesinLingkar({
    nama: 'lingkar-m2d8-palsu',
    keterangan: 'lingkar & gerbang kode sungguhan (setelan M2d-8); model PALSU, tanpa jaringan, tanpa biaya',
    palsu: true,
    buatPanggil: () => palsuP({}, () => teksKunci(kunciTambahanPalsu)).panggil,
    siap: () => ({ siap: true, alasan: null }),
  });
}

/** Teks pilihan kunci yang disunting penyetuju (mode palsu): penebak palsu harus bisa menemukannya. */
export const kunciTambahanPalsu: string[] = [];
