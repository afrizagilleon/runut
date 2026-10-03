/**
 * M2d-16 D-4: penyedia dikunci per PERAN, jawaban mentah + teks berpikir
 * tersimpan, profil penulis Opus v3, penjaga biaya wajar. Tanpa jaringan.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { chat } from './klien.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, MODEL_OR_OPUS } from './model.ts';
import { chatBerpagu, PaguTercapai, PencatatBiaya } from './pagu.ts';
import {
  BIAYA_WAJAR_OPUS_USD, biayaPenulisOpusTersimpan, buktiPenyedia, denganMentah, median, pagarPeranV2, PENYEDIA_PERAN, PencatatMentah, peranV2, periksaPenyedia, perkiraanWajarV2,
  SETELAN_PENULIS_OPUS_V3, tagV2, type BarisMentah, type PeranV2,
} from './pemanggil-v2.ts';
import { PenyediaTidakTersedia } from './templat/penyedia.ts';
import { jawabPalsu } from './templat/palsu.ts';
import type { InfoTemplat, PanggilTemplat } from './templat/penulis.ts';

const KUNCI = 'sk-UJI-pemanggil-v2-0123456789abcdef';
const info = (jenis: InfoTemplat['jenis'], model: InfoTemplat['model'], x: Partial<InfoTemplat> = {}): InfoTemplat => ({ jenis, putaran: 1, omongan: 1, ke: 1, peran: 'penebak', model, ...x });

describe('penyedia dikunci per peran (satu tabel)', () => {
  it('tabel: peran → model + satu slug penyedia', () => {
    expect(Object.fromEntries(Object.entries(PENYEDIA_PERAN).map(([p, k]) => [p, `${k.model}@${k.slug}`]))).toEqual({
      penulis: `${MODEL_OR_OPUS}@anthropic`,
      'penebak-kuat': `${MODEL_OR_OPUS}@anthropic`,
      'penebak-haiku': `${MODEL_OR_HAIKU}@amazon-bedrock`,
      'penebak-deepseek': `${MODEL_OR_DEEPSEEK}@relace`,
      'penebak-glm': `${MODEL_OR_GLM}@wafer`,
      'pembaca-kartu': `${MODEL_OR_DEEPSEEK}@wafer`,
      kritikus: `${MODEL_OR_GLM}@wafer`,
    });
    for (const k of Object.values(PENYEDIA_PERAN)) expect(k.alasan.length).toBeGreaterThan(40);
  });

  it('peran dari jenis panggilan + model; DeepSeek penebak ≠ DeepSeek pembaca kartu', () => {
    expect(peranV2(info('tulis-bebas', MODEL_OR_OPUS))).toBe('penulis');
    expect(peranV2(info('gerbang-tebak-kuat', MODEL_OR_OPUS))).toBe('penebak-kuat');
    expect(peranV2(info('gerbang-tebak', MODEL_OR_HAIKU))).toBe('penebak-haiku');
    expect(peranV2(info('gerbang-tebak', MODEL_OR_DEEPSEEK))).toBe('penebak-deepseek');
    expect(peranV2(info('gerbang-tebak', MODEL_OR_GLM))).toBe('penebak-glm');
    expect(peranV2(info('gerbang-kartu', MODEL_OR_DEEPSEEK))).toBe('pembaca-kartu');
    expect(peranV2(info('kritikus', MODEL_OR_GLM))).toBe('kritikus');
  });

  it('pasangan jenis × model di luar tabel ditolak (tidak ada panggilan tanpa kunci penyedia)', () => {
    expect(() => peranV2(info('tulis-bebas', MODEL_OR_HAIKU))).toThrow(/tidak punya penyedia terkunci/);
    expect(() => peranV2(info('gerbang-tebak', MODEL_OR_OPUS))).toThrow(/tidak punya penyedia terkunci/);
    expect(() => peranV2(info('gerbang-kartu', MODEL_OR_GLM))).toThrow(/tidak punya penyedia terkunci/);
    expect(() => peranV2(info('tulis-pesan', MODEL_OR_DEEPSEEK))).toThrow(/tidak punya penyedia terkunci/);
  });

  it('pagar: provider.order = [slug], allow_fallbacks false, tanpa ignore; kuantisasi/harga/parameter/data seperti pagar lama', () => {
    for (const [peran, k] of Object.entries(PENYEDIA_PERAN)) {
      const p = pagarPeranV2(peran as PeranV2) as Record<string, unknown>;
      expect(p['order']).toEqual([k.slug]);
      expect(p['allow_fallbacks']).toBe(false);
      expect(p['require_parameters']).toBe(true);
      expect(p['data_collection']).toBe('deny');
      expect(p).not.toHaveProperty('ignore');
      expect(p['max_price']).toBeDefined();
    }
  });

  it('respons dari penyedia lain → PenyediaTidakTersedia (jalan berhenti); penyedia cocok atau tak disebut → lanjut', () => {
    expect(() => periksaPenyedia('penulis', 'Azure')).toThrow(PenyediaTidakTersedia);
    expect(() => periksaPenyedia('pembaca-kartu', 'Relace')).toThrow(/Wafer/);
    expect(() => periksaPenyedia('penulis', 'Anthropic')).not.toThrow();
    expect(() => periksaPenyedia('penebak-haiku', 'Amazon Bedrock')).not.toThrow();
    expect(() => periksaPenyedia('penebak-deepseek', null)).not.toThrow();
  });

  it('bukti ledger: hitungan per peran × penyedia (murni)', () => {
    const e = (tag: string, model: string, penyedia: string, tp: number, diminta: Record<string, unknown> | null) => ({ tag, model, penyedia, status: 200, token_penalaran: tp, penalaran_diminta: diminta });
    const b = buktiPenyedia([
      e('penyusun/m2d13-x/p1/gerbang-tebak/o1/t5', MODEL_OR_DEEPSEEK, 'Relace', 0, { enabled: false }),
      e('penyusun/m2d13-x/p1/gerbang-tebak/o1/t6', MODEL_OR_DEEPSEEK, 'GMICloud', 600, { enabled: false }),
      e('penyusun/m2d13-x/p1/gerbang-kartu/o1', MODEL_OR_DEEPSEEK, 'Relace', 11_724, { max_tokens: 6000 }),
      e('penyusun/m2d13-x/p1/gerbang-kartu/o1', MODEL_OR_DEEPSEEK, 'Wafer', 502, { max_tokens: 6000 }),
      e('m2d6/lain', MODEL_OR_DEEPSEEK, 'Relace', 0, null),
    ]);
    expect(b.find((x) => x.peran === 'penebak-deepseek' && x.penyedia === 'GMICloud')).toMatchObject({ n: 1, berpikir_saat_dimatikan: 1 });
    expect(b.find((x) => x.peran === 'penebak-deepseek' && x.penyedia === 'Relace')).toMatchObject({ n: 1, berpikir_saat_dimatikan: 0 });
    expect(b.find((x) => x.peran === 'pembaca-kartu' && x.penyedia === 'Relace')).toMatchObject({ n: 1, lewat_batas: 1 });
    expect(b.find((x) => x.peran === 'pembaca-kartu' && x.penyedia === 'Wafer')).toMatchObject({ n: 1, lewat_batas: 0 });
    expect(b).toHaveLength(4);
  });
});

describe('profil penulis Opus v3', () => {
  it('effort "medium", max_tokens 128.000, TANPA temperature (M2d-17), minta teks berpikir, TANPA reasoning.max_tokens', () => {
    expect(SETELAN_PENULIS_OPUS_V3).toEqual({ suhu: 1, tanpaSuhu: true, maxTokens: 128_000, tambahanBadan: { reasoning: { effort: 'medium', exclude: false } } });
    expect(JSON.stringify(SETELAN_PENULIS_OPUS_V3.tambahanBadan)).not.toContain('max_tokens');
  });
});

describe('teks berpikir dari respons (klien)', () => {
  const respons = (message: Record<string, unknown>): typeof fetch =>
    (() => Promise.resolve(new Response(JSON.stringify({ provider: 'Anthropic', choices: [{ message, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 20, cost: 0.001, completion_tokens_details: { reasoning_tokens: 12 } } }), { status: 200 }))) as typeof fetch;
  const opsi = { model: MODEL_OR_OPUS, pesan: [{ role: 'user' as const, content: 'x' }], suhu: 1, maxTokens: 100 };
  it('message.reasoning dibaca (seperti sebelumnya)', async () => {
    const h = await chat({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: respons({ content: 'J', reasoning: 'ringkasan pikir' }) }, opsi);
    expect(h.penalaran).toBe('ringkasan pikir');
  });
  it('hanya reasoning_details (summary/text; encrypted dilewati) → digabung', async () => {
    const h = await chat({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: respons({ content: 'J', reasoning_details: [{ type: 'reasoning.summary', summary: 'bagian satu' }, { type: 'reasoning.encrypted', data: 'AAAA' }, { type: 'reasoning.text', text: 'bagian dua' }] }) }, opsi);
    expect(h.penalaran).toBe('bagian satu\n\nbagian dua');
  });
  it('tanpa teks berpikir → null', async () => {
    const h = await chat({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: respons({ content: 'J', reasoning_details: [{ type: 'reasoning.encrypted', data: 'AAAA' }] }) }, opsi);
    expect(h.penalaran).toBeNull();
  });
});

describe('mentah-panggilan.jsonl', () => {
  it('tiap panggilan: tag, peran, model, penyedia, token, finish_reason, prompt, isi, penalaran; rahasia disamarkan', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'mentah-'));
    const jalur = join(folder, 'mentah-panggilan.jsonl');
    const dasar: PanggilTemplat = (_p, _s, i) =>
      Promise.resolve({ ...jawabPalsu(i.jenis === 'tulis-bebas' ? `{"omongan": []} ${KUNCI}` : '{"teks": "x"}', 321), penalaran: i.jenis === 'tulis-bebas' ? `aku menimbang kartu… ${KUNCI}` : null, penyedia: 'Anthropic', finish_reason: 'stop', token_masuk: 111, token_keluar: 222, biaya_usd: 0.05 });
    const p = denganMentah(dasar, new PencatatMentah(jalur, [KUNCI], () => new Date('2026-10-03T00:00:00Z')), 'penyusun/j1/');
    await p([{ role: 'user', content: 'tulis' }], SETELAN_PENULIS_OPUS_V3, info('tulis-bebas', MODEL_OR_OPUS, { omongan: null, peran: 'penulis' }));
    await p([{ role: 'user', content: 'tebak' }], { suhu: 1, maxTokens: 10 }, info('gerbang-tebak-kuat', MODEL_OR_OPUS, { ke: 3 }));
    const mentah = readFileSync(jalur, 'utf8');
    expect(mentah).not.toContain(KUNCI);
    const baris = mentah.trim().split('\n').map((b) => JSON.parse(b) as BarisMentah);
    expect(baris).toHaveLength(2);
    expect(baris[0]).toEqual({
      waktu: '2026-10-03T00:00:00.000Z', tag: 'penyusun/j1/p1/tulis-bebas', peran: 'penulis', jenis: 'tulis-bebas', model: MODEL_OR_OPUS, penyedia: 'Anthropic', token_masuk: 111, token_keluar: 222, token_penalaran: 321,
      finish_reason: 'stop', biaya_usd: 0.05, latensi_ms: expect.any(Number) as number, penalaran_diminta: { effort: 'medium', exclude: false }, max_tokens: 128_000, prompt: [{ role: 'user', content: 'tulis' }], isi: '{"omongan": []} [disamarkan]', penalaran: 'aku menimbang kartu… [disamarkan]', ada_penalaran: true,
    });
    expect(baris[1]).toMatchObject({ tag: 'penyusun/j1/p1/gerbang-tebak-kuat/o1/r3', peran: 'penebak-kuat', penalaran: null, ada_penalaran: false });
  });

  it('tag: tebak rotasi /t<ke>, tebak kuat & kartu /r<ke>, ulangan /u<n>', () => {
    expect(tagV2('a/', info('gerbang-tebak', MODEL_OR_GLM, { putaran: 2, omongan: 3, ke: 17, ulang: 1 }))).toBe('a/p2/gerbang-tebak/o3/t17/u1');
    expect(tagV2('a/', info('gerbang-kartu', MODEL_OR_DEEPSEEK, { ke: 3 }))).toBe('a/p1/gerbang-kartu/o1/r3');
    expect(tagV2('a/', info('kritikus', MODEL_OR_GLM))).toBe('a/p1/kritikus/o1');
  });

  it('pencatat tidak membuat berkas sebelum ada panggilan', () => {
    const folder = mkdtempSync(join(tmpdir(), 'mentah-'));
    new PencatatMentah(join(folder, 'mentah-panggilan.jsonl'), []);
    expect(existsSync(folder) ? readdirSync(folder) : []).toEqual([]);
  });
});

describe('penjaga biaya: perkiraan pra-kirim WAJAR, biaya nyata dari usage.cost', () => {
  const pesan = [{ role: 'user' as const, content: 'x'.repeat(40_000) }];
  const opsi = { model: MODEL_OR_OPUS, pesan, suhu: 1, maxTokens: 128_000 };
  const jawab = (cost: number | null, finish = 'stop', hitung?: { n: number }): typeof fetch =>
    (() => {
      if (hitung !== undefined) hitung.n += 1;
      return Promise.resolve(new Response(JSON.stringify({ provider: 'Anthropic', choices: [{ message: { content: finish === 'length' ? '' : '{}' }, finish_reason: finish }], usage: { prompt_tokens: 9000, completion_tokens: 7000, ...(cost === null ? {} : { cost }) } }), { status: 200 }));
    }) as typeof fetch;

  it('biaya wajar = 2 × median 10 panggilan penulis Opus tersimpan (jejak-agen M2d-13/15) = US$0,37864', () => {
    const b = biayaPenulisOpusTersimpan(AKAR);
    expect(b).toHaveLength(10);
    expect(median(b)).toBeCloseTo(0.18932, 6);
    expect(BIAYA_WAJAR_OPUS_USD).toBeCloseTo(2 * median(b), 6);
    expect(perkiraanWajarV2(MODEL_OR_OPUS)).toBe(BIAYA_WAJAR_OPUS_USD);
    expect(perkiraanWajarV2(MODEL_OR_GLM)).toBeNull();
  });

  it('tanpa perkiraan wajar (perilaku lama): max_tokens 128.000 ditolak pagu US$1 sebelum kirim', async () => {
    const h = { n: 0 };
    const c = new PencatatBiaya({ paguUsd: 1, jalurLedger: null, biayaNyata: true });
    await expect(chatBerpagu({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: jawab(0.2, 'stop', h) }, c, opsi, 'u/1')).rejects.toBeInstanceOf(PaguTercapai);
    expect(h.n).toBe(0);
  });

  it('dengan perkiraan wajar: panggilan dikirim; biaya = usage.cost; perkiraan maksimum teoretis tetap dicatat; pagu ditegakkan sebelum panggilan berikutnya', async () => {
    const h = { n: 0 };
    const c = new PencatatBiaya({ paguUsd: 1, jalurLedger: null, biayaNyata: true, perkiraanWajar: perkiraanWajarV2 });
    const klien = { baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: jawab(0.35, 'stop', h) };
    const a = await chatBerpagu(klien, c, opsi, 'u/1');
    expect(a.biaya_usd).toBe(0.35);
    expect(c.semua()[0]).toMatchObject({ biaya_usd: 0.35, dasar_biaya: 'usage-cost' });
    expect(c.semua()[0]?.perkiraan_maks_usd).toBeGreaterThan(2.5);
    await chatBerpagu(klien, c, opsi, 'u/2'); // 0,35 + 0,37864 ≤ 1
    expect(h.n).toBe(2);
    // 0,70 + 0,37864 > 1 → ditolak SEBELUM kirim
    await expect(chatBerpagu(klien, c, opsi, 'u/3')).rejects.toBeInstanceOf(PaguTercapai);
    expect(h.n).toBe(2);
  });

  it('respons terpotong (finish length, tanpa JSON) tetap dicatat biaya NYATA, bukan perkiraan maksimum', async () => {
    const c = new PencatatBiaya({ paguUsd: 5, jalurLedger: null, biayaNyata: true, perkiraanWajar: perkiraanWajarV2 });
    const a = await chatBerpagu({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: jawab(0.41, 'length') }, c, opsi, 'u/1');
    expect(a.finish_reason).toBe('length');
    expect(c.total()).toBe(0.41);
  });

  it('tanpa respons sama sekali (galat jaringan) → dicatat perkiraan MAKSIMUM teoretis', async () => {
    const c = new PencatatBiaya({ paguUsd: 5, jalurLedger: null, biayaNyata: true, perkiraanWajar: perkiraanWajarV2 });
    const f = (() => Promise.reject(new TypeError('putus'))) as typeof fetch;
    await expect(chatBerpagu({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: f }, c, opsi, 'u/1')).rejects.toThrow(/galat jaringan/);
    expect(c.semua()[0]?.dasar_biaya).toBe('perkiraan-maksimum');
    expect(c.total()).toBeGreaterThan(2.5);
  });

  it('pagu milestone & pagu bagian juga memakai perkiraan wajar, dan tetap menolak sesudah terlampaui', async () => {
    const c = new PencatatBiaya({ paguUsd: 50, jalurLedger: null, biayaNyata: true, perkiraanWajar: perkiraanWajarV2, paguMilestone: { usd: 10, awalanTag: 'm/' }, paguBagian: [{ usd: 0.5, awalanTag: 'm/j1/' }] });
    const klien = { baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: jawab(0.2) };
    await chatBerpagu(klien, c, opsi, 'm/j1/a');
    await expect(chatBerpagu(klien, c, opsi, 'm/j1/b')).rejects.toBeInstanceOf(PaguTercapai); // 0,2 + 0,37864 > 0,5
    await chatBerpagu(klien, c, opsi, 'm/j2/a');
  });
});
