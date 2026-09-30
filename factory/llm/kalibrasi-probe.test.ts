/**
 * M2d-8 T-01: effort "high" + penjaga penalaran dari data (pra-registrasi §5),
 * konfigurasi pagu M2d-8.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { AWALAN_TAG_M2D8, PAGU_BAGIAN_M2D8, PAGU_MILESTONE_M2D8, pencatatM2d8, siapM2d8 } from './kalibrasi-konfig.ts';
import { AMBANG_KRITIKUS_M2D8, HABIS_PENEBAK, JALUR_PROBE_M2D8, MAX_TOKENS_PROBE_KRITIKUS, MAX_TOKENS_PROBE_PENEBAK, bacaLedger, bacaProbeM2d8, butirProbe, entriBahan, putusanPenalar, type HasilProbeM2d8 } from './kalibrasi-probe.ts';
import type { EntriLedger } from './pagu.ts';
import { PENALAR_M2D8 } from './penalaran.ts';

const PRAREG = readFileSync(`${AKAR}docs/bukti/m2d8-praregistrasi.md`, 'utf8').replace(/\r\n/g, '\n');

const e = (tag: string, token_penalaran: number, token_keluar: number, penyedia = 'Wafer', effort = 'high'): EntriLedger =>
  ({ waktu: '2026-09-29T00:00:00Z', model: 'z-ai/glm-5.3', tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar, biaya_usd: 0.01, dasar_biaya: 'usage-cost', perkiraan_maks_usd: 0.1, latensi_ms: 1, galat: null, penyedia, token_penalaran, tanpa_cost: false, penalaran_diminta: { effort } }) as unknown as EntriLedger;
const k = (finish: string, keluar: number): HasilProbeM2d8 => ({ tag: 'm2d8/probe/kritikus/x', peran: 'kritikus', max_tokens: 32_000, finish_reason: finish, token_keluar: keluar, token_penalaran: keluar - 100, status: 200 });
const t = (penalaran: number, finish = 'stop'): HasilProbeM2d8 => ({ tag: 'm2d8/probe/penebak/x', peran: 'penebak', max_tokens: 8_000, finish_reason: finish, token_keluar: penalaran + 100, token_penalaran: penalaran, status: 200 });

describe('putusanPenalar (aturan §5)', () => {
  it('kritikus: 1,5 × keluaran selesai terpanjang, dibulatkan ke atas, antara 24.000 dan 40.000', () => {
    expect(putusanPenalar([e('m2d6/jalan-1/tirt/p1/kritikus/o1', 9_000, 9_500)], []).kritikus.maxTokens).toBe(24_000);
    expect(putusanPenalar([e('m2d6/jalan-1/tirt/p1/kritikus/o1', 9_000, 9_500)], [k('stop', 20_100)]).kritikus.maxTokens).toBe(31_000);
    expect(putusanPenalar([], [k('stop', 30_000)]).kritikus.maxTokens).toBe(40_000);
  });

  it('kritikus: yang habis di M2d-6 (≥ 23.990) tidak dihitung selesai; probe habis di 32.000 → 40.000', () => {
    expect(putusanPenalar([e('m2d6/kritikus/x', 24_000, 24_000), e('m2d6/kritikus/y', 5_000, 12_000)], []).kritikus.maxTokens).toBe(24_000);
    expect(putusanPenalar([], [k('length', 32_000), k('stop', 5_000)]).kritikus.maxTokens).toBe(40_000);
  });

  it('hanya entri M2d-6 GLM effort "high" yang dipakai', () => {
    const lain = [e('m2d7/jalan-2/tirt/p1/kritikus/o1', 9_000, 30_000), e('m2d6/kritikus/x', 9_000, 30_000, 'Wafer', 'max')];
    expect(putusanPenalar(lain, []).kritikus.maxTokens).toBe(24_000);
  });

  it('penebak: ambang = ½ kuartil bawah (Wafer M2d-6 + probe, tanpa yang habis), min 50; habis > 1/10 → 12.000', () => {
    const w = [100, 200, 400, 800, 1_600].map((x, i) => e(`m2d6/kalibrasi/K3/s${String(i)}/penebak`, x, x + 50));
    const p = putusanPenalar(w, []);
    expect(p.penebakGlm.ambang).toBe(100);
    expect(p.penebakGlm.maxTokens).toBe(8_000);
    expect(putusanPenalar([...w, e('m2d6/x/penebak', 300, 350, 'Reka')], []).penebakGlm.ambang).toBe(100);
    expect(putusanPenalar([...w, e('m2d6/x/penebak', 8_000, 8_000)], []).penebakGlm.maxTokens).toBe(12_000);
    expect(putusanPenalar([], [t(60), t(70)]).penebakGlm.ambang).toBe(50);
    expect(putusanPenalar(w, [t(8_000, 'length')]).penebakGlm.maxTokens).toBe(12_000); // 1/6 > 1/10
    expect(putusanPenalar([...w, ...w], [t(8_000, 'length')]).penebakGlm.maxTokens).toBe(8_000); // 1/11 ≤ 1/10
  });

  it('4xx dari penyedia → effort tidak diterima (berhenti; tidak kembali ke "max")', () => {
    const p = putusanPenalar([], [{ tag: 'x', peran: 'kritikus', max_tokens: 1, galat: 'HTTP 400', status: 400 }]);
    expect(p.effort_diterima).toBe(false);
    expect(p.kritikus.effort).toBe('high');
  });
});

describe('PENALAR_M2D8 = putusan atas data nyata', () => {
  it('sama dengan putusanPenalar(ledger, probe-1.json)', () => {
    const p = putusanPenalar(bacaLedger(), bacaProbeM2d8(JALUR_PROBE_M2D8));
    expect(p.effort_diterima).toBe(true);
    expect({ kritikus: p.kritikus, penebakGlm: p.penebakGlm }).toEqual(PENALAR_M2D8);
    expect(PENALAR_M2D8.kritikus.effort).toBe('high');
    expect(PENALAR_M2D8.penebakGlm.effort).toBe('high');
  });

  it('bahan probe = entri jalan 2 M2d-7 menurut pra-registrasi; angka aturan tertulis di pra-registrasi', () => {
    const b = butirProbe();
    expect(b.filter((x) => x.peran === 'penebak').map((x) => x.tag)).toEqual(entriBahan().slice(0, 4).map((x) => `penebak/p${String(x.putaran)}-o${String(x.no)}`));
    expect(b.filter((x) => x.peran === 'kritikus').map((x) => x.tag)).toEqual(['kritikus/p5-o2', 'kritikus/p6-o2', 'kritikus/p7-o2']);
    for (const x of b) expect(x.setelan.tambahanBadan).toEqual({ reasoning: { effort: 'high' } });
    expect(MAX_TOKENS_PROBE_KRITIKUS).toBe(32_000);
    expect(MAX_TOKENS_PROBE_PENEBAK).toBe(8_000);
    for (const s of ['32.000', '40.000', '24.000', '1.000', '7.990', '8.000', '12.000', '1/10']) expect(PRAREG).toContain(s);
    expect(AMBANG_KRITIKUS_M2D8).toBe(1_000);
    expect(HABIS_PENEBAK).toBe(7_990);
  });
});

describe('konfigurasi M2d-8', () => {
  it('pagu milestone US$2,30 + bagian probe 0,25 / kalibrasi 0,70 / pemanasan 0,25 (pra-registrasi §9)', () => {
    expect(PAGU_MILESTONE_M2D8).toBe(2.3);
    expect(PAGU_BAGIAN_M2D8.probe.usd).toBe(0.25);
    expect(PAGU_BAGIAN_M2D8.kalibrasi.usd).toBe(0.7);
    expect(PAGU_BAGIAN_M2D8.pemanasan.usd).toBe(0.25);
    expect(AWALAN_TAG_M2D8).toBe('m2d8/');
    expect(PRAREG).toContain('Milestone US$2,30 atas semua tag `m2d8/`; bagian: probe US$0,25, kalibrasi US$0,70, pemanasan US$0,25');
  });

  it('pagu milestone dan bagian ditegakkan sebelum kirim', () => {
    const b = pencatatM2d8(100, null);
    expect(() => b.periksa('z-ai/glm-5.3', [{ role: 'user', content: 'x' }], 60_000, 'm2d8/probe/x')).toThrow(/Pagu milestone tercapai/);
    expect(() => b.periksa('z-ai/glm-5.3', [{ role: 'user', content: 'x' }], 1_000, 'm2d7/x')).toThrow(/di luar awalan milestone/);
    expect(b.periksa('z-ai/glm-5.3', [{ role: 'user', content: 'x' }], 1_000, 'm2d8/jalan/x')).toBeGreaterThan(0);
  });

  it('ledger hanya boleh bertag m2d5/…m2d8/ (dan penyusun/ sejak M2d-9)', () => {
    expect(siapM2d8()).toBeNull();
  });
});
