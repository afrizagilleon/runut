/**
 * M2a T-01 (RQ-01): skema generasi kedua.
 *
 * Yang diuji di sini adalah tiga perubahan D-1 dan satu invarian:
 * status `TIDAK_LENGKAP`, keparahan temuan yang opsional, `KodeAturan` yang
 * diperluas — dan INV-A: berkas kasus yang sudah dimainkan publik tidak boleh
 * berubah satu byte pun karenanya.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Kasus, Temuan } from './tipe.ts';
import {
  KEPARAHAN_BAWAAN,
  SEMUA_ATURAN,
  SEMUA_KODE_ATURAN,
  keparahanTemuan,
} from './tipe.ts';
import { periksaKasus } from './validator.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const BERKAS_KASUS = AKAR + 'cases/dada-2025-10-08.json';

function muatKasus(): Kasus {
  return JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as Kasus;
}

function temuanContoh(ubah: Partial<Temuan> = {}): Temuan {
  return {
    temuan_id: 'T-1',
    aturan: 'R1',
    ringkasan: 'Contoh.',
    angka: [{ label: 'lembar', nilai: 1, satuan: 'lembar' }],
    fakta_terkait: [],
    rujukan: [],
    ...ubah,
  };
}

describe('M2a D-1 — skema generasi kedua', () => {
  it('mengenal status TIDAK_LENGKAP sebagai status keempat', () => {
    const kasus = muatKasus();
    const fakta = kasus.fakta[0];
    expect(fakta).toBeDefined();
    // Tipe-nya menerima nilai ini; kalau `StatusFakta` belum diperluas,
    // baris berikut tidak akan lolos typecheck.
    const diubah: Kasus = {
      ...kasus,
      fakta: kasus.fakta.map((f) =>
        f.fact_id === fakta?.fact_id ? { ...f, status: 'TIDAK_LENGKAP' as const } : f,
      ),
    };
    expect(diubah.fakta.some((f) => f.status === 'TIDAK_LENGKAP')).toBe(true);
  });

  it('melarang fakta TIDAK_LENGKAP dipakai sebagai dasar jawaban soal', () => {
    const kasus = muatKasus();
    const soal = kasus.soal[0];
    expect(soal).toBeDefined();
    const dasar = soal?.fact_ids[0];
    expect(typeof dasar).toBe('string');
    const rusak: Kasus = {
      ...kasus,
      fakta: kasus.fakta.map((f) =>
        f.fact_id === dasar ? { ...f, status: 'TIDAK_LENGKAP' as const } : f,
      ),
    };
    const kode = periksaKasus(rusak).map((m) => m.kode);
    expect(kode).toContain('FAKTA_KONFLIK_DIPAKAI');
  });

  it('membaca temuan tanpa medan keparahan sebagai konflik', () => {
    const t = temuanContoh();
    expect(t.keparahan).toBeUndefined();
    expect(keparahanTemuan(t)).toBe('konflik');
    expect(KEPARAHAN_BAWAAN).toBe('konflik');
  });

  it('membaca keparahan yang ditulis apa adanya', () => {
    expect(keparahanTemuan(temuanContoh({ keparahan: 'peringatan' }))).toBe('peringatan');
    expect(keparahanTemuan(temuanContoh({ keparahan: 'catatan' }))).toBe('catatan');
  });

  it('menolak keparahan yang bukan salah satu dari tiga nilai', () => {
    const kasus = muatKasus();
    const pertama = kasus.temuan[0];
    expect(pertama).toBeDefined();
    const rusak: Kasus = {
      ...kasus,
      temuan: kasus.temuan.map((t, i) =>
        i === 0 ? { ...t, keparahan: 'gawat' as unknown as Temuan['keparahan'] } : t,
      ),
    };
    const kode = periksaKasus(rusak).map((m) => m.kode);
    expect(kode).toContain('TEMUAN_KEPARAHAN_TAK_DIKENAL');
  });

  it('menolak temuan yang menyebut kode aturan di luar skema', () => {
    const kasus = muatKasus();
    const rusak: Kasus = {
      ...kasus,
      temuan: kasus.temuan.map((t, i) =>
        i === 0 ? { ...t, aturan: 'R99' as unknown as Temuan['aturan'] } : t,
      ),
    };
    const kode = periksaKasus(rusak).map((m) => m.kode);
    expect(kode).toContain('TEMUAN_ATURAN_TAK_DIKENAL');
  });

  it('memperluas KodeAturan dengan aturan M2a dan M2b, tanpa memakai ulang nomor lama', () => {
    expect(SEMUA_KODE_ATURAN.slice(0, SEMUA_ATURAN.length)).toEqual([...SEMUA_ATURAN]);
    const baru = SEMUA_KODE_ATURAN.filter((k) => !SEMUA_ATURAN.includes(k));
    expect(baru).toEqual([
      'R11a',
      'R11b',
      'R12',
      'R13',
      'R14',
      'R15',
      'R16',
      'R17B',
      'R18a',
      'R19a',
      'R19b',
      'R20',
      'R21',
      'R22',
      'R23',
      'R25',
      'R26',
      'R27',
      'R28',
      'R29',
      'R31',
      'R32',
      'R33',
      'R34',
      'R35',
    ]);
    expect(new Set(SEMUA_KODE_ATURAN).size).toBe(SEMUA_KODE_ATURAN.length);
  });

  it('tidak menuntut jejak aturan M2a di berkas kasus lama (INV-A)', () => {
    // `SEMUA_ATURAN` adalah daftar yang wajib tercatat di berkas kasus dan
    // sengaja tetap R1-R10; kalau ia ikut bertambah, berkas kasus yang sah
    // akan ditolak validator.
    expect([...SEMUA_ATURAN]).toEqual([
      'R1',
      'R2',
      'R3',
      'R4',
      'R5',
      'R6',
      'R7',
      'R8',
      'R9',
      'R10',
    ]);
    expect(periksaKasus(muatKasus())).toEqual([]);
  });

  it('INV-A: berkas kasus yang sedang dimainkan tetap byte-identik', () => {
    const sha = createHash('sha256').update(readFileSync(BERKAS_KASUS)).digest('hex');
    expect(sha).toBe('76de546d4b1b859308578ac8f464ae4fa035f441324b8e5b999875effbc176bc');
  });

  it('tidak menulis medan keparahan ke berkas kasus jalur lama', () => {
    const mentah = readFileSync(BERKAS_KASUS, 'utf8');
    expect(mentah).not.toContain('"keparahan"');
    for (const t of muatKasus().temuan) {
      expect(t.keparahan).toBeUndefined();
    }
  });
});
