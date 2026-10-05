/**
 * Kalimat "siapa yang menyusun soal simulasi ini" di layar pembukaan.
 *
 * Kegagalan yang dijaga: simulasi yang soalnya ditulis agent tampil dengan
 * kalimat "disusun Claude bersama pemilik … disetujui manusia", atau simulasi
 * lain masih berkata "belum ada yang tayang" padahal satu sudah tayang.
 */
import { describe, expect, it } from 'vitest';
import { KASUS_DARI_AGEN } from '../../factory/kasus/asal-agen.ts';
import { keteranganPenyusun } from './isi-kasus.ts';

describe('keteranganPenyusun', () => {
  it('simulasi dari agent: menyebut agent dan penyetujunya, tidak mengaku disetujui manusia', () => {
    expect(KASUS_DARI_AGEN).toContain('amag-2026-06-15');
    const teks = keteranganPenyusun('amag-2026-06-15');
    expect(teks).toBe('Soal simulasi ini ditulis agen AI kami dan diperiksa Claude (model AI).');
    expect(teks).not.toMatch(/manusia|pemilik|belum ada yang tayang/);
  });

  it('simulasi DADA dan ULTJ: kalimat lamanya tetap, tanpa "belum ada yang tayang"', () => {
    for (const id of ['dada-2025-10-08', 'ultj-2026-05-04']) {
      const teks = keteranganPenyusun(id);
      expect(teks, id).toContain(
        'Soal di simulasi ini disusun Claude (model AI) bersama pemilik, lalu diuji dan disetujui manusia.',
      );
      expect(teks, id).not.toContain('belum ada yang tayang');
      expect(teks, id).toContain('Agen otomatis kami juga menulis soal');
    }
  });

  it('tidak memuat kata "kasus" (M3.12: yang tampil ke pemain selalu "simulasi")', () => {
    for (const id of ['dada-2025-10-08', 'ultj-2026-05-04', 'amag-2026-06-15']) {
      expect(keteranganPenyusun(id)).not.toMatch(/\bkasus\b/i);
    }
  });
});
