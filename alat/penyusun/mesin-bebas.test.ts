/** Mesin bebas M2d-13 di pintu penyusun: paket beku, argumen, jalan palsu. */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../../factory/llm/env.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { MesinBebas, mesinBebasPalsu, MODEL_PENULIS, perkiraanBebas, SHA_PAKET_BEKU, shaPaket } from './mesin-bebas.ts';
import { uraiArgumen } from './server.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const sungguhanTanpaJaringan = (): MesinBebas =>
  new MesinBebas({ penulis: 'opus', palsu: false, buatPanggil: () => () => Promise.reject(new Error('tidak boleh memanggil')), siap: () => ({ siap: true, alasan: null }) });

describe('mesin bebas — paket beku (pra-registrasi §3)', () => {
  it('paket TIRT-7 = sha256 pra-registrasi', () => {
    expect(shaPaket(paket)).toBe(SHA_PAKET_BEKU);
    expect(sungguhanTanpaJaringan().cukupPaket(paket).cukup).toBe(true);
  });
  it('paket lain (satu fakta berubah) ditolak sebelum biaya', async () => {
    const lain = { ...paket, fakta: paket.fakta.slice(1) };
    expect(sungguhanTanpaJaringan().cukupPaket(lain).cukup).toBe(false);
    await expect(sungguhanTanpaJaringan().jalankan({ id: 'x-1', paket: lain, folder: mkdtempSync(join(tmpdir(), 'bebas-')), paguJalanUsd: 0.1, lapor: () => undefined, jam: () => new Date() })).rejects.toThrow(/menolak berjalan/);
  });
  it('model penulis hanya tiga model kontrak', () => {
    expect(MODEL_PENULIS).toEqual({ opus: 'anthropic/claude-opus-5.5', haiku: 'anthropic/claude-haiku-4.5', deepseek: 'deepseek/deepseek-v4.1-flash' });
    expect(perkiraanBebas(MODEL_PENULIS.opus).per_panggilan[0]?.model).toBe('anthropic/claude-opus-5.5');
  });
});

describe('argumen pintu', () => {
  it('--mesin bebas butuh --penulis; --penulis hanya untuk bebas', () => {
    expect(uraiArgumen(['--mesin', 'bebas', '--penulis', 'haiku'], 'D:/r/')).toMatchObject({ mesin: 'bebas', penulis: 'haiku' });
    expect(() => uraiArgumen(['--mesin', 'bebas'], 'D:/r/')).toThrow(/--penulis/);
    expect(() => uraiArgumen(['--penulis', 'opus'], 'D:/r/')).toThrow(/--mesin bebas/);
    expect(() => uraiArgumen(['--mesin', 'bebas', '--penulis', 'gpt'], 'D:/r/')).toThrow(/opus/);
  });
});

describe('jalan palsu lewat antarmuka pintu', () => {
  it('hasil mesin memuat riwayat penolakan, versi akhir, jejak', async () => {
    const m = mesinBebasPalsu('deepseek');
    const h = await m.jalankan({ id: 'm2d13-palsu-1', paket, folder: mkdtempSync(join(tmpdir(), 'bebas-')), paguJalanUsd: 1, lapor: () => undefined, jam: () => new Date() });
    expect(h.terbit).toBe(false);
    expect(h.putaran).toBe(3);
    expect(h.draf_terakhir.filter((x) => x !== null)).toHaveLength(3);
    const r = h.riwayat as { riwayat: Array<{ omongan: Array<{ no: number; status: string }> }> };
    expect(r.riwayat[0]?.omongan.map((x) => x.status)).toEqual(['lolos', 'lolos', 'ditolak-kode']);
    expect(h.jejak.dibuat_oleh).toBe('factory/llm/bebas/mesin.ts');
  });
});

describe('M2d-15: --prompt v2 (profil Opus ditingkatkan)', () => {
  it('--prompt v2 hanya untuk --mesin bebas --penulis opus; v1/v2 saja', () => {
    expect(uraiArgumen(['--mesin', 'bebas', '--penulis', 'opus', '--prompt', 'v2'], 'D:/r/')).toMatchObject({ mesin: 'bebas', penulis: 'opus', prompt: 'v2' });
    expect(uraiArgumen(['--mesin', 'bebas', '--penulis', 'opus'], 'D:/r/').prompt).toBeNull();
    expect(() => uraiArgumen(['--mesin', 'bebas', '--penulis', 'haiku', '--prompt', 'v2'], 'D:/r/')).toThrow(/penulis opus/);
    expect(() => uraiArgumen(['--mesin', 'templat', '--prompt', 'v2'], 'D:/r/')).toThrow(/--mesin bebas/);
    expect(() => uraiArgumen(['--mesin', 'bebas', '--penulis', 'opus', '--prompt', 'v3'], 'D:/r/')).toThrow(/v1.*v2/);
  });

  it('profil v2: nama, perkiraan memakai max_tokens 16.000 dan ≤ 2 tulis-ulang pra-periksa', () => {
    const m = mesinBebasPalsu('opus', 'v2');
    expect(m.nama).toBe('bebas-opus-v2-palsu');
    expect(m.keterangan).toMatch(/amandemen T1/);
    const p = m.perkiraan();
    expect(p.per_panggilan[0]?.peran).toMatch(/≤ 2 tulis-ulang pra-periksa/);
    expect(p.per_panggilan[0]?.maks_usd).toBeCloseTo(4 * (12_000 * 4 + 16_000 * 20) / 1e6, 3);
    expect(p.catatan[0]).toMatch(/M2d-15/);
    expect(mesinBebasPalsu('opus').nama).toBe('bebas-opus-palsu');
  });

  it('jalan palsu profil v2: pra-periksa tercatat di riwayat hasil', async () => {
    const h = await mesinBebasPalsu('opus', 'v2').jalankan({ id: 'm2d15-palsu-1', paket, folder: mkdtempSync(join(tmpdir(), 'bebas-')), paguJalanUsd: 1, lapor: () => undefined, jam: () => new Date() });
    const r = h.riwayat as { pra_periksa?: Array<{ versi: number; ke: number }>; sha256_prompt_sistem: string };
    expect(r.pra_periksa?.length).toBeGreaterThan(0);
    expect(h.jejak.dibuat_oleh).toBe('factory/llm/bebas/mesin.ts');
  });
});

describe('M2d-15: jalan selesai untuk npm run opus:jalan', () => {
  it('membaca folder m2d15-opus-<n>, biaya dari ledger (tag penyusun/<id>/), terbit dari hasil.json', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { jalanSelesaiM2d15 } = await import('./jalan-opus.ts');
    const akar = mkdtempSync(join(tmpdir(), 'opus-'));
    expect(jalanSelesaiM2d15(akar)).toEqual([]);
    mkdirSync(join(akar, 'eval', 'penyusun', 'm2d15-opus-1'), { recursive: true });
    writeFileSync(join(akar, 'eval', 'penyusun', 'm2d15-opus-1', 'hasil.json'), JSON.stringify({ terbit: false }));
    mkdirSync(join(akar, '.cache', 'llm'), { recursive: true });
    const e = (tag: string, biaya: number): string => JSON.stringify({ waktu: '2026-10-04T00:00:00Z', model: 'x', tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: biaya, dasar_biaya: 'usage-cost', perkiraan_maks_usd: 1, latensi_ms: 1, galat: null });
    writeFileSync(join(akar, '.cache', 'llm', 'ledger.jsonl'), [e('penyusun/m2d15-opus-1/p1/tulis-bebas', 0.3), e('penyusun/m2d15-opus-1/p1/kritikus/o1', 0.02), e('penyusun/m2d13-opus-1/p1/tulis-bebas', 9)].join('\n'));
    expect(jalanSelesaiM2d15(akar)).toEqual([{ id: 'm2d15-opus-1', biaya_usd: 0.32, terbit: false }]);
  });
});
