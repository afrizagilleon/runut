/**
 * M2d-7 T-01: GLM `reasoning.effort: "max"` + penjaga dikalibrasi ulang (D-1).
 *
 * Kegagalan yang dijaga (kontrak M2d-7 §0): `effort: "max"` ditolak penyedia
 * tanpa ketahuan; `effort` digabung dengan `reasoning.max_tokens` (dokumen
 * OpenRouter: tidak boleh); urutan penyedia yang ditulis dari dugaan, bukan
 * bukti ledger; pagu milestone yang tidak ditegakkan.
 */
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { PaguTercapai } from './pagu.ts';
import { PENYEDIA_DIKECUALIKAN, type BarisBukti } from './penyedia-bukti.ts';
import { URUTAN_GLM_M2D7, pagarM2d7, urutanBerpikirDalam } from './penyedia-urutan.ts';
import { AWALAN_TAG_M2D7, PAGU_BAGIAN_M2D7, PAGU_MILESTONE_M2D7, pencatatM2d7, siapM2d7 } from './pengecoh-konfig.ts';
import { JALUR_BUKTI_URUTAN, JALUR_PROBE_M2D7, JEJAK_TAMBAHAN_PENALAR, bacaProbe, butirProbe, kritikusDariJejak, putusanProbe, type HasilProbe } from './pengecoh-probe.ts';
import { readFileSync } from 'node:fs';
import { PENALAR_M2D7, badanUpaya } from './penalaran.ts';

const b = (tag: string, penyedia: string, token: number): BarisBukti => ({
  waktu: '2026-09-29T00:00:00.000Z', tag, model: MODEL_OR_GLM, penyedia, status: 200, token_keluar: token + 100, token_penalaran: token,
  penalaran_diminta: { effort: 'high' }, asal_diminta: 'ledger',
});

describe('urutan penyedia GLM dari bukti (D-1)', () => {
  it('URUTAN_GLM_M2D7 = turunan dari cuplikan ledger terlacak', () => {
    const berkas = JSON.parse(readFileSync(JALUR_BUKTI_URUTAN, 'utf8')) as { baris: BarisBukti[]; urutan: string[] };
    expect(urutanBerpikirDalam(berkas.baris)).toEqual([...URUTAN_GLM_M2D7]);
    expect(berkas.urutan).toEqual([...URUTAN_GLM_M2D7]);
  });

  it('butuh ≥ 10 panggilan per peran dan median ≥ ambang M2d-6 di SETIAP peran yang cukup', () => {
    const kritikusDalam = Array.from({ length: 10 }, () => b('m2d6/jalan-1/tirt/p1/kritikus/o1', 'Wafer', 5000));
    const tebakDangkal = Array.from({ length: 10 }, () => b('m2d6/jalan-1/tirt/p1/gerbang-tebak/o1/t1', 'Wafer', 100));
    expect(urutanBerpikirDalam(kritikusDalam)).toEqual(['wafer']);
    expect(urutanBerpikirDalam([...kritikusDalam, ...tebakDangkal])).toEqual([]);
    expect(urutanBerpikirDalam(kritikusDalam.slice(0, 9))).toEqual([]);
    // Panggilan tanpa effort bukan bukti.
    expect(urutanBerpikirDalam(kritikusDalam.map((x) => ({ ...x, penalaran_diminta: { max_tokens: 8000 } })))).toEqual([]);
  });

  it('pagar M2d-7: GLM mendahulukan penyedia terbukti, pengecualian M2d-6 tetap, DeepSeek tanpa order', () => {
    const g = pagarM2d7(MODEL_OR_GLM) as Record<string, unknown>;
    expect(g['order']).toEqual([...URUTAN_GLM_M2D7]);
    expect(g['ignore']).toEqual([...(PENYEDIA_DIKECUALIKAN[MODEL_OR_GLM] ?? [])]);
    expect(g['allow_fallbacks']).toBe(true);
    expect(g['require_parameters']).toBe(true);
    const d = pagarM2d7(MODEL_OR_DEEPSEEK) as Record<string, unknown>;
    expect(d['order']).toBeUndefined();
    // Ulangan sesudah jawaban tidak sah dari Wafer: Wafer dilewati DAN tidak didahulukan.
    const u = pagarM2d7(MODEL_OR_GLM, ['Wafer']) as Record<string, unknown>;
    expect(u['order']).toBeUndefined();
    expect(u['ignore']).toContain('wafer');
  });
});

describe('pagu M2d-7 ditegakkan kode', () => {
  it('pagu milestone US$3,00 atas tag m2d7/, bagian probe/kalibrasi/jalan-1', () => {
    expect(PAGU_MILESTONE_M2D7).toBe(3);
    expect(PAGU_BAGIAN_M2D7.probe.usd).toBe(0.3);
    expect(PAGU_BAGIAN_M2D7.kalibrasi.usd).toBe(0.6);
    const p = pencatatM2d7(8, null);
    const pesan = [{ role: 'user' as const, content: 'x' }];
    // 20.000 token keluar GLM (4,40/juta) = US$0,088 per panggilan: di bawah pagu probe.
    expect(() => p.periksa(MODEL_OR_GLM, pesan, 20_000, `${AWALAN_TAG_M2D7}probe/a`)).not.toThrow();
    // 80.000 token = US$0,352 > pagu probe US$0,30.
    expect(() => p.periksa(MODEL_OR_GLM, pesan, 80_000, `${AWALAN_TAG_M2D7}probe/a`)).toThrow(PaguTercapai);
    // Tag di luar m2d7/ ditolak sebelum kirim.
    expect(() => p.periksa(MODEL_OR_GLM, pesan, 1000, 'm2d6/x')).toThrow(/di luar awalan milestone/);
  });

  it('ledger dengan tag di luar m2d5/m2d6/m2d7 → belum siap', () => {
    const d = mkdtempSync(join(tmpdir(), 'm2d7-'));
    const f = join(d, 'ledger.jsonl');
    writeFileSync(f, `${JSON.stringify({ tag: 'm2d7/probe/a' })}\n${JSON.stringify({ tag: 'm2d6/x' })}\n`);
    expect(siapM2d7(f)).toBeNull();
    writeFileSync(f, `${JSON.stringify({ tag: 'tanding/x' })}\n`);
    expect(siapM2d7(f)).toMatch(/di luar/);
  });
});

const h = (x: Partial<HasilProbe> & Pick<HasilProbe, 'peran'>): HasilProbe => ({ tag: 't', max_tokens: 1, badan: null, status: 200, ...x });

describe('probe effort "max" (D-1)', () => {
  it('badan probe hanya reasoning.effort "max" — tanpa reasoning.max_tokens', () => {
    for (const x of butirProbe()) expect(x.setelan.tambahanBadan).toEqual({ reasoning: { effort: 'max' } });
    expect(badanUpaya({ effort: 'max', maxTokens: 1, ambang: 1 })).toEqual({ reasoning: { effort: 'max' } });
  });

  it('"max" hanya dipakai bila tidak ditolak penyedia DAN kritikus terbukti berpikir', () => {
    const k = (t: number, keluar = t + 300): HasilProbe => h({ peran: 'kritikus', token_penalaran: t, token_keluar: keluar, finish_reason: 'stop', terurai: true });
    const t = (x: number): HasilProbe => h({ peran: 'penebak', token_penalaran: x, terurai: true, finish_reason: 'stop' });
    expect(putusanProbe([k(5000), k(6000), k(100), t(400)]).effort).toBe('max');
    expect(putusanProbe([k(5000), k(100), k(100), t(400)]).effort).toBe('high');
    // Ditolak penyedia (4xx) = tidak diterima, walau yang lain berpikir.
    expect(putusanProbe([k(5000), k(6000), k(7000), h({ peran: 'penebak', galat: 'GalatLlm: HTTP 400', status: 400 })]).effort).toBe('high');
  });

  it('ambang penebak dari kuartil bawah tebakan terbaca; kritikus tetap 1.000; max_tokens dari keluaran terpanjang', () => {
    const k = (keluar: number, fin = 'stop'): HasilProbe => h({ peran: 'kritikus', token_penalaran: 4000, token_keluar: keluar, finish_reason: fin, terurai: true });
    const t = (x: number, terurai = true): HasilProbe => h({ peran: 'penebak', token_penalaran: x, terurai, finish_reason: 'stop' });
    const p = putusanProbe([k(9000), k(12000), t(300), t(500), t(900), t(2000), t(10, false)]);
    expect(p.kritikus.ambang).toBe(1000);
    expect(p.kritikus.maxTokens).toBe(18_000);
    // Kuartil bawah dari [300, 500, 900, 2000] = 300 → ½ = 150.
    expect(p.penebakGlm.ambang).toBe(150);
    expect(p.penebakGlm.maxTokens).toBe(8000);
    expect(putusanProbe([k(9000, 'length'), t(40)]).kritikus.maxTokens).toBe(24_000);
    expect(putusanProbe([k(3000), t(40)]).penebakGlm.ambang).toBe(50);
  });

  it('PENALAR_M2D7 = putusan probe + kritikus jalan yang sudah selesai (aturan yang sama)', () => {
    expect(existsSync(JALUR_PROBE_M2D7)).toBe(true);
    const tambahan = JEJAK_TAMBAHAN_PENALAR.filter((f) => existsSync(f)).flatMap(kritikusDariJejak);
    expect(tambahan.some((h) => h.finish_reason === 'length')).toBe(true);
    const p = putusanProbe([...bacaProbe(), ...tambahan]);
    expect(PENALAR_M2D7.kritikus).toEqual({ effort: p.effort, maxTokens: p.kritikus.maxTokens, ambang: p.kritikus.ambang });
    expect(PENALAR_M2D7.penebakGlm).toEqual({ effort: p.effort, maxTokens: p.penebakGlm.maxTokens, ambang: p.penebakGlm.ambang });
  });
});
