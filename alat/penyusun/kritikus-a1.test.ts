/**
 * M2d-10 Amandemen A-1: kritikus dikunci ke Wafer (`order` + `allow_fallbacks:
 * false`); tak tersedia → ulang terbatas lalu jalan BERHENTI, tidak dialihkan.
 * Setelan mesin = S1 + pembaca kartu "dicatat".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaguTercapai } from '../../factory/llm/pagu.ts';
import { DEFINISI_PAKET, bangunPaket } from '../../factory/llm/paket.ts';
import { jalankanTemplat } from '../../factory/llm/templat/mesin.ts';
import { kritikusTerkunci, pagarKritikusTerkunci, PenyediaTidakTersedia } from '../../factory/llm/templat/penyedia.ts';
import { SETELAN_TEMPLAT_A1 } from '../../factory/llm/templat/setelan.ts';
import { akarSementara } from './bantu-uji.ts';
import { panggilSungguhan } from './mesin.ts';
import { KRITIKUS_TERKUNCI_A1, mesinTemplatSungguhan } from './mesin-templat.ts';
import { uraiArgumenJalan } from './jalan-templat.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

const jawab = (penyedia: string): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content: '{"keberatan":[]}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.0001, completion_tokens_details: { reasoning_tokens: 2000 } }, provider: penyedia }), { status: 200, headers: { 'content-type': 'application/json' } });

describe('pagar kritikus A-1', () => {
  it('hanya Wafer, tanpa fallback, tanpa ignore; batas harga & kuantisasi tetap', () => {
    const p = pagarKritikusTerkunci('z-ai/glm-5.3', ['Wafer']);
    expect(p['order']).toEqual(['wafer']);
    expect(p['allow_fallbacks']).toBe(false);
    expect(p['ignore']).toBeUndefined();
    expect(p['max_price']).toEqual({ prompt: 1.4, completion: 4.4 });
    expect(() => pagarKritikusTerkunci('deepseek/deepseek-v4.1-flash')).toThrow();
  });

  it('permintaan kritikus membawa pagar terkunci; panggilan GLM lain tidak', async () => {
    const badan: Array<Record<string, unknown>> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u, init) => {
      badan.push(JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);
      return jawab('Wafer');
    });
    const p = panggilSungguhan(akarSementara(), 1.2, () => undefined, KRITIKUS_TERKUNCI_A1)('penyusun/j/', 0.5);
    await p([{ role: 'user', content: 'x' }], { suhu: 0, maxTokens: 100 }, { jenis: 'kritikus', putaran: 1, omongan: 1, ke: 1, model: 'z-ai/glm-5.3' });
    await p([{ role: 'user', content: 'x' }], { suhu: 0, maxTokens: 100 }, { jenis: 'gerbang-tebak', putaran: 1, omongan: 1, ke: 3, model: 'z-ai/glm-5.3' });
    expect((badan[0]?.['provider'] as Record<string, unknown>)['allow_fallbacks']).toBe(false);
    expect((badan[0]?.['provider'] as Record<string, unknown>)['order']).toEqual(['wafer']);
    expect((badan[1]?.['provider'] as Record<string, unknown>)['allow_fallbacks']).toBe(true);
  });

  it('kritikus dilayani penyedia lain → PenyediaTidakTersedia (berhenti)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jawab('SiliconFlow'));
    const p = panggilSungguhan(akarSementara(), 1.2, () => undefined, KRITIKUS_TERKUNCI_A1)('penyusun/j/', 0.5);
    await expect(p([{ role: 'user', content: 'x' }], { suhu: 0, maxTokens: 100 }, { jenis: 'kritikus', putaran: 1, omongan: 1, ke: 1, model: 'z-ai/glm-5.3' })).rejects.toBeInstanceOf(PenyediaTidakTersedia);
  });
});

describe('ulang terbatas lalu berhenti', () => {
  it('galat dua kali lalu berhasil → jawaban; galat tiga kali → PenyediaTidakTersedia; pagu diteruskan', async () => {
    let n = 0;
    const tidur = vi.fn(async () => undefined);
    const ok = kritikusTerkunci(async () => {
      n += 1;
      if (n < 3) throw new Error('HTTP 503 no endpoints');
      return { penyedia: 'Wafer' };
    }, { tidur });
    await expect(ok()).resolves.toEqual({ penyedia: 'Wafer' });
    expect(tidur).toHaveBeenCalledTimes(2);
    const gagal = kritikusTerkunci(async () => {
      throw new Error('HTTP 404 no endpoints found');
    }, { tidur });
    await expect(gagal()).rejects.toBeInstanceOf(PenyediaTidakTersedia);
    const pagu = kritikusTerkunci(async () => {
      throw new PaguTercapai(1, 1, 1, 'x');
    }, { tidur });
    await expect(pagu()).rejects.toThrow(/Pagu tercapai/);
  });

  it('mesin berhenti dengan alasan "penyedia tidak tersedia", bukan beralih', async () => {
    const h = await jalankanTemplat({
      paket: bangunPaket(DEFINISI_PAKET.tirt), setelan: SETELAN_TEMPLAT_A1, panggil: async () => {
        throw new PenyediaTidakTersedia('kritikus: penyedia Wafer tidak tersedia', 'z-ai/glm-5.3');
      },
    });
    expect(h.berhenti).toMatch(/^penyedia tidak tersedia/);
  });
});

describe('setelan & argumen A-1', () => {
  it('mesin templat sungguhan memakai S1 + pembaca kartu dicatat', () => {
    const m = mesinTemplatSungguhan(() => async () => { throw new Error('tidak dipanggil'); }, () => ({ siap: true, alasan: null }));
    expect(m.setelan).toEqual({ penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 60 }, kartu: 'dicatat', kritikus: { jenis: ['kunci', 'makna', 'aturan'], dicatat: false } });
  });
  it('--id m2d10-… dan --pagu', () => {
    expect(uraiArgumenJalan(['--id', 'm2d10-tirt-a1', '--pagu', '0.45'])).toEqual({ id: 'm2d10-tirt-a1', pagu: 0.45 });
    expect(() => uraiArgumenJalan(['--id', 'lain'])).toThrow();
  });
});
