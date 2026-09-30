/**
 * Mode palsu pintu penyusun (`npm run penyusun -- --palsu`): Sectors dan agen
 * palsu, TANPA jaringan dan tanpa biaya — untuk spesifikasi Playwright asap
 * dan untuk melihat halaman tanpa kunci. Tidak ada yang ditulis ke buku kas
 * atau ledger sungguhan.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Pengambil } from '../sectors.ts';

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
