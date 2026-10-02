/**
 * Paket reviewer M2d-13: audit Opus satu soal (D-C) dan penilai mutu buta
 * (D-D) — satu butir per berkas, tanpa kunci/asal di bahan; urai penilaian.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';
import { bangunAuditSatuSoal, urutButa, type ButirAkhir } from './audit.ts';
import { teksButir, uraiPenilaian } from './mutu.ts';
import { beriLabel, drafTirt7 } from './palsu.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const [o1, o2, o3] = drafTirt7();
const butir: ButirAkhir[] = [
  { jalan: 'm2d13-opus-1', penulis: 'opus', no: 1, versi: 2, lulus: false, omongan: beriLabel(o1) },
  { jalan: 'm2d13-haiku-1', penulis: 'haiku', no: 2, versi: 3, lulus: true, omongan: beriLabel(o2) },
  { jalan: 'm2d13-deepseek-1', penulis: 'deepseek', no: 3, versi: 1, lulus: false, omongan: beriLabel(o3) },
];

describe('audit Opus satu soal (D-C)', () => {
  const { berkas, kunci } = bangunAuditSatuSoal(butir);
  it('SATU soal per berkas, 4 rotasi per butir, kunci tepat sekali di a–d', () => {
    expect(berkas).toHaveLength(12);
    for (const b of berkas) expect(b.isi.match(/^### Q/gm)).toHaveLength(1);
    for (const id of kunci.butir.map((x) => x.id_buta)) {
      const k = kunci.berkas.filter((x) => x.soal[0]?.id === id).map((x) => x.soal[0]?.kunci).sort();
      expect(k).toEqual(['a', 'b', 'c', 'd']);
    }
  });
  it('bahan tidak memuat kunci, penulis, jalan, label, umpan balik, atau kartu', () => {
    for (const b of berkas) {
      expect(b.isi).not.toMatch(/kunci|opus|haiku|deepseek|m2d13|salah periode|Kartu \d|pertanyaan cek/i);
      expect(b.nama).toMatch(/^b\d\d--r[0-3]$/);
    }
  });
  it('urutan buta deterministik dan tidak mengikuti urutan jalan', () => {
    expect(urutButa([1, 2, 3, 4, 5], String, 'x')).toEqual(urutButa([5, 4, 3, 2, 1], String, 'x'));
    expect(kunci.butir.map((x) => x.id_buta)).toEqual(['b01', 'b02', 'b03']);
  });
});

describe('penilai mutu buta (D-D)', () => {
  it('tampilan seragam tanpa label, umpan balik, pertanyaan cek, atau asal', () => {
    const t = teksButir({ omongan: beriLabel(o2), paket });
    expect(t).toContain('Kartu 1 —');
    expect(t).toContain('Kunci: d');
    expect(t).not.toMatch(/salah periode|angka nyaris benar|pertanyaan cek|opus|haiku|deepseek|templat|\[\[/i);
  });
  it('urai penilaian: lima kriteria 0–2 + layak; bentuk lain ditolak', () => {
    const ok = '{"skor": {"bergantung_kartu": 2, "pengecoh_diagnostik": 1, "penjelasan_mengajar": 2, "bahasa_pemula": 2, "benar_satu_kunci": 1}, "layak_tayang": true, "alasan": "x"}';
    expect(uraiPenilaian(ok)).toMatchObject({ total: 8, layak_tayang: true });
    expect(uraiPenilaian(ok.replace('"bahasa_pemula": 2', '"bahasa_pemula": 3'))).toBeNull();
    expect(uraiPenilaian(ok.replace('"layak_tayang": true', '"layak_tayang": "ya"'))).toBeNull();
    expect(uraiPenilaian('tidak tahu')).toBeNull();
  });
});
