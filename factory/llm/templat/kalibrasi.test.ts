/**
 * Kalibrasi singkat M2d-10 (T-05): himpunan beku, pemakaian ulang kritikus
 * M2d-8 hanya untuk teks yang sama, aturan memilih setelan (pra-registrasi §4).
 */
import { describe, expect, it } from 'vitest';
import type { JawabanModel } from '../susun.ts';
import { himpunanTemplat, ID_BOCOR_M2D8, KEADAAN_PENEBAK, kritikusM2d8, putusanKalibrasiTemplat, putusanSoalTemplat, SETELAN_S1, ukurSoalTemplat, type MentahTemplat } from './kalibrasi.ts';

const H = himpunanTemplat();

describe('himpunan beku', () => {
  it('6 soal tayang + 6 soal bocor, urut pra-registrasi', () => {
    expect(H.map((s) => s.id)).toEqual([
      'dada-s1-kata-bursa', 'dada-s2-dividen-pemilik-kecil', 'dada-s3-siapa-yang-menjual', 'ultj-turun-di-tanggal-ex', 'ultj-riwayat-dividen', 'ultj-siapa-yang-membeli',
      'm2d5-tirt-o2', 'm2d5-tirt-o3', 'm2d4-tirt-o3', 'm2d4-tirt-o1', 'm2d6-tirt-o1', ID_BOCOR_M2D8,
    ]);
    expect(H.filter((s) => s.kelompok === 'tayang').length).toBe(6);
  });
  it('kritikus M2d-8 dipakai ulang untuk lima soal tayang (teks sama); ULTJ s3 belum terukur', () => {
    const tayang = H.filter((s) => s.kelompok === 'tayang');
    expect(tayang.map((s) => kritikusM2d8(s) !== null)).toEqual([true, true, true, true, true, false]);
  });
  it('sabotase: teks soal berubah → pemakaian ulang ditolak', () => {
    const s = H[0] as (typeof H)[number];
    expect(() => kritikusM2d8({ ...s, omongan: { ...s.omongan, pesan: `${s.omongan.pesan} ya` } })).toThrow(/berbeda/);
  });
});

function mentah(id: string, kelompok: 'tayang' | 'bocor', kunci: 'a' | 'b', tebak: Array<[string | null, number | null]>, kartu: string, kritik: string[] = []): MentahTemplat {
  return {
    id, kelompok, luar: '', kunci, soal: '', kode: [],
    penebak: tebak.map(([p, y], i) => ({ ke: i + 1, model: 'm', pilihan: p, yakin: y, terbaca: p !== null, alasan: '', token_penalaran: [], penyedia: [] })),
    kartu: { pilihan: kartu, ditunjuk: [], menunjuk_penentu: true, bingung: [], alasan: '' },
    kritikus: kelompok === 'tayang' ? { sumber: 'm2d10', menjawab: true, keberatan: kritik.map((j) => ({ jenis: j as never, bagian: '-', alasan: 'x' })), token_penalaran: [] } : null,
    biaya_usd: 0,
  };
}

describe('aturan memilih setelan (mekanis)', () => {
  it('S1 bila soal tayang ≥ 5/6 diterima', () => {
    const m = [1, 2, 3, 4, 5, 6].map((i) => mentah(`t${String(i)}`, 'tayang', 'a', [['b', 50], ['b', 50], ['a', 50]], 'a'));
    expect(putusanKalibrasiTemplat(m).keadaan).toBe('S1');
  });
  it('Haiku yakin 75 & 85 memilih kunci di dua soal → S3 (A = 80)', () => {
    const m = [1, 2, 3, 4].map((i) => mentah(`t${String(i)}`, 'tayang', 'a', [['b', 50], ['b', 50], ['b', 50]], 'a'));
    m.push(mentah('t5', 'tayang', 'a', [['a', 85], ['b', 50], ['b', 50]], 'a'), mentah('t6', 'tayang', 'a', [['a', 75], ['b', 50], ['b', 50]], 'a'));
    const p = putusanKalibrasiTemplat(m);
    expect(p.keadaan).toBe('S3');
    expect(p.setelan.penebak).toEqual({ aturan: 'dua-dari-tiga', ambangHaiku: 80 });
  });
  it('tebakan tak terbaca = kunci yakin 100 (Haiku tak terbaca menolak di S1–S4)', () => {
    const t = mentah('x', 'tayang', 'a', [[null, null], ['b', 50], ['b', 50]], 'a');
    expect(putusanSoalTemplat(t, SETELAN_S1).penebak).toBe(true);
    expect(putusanSoalTemplat(t, { ...SETELAN_S1, penebak: { aturan: 'dua-dari-tiga', ambangHaiku: null } }).penebak).toBe(false);
  });
  it('dua pembaca kartu salah → S7 tak cukup → pembaca kartu dicatat', () => {
    const m = [1, 2, 3, 4].map((i) => mentah(`t${String(i)}`, 'tayang', 'a', [['b', 50], ['b', 50], ['b', 50]], 'a'));
    m.push(mentah('t5', 'tayang', 'a', [['b', 50], ['b', 50], ['b', 50]], 'b'), mentah('t6', 'tayang', 'a', [['b', 50], ['b', 50], ['b', 50]], 'b'));
    const p = putusanKalibrasiTemplat(m);
    expect(p.keadaan).toBe('S7 + pembaca kartu dicatat');
    expect(p.langkah.length).toBe(KEADAAN_PENEBAK.length + 1);
  });
  it('tangkapan soal bocor dihitung sebelum kritikus di bawah setelan hasil', () => {
    const m = [1, 2, 3, 4, 5, 6].map((i) => mentah(`t${String(i)}`, 'tayang', 'a', [['b', 50], ['b', 50], ['b', 50]], 'a'));
    m.push(mentah('b1', 'bocor', 'a', [['a', 90], ['a', 90], ['a', 90]], 'a'), mentah('b2', 'bocor', 'a', [['b', 50], ['b', 50], ['b', 50]], 'a'));
    expect(putusanKalibrasiTemplat(m).syarat).toMatchObject({ bocor_tertangkap_sebelum_kritikus: 1, bocor_terukur: 2, terpenuhi: true });
  });
});

describe('pengukuran satu soal (model palsu)', () => {
  it('ketiga penebak selalu dipanggil (tanpa henti dini) + pembaca kartu', async () => {
    const s = H[0] as (typeof H)[number];
    const dipanggil: string[] = [];
    const j = (teks: string, tp: number): JawabanModel => ({ teks, token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0, token_penalaran: tp });
    const { m } = await ukurSoalTemplat(s, async (_p, _s, info) => {
      dipanggil.push(`${info.jenis}/${info.model}`);
      if (info.jenis === 'gerbang-tebak') return j(JSON.stringify({ pilihan: s.omongan.kunci, yakin: 95, alasan: 'x' }), 600);
      return j(JSON.stringify({ pilihan: s.omongan.kunci, kartu: [1], alasan: 'x', membingungkan: [] }), 0);
    });
    expect(dipanggil).toEqual(['gerbang-tebak/anthropic/claude-haiku-4.5', 'gerbang-tebak/deepseek/deepseek-v4.1-flash', 'gerbang-tebak/z-ai/glm-5.3', 'gerbang-kartu/deepseek/deepseek-v4.1-flash']);
    expect(m.penebak?.length).toBe(3);
  });
});

describe('setelan mesin = keluaran kalibrasi (tidak disetel tangan)', async () => {
  const { readFileSync } = await import('node:fs');
  const { AKAR } = await import('../env.ts');
  const { bacaMentahTemplat } = await import('./kalibrasi.ts');
  const { SETELAN_TEMPLAT_M2D10 } = await import('./setelan.ts');
  it('SETELAN_TEMPLAT_M2D10 = putusanKalibrasiTemplat(mentah.json) = setelan.json', () => {
    const p = putusanKalibrasiTemplat(bacaMentahTemplat());
    expect(SETELAN_TEMPLAT_M2D10).toEqual(p.setelan);
    expect(JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d10/kalibrasi/setelan.json`, 'utf8'))).toEqual(p.setelan);
    expect(p.keadaan).toBe('S7 + pembaca kartu dicatat');
    expect(p.syarat).toMatchObject({ tayang_diterima: 5, tayang_terukur: 6, terpenuhi: true });
  });
});

describe('A-1: setelan S1 + pembaca kartu dicatat atas data kalibrasi yang sama (tanpa panggilan baru)', async () => {
  const { bacaMentahTemplat, lengkapTemplat, putusanSoalTemplat: ps } = await import('./kalibrasi.ts');
  const { SETELAN_TEMPLAT_A1 } = await import('./setelan.ts');
  it('soal tayang diterima 5/6 (ULTJ s3 ditolak kritikus); soal bocor tertangkap sebelum kritikus 3/3', () => {
    const m = bacaMentahTemplat().filter(lengkapTemplat);
    const tayang = m.filter((x) => x.kelompok === 'tayang');
    const bocor = m.filter((x) => x.kelompok === 'bocor');
    expect(tayang.filter((x) => !ps(x, SETELAN_TEMPLAT_A1).ditolak).length).toBe(5);
    expect(tayang.filter((x) => ps(x, SETELAN_TEMPLAT_A1).ditolak).map((x) => x.id)).toEqual(['ultj-siapa-yang-membeli']);
    expect(bocor.filter((x) => ps(x, SETELAN_TEMPLAT_A1).sebelum_kritikus).length).toBe(3);
    expect(bocor.length).toBe(3);
  });
});
