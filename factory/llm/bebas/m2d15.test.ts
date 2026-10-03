/** M2d-15 D-5/D-6: paket reviewer (audit satu soal, mutu buta) dan laporan. */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { bangunAuditSatuSoal } from './audit.ts';
import { hitungJenis, jenisAlasan, JALUR_LAPORAN_OPUS, bangunLaporanOpus } from './laporan-opus.ts';
import { BENIH_AUDIT_M2D15, butirAkhirM2d15, butirMutuM2d15, LULUS_OPUS_M2D13 } from './m2d15.ts';

describe('jenis penolakan', () => {
  it('memetakan alasan gerbang dan pra-periksa ke jenis aturan', () => {
    expect(jenisAlasan('pemeriksa: G-satu-klausa: koma kedua …')).toBe('G-satu-klausa');
    expect(jenisAlasan('pemeriksa: ANGKA_TANPA_RUJUKAN: Penjelasan …')).toBe('ANGKA_TANPA_RUJUKAN');
    expect(jenisAlasan('detektor D9 (urutan numerik; pilihan): …')).toBe('D9');
    expect(jenisAlasan('M2d-13: angka-di-kartu: penjelasan: …')).toBe('angka-di-kartu');
    expect(jenisAlasan('M2d-13: umpan balik: umpan balik b: …')).toBe('umpan balik');
    expect(jenisAlasan('validator seluruh draf [KUNCI_SERAGAM]: Huruf …')).toBe('KUNCI_SERAGAM');
    expect(jenisAlasan('omongan 2: gerbang artefak: meresmikan: …')).toBe('meresmikan');
    expect(jenisAlasan('anti-salin: pesan menyalin …')).toBe('anti-salin');
  });
  it('satu versi dihitung sekali per jenis', () => {
    expect(hitungJenis([['detektor D9 (x): a', 'detektor D9 (x): b', 'pemeriksa: G-panjang: c'], ['pemeriksa: G-panjang: d']])).toEqual({ 'G-panjang': 2, D9: 1 });
  });
});

describe('paket reviewer M2d-15', () => {
  const butir = butirAkhirM2d15();
  it('audit: satu soal × 4 rotasi per berkas, benih M2d-15, kunci tidak ada di teks berkas', () => {
    if (butir.length === 0) return;
    const { berkas, kunci } = bangunAuditSatuSoal(butir, BENIH_AUDIT_M2D15);
    expect(kunci.benih).toBe(BENIH_AUDIT_M2D15);
    expect(berkas).toHaveLength(4 * butir.length);
    for (const b of berkas) {
      expect(b.isi.match(/### Q/g)).toHaveLength(1);
      expect(b.isi).not.toMatch(/kunci|Kartu \d/i);
    }
  });
  it('mutu buta: versi akhir M2d-15 + 2 Opus M2d-13 lulus + 3 templat TIRT-7 + 3 DADA, asal tidak ada di teks', () => {
    const m = butirMutuM2d15();
    const per = (a: string): number => m.filter((x) => x.asal === a).length;
    expect([per('opus-m2d15'), per('opus-m2d13'), per('templat-m2d11'), per('tayang-dada')]).toEqual([butir.length, LULUS_OPUS_M2D13.length, 3, 3]);
    expect(m.map((x) => x.id_buta)).toEqual(m.map((_, i) => `m${String(i + 1).padStart(2, '0')}`));
  });
});

describe('laporan M2d-15', () => {
  it.skipIf(!existsSync(JALUR_LAPORAN_OPUS))('berkas laporan = keluaran `npm run opus:laporan`', () => {
    expect(readFileSync(JALUR_LAPORAN_OPUS, 'utf8')).toBe(bangunLaporanOpus());
  });
  it('menyebut pra-registrasi, amandemen A1 dan T1', () => {
    const t = bangunLaporanOpus();
    for (const s of ['docs/bukti/m2d15-praregistrasi.md', 'm2d15-amandemen-A1.md', 'm2d15-amandemen-teknis-T1.md']) expect(t).toContain(s);
    expect(AKAR.length).toBeGreaterThan(0);
  });
});
