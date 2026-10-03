/** M2d-19: kebutuhan tingkat simulasi terlihat oleh agen; draf "Keliru" tidak dibayar bila yang kurang hanya "Betul". */
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bacaBank, shaPaketBank } from '../bebas/bank.ts';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';
import { buatAlat, kebutuhanSimulasi, keluargaSudut, kunciBetul } from './alat.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d17-uji-2/paket.json`, 'utf8')) as PaketFakta;
const sha = shaPaketBank(paket);
const mentah = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d18-uji-sdk-2/omongan-akhir.json`, 'utf8')) as { omongan: unknown[] }).omongan[0] as Record<string, unknown>;
const ID_TIGA_KELIRU = ['1a5abd0216e457e5', 'adf573a6e895ac7a', '4615245eb6fd12e7'];

/** Salinan tiga omongan bank sungguhan (4 Okt: ketiganya berjawaban "Keliru") ke folder sementara. */
function bankTigaKeliru(): string {
  const f = mkdtempSync(join(tmpdir(), 'bank-butuh-'));
  for (const id of ID_TIGA_KELIRU) cpSync(`${AKAR}eval/bank-omongan/${sha}/${id}.json`, `${f}/${sha}/${id}.json`, { recursive: true });
  return f;
}

function nilaiLolos() {
  const dipanggil: OmonganBebas[] = [];
  const f = ((o: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: (n: NilaiOmonganV3) => void): Promise<NilaiOmonganV3> => {
    dipanggil.push(o);
    const n: NilaiOmonganV3 = { putaran, urut, omongan: o, berhenti: 'lolos', alasan: [], dicatat: [], saringan: null, kartu_rotasi: null, penebak_kuat: null, kritik: null, biaya_gerbang_usd: 0.05, id_bank: null };
    catat(n);
    return Promise.resolve(n);
  }) as never;
  return { f, dipanggil };
}

describe('kebutuhan simulasi', () => {
  it('kunciBetul dan keluargaSudut', () => {
    const o = uraiOmonganBebas(structuredClone(mentah)).omongan as OmonganBebas;
    expect(kunciBetul(o)).toBe(false);
    expect(kunciBetul({ ...o, kunci: 'a' })).toBe(true);
    expect(keluargaSudut(['volume-2025-12-09'])).toBe('volume');
    expect(keluargaSudut([])).toBe('');
  });
  it('bank sungguhan 4 Okt (tiga "Keliru", dua sudut volume): tidak terakit, butuh "Betul", sudut volume disebut', () => {
    const b = bacaBank(bankTigaKeliru(), sha);
    expect(b).toHaveLength(3);
    const k = kebutuhanSimulasi(b, paket, 3);
    expect(k.terakit).toBe(false);
    expect(k.butuh_betul).toBe(true);
    expect(k.kebutuhan.join(' ')).toMatch(/BETUL/);
    expect(k.kebutuhan.join(' ')).toMatch(/Sudut "volume" sudah dipakai 2 omongan/);
  });
  it('bank kosong: yang dibutuhkan hanya jumlah sudut', () => {
    const k = kebutuhanSimulasi([], paket, 3);
    expect(k).toMatchObject({ terakit: false, butuh_betul: false });
    expect(k.kebutuhan).toEqual(['Bank baru memuat 0 dari 3 kartu penentu berbeda.']);
  });
  it('lihat_bank menyampaikan kebutuhan dan jawaban tiap omongan; selesai() = bisa dirakit, bukan jumlah sudut', () => {
    const alat = buatAlat({ paket, folderBank: bankTigaKeliru(), idJalan: 'tes', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')) });
    const l = alat.lihatBank();
    expect(l.jumlah_sudut).toBe(3);
    expect(l.omongan.map((x) => x.jawaban)).toEqual(['Keliru', 'Keliru', 'Keliru']);
    expect(l.kebutuhan_simulasi.join(' ')).toMatch(/BETUL/);
    expect(alat.selesai()).toBe(false);
  });
  it('ajukan: draf "Keliru" saat yang kurang hanya "Betul" → ditolak TANPA gerbang berbayar', async () => {
    const n = nilaiLolos();
    const alat = buatAlat({ paket, folderBank: bankTigaKeliru(), idJalan: 'tes', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai: n.f });
    const h = await alat.ajukan(mentah);
    expect(h).toMatchObject({ lolos: false, berhenti: 'kebutuhan', biaya_pengajuan_usd: 0 });
    expect(h.penolakan.join(' ')).toMatch(/BETUL/);
    expect(n.dipanggil).toHaveLength(0);
  });
  it('bank belum penuh: draf "Keliru" tetap boleh diajukan', async () => {
    const n = nilaiLolos();
    const alat = buatAlat({ paket, folderBank: mkdtempSync(join(tmpdir(), 'bank-butuh-')), idJalan: 'tes', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai: n.f });
    expect((await alat.ajukan(mentah)).lolos).toBe(true);
    expect(n.dipanggil).toHaveLength(1);
  });
});
