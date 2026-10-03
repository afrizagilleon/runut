/**
 * M2d-16 D-4: pemanggil v3 — badan permintaan yang BENAR-BENAR dikirim
 * (fetch palsu, tanpa jaringan): penyedia terkunci per peran, profil Opus v3,
 * mentah + teks berpikir tersimpan, kunci tidak pernah ditulis.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import { PaguTercapai } from '../../factory/llm/pagu.ts';
import { SETELAN_PENULIS_OPUS_V3, type BarisMentah } from '../../factory/llm/pemanggil-v2.ts';
import { SETELAN_PENEBAK_KUAT } from '../../factory/llm/rotasi/penebak-kuat.ts';
import { MODEL_ROTASI } from '../../factory/llm/rotasi/rotasi.ts';
import { SETELAN_KARTU } from '../../factory/llm/templat/gerbang.ts';
import type { InfoTemplat } from '../../factory/llm/templat/penulis.ts';
import { PenyediaTidakTersedia } from '../../factory/llm/templat/penyedia.ts';
import { akarSementara, KUNCI_LLM_PALSU } from './bantu-uji.ts';
import { panggilV3 } from './pemanggil-v3.ts';

interface Kirim {
  badan: Record<string, unknown>;
  header: Record<string, string>;
}

function palsu(jawab: (badan: Record<string, unknown>) => Record<string, unknown> | Error): { fetch: typeof fetch; kirim: Kirim[] } {
  const kirim: Kirim[] = [];
  const f = ((_u: unknown, init?: RequestInit) => {
    const badan = JSON.parse(String(init?.body)) as Record<string, unknown>;
    kirim.push({ badan, header: init?.headers as Record<string, string> });
    const r = jawab(badan);
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(new Response(JSON.stringify(r), { status: 200 }));
  }) as typeof fetch;
  return { fetch: f, kirim };
}

const respons = (penyedia: string, x: { isi?: string; pikir?: string; cost?: number; finish?: string; rincian?: unknown[] } = {}): Record<string, unknown> => ({
  provider: penyedia,
  choices: [{ message: { content: x.isi ?? '{"teks":"x"}', ...(x.pikir === undefined ? {} : { reasoning: x.pikir }), ...(x.rincian === undefined ? {} : { reasoning_details: x.rincian }) }, finish_reason: x.finish ?? 'stop' }],
  usage: { prompt_tokens: 3000, completion_tokens: 5000, cost: x.cost ?? 0.11, completion_tokens_details: { reasoning_tokens: 2100 } },
});

const info = (jenis: InfoTemplat['jenis'], model: InfoTemplat['model'], x: Partial<InfoTemplat> = {}): InfoTemplat => ({ jenis, putaran: 1, omongan: 1, ke: 1, peran: 'penebak', model, ...x });
const PESAN = [{ role: 'user' as const, content: 'tulis' }];
const NAMA: Record<string, string> = { anthropic: 'Anthropic', 'amazon-bedrock': 'Amazon Bedrock', relace: 'Relace', wafer: 'Wafer' };

function siapkan(jawab: (badan: Record<string, unknown>) => Record<string, unknown> | Error, paguJalan = 2): { p: ReturnType<ReturnType<typeof panggilV3>>; kirim: Kirim[]; akar: string; mentah: string } {
  const akar = akarSementara();
  const f = palsu(jawab);
  const mentah = join(akar, 'jalan', 'mentah-panggilan.jsonl');
  const p = panggilV3({ akar, paguMilestoneUsd: 5, awalanMilestone: 'penyusun/', fetch: f.fetch, tidur: () => Promise.resolve(), jam: () => new Date('2026-10-03T01:02:03Z') })('penyusun/j1/', paguJalan, mentah);
  return { p, kirim: f.kirim, akar, mentah };
}
const baris = (jalur: string): BarisMentah[] => readFileSync(jalur, 'utf8').trim().split('\n').map((b) => JSON.parse(b) as BarisMentah);
const ledger = (akar: string): Array<Record<string, unknown>> => readFileSync(join(akar, '.cache', 'llm', 'ledger.jsonl'), 'utf8').trim().split('\n').map((b) => JSON.parse(b) as Record<string, unknown>);

describe('pemanggil v3: badan permintaan', () => {
  it('penulis Opus: provider anthropic tanpa fallback, effort medium, max_tokens 128.000, suhu 1, teks berpikir diminta, TANPA reasoning.max_tokens', async () => {
    const s = siapkan(() => respons('Anthropic', { isi: '{"omongan": []}', pikir: 'ringkasan berpikir penulis' }));
    const j = await s.p(PESAN, SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' }));
    expect(s.kirim).toHaveLength(1);
    const b = s.kirim[0]?.badan as Record<string, unknown>;
    expect(b['model']).toBe(MODEL_OR_OPUS);
    expect(b['max_tokens']).toBe(128_000);
    expect(b['temperature']).toBe(1);
    expect(b['reasoning']).toEqual({ effort: 'medium', exclude: false });
    expect(b['provider']).toMatchObject({ order: ['anthropic'], allow_fallbacks: false, require_parameters: true, data_collection: 'deny', max_price: { prompt: 4, completion: 20 } });
    expect(b['provider']).not.toHaveProperty('ignore');
    expect(b['messages']).toEqual(PESAN);
    expect(j.penalaran).toBe('ringkasan berpikir penulis');
    expect(j.biaya_usd).toBe(0.11);
  });

  it('tiap peran gerbang membawa SATU penyedia terkunci (penebak DeepSeek relace; pembaca kartu DeepSeek wafer)', async () => {
    const s = siapkan((b) => respons(NAMA[((b['provider'] as { order: string[] }).order[0] as string)] as string));
    const [haiku, deepseek, glm] = MODEL_ROTASI;
    await s.p(PESAN, { ...haiku!.setelan }, info('gerbang-tebak', MODEL_OR_HAIKU, { ke: 1 }));
    await s.p(PESAN, { ...deepseek!.setelan }, info('gerbang-tebak', MODEL_OR_DEEPSEEK, { ke: 5 }));
    await s.p(PESAN, { ...glm!.setelan }, info('gerbang-tebak', MODEL_OR_GLM, { ke: 9 }));
    await s.p(PESAN, { suhu: 0, maxTokens: SETELAN_KARTU.maxTokens }, info('gerbang-kartu', MODEL_OR_DEEPSEEK, { peran: 'pembaca-kartu' }));
    await s.p(PESAN, SETELAN_PENEBAK_KUAT, info('gerbang-tebak-kuat', MODEL_OR_OPUS, { ke: 2 }));
    await s.p(PESAN, { suhu: 0, maxTokens: 4000 }, info('kritikus', MODEL_OR_GLM, { peran: 'kritikus' }));
    expect(s.kirim.map((k) => [k.badan['model'], (k.badan['provider'] as { order: string[]; allow_fallbacks: boolean }).order, (k.badan['provider'] as { allow_fallbacks: boolean }).allow_fallbacks])).toEqual([
      [MODEL_OR_HAIKU, ['amazon-bedrock'], false],
      [MODEL_OR_DEEPSEEK, ['relace'], false],
      [MODEL_OR_GLM, ['wafer'], false],
      [MODEL_OR_DEEPSEEK, ['wafer'], false],
      [MODEL_OR_OPUS, ['anthropic'], false],
      [MODEL_OR_GLM, ['wafer'], false],
    ]);
    expect(s.kirim[4]?.badan['reasoning']).toEqual({ effort: 'low', exclude: false });
    expect(ledger(s.akar).map((e) => e['tag'])).toEqual(['penyusun/j1/p1/gerbang-tebak/o1/t1', 'penyusun/j1/p1/gerbang-tebak/o1/t5', 'penyusun/j1/p1/gerbang-tebak/o1/t9', 'penyusun/j1/p1/gerbang-kartu/o1/r1', 'penyusun/j1/p1/gerbang-tebak-kuat/o1/r2', 'penyusun/j1/p1/kritikus/o1']);
  });

  it('jenis × model di luar tabel → ditolak TANPA fetch', async () => {
    const s = siapkan(() => respons('Azure'));
    await expect(s.p(PESAN, SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_HAIKU))).rejects.toThrow(/tidak punya penyedia terkunci/);
    expect(s.kirim).toHaveLength(0);
  });
});

describe('pemanggil v3: mentah-panggilan.jsonl', () => {
  it('jawaban + teks berpikir (reasoning atau reasoning_details) tersimpan; kunci API tidak ada di berkas maupun ledger', async () => {
    let n = 0;
    const s = siapkan(() => {
      n += 1;
      return n === 1 ? respons('Anthropic', { isi: '{"omongan": [1]}', pikir: 'aku memilih kartu suspensi' }) : respons('Anthropic', { isi: '{"teks":"a"}', rincian: [{ type: 'reasoning.summary', summary: 'ringkas dua' }] });
    });
    await s.p(PESAN, SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' }));
    await s.p(PESAN, SETELAN_PENEBAK_KUAT, info('gerbang-tebak-kuat', MODEL_OR_OPUS, { ke: 4 }));
    const b = baris(s.mentah);
    expect(b).toHaveLength(2);
    expect(b[0]).toMatchObject({
      waktu: '2026-10-03T01:02:03.000Z', tag: 'penyusun/j1/p1/tulis-bebas', peran: 'penulis', model: MODEL_OR_OPUS, penyedia: 'Anthropic', token_masuk: 3000, token_keluar: 5000, token_penalaran: 2100, finish_reason: 'stop', biaya_usd: 0.11,
      isi: '{"omongan": [1]}', penalaran: 'aku memilih kartu suspensi', ada_penalaran: true, max_tokens: 128_000, penalaran_diminta: { effort: 'medium', exclude: false },
    });
    expect(b[1]).toMatchObject({ tag: 'penyusun/j1/p1/gerbang-tebak-kuat/o1/r4', peran: 'penebak-kuat', penalaran: 'ringkas dua', ada_penalaran: true });
    expect(s.kirim[0]?.header['authorization']).toBe(`Bearer ${KUNCI_LLM_PALSU}`);
    expect(readFileSync(s.mentah, 'utf8')).not.toContain(KUNCI_LLM_PALSU);
    expect(JSON.stringify(ledger(s.akar))).not.toContain(KUNCI_LLM_PALSU);
  });

  it('jawaban terpotong tanpa isi tetap tersimpan (dengan teks berpikirnya) dan dicatat biaya nyata', async () => {
    const s = siapkan(() => respons('Anthropic', { isi: '', pikir: 'masih menimbang…', finish: 'length', cost: 0.9 }));
    const j = await s.p(PESAN, SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' }));
    expect(j.finish_reason).toBe('length');
    expect(baris(s.mentah)[0]).toMatchObject({ isi: '', finish_reason: 'length', penalaran: 'masih menimbang…', biaya_usd: 0.9 });
    expect(ledger(s.akar)[0]).toMatchObject({ biaya_usd: 0.9, dasar_biaya: 'usage-cost' });
  });
});

describe('pemanggil v3: penyedia & pagu', () => {
  it('respons dari penyedia lain → mentah tetap tersimpan, lalu PenyediaTidakTersedia (jalan berhenti, tidak dialihkan)', async () => {
    const s = siapkan(() => respons('Azure', { pikir: 'x' }));
    await expect(s.p(PESAN, SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' }))).rejects.toBeInstanceOf(PenyediaTidakTersedia);
    expect(s.kirim).toHaveLength(1);
    expect(baris(s.mentah)[0]).toMatchObject({ penyedia: 'Azure' });
  });

  it('pagu jalan: perkiraan wajar Opus (US$0,37864) — panggilan ke-3 ditolak sebelum kirim sesudah biaya nyata 2 × 0,35', async () => {
    const s = siapkan(() => respons('Anthropic', { cost: 0.35 }), 1);
    const i = info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' });
    await s.p(PESAN, SETELAN_PENULIS_OPUS_V3, i);
    await s.p(PESAN, SETELAN_PENULIS_OPUS_V3, { ...i, putaran: 2 });
    await expect(s.p(PESAN, SETELAN_PENULIS_OPUS_V3, { ...i, putaran: 3 })).rejects.toBeInstanceOf(PaguTercapai);
    expect(s.kirim).toHaveLength(2);
    expect(ledger(s.akar)).toHaveLength(2);
  });

  it('tanpa respons (galat jaringan) → tidak ada baris mentah; ledger mencatat perkiraan maksimum', async () => {
    const s = siapkan(() => new TypeError('putus'), 5);
    await expect(s.p(PESAN, SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' }))).rejects.toThrow(/galat jaringan/);
    expect(existsSync(s.mentah)).toBe(false);
    expect(ledger(s.akar)[0]).toMatchObject({ dasar_biaya: 'perkiraan-maksimum' });
    expect(ledger(s.akar)[0]?.['biaya_usd']).toBeGreaterThan(2.5);
  });
});
