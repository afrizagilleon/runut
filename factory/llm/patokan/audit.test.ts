/**
 * Paket audit Opus (disiapkan kode, dijalankan reviewer): 8 berkas = 4 rotasi ×
 * tanpa/dengan kartu, kunci tepat sekali di tiap huruf per soal; penilai
 * memetakan salinan teks; tanpa jawaban → dilaporkan, bukan diisi.
 */
import { describe, expect, it } from 'vitest';
import { bankUjiUlang } from './bank-lama.ts';
import { bangunAudit, nilaiAudit } from './audit.ts';

describe('paket audit Opus', () => {
  const soal = bankUjiUlang().slice(0, 2).map((b) => ({ id: b.id, omongan: b.omongan, paket: b.paket }));
  const a = bangunAudit(soal);
  it('8 berkas; kunci tiap soal tepat sekali di a–d per kondisi; kartu hanya di "dengan-kartu"', () => {
    expect(a.berkas.map((b) => b.nama)).toEqual(['tanpa-kartu-r0', 'tanpa-kartu-r1', 'tanpa-kartu-r2', 'tanpa-kartu-r3', 'dengan-kartu-r0', 'dengan-kartu-r1', 'dengan-kartu-r2', 'dengan-kartu-r3']);
    for (const kondisi of ['tanpa-kartu', 'dengan-kartu'] as const) {
      for (const id of soal.map((s) => s.id)) {
        const k = a.kunci.berkas.filter((b) => b.kondisi === kondisi).map((b) => b.soal.find((s) => s.id === id)?.kunci);
        expect([...k].sort()).toEqual(['a', 'b', 'c', 'd']);
      }
    }
    expect(a.berkas.find((b) => b.nama === 'tanpa-kartu-r0')?.isi).not.toContain('Kartu 1');
    expect(a.berkas.find((b) => b.nama === 'dengan-kartu-r0')?.isi).toContain('Kartu 1');
  });
  it('penilai: salinan teks dipetakan; berkas tanpa jawaban dilaporkan', () => {
    const b0 = a.kunci.berkas[0];
    if (b0 === undefined) throw new Error('x');
    const s0 = b0.soal[0];
    if (s0 === undefined) throw new Error('x');
    const jawaban: Record<string, string | null> = Object.fromEntries(a.kunci.berkas.map((b) => [b.nama, null]));
    jawaban[b0.nama] = JSON.stringify({ jawaban: [{ id: 'Q1', teks: s0.pilihan[s0.kunci], pilihan: 'z', yakin: 50 }] });
    const n = nilaiAudit(a.kunci, jawaban);
    expect(n.per_soal.find((x) => x.id === s0.id)?.tanpa_kartu_benar).toBe(1);
    expect(n.berkas_tanpa_jawaban).toHaveLength(7);
  });
});
