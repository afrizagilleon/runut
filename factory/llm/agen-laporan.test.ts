/**
 * M2d-2 T-07: laporan lingkar agen dihasilkan skrip, bukan ditulis tangan.
 *
 * Dijaga: laporan terlacak = hasil `bangunLaporan` atas keluaran mentah dan
 * ledger (dibangun ulang identik); ledger dipotong di akhir milestone, jadi
 * panggilan sesudahnya tidak mengubah laporan; angka eksternal memakai
 * kriteria K-05 yang sama dengan gerbang. Ledger ada di `.cache/` (tidak
 * terlacak); tanpa ledger, tes yang membutuhkannya dilewati.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bacaLedger, bangunLaporan, lolosKartuLuar, lolosTebakLuar } from './agen-laporan.ts';
import { AKAR } from './env.ts';
import { lolosTebak } from './laporan.ts';
import { bacaLedgerSemua, type EntriLedger } from './pagu.ts';

// Riwayat biaya = arsip (M2d-4) + ledger kini.
const adaLedger = bacaLedgerSemua().length > 0;

describe.skipIf(!adaLedger)('laporan lingkar agen (D-7)', () => {
  const ledger = adaLedger ? bacaLedger() : [];
  const l = bangunLaporan(ledger);

  it('docs/bukti/lingkar-agen.md dan ringkasan terlacak = hasil skrip atas keluaran mentah', () => {
    expect(l.md).toBe(readFileSync(`${AKAR}docs/bukti/lingkar-agen.md`, 'utf8'));
    expect(l.ringkasan).toEqual(JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d2/ringkasan.json`, 'utf8')));
    expect(l.ledgerRingkas).toEqual(JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d2/ledger-ringkas.json`, 'utf8')));
  });

  it('panggilan sesudah milestone (ledger kumulatif terus bertambah) tidak mengubah laporan', () => {
    const nanti: EntriLedger = {
      waktu: '2099-01-01T00:00:00.000Z',
      model: 'deepseek-ai/DeepSeek-V4.1-Flash',
      tag: 'agen/tirt/p1/susun/o1',
      percobaan_http: 1,
      status: 200,
      token_masuk: 1,
      token_keluar: 1,
      biaya_usd: 9,
      dasar_biaya: 'usage',
      perkiraan_maks_usd: 9,
      latensi_ms: 1,
      galat: null,
    };
    expect(bangunLaporan([...ledger, nanti]).md).toBe(l.md);
  });

  it('hasil tebak buta eksternal memakai kriteria K-05 (lolosTebak) atas jawaban mentah', () => {
    const r = l.ringkasan as { luar: Array<{ kunci: string; tebak_luar: { jawaban: Array<{ pilihan: string; yakin: number }>; lolos: boolean } }> };
    expect(r.luar.length).toBeGreaterThan(0);
    for (const x of r.luar) {
      expect(x.tebak_luar.jawaban).toHaveLength(3);
      expect(x.tebak_luar.lolos).toBe(lolosTebak(x.tebak_luar.jawaban, x.kunci).lolos);
    }
  });
});

describe('kriteria K-05 untuk penguji luar (tanpa ledger)', () => {
  const j = (pilihan: string, yakin: number): { pilihan: string; yakin: number } => ({ pilihan, yakin });

  it('tebak buta: ≤ 1 dari 3 benar dan yakin < 40; kurang dari 3 jawaban = tidak lolos', () => {
    expect(lolosTebakLuar([j('b', 80), j('c', 80), j('d', 80)], 'a')).toBe(true);
    expect(lolosTebakLuar([j('a', 35), j('c', 80), j('d', 80)], 'a')).toBe(true);
    expect(lolosTebakLuar([j('a', 45), j('c', 80), j('d', 80)], 'a')).toBe(false);
    expect(lolosTebakLuar([j('a', 10), j('a', 10), j('d', 80)], 'a')).toBe(false);
    expect(lolosTebakLuar([j('b', 80), j('c', 80)], 'a')).toBe(false);
  });

  it('jawab dengan kartu: 3/3 benar DAN ketiganya menunjuk kartu penentu', () => {
    const k = (pilihan: string, kartu: number[]): { pilihan: string; kartu: number[] } => ({ pilihan, kartu });
    expect(lolosKartuLuar([k('a', [3]), k('a', [1, 3]), k('a', [3])], 'a', [3])).toBe(true);
    expect(lolosKartuLuar([k('a', [3]), k('a', [1]), k('a', [3])], 'a', [3])).toBe(false);
    expect(lolosKartuLuar([k('a', [3]), k('b', [3]), k('a', [3])], 'a', [3])).toBe(false);
  });
});
