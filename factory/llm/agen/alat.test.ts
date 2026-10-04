import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bacaBank, shaPaketBank } from '../bebas/bank.ts';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { periksaKodeV3 } from '../bebas/prompt-v3.ts';
import { uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { buatAlat, CADANGAN_AJUKAN_USD, type PeristiwaAlat } from './alat.ts';
import { pasangNama, PEMERAN, PEMERAN_LAKI, PEMERAN_PEREMPUAN, periksaKodeAgen } from './pemeran.ts';
import { instruksiAgen } from './prompt.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d17-uji-2/paket.json`, 'utf8')) as PaketFakta;
const mentah = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d18-uji-sdk-2/omongan-akhir.json`, 'utf8')) as { omongan: unknown[] }).omongan[0] as Record<string, unknown>;
const om = (): OmonganBebas => uraiOmonganBebas(structuredClone(mentah)).omongan as OmonganBebas;
const panggilTakDipakai = (): never => {
  throw new Error('gerbang berbayar tidak boleh dipanggil di tes ini');
};

type Catat = (n: NilaiOmonganV3) => void;
const kosong = (o: OmonganBebas, putaran: number, urut: number, berhenti: NilaiOmonganV3['berhenti'], biaya: number, alasan: string[]): NilaiOmonganV3 => ({ putaran, urut, omongan: o, berhenti, alasan, dicatat: [], saringan: null, kartu_rotasi: null, penebak_kuat: null, kritik: null, biaya_gerbang_usd: biaya, id_bank: null });

function nilaiPalsu(berhenti: NilaiOmonganV3['berhenti'], biaya: number, alasan: string[] = []) {
  const dipanggil: OmonganBebas[] = [];
  const f = (o: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: Catat): Promise<NilaiOmonganV3> => {
    dipanggil.push(o);
    const n = kosong(o, putaran, urut, berhenti, biaya, alasan);
    catat(n);
    return Promise.resolve(n);
  };
  return { f: f as never, dipanggil };
}

function siapkan(o: { pagu?: number; nilai?: never; biayaAgen?: () => number } = {}) {
  const folderBank = mkdtempSync(join(tmpdir(), 'bank-agen-'));
  const peristiwa: PeristiwaAlat[] = [];
  const alat = buatAlat({ paket, folderBank, idJalan: 'tes', panggil: panggilTakDipakai, paguUsd: o.pagu ?? 2, biayaAgen: o.biayaAgen ?? (() => 0), labelPenulis: 'tes', catat: (p) => peristiwa.push(p), ...(o.nilai === undefined ? {} : { nilai: o.nilai }) });
  return { alat, folderBank, peristiwa };
}

describe('pemeran tetap (keputusan pemilik 3 Okt)', () => {
  it('tiga perempuan + tiga laki-laki, berselang', () => {
    expect(PEMERAN_PEREMPUAN).toHaveLength(3);
    expect(PEMERAN_LAKI).toHaveLength(3);
    expect(PEMERAN).toEqual(['Rara', 'Bayu', 'Nadia', 'Dimas', 'Zahra', 'Rio']);
  });
  it('nama di luar daftar diganti pemeran pertama yang belum dipakai; nama pemeran yang bebas dipertahankan', () => {
    expect(pasangNama({ ...om(), nama: 'Wulan' }, []).nama).toBe('Rara');
    expect(pasangNama({ ...om(), nama: 'Wulan' }, ['Rara', 'bayu']).nama).toBe('Nadia');
    expect(pasangNama({ ...om(), nama: 'Dimas' }, ['Rara']).nama).toBe('Dimas');
    expect(pasangNama({ ...om(), nama: 'Dimas' }, ['Dimas']).nama).toBe('Rara');
  });
  it('gerbang kode jalur agen tidak pernah menolak karena nama; penolakan lain tetap', () => {
    const bayu = { ...om(), nama: 'Bayu' };
    expect(periksaKodeV3(bayu, paket).menolak.some((m) => /NAMA_TERLARANG/.test(`${m.sumber} ${m.alasan}`))).toBe(true);
    expect(periksaKodeAgen(bayu, paket).menolak).toEqual([]);
    const rusak = { ...bayu, penjelasan: 'Tanpa rujukan dan tanpa penutup.' };
    expect(periksaKodeAgen(rusak, paket).menolak.length).toBeGreaterThan(0);
  });
});

describe('alat agen', () => {
  it('lihat_fakta memuat kartu paket; lihat_bank kosong melaporkan target dan sisa anggaran', () => {
    const { alat } = siapkan({ pagu: 1.5, biayaAgen: () => 0.25 });
    expect(alat.lihatFakta().kartu).toContain('susp-2025-12-10');
    expect(alat.lihatBank()).toMatchObject({ omongan: [], jumlah_sudut: 0, target: 3, sisa_anggaran_usd: 1.25 });
  });
  it('periksa_kode: draf lolos walau namanya di luar daftar; draf rusak ditolak apa adanya', () => {
    const { alat } = siapkan();
    expect(alat.periksaKode(mentah)).toMatchObject({ lolos: true, penolakan: [] });
    expect(alat.periksaKode({ ...mentah, pilihan: { a: 'x' } }).lolos).toBe(false);
  });
  it('ajukan: belum lolos kode → gerbang berbayar TIDAK dijalankan', async () => {
    const n = nilaiPalsu('lolos', 0.2);
    const { alat } = siapkan({ nilai: n.f });
    const h = await alat.ajukan({ ...mentah, penjelasan: 'Tanpa rujukan.' });
    expect(h).toMatchObject({ lolos: false, berhenti: 'kode', biaya_pengajuan_usd: 0 });
    expect(n.dipanggil).toHaveLength(0);
  });
  it('ajukan: lolos → masuk bank dengan nama pemeran, biaya dihitung, sisa anggaran turun', async () => {
    const n = nilaiPalsu('lolos', 0.2);
    const { alat, folderBank } = siapkan({ pagu: 1, nilai: n.f });
    const h = await alat.ajukan(mentah);
    expect(h).toMatchObject({ lolos: true, berhenti: 'lolos', biaya_pengajuan_usd: 0.2, sisa_anggaran_usd: 0.8, bank: { jumlah_sudut: 1, target: 3 } });
    const b = bacaBank(folderBank, shaPaketBank(paket));
    expect(b).toHaveLength(1);
    expect(b[0]?.omongan.nama).toBe('Rara');
    expect(n.dipanggil[0]?.nama).toBe('Rara');
    expect(alat.selesai()).toBe(false);
  });
  it('ajukan: ditolak gerbang → alasan apa adanya, tidak masuk bank; draf yang sama tidak dibayar dua kali', async () => {
    const n = nilaiPalsu('penebak-kuat', 0.1, ['penebak kuat memilih kunci 4 dari 4 rotasi']);
    const { alat, folderBank } = siapkan({ pagu: 1, nilai: n.f });
    const h = await alat.ajukan(mentah);
    expect(h).toMatchObject({ lolos: false, berhenti: 'penebak-kuat', penolakan: ['penebak kuat memilih kunci 4 dari 4 rotasi'] });
    expect(bacaBank(folderBank, shaPaketBank(paket))).toHaveLength(0);
    const h2 = await alat.ajukan(mentah);
    expect(h2).toMatchObject({ berhenti: 'sudah-diajukan', biaya_pengajuan_usd: 0 });
    expect(n.dipanggil).toHaveLength(1);
  });
  it('ajukan: sisa anggaran di bawah cadangan → ditolak tanpa biaya; anggaranHabis() benar', async () => {
    const n = nilaiPalsu('lolos', 0.2);
    const { alat } = siapkan({ pagu: CADANGAN_AJUKAN_USD - 0.01, nilai: n.f });
    expect(alat.anggaranHabis()).toBe(true);
    expect(await alat.ajukan(mentah)).toMatchObject({ lolos: false, berhenti: 'anggaran' });
    expect(n.dipanggil).toHaveLength(0);
  });
  it('ajukan: pagu tercapai di tengah gerbang → "anggaran", biaya yang sudah terjadi tetap dihitung', async () => {
    const f = ((o: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: Catat): Promise<NilaiOmonganV3> => {
      catat(kosong(o, putaran, urut, 'kartu', 0.07, []));
      return Promise.reject(new PaguTercapai(1, 1, 1, 'x'));
    }) as never;
    const { alat } = siapkan({ pagu: 1, nilai: f });
    expect(await alat.ajukan(mentah)).toMatchObject({ lolos: false, berhenti: 'anggaran', biaya_pengajuan_usd: 0.07 });
    expect(alat.keadaan().biaya_gerbang_usd).toBe(0.07);
  });
  it('dua pengajuan serentak dijalankan berurutan; tiap panggilan alat tercatat', async () => {
    const urutan: string[] = [];
    const f = (async (o: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: Catat): Promise<NilaiOmonganV3> => {
      urutan.push(`mulai-${String(putaran)}`);
      await new Promise((r) => setTimeout(r, 15));
      urutan.push(`selesai-${String(putaran)}`);
      const n = kosong(o, putaran, urut, 'saringan', 0.01, ['x']);
      catat(n);
      return n;
    }) as never;
    const { alat, peristiwa } = siapkan({ nilai: f });
    await Promise.all([alat.ajukan(mentah), alat.ajukan({ ...mentah, jam: '17.05' })]);
    expect(urutan).toEqual(['mulai-1', 'selesai-1', 'mulai-2', 'selesai-2']);
    expect(peristiwa.map((p) => p.alat)).toEqual(['ajukan', 'ajukan']);
  });
});

describe('prompt agen', () => {
  it('terisi penuh, menyebut keempat alat, tidak memuat paket fakta (agen mengambilnya lewat alat)', () => {
    const p = instruksiAgen(3);
    expect(p).not.toMatch(/\{[A-Z_]+\}/);
    for (const a of ['lihat_fakta', 'lihat_bank', 'periksa_kode', 'ajukan']) expect(p).toContain(`\`${a}\``);
    expect(p).not.toContain('susp-2025-12-10');
    // M2d-20: kontrak bentuk masuk prompt (±2.500 karakter); tetap jauh di bawah prompt 23 aturan lama (17.621).
    expect(p.length).toBeLessThan(10600);
  });
});
