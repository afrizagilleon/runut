/**
 * M2d T-02: pagu dolar ditegakkan kode, SEBELUM kirim.
 *
 * Kegagalan yang dijaga (kontrak §0): pagu hanya dicatat dan tidak menolak;
 * biaya dihitung dari harga yang terlalu murah sehingga pagu tak pernah
 * terpicu. `fetch` dipalsukan dan dihitung — penolakan yang sah adalah
 * penolakan yang tidak pernah memanggil `fetch`.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HARGA, biayaUsd } from './harga.ts';
import { MODEL_TANDING } from './model.ts';
import {
  PaguMilestoneTercapai,
  PaguTercapai,
  PencatatBiaya,
  batasAtasTokenMasuk,
  chatBerpagu,
  type EntriLedger,
} from './pagu.ts';

const KUNCI = 'sk-UJI-pagu-0123456789abcdef';

function fetchPalsu(respons: () => Response): { fetch: typeof fetch; hitung: () => number } {
  let n = 0;
  const f = (async () => {
    n += 1;
    return respons();
  }) as typeof fetch;
  return { fetch: f, hitung: () => n };
}

const sukses = (): Response =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: 'x' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1200, completion_tokens: 1500 },
    }),
    { status: 200 },
  );

const OPSI = {
  model: 'zai-org/GLM-5.3',
  pesan: [{ role: 'user' as const, content: 'halo' }],
  suhu: 0.3,
  maxTokens: 2000,
};

describe('pagu 0,01 — panggilan kedua ditolak sebelum fetch', () => {
  it('panggilan pertama lolos; kedua melempar PaguTercapai dan fetch tetap satu kali', async () => {
    const { fetch: f, hitung } = fetchPalsu(sukses);
    const pencatat = new PencatatBiaya({ paguUsd: 0.01, jalurLedger: null });
    const klien = { baseUrl: 'https://llm.contoh.test/v1', apiKey: KUNCI, fetch: f };

    // Perkiraan maksimum: (4+4+16) token masuk × 1,00 + 2000 × 3,00 per juta ≈ US$0,006024.
    const pertama = await chatBerpagu(klien, pencatat, OPSI, 'uji/1');
    expect(hitung()).toBe(1);
    // Biaya nyata dari usage: 1200 × 1,00 + 1500 × 3,00 per juta = US$0,0057.
    expect(pertama.biaya_usd).toBeCloseTo(0.0057, 10);
    expect(pencatat.total()).toBeCloseTo(0.0057, 10);

    await expect(chatBerpagu(klien, pencatat, OPSI, 'uji/2')).rejects.toBeInstanceOf(PaguTercapai);
    expect(hitung()).toBe(1);
    expect(pencatat.semua()).toHaveLength(1);
  });

  it('perkiraan tunggal yang sudah melampaui pagu ditolak bahkan untuk panggilan pertama', async () => {
    const { fetch: f, hitung } = fetchPalsu(sukses);
    const pencatat = new PencatatBiaya({ paguUsd: 0.001, jalurLedger: null });
    await expect(
      chatBerpagu({ baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: f }, pencatat, OPSI, 'uji'),
    ).rejects.toThrow(/Pagu tercapai/);
    expect(hitung()).toBe(0);
  });

  it('coba ulang juga diperiksa: 503 (dicatat perkiraan maksimum) lalu coba ulang ditolak pagu', async () => {
    const { fetch: f, hitung } = fetchPalsu(() => new Response('rusak', { status: 503 }));
    // Perkiraan ≈ 0,006024; pagu 0,01: percobaan 1 lolos, dicatat 0,006024,
    // percobaan 2 akan membuat 0,012048 > 0,01 → ditolak sebelum fetch kedua.
    const pencatat = new PencatatBiaya({ paguUsd: 0.01, jalurLedger: null });
    await expect(
      chatBerpagu(
        { baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: f, tidur: async () => {} },
        pencatat,
        OPSI,
        'uji',
      ),
    ).rejects.toBeInstanceOf(PaguTercapai);
    expect(hitung()).toBe(1);
    const [e] = pencatat.semua();
    expect(e?.dasar_biaya).toBe('perkiraan-maksimum');
    expect(e?.biaya_usd).toBeCloseTo(0.006024, 9);
  });

  it('429 dicatat nol', async () => {
    let n = 0;
    const f = (async () => {
      n += 1;
      return n === 1 ? new Response('sibuk', { status: 429 }) : sukses();
    }) as typeof fetch;
    const pencatat = new PencatatBiaya({ paguUsd: 1, jalurLedger: null });
    await chatBerpagu(
      { baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: f, tidur: async () => {} },
      pencatat,
      OPSI,
      'uji',
    );
    expect(pencatat.semua().map((e) => e.dasar_biaya)).toEqual(['nol-ditolak', 'usage']);
  });

  it('model di luar tabel harga ditolak sebelum fetch', async () => {
    const { fetch: f, hitung } = fetchPalsu(sukses);
    const pencatat = new PencatatBiaya({ paguUsd: 5, jalurLedger: null });
    await expect(
      chatBerpagu(
        { baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: f },
        pencatat,
        { ...OPSI, model: 'openai/gpt-lain' },
        'uji',
      ),
    ).rejects.toThrow(/tidak punya baris harga/);
    expect(hitung()).toBe(0);
  });
});

describe('ledger — akumulasi bertahan antar proses, tanpa rahasia', () => {
  it('pencatat baru membaca ledger lama, jadi pagu berlaku untuk seluruh milestone', async () => {
    const jalur = join(mkdtempSync(join(tmpdir(), 'm2d-pagu-')), 'llm', 'ledger.jsonl');
    const { fetch: f, hitung } = fetchPalsu(sukses);
    const klien = { baseUrl: 'https://x.test/v1', apiKey: KUNCI, fetch: f };
    await chatBerpagu(klien, new PencatatBiaya({ paguUsd: 0.01, jalurLedger: jalur }), OPSI, 'a');
    const baru = new PencatatBiaya({ paguUsd: 0.01, jalurLedger: jalur });
    expect(baru.total()).toBeCloseTo(0.0057, 10);
    await expect(chatBerpagu(klien, baru, OPSI, 'b')).rejects.toBeInstanceOf(PaguTercapai);
    expect(hitung()).toBe(1);

    const isi = readFileSync(jalur, 'utf8');
    expect(isi).not.toContain(KUNCI);
    expect(isi).not.toContain('sk-UJI');
    const entri = JSON.parse(isi.trim()) as EntriLedger;
    expect(Object.keys(entri).sort()).toEqual(
      [
        'biaya_usd',
        'dasar_biaya',
        'galat',
        'latensi_ms',
        'model',
        'perkiraan_maks_usd',
        'percobaan_http',
        'status',
        'tag',
        'token_keluar',
        'token_masuk',
        'waktu',
      ].sort(),
    );
  });

  it('tanpa pagu positif tidak ada pencatat, jadi tidak ada panggilan berbayar', () => {
    expect(() => new PencatatBiaya({ paguUsd: Number.NaN, jalurLedger: null })).toThrow(/Pagu/);
    expect(() => new PencatatBiaya({ paguUsd: 0, jalurLedger: null })).toThrow(/Pagu/);
  });
});

describe('harga — konservatif dan hanya tiga model', () => {
  it('tabel memuat tepat tiga model kontrak', () => {
    expect(Object.keys(HARGA).sort()).toEqual([...MODEL_TANDING].sort());
  });

  it('angka = 2× OpenRouter untuk dua model Flash; GLM-5.3 = 1,00/3,00 (kontrak D-2)', () => {
    expect(HARGA['deepseek-ai/DeepSeek-V4.1-Flash']).toMatchObject({ masuk: 0.196, keluar: 0.392 });
    expect(HARGA['zai-org/GLM-5.3-Flash']).toMatchObject({ masuk: 0.15, keluar: 0.5 });
    expect(HARGA['zai-org/GLM-5.3']).toMatchObject({ masuk: 1, keluar: 3 });
    for (const h of Object.values(HARGA)) expect(h.sumber).toMatch(/2026/);
  });

  it('biayaUsd per juta token', () => {
    expect(biayaUsd({ masuk: 1, keluar: 3, sumber: '' }, 1_000_000, 1_000_000)).toBe(4);
  });

  it('batas atas token masuk ≥ jumlah byte isi (tidak pernah di bawah)', () => {
    const pesan = [
      { role: 'system' as const, content: 'Kamu penulis.' },
      { role: 'user' as const, content: 'Rp1.690 — "Perusahaan U" dibuka lebih rendah.' },
    ];
    const byte = pesan.reduce((a, p) => a + Buffer.byteLength(p.content, 'utf8'), 0);
    expect(batasAtasTokenMasuk(pesan)).toBeGreaterThan(byte);
  });
});

describe('pagu milestone (M2d-3 D-0) — dihitung dari ledger bertag awalan milestone, dicek sebelum kirim', () => {
  const klienDengan = (f: typeof fetch) => ({ baseUrl: 'https://llm.contoh.test/v1', apiKey: KUNCI, fetch: f });

  it('entri milestone lama + perkiraan > pagu milestone → PaguMilestoneTercapai, fetch tidak terjadi; entri tag lain tidak dihitung', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pagu-m-'));
    const jalur = join(dir, 'ledger.jsonl');
    const lama = (tag: string, biaya: number): string =>
      JSON.stringify({ waktu: 'x', model: OPSI.model, tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: biaya, dasar_biaya: 'usage', perkiraan_maks_usd: biaya, latensi_ms: 1, galat: null });
    writeFileSync(jalur, [lama('agen/tirt/p1/susun/o1', 0.9), lama('m2d3/tirt/p1/susun/o1', 0.0055)].join('\n') + '\n');
    const { fetch: f, hitung } = fetchPalsu(sukses);
    // Perkiraan maksimum satu panggilan ≈ US$0,006024; milestone US$0,0055 + 0,006024 > 0,01.
    const pencatat = new PencatatBiaya({ paguUsd: 5, jalurLedger: jalur, paguMilestone: { usd: 0.01, awalanTag: 'm2d3/' } });
    expect(pencatat.total()).toBeCloseTo(0.9055, 10);
    expect(pencatat.totalMilestone()).toBeCloseTo(0.0055, 10);
    const galat = await chatBerpagu(klienDengan(f), pencatat, OPSI, 'm2d3/tirt/p2/kritikus/o1').catch((e: unknown) => e);
    expect(galat).toBeInstanceOf(PaguMilestoneTercapai);
    expect(galat).toBeInstanceOf(PaguTercapai);
    expect((galat as Error).message).toContain('Pagu milestone tercapai');
    expect(hitung()).toBe(0);
    // Tanpa entri milestone lama, panggilan yang sama lolos: entri 'agen/…' (US$0,9) tidak ikut dihitung.
    const bersih = new PencatatBiaya({ paguUsd: 5, jalurLedger: null, paguMilestone: { usd: 0.01, awalanTag: 'm2d3/' } });
    await chatBerpagu(klienDengan(f), bersih, OPSI, 'm2d3/tirt/p1/kritikus/o1');
    expect(hitung()).toBe(1);
    expect(bersih.totalMilestone()).toBeCloseTo(0.0057, 10);
  });

  it('panggilan bertag di luar awalan milestone ditolak sebelum fetch (tidak ada panggilan yang lolos dari hitungan)', async () => {
    const { fetch: f, hitung } = fetchPalsu(sukses);
    const pencatat = new PencatatBiaya({ paguUsd: 5, jalurLedger: null, paguMilestone: { usd: 2, awalanTag: 'm2d3/' } });
    await expect(chatBerpagu(klienDengan(f), pencatat, OPSI, 'agen/tirt/p1/susun/o1')).rejects.toThrow('di luar awalan milestone');
    expect(hitung()).toBe(0);
  });

  it('pagu kumulatif tetap berlaku di dalam pagu milestone', async () => {
    const { fetch: f, hitung } = fetchPalsu(sukses);
    const pencatat = new PencatatBiaya({ paguUsd: 0.001, jalurLedger: null, paguMilestone: { usd: 2, awalanTag: 'm2d3/' } });
    const galat = await chatBerpagu(klienDengan(f), pencatat, OPSI, 'm2d3/x').catch((e: unknown) => e);
    expect(galat).toBeInstanceOf(PaguTercapai);
    expect(galat).not.toBeInstanceOf(PaguMilestoneTercapai);
    expect(hitung()).toBe(0);
  });
});
