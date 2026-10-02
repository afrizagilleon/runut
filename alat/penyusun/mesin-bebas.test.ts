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
