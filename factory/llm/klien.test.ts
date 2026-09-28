/**
 * M2d T-01: klien OpenAI-compatible.
 *
 * Tidak ada jaringan di sini: `fetch` dipalsukan. Kunci palsu `sk-UJI-…` dipakai
 * supaya tes bisa membuktikan bahwa ia tidak pernah muncul di pesan galat,
 * bahkan ketika server dengan sengaja memantulkan header ke badan responsnya.
 */
import { describe, expect, it } from 'vitest';
import { GalatLlm, chat, daftarModel, samarkan, type CatatanPercobaan } from './klien.ts';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bacaKonfigLlm, konfigDari, uraiEnv } from './env.ts';

const KUNCI = 'sk-UJI-a1b2c3d4e5f6g7h8i9j0-RAHASIA';
const BASE = 'https://llm.contoh.test/v1';

interface Panggilan {
  url: string;
  init: RequestInit | undefined;
}

function responsJson(badan: unknown, status = 200): Response {
  return new Response(JSON.stringify(badan), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const SUKSES = {
  model: 'zai-org/GLM-5.3',
  choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1200, completion_tokens: 340 },
};

function palsu(urutan: Array<(p: Panggilan) => Response | Promise<Response>>): {
  fetch: typeof fetch;
  panggilan: Panggilan[];
} {
  const panggilan: Panggilan[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const p = { url: String(url), init };
    panggilan.push(p);
    const langkah = urutan[Math.min(panggilan.length - 1, urutan.length - 1)];
    if (langkah === undefined) throw new Error('tidak ada langkah');
    return langkah(p);
  }) as typeof fetch;
  return { fetch: f, panggilan };
}

const OPSI = {
  model: 'zai-org/GLM-5.3',
  pesan: [{ role: 'user' as const, content: 'halo' }],
  suhu: 0.3,
  maxTokens: 100,
};

const tanpaTidur = async (): Promise<void> => {};

describe('chat — bentuk permintaan dan respons', () => {
  it('mengirim POST ke /chat/completions dengan format OpenAI dan membaca usage', async () => {
    const { fetch: f, panggilan } = palsu([() => responsJson(SUKSES)]);
    const hasil = await chat({ baseUrl: `${BASE}/`, apiKey: KUNCI, fetch: f }, OPSI);
    expect(panggilan).toHaveLength(1);
    expect(panggilan[0]?.url).toBe(`${BASE}/chat/completions`);
    expect(panggilan[0]?.init?.method).toBe('POST');
    const badan = JSON.parse(String(panggilan[0]?.init?.body)) as Record<string, unknown>;
    expect(badan).toEqual({
      model: 'zai-org/GLM-5.3',
      messages: [{ role: 'user', content: 'halo' }],
      temperature: 0.3,
      max_tokens: 100,
      stream: false,
    });
    expect(hasil.teks).toBe('{"ok":true}');
    expect(hasil.token_masuk).toBe(1200);
    expect(hasil.token_keluar).toBe(340);
    expect(hasil.finish_reason).toBe('stop');
    expect(hasil.percobaan_http).toBe(1);
  });

  it('tambahanBadan (M2d-2) ikut terkirim, tetapi tidak bisa menimpa model, pesan, suhu, max_tokens, atau stream', async () => {
    const { fetch: f, panggilan } = palsu([() => responsJson(SUKSES)]);
    await chat(
      { baseUrl: BASE, apiKey: KUNCI, fetch: f },
      {
        ...OPSI,
        tambahanBadan: {
          chat_template_kwargs: { thinking: false },
          model: 'model-lain',
          max_tokens: 999_999,
          stream: true,
          temperature: 2,
          messages: [],
        },
      },
    );
    const badan = JSON.parse(String(panggilan[0]?.init?.body)) as Record<string, unknown>;
    expect(badan).toEqual({
      chat_template_kwargs: { thinking: false },
      model: 'zai-org/GLM-5.3',
      messages: [{ role: 'user', content: 'halo' }],
      temperature: 0.3,
      max_tokens: 100,
      stream: false,
    });
  });
});

describe('chat — coba ulang (D-1: 2 kali, hanya 429/5xx)', () => {
  it('429 lalu 503 lalu sukses: tiga percobaan, dua jeda', async () => {
    const jeda: number[] = [];
    const { fetch: f, panggilan } = palsu([
      () => new Response('sibuk', { status: 429 }),
      () => new Response('rusak', { status: 503 }),
      () => responsJson(SUKSES),
    ]);
    const hasil = await chat(
      {
        baseUrl: BASE,
        apiKey: KUNCI,
        fetch: f,
        tidur: async (ms) => {
          jeda.push(ms);
        },
      },
      OPSI,
    );
    expect(panggilan).toHaveLength(3);
    expect(jeda).toEqual([2000, 6000]);
    expect(hasil.percobaan_http).toBe(3);
  });

  it('tiga kali 500: berhenti sesudah dua coba ulang dan melempar', async () => {
    const { fetch: f, panggilan } = palsu([() => new Response('rusak', { status: 500 })]);
    await expect(
      chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f, tidur: tanpaTidur }, OPSI),
    ).rejects.toThrow(/HTTP 500/);
    expect(panggilan).toHaveLength(3);
  });

  it('400 tidak diulang', async () => {
    const { fetch: f, panggilan } = palsu([() => new Response('buruk', { status: 400 })]);
    await expect(
      chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f, tidur: tanpaTidur }, OPSI),
    ).rejects.toBeInstanceOf(GalatLlm);
    expect(panggilan).toHaveLength(1);
  });

  it('batas waktu tidak diulang (permintaan mungkin sudah ditagih)', async () => {
    const { fetch: f, panggilan } = palsu([
      () => {
        const g = new Error('waktu habis');
        g.name = 'TimeoutError';
        throw g;
      },
    ]);
    const catatan: CatatanPercobaan[] = [];
    await expect(
      chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f, tidur: tanpaTidur }, OPSI, {
        sesudahPercobaan: (c) => catatan.push(c),
      }),
    ).rejects.toThrow(/batas waktu/);
    expect(panggilan).toHaveLength(1);
    expect(catatan[0]?.mungkin_ditagih).toBe(true);
  });

  it('kait sebelumKirim dipanggil sebelum SETIAP fetch, termasuk coba ulang', async () => {
    const jejak: string[] = [];
    const { fetch: f } = palsu([
      () => {
        jejak.push('fetch');
        return new Response('sibuk', { status: 429 });
      },
      () => {
        jejak.push('fetch');
        return responsJson(SUKSES);
      },
    ]);
    await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f, tidur: tanpaTidur }, OPSI, {
      sebelumKirim: (n) => jejak.push(`cek${String(n)}`),
    });
    expect(jejak).toEqual(['cek1', 'fetch', 'cek2', 'fetch']);
  });

  it('kait sebelumKirim yang melempar membatalkan panggilan tanpa fetch', async () => {
    const { fetch: f, panggilan } = palsu([() => responsJson(SUKSES)]);
    await expect(
      chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f }, OPSI, {
        sebelumKirim: () => {
          throw new Error('ditolak');
        },
      }),
    ).rejects.toThrow('ditolak');
    expect(panggilan).toHaveLength(0);
  });
});

describe('rahasia — kunci tidak pernah muncul di galat atau catatan', () => {
  it('server yang memantulkan header dan kunci ke badan galat: pesan tersamar', async () => {
    const pantul = (p: Panggilan): Response => {
      const h = new Headers(p.init?.headers);
      return new Response(
        `invalid key ${KUNCI}; headers=${JSON.stringify(Object.fromEntries(h.entries()))}`,
        { status: 401 },
      );
    };
    const { fetch: f } = palsu([pantul]);
    const catatan: CatatanPercobaan[] = [];
    let pesan = '';
    let tumpukan = '';
    try {
      await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f }, OPSI, {
        sesudahPercobaan: (c) => catatan.push(c),
      });
    } catch (galat) {
      pesan = galat instanceof Error ? galat.message : String(galat);
      tumpukan = galat instanceof Error ? String(galat.stack) : '';
    }
    expect(pesan).toMatch(/HTTP 401/);
    expect(pesan).not.toContain(KUNCI);
    expect(pesan).not.toContain('sk-UJI');
    expect(tumpukan).not.toContain(KUNCI);
    expect(JSON.stringify(catatan)).not.toContain(KUNCI);
    expect(JSON.stringify(catatan)).not.toContain('sk-UJI');
  });

  it('galat jaringan yang pesannya memuat kunci: tidak ikut disalin', async () => {
    const { fetch: f } = palsu([
      () => {
        throw new TypeError(`fetch failed for Bearer ${KUNCI}`);
      },
    ]);
    const galat = await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f }, OPSI).catch(
      (g: unknown) => g,
    );
    expect(galat).toBeInstanceOf(GalatLlm);
    expect(String((galat as Error).message)).not.toContain(KUNCI);
  });

  it('GET /models yang gagal juga tersamar', async () => {
    const { fetch: f } = palsu([() => new Response(`bad ${KUNCI}`, { status: 403 })]);
    const galat = await daftarModel({ baseUrl: BASE, apiKey: KUNCI, fetch: f }).catch(
      (g: unknown) => g,
    );
    expect(String((galat as Error).message)).toMatch(/HTTP 403/);
    expect(String((galat as Error).message)).not.toContain(KUNCI);
  });

  it('samarkan menyapu pola kunci umum walau bukan kunci yang diketahui', () => {
    expect(samarkan('x sk-LAIN-1234567890 y Bearer abc.def-ghi', [])).toBe(
      'x [disamarkan] y Bearer [disamarkan]',
    );
  });

  it('pesan galat konfigurasi hanya menyebut nama variabel, tidak nilainya', () => {
    const env = uraiEnv(`LLM_BASE_URL=http://tidak-aman\nLLM_API_KEY="${KUNCI}"\nLLM_MODEL=m\nLLM_PAGU_USD=5\n`);
    let pesan = '';
    try {
      konfigDari(env);
    } catch (g) {
      pesan = g instanceof Error ? g.message : '';
    }
    expect(pesan).toMatch(/LLM_BASE_URL/);
    expect(pesan).not.toContain('tidak-aman');
    expect(pesan).not.toContain(KUNCI);
    const hilang = (() => {
      try {
        konfigDari({ LLM_API_KEY: KUNCI });
        return '';
      } catch (g) {
        return g instanceof Error ? g.message : '';
      }
    })();
    expect(hilang).toContain('LLM_BASE_URL');
    expect(hilang).not.toContain(KUNCI);
  });
});

describe('bacaKonfigLlm — .env menang, lingkungan proses hanya mengisi yang kosong', () => {
  it('LLM_PAGU_USD yang tidak ada di .env diambil dari proses; yang ada di .env tidak ditimpa', () => {
    const folder = mkdtempSync(join(tmpdir(), 'm2d-env-')) + '/';
    writeFileSync(
      `${folder}.env`,
      `LLM_BASE_URL=https://llm.contoh.test/v1/
LLM_API_KEY=${KUNCI}
LLM_MODEL=zai-org/GLM-5.3
`,
    );
    const k = bacaKonfigLlm(folder, {
      proses: { LLM_PAGU_USD: '5', LLM_MODEL: 'lain/tidak-dipakai' },
    });
    expect(k.paguUsd).toBe(5);
    expect(k.model).toBe('zai-org/GLM-5.3');
    expect(k.baseUrl).toBe('https://llm.contoh.test/v1');
    expect(() => bacaKonfigLlm(folder, { proses: {} })).toThrow(/LLM_PAGU_USD/);
    expect(bacaKonfigLlm(folder, { proses: {}, perluPagu: false }).apiKey).toBe(KUNCI);
  });
});

describe('batas waktu saat membaca badan respons', () => {
  it('menjadi GalatLlm dan TETAP dicatat (mungkin ditagih), tanpa coba ulang', async () => {
    let n = 0;
    const f = (async () => {
      n += 1;
      const r = new Response('x', { status: 200 });
      Object.defineProperty(r, 'text', {
        value: async () => {
          const g = new Error('The operation was aborted due to timeout');
          g.name = 'TimeoutError';
          throw g;
        },
      });
      return r;
    }) as typeof fetch;
    const catatan: CatatanPercobaan[] = [];
    const g = await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f, tidur: async () => {} }, OPSI, {
      sesudahPercobaan: (c) => catatan.push(c),
    }).catch((x: unknown) => x);
    expect(g).toBeInstanceOf(GalatLlm);
    expect(String((g as Error).message)).toMatch(/saat membaca respons: batas waktu/);
    expect(n).toBe(1);
    expect(catatan).toHaveLength(1);
    expect(catatan[0]).toMatchObject({ status: 200, token_masuk: null, mungkin_ditagih: true });
  });
});

describe('HTTP 200 tanpa choices', () => {
  it('menjadi GalatLlm tersamar, dicatat mungkin ditagih', async () => {
    const { fetch: f } = palsu([() => responsJson({ error: { message: `sibuk ${KUNCI}` } })]);
    const catatan: CatatanPercobaan[] = [];
    const g = await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: f }, OPSI, {
      sesudahPercobaan: (c) => catatan.push(c),
    }).catch((x: unknown) => x);
    expect(g).toBeInstanceOf(GalatLlm);
    expect(String((g as Error).message)).toMatch(/HTTP 200 tanpa choices — .*sibuk/);
    expect(String((g as Error).message)).not.toContain(KUNCI);
    expect(catatan[0]?.mungkin_ditagih).toBe(true);
  });
});

describe('daftarModel', () => {
  it('membaca data[].id dari GET /models', async () => {
    const { fetch: f, panggilan } = palsu([
      () => responsJson({ data: [{ id: 'a/b' }, { id: 'c/d', context_length: 8192 }] }),
    ]);
    const daftar = await daftarModel({ baseUrl: BASE, apiKey: KUNCI, fetch: f });
    expect(panggilan[0]?.init?.method).toBe('GET');
    expect(panggilan[0]?.url).toBe(`${BASE}/models`);
    expect(daftar.map((m) => m.id)).toEqual(['a/b', 'c/d']);
  });
});
