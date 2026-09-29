import { describe, expect, it } from 'vitest';
import { PERTANYAAN_PENANDA, PERTANYAAN_PENOLAK, teksPrompt, type Paket } from './audit-paket.ts';

describe('paket penguji independen (D-5)', () => {
  const paket: Paket = {
    id: 'U99',
    aturan: 'R15',
    simbol: 'ABCD',
    kalimat: 'Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok.',
    fokus: 'laporan kepemilikan bertanggal 2025-01-01T00:00:00',
    pertanyaan: PERTANYAAN_PENOLAK,
    potongan: [{ dari: 'ABCD-m4a-filings-p*.json results[]', keterangan: 'baris itu', isi: [{ holding_before: 10, holding_after: 7 }] }],
  };

  it('memakai pertanyaan kontrak untuk aturan penolak', () => {
    expect(PERTANYAAN_PENOLAK).toContain('Apakah data ini benar-benar tidak konsisten seperti kata kalimat itu?');
    expect(PERTANYAAN_PENOLAK).toContain('ya/tidak/ragu');
    expect(PERTANYAAN_PENANDA).toContain('ya/tidak/ragu');
  });

  it('prompt hanya berisi kalimat awam, fokus, pertanyaan, dan potongan mentah', () => {
    const t = teksPrompt(paket);
    expect(t).toContain(`Kalimat aturan: "${paket.kalimat}"`);
    expect(t).toContain(`Fokus: ${paket.fokus}.`);
    expect(t).toContain('"holding_before": 10');
    expect(t).toContain('JAWABAN: ya');
    // Tidak ada kode aturan, nama fungsi, atau vonis kami di dalamnya.
    expect(t).not.toMatch(/R15|r15|temuan|merah|konflik/);
  });

  it('deterministik', () => {
    expect(teksPrompt(paket)).toBe(teksPrompt(paket));
  });
});
