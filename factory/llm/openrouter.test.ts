/**
 * M2d-5 T-01: klien OpenRouter — pagar penyedia di badan permintaan, biaya
 * nyata (`usage.cost`) di ledger, pagu yang menegakkan biaya nyata + perkiraan
 * batas atas sebelum kirim.
 *
 * Kegagalan yang dijaga (kontrak M2d-5 §0): pagu memakai tabel tebakan, bukan
 * biaya nyata; perkiraan sebelum-kirim lebih rendah dari harga penyedia
 * termahal yang mungkin dipilih. Tanpa jaringan: `fetch` dipalsukan.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { HARGA } from './harga.ts';
import { chat } from './klien.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { KUANTISASI_BOLEH, KUANTISASI_DITOLAK, lolosPagar, pagarPenyedia, periksaKunci, type EndpointModel } from './openrouter.ts';
import { PaguMilestoneTercapai, PencatatBiaya, SaldoPenyediaHabis, batasAtasTokenMasuk, chatBerpagu, galatSaldo } from './pagu.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { AWALAN_TAG_M2D5, KONFIG_M2D5, PAGU_MILESTONE_M2D5, argumenTirt } from './tirt-susun.ts';

const KUNCI = 'sk-or-v1-UJI0123456789abcdefRAHASIA';
const BASE = 'https://openrouter.ai/api/v1';

interface Tangkap {
  badan: Record<string, unknown>[];
  n: () => number;
}

function palsu(respons: () => Response): { fetch: typeof fetch } & Tangkap {
  const badan: Record<string, unknown>[] = [];
  const f = (async (_url: string | URL | Request, init?: RequestInit) => {
    badan.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return respons();
  }) as typeof fetch;
  return { fetch: f, badan, n: () => badan.length };
}

const jawab = (usage: Record<string, unknown>, provider: string | null = 'DeepInfra', finish = 'stop', isi = '{"ok":true}'): (() => Response) => () =>
  new Response(
    JSON.stringify({ ...(provider === null ? {} : { provider }), model: MODEL_OR_DEEPSEEK, choices: [{ message: { content: isi }, finish_reason: finish }], usage }),
    { status: 200 },
  );

const OPSI = { model: MODEL_OR_DEEPSEEK, pesan: [{ role: 'user' as const, content: 'halo' }], suhu: 0.3, maxTokens: 2000 };

describe('pagar penyedia (D-1) — objek provider di SETIAP badan permintaan', () => {
  it('bentuk pagar: kuantisasi fp8 ke atas + unknown, max_price = harga daftar standar, require_parameters, data_collection deny, fallback, tanpa sort', () => {
    for (const model of [MODEL_OR_DEEPSEEK, MODEL_OR_GLM]) {
      const p = pagarPenyedia(model);
      expect(p).toEqual({
        quantizations: ['fp8', 'mxfp8', 'fp16', 'bf16', 'fp32', 'unknown'],
        max_price: { prompt: HARGA[model].masuk, completion: HARGA[model].keluar },
        require_parameters: true,
        data_collection: 'deny',
        allow_fallbacks: true,
      });
      expect(p).not.toHaveProperty('sort');
      for (const q of KUANTISASI_DITOLAK) expect(p.quantizations).not.toContain(q);
    }
    expect(pagarPenyedia(MODEL_OR_DEEPSEEK).max_price).toEqual({ prompt: 0.3, completion: 1.2 });
    expect(pagarPenyedia(MODEL_OR_GLM).max_price).toEqual({ prompt: 1.4, completion: 4.4 });
  });

  it('model lain, model Featherless, dan sufiks :floor/:nitro ditolak sebelum permintaan dibangun', () => {
    expect(() => pagarPenyedia('deepseek/deepseek-v4.1-flash:floor')).toThrow(/sufiks/);
    expect(() => pagarPenyedia('z-ai/glm-5.3:nitro')).toThrow(/sufiks/);
    expect(() => pagarPenyedia('deepseek-ai/DeepSeek-V4.1-Flash')).toThrow(/bukan model OpenRouter/);
    expect(() => pagarPenyedia('openai/gpt-lain')).toThrow(/bukan model OpenRouter/);
  });

  it('klien memasang provider di badan; tambahanBadan tidak bisa menimpa atau menghapusnya', async () => {
    const t = palsu(jawab({ prompt_tokens: 10, completion_tokens: 5, cost: 0.00001 }));
    await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: pagarPenyedia }, {
      ...OPSI,
      tambahanBadan: { provider: { sort: 'price', quantizations: ['fp4'] }, reasoning: { max_tokens: 100 } },
    });
    expect(t.badan[0]?.['provider']).toEqual(pagarPenyedia(MODEL_OR_DEEPSEEK));
    expect(t.badan[0]?.['reasoning']).toEqual({ max_tokens: 100 });
    expect(t.badan[0]?.['model']).toBe(MODEL_OR_DEEPSEEK);
  });

  it('KONFIG_M2D5 memasang pagar dan base URL OpenRouter; hanya dua model; pagu milestone US$4,00 ditetapkan; hanya TIRT', () => {
    expect(KONFIG_M2D5.openRouter?.baseUrl).toBe(BASE);
    expect(KONFIG_M2D5.openRouter?.pagar(MODEL_OR_GLM)).toEqual(pagarPenyedia(MODEL_OR_GLM));
    expect([...KONFIG_M2D5.izinModel].sort()).toEqual([MODEL_OR_DEEPSEEK, MODEL_OR_GLM].sort());
    expect(KONFIG_M2D5.awalanTag).toBe(AWALAN_TAG_M2D5);
    expect(KONFIG_M2D5.urutan).toEqual(['tirt']);
    expect(PAGU_MILESTONE_M2D5).toBe(4);
    expect(argumenTirt([])).toEqual(['tirt', '--pagu-milestone', '4.00']);
    expect(argumenTirt(['--pagu-milestone', '5'])).toMatch(/ditetapkan US\$4\.00/);
    expect(argumenTirt(['ultj'])).toMatch(/hanya menjalankan TIRT/);
  });
});

describe('biaya nyata (D-2) — ledger mencatat usage.cost, bukan token × tabel', () => {
  it('biaya = usage.cost; penyedia dan token penalaran dicatat; perkiraan sebelum-kirim tetap tercatat', async () => {
    const t = palsu(jawab({ prompt_tokens: 1200, completion_tokens: 1500, cost: 0.00123, completion_tokens_details: { reasoning_tokens: 900 } }, 'Parasail'));
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
    const h = await chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: pagarPenyedia }, p, OPSI, 'm2d5/uji');
    expect(h.biaya_usd).toBe(0.00123);
    expect(h.penyedia).toBe('Parasail');
    const e = p.semua()[0];
    expect(e).toMatchObject({ biaya_usd: 0.00123, dasar_biaya: 'usage-cost', penyedia: 'Parasail', token_penalaran: 900, tanpa_cost: false });
    // Tabel akan memberi 1200 × 0,30 + 1500 × 1,20 per juta = 0,00216 — bukan itu yang dicatat.
    expect(e?.biaya_usd).not.toBeCloseTo(0.00216, 6);
    expect(e?.perkiraan_maks_usd).toBeCloseTo((batasAtasTokenMasuk(OPSI.pesan) * 0.3 + 2000 * 1.2) / 1e6, 12);
  });

  it('respons tanpa usage.cost: dicatat PERKIRAAN MAKSIMUM (bukan nol, bukan tabel) dan ditandai tanpa_cost', async () => {
    const t = palsu(jawab({ prompt_tokens: 1200, completion_tokens: 1500 }, null));
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
    await chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: pagarPenyedia }, p, OPSI, 'm2d5/uji');
    const e = p.semua()[0];
    expect(e?.dasar_biaya).toBe('perkiraan-maksimum');
    expect(e?.tanpa_cost).toBe(true);
    expect(e?.biaya_usd).toBeCloseTo(e?.perkiraan_maks_usd ?? 0, 12);
    expect(e?.biaya_usd).toBeGreaterThan(0);
    expect(e?.penyedia).toBeNull();
  });

  it('jawaban kosong karena penalaran habis (finish length, isi kosong) tetap dibayar penuh menurut usage.cost', async () => {
    const t = palsu(jawab({ prompt_tokens: 900, completion_tokens: 2000, cost: 0.0026 }, 'DeepInfra', 'length', ''));
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
    const h = await chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: pagarPenyedia }, p, OPSI, 'm2d5/uji');
    expect(h.teks).toBe('');
    expect(h.finish_reason).toBe('length');
    expect(p.total()).toBe(0.0026);
  });
});

describe('pagu biaya-nyata — jumlah biaya nyata + perkiraan panggilan berikutnya ≤ pagu, dicek sebelum kirim', () => {
  it('biaya nyata menumpuk; panggilan yang perkiraannya melampaui sisa pagu milestone tidak dikirim', async () => {
    const t = palsu(jawab({ prompt_tokens: 1000, completion_tokens: 1000, cost: 0.002 }));
    const klien = { baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: pagarPenyedia };
    // perkiraan maks satu panggilan ≈ (21 × 0,30 + 2000 × 1,20) / 1e6 ≈ 0,0024063
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true, paguMilestone: { usd: 0.0045, awalanTag: 'm2d5/' } });
    await chatBerpagu(klien, p, OPSI, 'm2d5/a');
    expect(p.totalMilestone()).toBe(0.002);
    // 0,002 + 0,0024063 = 0,0044063 ≤ 0,0045 → dikirim
    await chatBerpagu(klien, p, OPSI, 'm2d5/b');
    expect(p.totalMilestone()).toBe(0.004);
    // 0,004 + 0,0024063 > 0,0045 → ditolak, fetch tidak terjadi
    await expect(chatBerpagu(klien, p, OPSI, 'm2d5/c')).rejects.toBeInstanceOf(PaguMilestoneTercapai);
    expect(t.n()).toBe(2);
  });

  it('perkiraan sebelum kirim ≥ biaya penyedia TERMAHAL yang lolos pagar (lampiran endpoints 29 Sep)', () => {
    const teks = readFileSync(`${AKAR}.contracts/lampiran/M-02d5/openrouter-endpoints-29sep.txt`, 'utf8');
    let model = '';
    let dicek = 0;
    for (const baris of teks.split(/\r?\n/)) {
      const kepala = /^== (\S+)/.exec(baris);
      if (kepala !== null) {
        model = kepala[1] ?? '';
        continue;
      }
      const m = /q=(\S+) \| in=([\d.]+) \| out=([\d.]+)/.exec(baris);
      if (m === null || (model !== MODEL_OR_DEEPSEEK && model !== MODEL_OR_GLM)) continue;
      const e: EndpointModel = {
        provider_name: baris.split('|')[0]?.trim() ?? '', tag: null, quantization: m[1] ?? null,
        prompt_per_juta: Number(m[2]), completion_per_juta: Number(m[3]), supported_parameters: ['reasoning'], max_completion_tokens: null,
      };
      if (!lolosPagar(e, pagarPenyedia(model), ['reasoning'])) continue;
      dicek += 1;
      const pesan = [{ role: 'user' as const, content: 'x'.repeat(5000) }];
      const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
      const perkiraan = p.perkiraan(model, pesan, 32_768);
      const nyataTerburuk = (5000 * (e.prompt_per_juta ?? 0) + 32_768 * (e.completion_per_juta ?? 0)) / 1e6;
      expect(perkiraan).toBeGreaterThanOrEqual(nyataTerburuk - 1e-12);
    }
    expect(dicek).toBeGreaterThan(20);
  });

  it('kuantisasi fp4/nvfp4 dan penyedia di atas max_price tidak lolos pagar (mis. fireworks/us, mistral/nvfp4)', () => {
    const e = (q: string, i: number, o: number): EndpointModel => ({
      provider_name: 'x', tag: null, quantization: q, prompt_per_juta: i, completion_per_juta: o, supported_parameters: ['reasoning'], max_completion_tokens: null,
    });
    expect(lolosPagar(e('fp4', 0.08, 0.4), pagarPenyedia(MODEL_OR_DEEPSEEK), [])).toBe(false);
    expect(lolosPagar(e('nvfp4', 1.4, 4.4), pagarPenyedia(MODEL_OR_GLM), [])).toBe(false);
    expect(lolosPagar(e('unknown', 0.45, 1.8), pagarPenyedia(MODEL_OR_DEEPSEEK), [])).toBe(false);
    expect(lolosPagar(e('fp8', 0.3, 1.2), pagarPenyedia(MODEL_OR_DEEPSEEK), ['reasoning'])).toBe(true);
    expect(lolosPagar(e('fp8', 0.3, 1.2), pagarPenyedia(MODEL_OR_DEEPSEEK), ['reasoning', 'x'])).toBe(false);
    expect(KUANTISASI_BOLEH).not.toContain('fp4');
  });

  it('model Featherless tidak punya baris harga lagi: panggilannya ditolak sebelum fetch', async () => {
    const t = palsu(jawab({ prompt_tokens: 1, completion_tokens: 1, cost: 0 }));
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
    await expect(chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch }, p, { ...OPSI, model: 'zai-org/GLM-5.3' }, 'm2d5/x')).rejects.toThrow(/tidak punya baris harga/);
    expect(t.n()).toBe(0);
  });

  it('saldo/limit habis (HTTP 402) → SaldoPenyediaHabis: lingkar berhenti, dicatat nol', async () => {
    const t = palsu(() => new Response(JSON.stringify({ error: { code: 402, message: 'Insufficient credits' } }), { status: 402 }));
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
    const galat = await chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: pagarPenyedia }, p, OPSI, 'm2d5/x').catch((e: unknown) => e);
    expect(ubahGalatSaldo(galat, MODEL_OR_DEEPSEEK)).toBeInstanceOf(SaldoPenyediaHabis);
    expect(galatSaldo(402, '')).toBe(true);
    expect(p.semua()[0]).toMatchObject({ biaya_usd: 0, dasar_biaya: 'nol-ditolak' });
    expect(t.n()).toBe(1);
  });
});

describe('pemeriksaan kunci (D-0) — GET /key, hanya angka', () => {
  it('mengembalikan status dan angka batas/pemakaian; label dan kunci tidak ikut', async () => {
    const f = (async () =>
      new Response(JSON.stringify({ data: { label: 'sk-or-v1-abc…LABEL', limit: 8, limit_remaining: 7.5, usage: 0.5, usage_daily: 0.1, is_free_tier: false } }), { status: 200 })) as typeof fetch;
    const info = await periksaKunci({ baseUrl: BASE, apiKey: KUNCI, fetch: f });
    expect(info).toEqual({ status: 200, limit: 8, limit_remaining: 7.5, usage: 0.5, usage_daily: 0.1, is_free_tier: false });
    expect(JSON.stringify(info)).not.toContain('LABEL');
  });

  it('kunci ditolak (401) → galat tersamar, kunci tidak muncul', async () => {
    const f = (async () => new Response(`kunci ${KUNCI} tidak sah`, { status: 401 })) as typeof fetch;
    const galat = await periksaKunci({ baseUrl: BASE, apiKey: KUNCI, fetch: f }).catch((e: unknown) => e as Error);
    expect(galat).toBeInstanceOf(Error);
    expect((galat as Error).message).toContain('401');
    expect((galat as Error).message).not.toContain(KUNCI);
  });
});
