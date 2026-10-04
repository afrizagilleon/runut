/** M2d-27: `tingkatkan` 1–3 versi berdampingan, draf siap (mode hemat), false alarm G-angka-cukup, nama tool baru. */
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bacaBank, shaPaketBank, type EntriBank } from '../bebas/bank.ts';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import { gAngkaCukup } from '../gerbang-g.ts';
import type { PaketFakta } from '../paket.ts';
import { buatAlat, CADANGAN_AJUKAN_USD, peningkatanDari } from './alat.ts';
import { instruksiAgen, instruksiTingkatkan } from './prompt.ts';

const alii = JSON.parse(readFileSync(`${AKAR}eval/penyusun/paket-alii-2025-11-10/paket.json`, 'utf8')) as PaketFakta;
const sha = shaPaketBank(alii);
type Catat = (n: NilaiOmonganV3) => void;
const pas = (kunci: number, n: number) => ({ putusan: { kunci, n }, jawaban: [] }) as unknown as NilaiOmonganV3['pasangan'];
const kuat = (kunci: number) => ({ putusan: { kunci, n: 4, putusan: 'lulus', alasan: 'x' }, jawaban: [] }) as unknown as NilaiOmonganV3['penebak_kuat'];
const asalAlii = (): EntriBank[] => bacaBank(`${AKAR}eval/bank-omongan`, sha).filter((e) => peningkatanDari(e) === null);

function alatAlii(o: { pagu?: number } = {}) {
  const folderBank = mkdtempSync(join(tmpdir(), 'bank-m2d27-'));
  cpSync(`${AKAR}eval/bank-omongan/${sha}`, join(folderBank, sha), { recursive: true });
  const urutan: string[] = [];
  const nilai = (async (om: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: Catat): Promise<NilaiOmonganV3> => {
    urutan.push(`mulai-${String(putaran)}`);
    await new Promise((r) => setTimeout(r, 20));
    urutan.push(`selesai-${String(putaran)}`);
    const n = { putaran, urut, omongan: om, berhenti: 'lolos', alasan: [], dicatat: [], saringan: null, kartu_rotasi: null, pasangan: pas(1, 12), penebak_kuat: kuat(0), kritik: null, biaya_gerbang_usd: 0.05, id_bank: null } as NilaiOmonganV3;
    catat(n);
    return n;
  }) as never;
  const alat = buatAlat({ paket: alii, folderBank, idJalan: 'tes-naik', paguUsd: o.pagu ?? 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai });
  return { alat, folderBank, urutan };
}

describe('tingkatkan 1–3 versi sekaligus', () => {
  it('tiga versi diuji berdampingan; ketiganya tersimpan di samping versi asal dengan nama teman yang sama', async () => {
    const { alat, folderBank, urutan } = alatAlii();
    const asal = asalAlii();
    const versi = asal.map((e, i) => ({ id_asal: e.id, id_draf: alat.periksaKode({ ...e.omongan, jam: `17.0${String(i + 1)}` }).id_draf as string }));
    expect(versi.every((v) => typeof v.id_draf === 'string')).toBe(true);
    const h = await alat.tingkatkanBanyak(versi);
    expect(urutan.slice(0, 3).every((x) => x.startsWith('mulai-'))).toBe(true);
    expect(h.hasil.map((x) => x.lolos)).toEqual([true, true, true]);
    expect(h).toMatchObject({ jumlah_naik: 3, semua_naik: true });
    const naik = bacaBank(folderBank, sha).filter((e) => peningkatanDari(e) !== null);
    expect(naik).toHaveLength(3);
    for (const e of naik) expect(e.omongan.nama).toBe(asal.find((a) => a.id === peningkatanDari(e))?.omongan.nama);
    expect(alat.semuaNaik()).toBe(true);
  });
  it('anggaran hanya cukup untuk satu versi → sisanya TIDAK dijalankan dan diberi tahu; id_asal tak dikenal tidak memakan anggaran', async () => {
    const { alat, urutan } = alatAlii({ pagu: CADANGAN_AJUKAN_USD + 0.01 });
    const asal = asalAlii();
    const d = (e: EntriBank, jam: string): string => alat.periksaKode({ ...e.omongan, jam }).id_draf as string;
    const h = await alat.tingkatkanBanyak([
      { id_asal: 'tidak-ada', id_draf: d(asal[0] as EntriBank, '17.09') },
      { id_asal: (asal[0] as EntriBank).id, id_draf: d(asal[0] as EntriBank, '17.01') },
      { id_asal: (asal[1] as EntriBank).id, id_draf: d(asal[1] as EntriBank, '17.02') },
    ]);
    expect(h.hasil.map((x) => x.berhenti)).toEqual(['bentuk', 'lolos', 'anggaran']);
    expect(urutan.filter((x) => x.startsWith('mulai-'))).toHaveLength(1);
  });
});

describe('draf siap (dipakai mode hemat pelari)', () => {
  it('draf lolos-aturan yang belum dikirim = siap; sesudah dikirim tidak lagi', async () => {
    const { alat } = alatAlii();
    const a = asalAlii()[0] as EntriBank;
    expect(alat.adaDrafSiap()).toBe(false);
    const id = alat.periksaKode({ ...a.omongan, jam: '17.05' }).id_draf as string;
    expect(alat.adaDrafSiap()).toBe(true);
    await alat.tingkatkanBanyak([{ id_asal: a.id, id_draf: id }]);
    expect(alat.adaDrafSiap()).toBe(false);
  });
});

describe('G-angka-cukup: selisih rupiah harus persis', () => {
  it('draf Rara m2d26-amag-1 ("naik 5 hari", kunci Rp392, pilihan lain Rp398) tidak lagi ditolak: 398 − 5 = 393, bukan 392', () => {
    const baris = readFileSync(`${AKAR}eval/penyusun/m2d26-amag-1/mentah-agen.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { ke: number; respons: { choices: Array<{ message: { tool_calls: Array<{ function: { arguments: string } }> } }> } });
    const l6 = baris.find((b) => b.ke === 6);
    const draf = (JSON.parse(l6?.respons.choices[0]?.message.tool_calls[0]?.function.arguments ?? '{}') as { draf: unknown[] }).draf;
    const rara = draf.map((d) => uraiOmonganBebas(d).omongan).find((o) => o !== null && /naik 5 hari/.test(o.pesan));
    expect(rara).toBeDefined();
    expect(gAngkaCukup(rara as never)).toMatchObject({ tolak: false, bukti: [] });
  });
});

describe('nama tool', () => {
  it('petunjuk memakai `periksa_draft_dengan_aturan`, bukan `periksa_kode`', () => {
    for (const p of [instruksiAgen(3, 5), instruksiAgen(3, 5, 'biasa', true), instruksiTingkatkan()]) {
      expect(p).toMatch(/`periksa_draft_dengan_aturan`/);
      expect(p).not.toMatch(/periksa_kode/);
    }
    expect(instruksiTingkatkan()).toMatch(/ajukan bersama-sama dalam satu `tingkatkan`/);
  });
});
