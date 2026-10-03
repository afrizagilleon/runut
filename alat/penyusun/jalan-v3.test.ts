/**
 * M2d-16 D-4 (e): `npm run penyusun:v3` — `--uji-satu-panggilan` menjalankan
 * TEPAT satu panggilan penulis lalu berhenti; jalan penuh mesin v3 dengan
 * model palsu. Tidak ada jaringan dan tidak ada panggilan berbayar di tes ini.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shaPaketBank } from '../../factory/llm/bebas/bank.ts';
import type { HasilV3 } from '../../factory/llm/bebas/mesin-v3.ts';
import { keluaranV3, panggilV3Palsu, tigaOmonganTirt7 } from '../../factory/llm/bebas/palsu-v3.ts';
import { pesanV3 } from '../../factory/llm/bebas/prompt-v3.ts';
import { AKAR } from '../../factory/llm/env.ts';
import { MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { SETELAN_PENULIS_OPUS_V3, type BarisMentah } from '../../factory/llm/pemanggil-v2.ts';
import { akarSementara, KUNCI_LLM_PALSU } from './bantu-uji.ts';
import { barisUji, ujiSatuPanggilan, uraiArgumenV3, utamaV3, type RingkasUji } from './jalan-v3.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

const tirt = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const sementara = (): string => mkdtempSync(join(tmpdir(), 'jalan-v3-')).replace(/\\/g, '/');
const jam = (): Date => new Date('2026-10-03T00:00:00Z');
const baris = (jalur: string): BarisMentah[] => readFileSync(jalur, 'utf8').trim().split('\n').map((b) => JSON.parse(b) as BarisMentah);

describe('argumen', () => {
  it('bawaan: paket TIRT-7, bukan uji, bukan palsu', () => {
    expect(uraiArgumenV3(['--id', 'm2d17-opus-1', '--pagu', '1.5', '--setuju-berbayar'])).toMatchObject({ id: 'm2d17-opus-1', paguUsd: 1.5, palsu: false, ujiSatuPanggilan: false, setujuBerbayar: true, paket: 'eval/penyusun/m2d11-tirt-7/paket.json' });
    expect(uraiArgumenV3(['--uji-satu-panggilan', '--palsu']).ujiSatuPanggilan).toBe(true);
  });
  it('argumen tak dikenal, id tak wajar, pagu bukan angka positif → galat', () => {
    expect(() => uraiArgumenV3(['--apa'])).toThrow(/tidak dikenal/);
    expect(() => uraiArgumenV3(['--id', '../x'])).toThrow(/--id/);
    expect(() => uraiArgumenV3(['--pagu', '0'])).toThrow(/--pagu/);
  });
});

describe('--uji-satu-panggilan (inti, pemanggil palsu)', () => {
  it('TEPAT satu panggilan penulis (prompt v3, profil Opus v3), lalu berhenti — tanpa gerbang, tanpa bank', async () => {
    const f = sementara();
    const p = panggilV3Palsu({ penulis: () => ({ teks: keluaranV3(tigaOmonganTirt7()), penalaran: 'aku menimbang tiga kartu penentu' }) });
    const setelan: unknown[] = [];
    const r = await ujiSatuPanggilan({ paket: tirt, panggil: (pesan, s, i) => { setelan.push(s); return p.panggil(pesan, s, i); }, folderBank: `${f}/bank` });
    expect(p.log).toHaveLength(1);
    expect(p.log[0]).toEqual({ jenis: 'tulis-bebas', putaran: 1, omongan: null, ke: 1, peran: 'penulis', model: MODEL_OR_OPUS });
    expect(p.pesanPenulis[0]).toEqual(pesanV3(tirt, 3, []));
    expect(setelan).toEqual([SETELAN_PENULIS_OPUS_V3]);
    expect(existsSync(`${f}/bank`)).toBe(false);
    expect(r).toMatchObject({
      model: MODEL_OR_OPUS, penyedia: 'Anthropic', token_masuk: 3000, token_keluar: 9000, token_penalaran: 4000, biaya_usd: 0.19, finish_reason: 'stop',
      ada_teks_berpikir: true, karakter_teks_berpikir: 'aku menimbang tiga kartu penentu'.length, diminta: 3, omongan_terbaca: 3, max_tokens: 128_000, penalaran_diminta: { effort: 'medium', exclude: false },
    });
    expect(r.kode.map((k) => k.menolak)).toEqual([0, 0, 0]);
  });

  it('yang dicetak: token masuk/keluar/penalaran, penyedia, biaya, dan ADA/TIDAK ADA teks berpikir', async () => {
    const f = sementara();
    const ada = barisUji(await ujiSatuPanggilan({ paket: tirt, panggil: panggilV3Palsu({ penulis: () => ({ teks: keluaranV3(tigaOmonganTirt7()), penalaran: 'pikir' }) }).panggil, folderBank: `${f}/bank` })).join('\n');
    expect(ada).toMatch(/token masuk 3\.000 \| keluar 9\.000 \| penalaran 4\.000/);
    expect(ada).toMatch(/penyedia: Anthropic/);
    expect(ada).toMatch(/biaya nyata: US\$0,190000/);
    expect(ada).toMatch(/teks berpikir: ADA \(5 karakter\)/);
    const tidak = barisUji(await ujiSatuPanggilan({ paket: tirt, panggil: panggilV3Palsu({ penulis: () => ({ teks: '', finish_reason: 'length', penalaran: null }) }).panggil, folderBank: `${f}/bank` })).join('\n');
    expect(tidak).toMatch(/teks berpikir: TIDAK ADA/);
    expect(tidak).toMatch(/finish_reason: length/);
    expect(tidak).toMatch(/omongan terbaca: 0 dari 3/);
  });
});

describe('utamaV3 --palsu', () => {
  it('--uji-satu-panggilan --palsu: folder jalan memuat uji-satu-panggilan.json + mentah-panggilan.jsonl (1 baris, dengan teks berpikir); tidak ada hasil.json, tidak ada bank', async () => {
    const f = sementara();
    const log: string[] = [];
    const kode = await utamaV3(['--uji-satu-panggilan', '--palsu', '--id', 'uji-a', '--keluaran', f], { akar: AKAR, log: (b) => log.push(b), jam });
    expect(kode).toBe(0);
    expect(readdirSync(`${f}/uji-a`).sort()).toEqual(['mentah-panggilan.jsonl', 'paket.json', 'uji-satu-panggilan.json']);
    const m = baris(`${f}/uji-a/mentah-panggilan.jsonl`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ tag: 'penyusun/uji-a/p1/tulis-bebas', peran: 'penulis', ada_penalaran: true, max_tokens: 128_000 });
    expect(m[0]?.isi).toContain('"omongan"');
    expect(m[0]?.prompt).toEqual(pesanV3(tirt, 3, []));
    const r = JSON.parse(readFileSync(`${f}/uji-a/uji-satu-panggilan.json`, 'utf8')) as RingkasUji & { palsu: boolean };
    expect(r).toMatchObject({ palsu: true, omongan_terbaca: 3, ada_teks_berpikir: true });
    expect(log.join('\n')).toMatch(/MODEL PALSU/);
    expect(log.join('\n')).toMatch(/teks berpikir: ADA/);
  });

  it('jalan penuh --palsu: hasil.json terbit, mentah 1 + 3 × 31 baris, bank PALSU di folder jalan (bukan eval/bank-omongan)', async () => {
    const f = sementara();
    // Bank sungguhan boleh berisi (sejak M2d-18); yang dijaga: jalan palsu tidak menambah apa pun ke sana.
    const bankSebelum = readdirSync(`${AKAR}eval/bank-omongan`, { recursive: true }).map(String).sort();
    const kode = await utamaV3(['--palsu', '--id', 'uji-b', '--keluaran', f], { akar: AKAR, log: () => undefined, jam });
    expect(kode).toBe(0);
    const h = JSON.parse(readFileSync(`${f}/uji-b/hasil.json`, 'utf8')) as HasilV3 & { palsu: boolean };
    expect(h).toMatchObject({ palsu: true, terbit: true, id_jalan: 'uji-b' });
    expect(baris(`${f}/uji-b/mentah-panggilan.jsonl`)).toHaveLength(1 + 3 * 31);
    const folderPalsu = `${f}/uji-b/bank-palsu/${shaPaketBank(tirt)}`;
    expect(readdirSync(folderPalsu)).toHaveLength(3);
    for (const b of readdirSync(folderPalsu)) expect((JSON.parse(readFileSync(`${folderPalsu}/${b}`, 'utf8')) as { asal: { penulis: string } }).asal.penulis).toBe('PALSU (tanpa model)');
    expect(readdirSync(`${AKAR}eval/bank-omongan`, { recursive: true }).map(String).sort()).toEqual(bankSebelum);
  });

  it('folder jalan yang sudah ada tidak pernah ditimpa; mode palsu menolak bank sungguhan', async () => {
    const f = sementara();
    await utamaV3(['--uji-satu-panggilan', '--palsu', '--id', 'uji-c', '--keluaran', f], { akar: AKAR, log: () => undefined, jam });
    await expect(utamaV3(['--uji-satu-panggilan', '--palsu', '--id', 'uji-c', '--keluaran', f], { akar: AKAR, log: () => undefined, jam })).rejects.toThrow(/sudah ada/);
    await expect(utamaV3(['--palsu', '--id', 'uji-d', '--keluaran', f, '--bank', `${AKAR}eval/bank-omongan`], { akar: AKAR, log: () => undefined, jam })).rejects.toThrow(/bank sungguhan/);
  });
});

describe('utamaV3 sungguhan: pengaman sebelum uang keluar', () => {
  it('tanpa --setuju-berbayar, tanpa --pagu, atau tanpa --id → ditolak TANPA fetch dan tanpa folder', async () => {
    const fetchMata = vi.spyOn(globalThis, 'fetch');
    const f = sementara();
    const akar = akarSementara();
    await expect(utamaV3(['--uji-satu-panggilan', '--id', 'x1', '--pagu', '1', '--keluaran', f], { akar, log: () => undefined, jam })).rejects.toThrow(/--setuju-berbayar/);
    await expect(utamaV3(['--uji-satu-panggilan', '--id', 'x1', '--setuju-berbayar', '--keluaran', f], { akar, log: () => undefined, jam })).rejects.toThrow(/--pagu/);
    await expect(utamaV3(['--uji-satu-panggilan', '--pagu', '1', '--setuju-berbayar', '--keluaran', f], { akar, log: () => undefined, jam })).rejects.toThrow(/--id/);
    expect(fetchMata).not.toHaveBeenCalled();
    expect(readdirSync(f)).toEqual([]);
  });

  it('--uji-satu-panggilan sungguhan (fetch palsu, akar sementara): SATU permintaan HTTP ke penyedia anthropic, mentah + ringkasan tersimpan, kunci tidak tertulis', async () => {
    const badan: Array<Record<string, unknown>> = [];
    const fetchMata = vi.spyOn(globalThis, 'fetch').mockImplementation((_u, init) => {
      badan.push(JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);
      return Promise.resolve(new Response(JSON.stringify({ provider: 'Anthropic', choices: [{ message: { content: keluaranV3(tigaOmonganTirt7()), reasoning: 'ringkasan berpikir sungguhan' }, finish_reason: 'stop' }], usage: { prompt_tokens: 2900, completion_tokens: 8100, cost: 0.1736, completion_tokens_details: { reasoning_tokens: 3900 } } }), { status: 200 }));
    });
    const f = sementara();
    const akar = akarSementara();
    const log: string[] = [];
    const kode = await utamaV3(['--uji-satu-panggilan', '--id', 'x2', '--pagu', '0.5', '--setuju-berbayar', '--keluaran', f, '--paket', `${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`], { akar, log: (b) => log.push(b), jam });
    expect(kode).toBe(0);
    expect(fetchMata).toHaveBeenCalledTimes(1);
    expect(badan[0]).toMatchObject({ model: MODEL_OR_OPUS, max_tokens: 128_000, reasoning: { effort: 'medium', exclude: false }, provider: { order: ['anthropic'], allow_fallbacks: false } });
    expect(badan[0]).not.toHaveProperty('temperature');
    expect((badan[0]?.['messages'] as unknown[]).length).toBe(1);
    const r = JSON.parse(readFileSync(`${f}/x2/uji-satu-panggilan.json`, 'utf8')) as RingkasUji & { palsu: boolean };
    expect(r).toMatchObject({ palsu: false, penyedia: 'Anthropic', token_masuk: 2900, token_keluar: 8100, token_penalaran: 3900, biaya_usd: 0.1736, ada_teks_berpikir: true, omongan_terbaca: 3 });
    expect(baris(`${f}/x2/mentah-panggilan.jsonl`)[0]).toMatchObject({ penalaran: 'ringkasan berpikir sungguhan', penyedia: 'Anthropic' });
    const ledger = readFileSync(join(akar, '.cache', 'llm', 'ledger.jsonl'), 'utf8').trim().split('\n');
    expect(ledger).toHaveLength(1);
    expect(JSON.parse(ledger[0] as string)).toMatchObject({ tag: 'penyusun/x2/p1/tulis-bebas', biaya_usd: 0.1736, dasar_biaya: 'usage-cost', penyedia: 'Anthropic' });
    for (const berkas of readdirSync(`${f}/x2`)) expect(readFileSync(`${f}/x2/${berkas}`, 'utf8')).not.toContain(KUNCI_LLM_PALSU);
    expect(log.join('\n')).not.toContain(KUNCI_LLM_PALSU);
  });
});
