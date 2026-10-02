/**
 * Aturan angka-di-kartu (pra-registrasi M2d-13 §4 (a)): setiap angka/tanggal
 * yang tampil harus ada di kartu omongan itu. Tes merah dulu + sabotase.
 * Kasus nyata: draf TIRT-7 omongan 1 (Rp89 dari kartu yang tidak ditampilkan)
 * dan omongan 3 ([[misal|2,02 kali]]).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import { angkaDiKartu } from './angka-kartu.ts';
import type { OmonganBebas } from './skema.ts';

const tirt7 = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/hasil.json`, 'utf8')) as { kunci: Array<{ omongan: OmonganDraf }> }).kunci.map((k) => k.omongan);

function bebas(o: OmonganDraf, tambah: Partial<OmonganBebas> = {}): OmonganBebas {
  const pengecoh = Object.fromEntries((['a', 'b', 'c', 'd'] as const).filter((h) => h !== o.kunci).map((h) => [h, { jenis: 'salah-periode' as const, rujukan: o.kartu[0] ?? '', umpan_balik: 'salah periode: cek kartu 1.' }]));
  return { ...o, pengecoh, pertanyaan_cek: 'Angka ini milik tanggal yang mana menurut kartu?', ...tambah };
}

const [o1, o2, o3] = tirt7 as [OmonganDraf, OmonganDraf, OmonganDraf];

describe('angka-di-kartu', () => {
  it('TIRT-7 omongan 1: Rp89 merujuk harga 5 Desember yang bukan kartu omongan itu → ditolak (pilihan a & penjelasan)', () => {
    const m = angkaDiKartu(bebas(o1));
    expect(m.some((x) => x.includes('pilihan a') && x.includes('harga-2025-12-05'))).toBe(true);
    expect(m.some((x) => x.includes('penjelasan') && x.includes('harga-2025-12-05'))).toBe(true);
  });

  it('TIRT-7 omongan 3: [[misal|2,02 kali]] → ditolak', () => {
    const m = angkaDiKartu(bebas(o3));
    expect(m.some((x) => x.includes('pilihan b') && x.includes('[[misal|2,02 kali]] dilarang'))).toBe(true);
  });

  it('TIRT-7 omongan 2: semua rujukan ke kartunya sendiri → bersih', () => {
    expect(angkaDiKartu(bebas(o2))).toEqual([]);
  });

  it('pesan: angka andaian atau fakta di luar kartu → ditolak', () => {
    expect(angkaDiKartu(bebas({ ...o2, angka_pesan: [{ teks: 'Rp115', andaian: true }] })).some((x) => x.includes('andaian'))).toBe(true);
    expect(angkaDiKartu(bebas({ ...o2, angka_pesan: [{ teks: '9 Desember', fact_id: 'harga-2025-12-09' }] })).some((x) => x.includes('harga-2025-12-09'))).toBe(true);
    expect(angkaDiKartu(bebas({ ...o2, angka_pesan: [{ teks: '9 Desember' }] })).length).toBeGreaterThan(0);
  });

  it('digit di luar rujukan (pilihan/penjelasan) → ditolak; [[hari-ini|…]] boleh', () => {
    expect(angkaDiKartu(bebas({ ...o2, pilihan: { ...o2.pilihan, a: 'Betul, harganya naik tapi masih 90-an rupiah.' } })).some((x) => x.includes('pilihan a'))).toBe(true);
    expect(angkaDiKartu(bebas({ ...o2, penjelasan: `${o2.penjelasan} Hari ini [[hari-ini|10 Desember 2025]].` }))).toEqual([]);
  });

  it('umpan balik: "kartu N" hanya untuk N ≤ jumlah kartu; angka lain wajib rujukan kartu', () => {
    const c = o2.kunci === 'a' ? 'b' : 'a';
    const ub = (t: string): OmonganBebas => bebas(o2, { pengecoh: { [c]: { jenis: 'salah-periode', rujukan: o2.kartu[0] ?? '', umpan_balik: t } } });
    expect(angkaDiKartu(ub('salah periode: cek kartu 2.'))).toEqual([]);
    expect(angkaDiKartu(ub('salah periode: cek kartu 3.')).some((x) => x.includes('kartu 3'))).toBe(true);
    expect(angkaDiKartu(ub('salah periode: harganya Rp106, cek kartu 1.')).length).toBeGreaterThan(0);
    expect(angkaDiKartu(ub(`salah periode: harganya [[${o2.kartu[1] ?? ''}|Rp58]], cek kartu 2.`))).toEqual([]);
  });

  it('pertanyaan cek tanpa digit', () => {
    expect(angkaDiKartu(bebas(o2, { pertanyaan_cek: 'Harga 9 Desember berapa?' })).some((x) => x.includes('pertanyaan cek'))).toBe(true);
  });
});
