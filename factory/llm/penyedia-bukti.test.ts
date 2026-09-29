/**
 * M2d-6 T-02: pengecualian penyedia BERDASAR BUKTI (D-2).
 *
 * Kegagalan yang dijaga (kontrak §0): pengecualian yang ditulis dari dugaan,
 * bukan dari ledger. Daftar di kode harus sama dengan turunan dari cuplikan
 * ledger yang terlacak, dan cuplikan itu harus cocok dengan ledger sungguhan.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { pagarPenyedia } from './openrouter.ts';
import { JALUR_LEDGER, type EntriLedger } from './pagu.ts';
import { bacaBukti, bangunBukti } from './penalar-bukti.ts';
import {
  MIN_PELANGGARAN, PENYEDIA_DIKECUALIKAN, barisBukti, dimintaM2d5, pagarM2d6, pelanggaran, ringkasPenyedia, turunkanPengecualian, type BarisBukti,
} from './penyedia-bukti.ts';

const b = (x: Partial<BarisBukti>): BarisBukti => ({
  waktu: '2026-09-30T00:00:00Z', tag: 'm2d6/x', model: MODEL_OR_DEEPSEEK, penyedia: 'P', status: 200, token_keluar: 100, token_penalaran: 100,
  penalaran_diminta: null, asal_diminta: 'ledger', ...x,
});

describe('reasoning yang diminta di M2d-5, diturunkan dari tag + setelan terlacak', () => {
  it('penulis, cadangan, pembaca kartu, kritikus, penebak GLM, penebak DeepSeek, probe', () => {
    expect(dimintaM2d5('m2d5/tirt/p2/tulis-ulang/o2')).toEqual({ max_tokens: 12_000 });
    expect(dimintaM2d5('m2d5/tirt/p1/susun/o1')).toEqual({ max_tokens: 12_000 });
    expect(dimintaM2d5('m2d5/tirt/p2/tulis-ulang/o2/u1')).toEqual({ enabled: false });
    expect(dimintaM2d5('m2d5/tirt/p1/gerbang-kartu/o1')).toEqual({ max_tokens: 6_000 });
    expect(dimintaM2d5('m2d5/tirt/p1/kritikus/o1')).toEqual({ max_tokens: 8_000 });
    expect(dimintaM2d5('m2d5/tirt/p1/gerbang-tebak/o1/t3')).toEqual({ max_tokens: 3_000 });
    expect(dimintaM2d5('m2d5/tirt/p1/gerbang-tebak/o1/t1')).toBeNull();
    expect(dimintaM2d5('m2d5/probe/penulis/r8000')).toEqual({ max_tokens: 8_000 });
    expect(dimintaM2d5('m2d5/probe/p2/penulis/r16000-b')).toEqual({ max_tokens: 16_000 });
    expect(dimintaM2d5('m2d5/probe/kartu/bawaan')).toBeNull();
    expect(dimintaM2d5('m2d5/probe/penulis/tanpa-berpikir')).toEqual({ enabled: false });
  });
});

describe('pelanggaran', () => {
  it('melewati batas: penalaran > reasoning.max_tokens; tepat batas bukan pelanggaran', () => {
    expect(pelanggaran(b({ penalaran_diminta: { max_tokens: 12_000 }, token_penalaran: 20_000 }))?.jenis).toBe('melewati-batas');
    expect(pelanggaran(b({ penalaran_diminta: { max_tokens: 12_000 }, token_penalaran: 12_000 }))).toBeNull();
    expect(pelanggaran(b({ penalaran_diminta: null, token_penalaran: 20_000 }))).toBeNull();
  });

  it('tidak berpikir: effort diminta ke GLM berperan penalar, penalaran < ambang atau tak dilaporkan', () => {
    const glm = { model: MODEL_OR_GLM, penalaran_diminta: { effort: 'high' } };
    expect(pelanggaran(b({ ...glm, tag: 'm2d6/probe/kritikus/high-1', token_penalaran: 120 }))?.jenis).toBe('tidak-berpikir');
    expect(pelanggaran(b({ ...glm, tag: 'm2d6/tirt/p1/gerbang-tebak/o2/t3', token_penalaran: null }))?.jenis).toBe('tidak-berpikir');
    expect(pelanggaran(b({ ...glm, tag: 'm2d6/probe/kritikus/high-1', token_penalaran: 5000 }))).toBeNull();
    // DeepSeek dengan effort tidak dinilai "tidak berpikir".
    expect(pelanggaran(b({ penalaran_diminta: { effort: 'high' }, tag: 'm2d6/x/kritikus/o1', token_penalaran: 0 }))).toBeNull();
  });

  it(`satu kejadian tidak cukup: dikecualikan bila ≥ ${String(MIN_PELANGGARAN)} pelanggaran DAN ≥ 1/3 panggilan yang bisa melanggar`, () => {
    const lewat = { penalaran_diminta: { max_tokens: 100 }, token_penalaran: 500 };
    const patuh = { penalaran_diminta: { max_tokens: 100 }, token_penalaran: 50 };
    const satu = [b({ ...lewat, penyedia: 'AtlasCloud' }), b({ ...patuh, penyedia: 'AtlasCloud' })];
    expect(turunkanPengecualian(satu)).toEqual({});
    const jarang = [b({ ...lewat, penyedia: 'AtlasCloud' }), b({ ...lewat, penyedia: 'AtlasCloud' }), ...Array.from({ length: 5 }, () => b({ ...patuh, penyedia: 'AtlasCloud' }))];
    expect(turunkanPengecualian(jarang)).toEqual({});
    const sering = [b({ ...lewat, penyedia: 'AtlasCloud' }), b({ ...lewat, penyedia: 'AtlasCloud' }), b({ ...patuh, penyedia: 'AtlasCloud' }), b({ ...patuh, penyedia: 'Together' })];
    expect(turunkanPengecualian(sering)).toEqual({ [MODEL_OR_DEEPSEEK]: ['atlas-cloud'] });
    // Panggilan tanpa medan reasoning tidak masuk hitungan (tidak bisa melanggar).
    expect(ringkasPenyedia([b({ penyedia: 'X' })])).toEqual([]);
  });

  it('porsi dihitung PER JENIS: panggilan jenis lain tidak mengencerkan bukti "tidak berpikir"', () => {
    const glm = { model: MODEL_OR_GLM, penyedia: 'Wafer' };
    const tidakBerpikir = { ...glm, tag: 'm2d6/kalibrasi/K1/s1/x/penebak/t3', penalaran_diminta: { effort: 'high' }, token_penalaran: 40 };
    const batasPatuh = { ...glm, tag: 'm2d5/tirt/p1/kritikus/o1', penalaran_diminta: { max_tokens: 8000 }, token_penalaran: 100 };
    const baris = [b(tidakBerpikir), b(tidakBerpikir), ...Array.from({ length: 10 }, () => b(batasPatuh))];
    const r = ringkasPenyedia(baris)[0];
    expect(r?.per_jenis).toEqual({ 'tidak-berpikir': { diperiksa: 2, melanggar: 2 }, 'melewati-batas': { diperiksa: 10, melanggar: 0 } });
    expect(r?.dikecualikan).toBe(true);
    // effort "medium" (sengaja diprobe) bukan bukti terhadap penyedia.
    const medium = { ...tidakBerpikir, penalaran_diminta: { effort: 'medium' } };
    expect(ringkasPenyedia([b(medium), b(medium), b(medium)])).toEqual([]);
  });
});

describe('daftar di kode = turunan dari cuplikan ledger terlacak', () => {
  const bukti = bacaBukti();

  it('PENYEDIA_DIKECUALIKAN sama dengan turunkanPengecualian(bukti-penyedia.json)', () => {
    expect(turunkanPengecualian(bukti.baris)).toEqual(PENYEDIA_DIKECUALIKAN);
    expect(bukti.pengecualian).toEqual(PENYEDIA_DIKECUALIKAN);
  });

  it('setiap penyedia yang dikecualikan punya baris bukti (tag + waktu) sebanyak aturan', () => {
    for (const r of ringkasPenyedia(bukti.baris).filter((x) => x.dikecualikan)) {
      expect(r.bukti.length).toBeGreaterThanOrEqual(MIN_PELANGGARAN);
      for (const x of r.bukti) expect(x.tag).toMatch(/^m2d[56]\//);
    }
    expect(PENYEDIA_DIKECUALIKAN[MODEL_OR_DEEPSEEK]).toContain('atlas-cloud');
  });

  it.runIf(existsSync(JALUR_LEDGER))('cuplikan cocok dengan ledger sungguhan (butuh .cache/llm/ledger.jsonl)', () => {
    const entri = readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((x) => x.trim() !== '').map((x) => JSON.parse(x) as EntriLedger);
    const kunci = new Set(entri.map((e) => `${e.waktu}|${e.tag}|${String(e.penyedia)}|${String(e.token_penalaran)}`));
    for (const x of bukti.baris) expect(kunci.has(`${x.waktu}|${x.tag}|${String(x.penyedia)}|${String(x.token_penalaran)}`), x.tag).toBe(true);
    // Cuplikan dibangun dari ledger yang sama (entri sesudah cuplikan boleh ada).
    const segar = bangunBukti(entri.filter((e) => e.waktu <= (bukti.baris.at(-1)?.waktu ?? '')));
    expect(segar.baris).toEqual(bukti.baris);
    expect(entri.map(barisBukti).filter((x) => x !== null).length).toBeGreaterThanOrEqual(bukti.baris.length);
  });

  it('pagar M2d-6 = pagar M2d-5 + ignore dari bukti; GLM tanpa ignore bila tanpa bukti', () => {
    const ds = pagarM2d6(MODEL_OR_DEEPSEEK);
    expect(ds.ignore).toEqual([...(PENYEDIA_DIKECUALIKAN[MODEL_OR_DEEPSEEK] ?? [])]);
    const { ignore: _i, ...sisa } = ds;
    expect(sisa).toEqual(pagarPenyedia(MODEL_OR_DEEPSEEK));
    const glm = pagarM2d6(MODEL_OR_GLM, ['Wafer']);
    expect(glm.ignore).toEqual([...(PENYEDIA_DIKECUALIKAN[MODEL_OR_GLM] ?? []), 'wafer']);
  });
});
