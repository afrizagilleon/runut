/** M2d-25: pengajuan berdampingan, label tingkat, mode sulit, pelajaran di petunjuk. */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bacaBank, shaPaketBank } from '../bebas/bank.ts';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import type { OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';
import { SETELAN_PENEBAK_KUAT } from '../rotasi/penebak-kuat.ts';
import { buatAlat, CADANGAN_AJUKAN_USD, tingkatOmongan } from './alat.ts';
import { instruksiAgen } from './prompt.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d17-uji-2/paket.json`, 'utf8')) as PaketFakta;
const mentah = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d18-uji-sdk-2/omongan-akhir.json`, 'utf8')) as { omongan: unknown[] }).omongan[0] as Record<string, unknown>;
type Catat = (n: NilaiOmonganV3) => void;
const pas = (kunci: number, n: number) => ({ putusan: { kunci, n } }) as unknown as NilaiOmonganV3['pasangan'];
const kuat = (kunci: number) => ({ putusan: { kunci, n: 4, putusan: kunci >= 3 ? 'tolak' : 'lulus', alasan: 'x' }, jawaban: [] }) as unknown as NilaiOmonganV3['penebak_kuat'];

function alatDengan(o: { pagu?: number; tingkat?: 'biasa' | 'sulit'; opus?: number; jeda?: number }) {
  const urutan: string[] = [];
  const nilai = (async (om: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: Catat): Promise<NilaiOmonganV3> => {
    urutan.push(`mulai-${String(putaran)}`);
    await new Promise((r) => setTimeout(r, o.jeda ?? 20));
    urutan.push(`selesai-${String(putaran)}`);
    const n = { putaran, urut, omongan: om, berhenti: 'lolos', alasan: [], dicatat: [], saringan: null, kartu_rotasi: null, pasangan: pas(5, 12), penebak_kuat: kuat(o.opus ?? 0), kritik: null, biaya_gerbang_usd: 0.05, id_bank: null } as NilaiOmonganV3;
    catat(n);
    return n;
  }) as never;
  const folderBank = mkdtempSync(join(tmpdir(), 'bank-m2d25-'));
  const alat = buatAlat({ paket, folderBank, idJalan: 'tes', paguUsd: o.pagu ?? 2, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai, ...(o.tingkat === undefined ? {} : { tingkat: o.tingkat }) });
  return { alat, folderBank, urutan };
}
const tigaDraf = (alat: ReturnType<typeof alatDengan>['alat']): string[] =>
  alat.periksaKodeBanyak([mentah, { ...mentah, jam: '17.05' }, { ...mentah, jam: '18.10' }]).map((h) => h.id_draf as string);

describe('pengajuan berdampingan', () => {
  it('tiga draf dinilai bersamaan (bukan berurutan), dan nama di bank berbeda-beda', async () => {
    const { alat, folderBank, urutan } = alatDengan({});
    const ids = tigaDraf(alat);
    expect(new Set(ids).size).toBe(3);
    const r = await alat.ajukanBanyak(ids);
    expect(urutan.slice(0, 3).every((x) => x.startsWith('mulai-'))).toBe(true);
    expect(r.hasil.map((h) => h.lolos)).toEqual([true, true, true]);
    const nama = bacaBank(folderBank, shaPaketBank(paket)).map((e) => e.omongan.nama).sort();
    expect(nama).toEqual(['Bayu', 'Nadia', 'Rara']);
    expect(alat.keadaan().biaya_gerbang_usd).toBeCloseTo(0.15, 6);
  });
  it('anggaran hanya cukup untuk sebagian draf → sisanya TIDAK dijalankan dan diberi tahu', async () => {
    const { alat, urutan } = alatDengan({ pagu: CADANGAN_AJUKAN_USD * 2 + 0.01 });
    const r = await alat.ajukanBanyak(tigaDraf(alat));
    expect(r.hasil.map((h) => h.berhenti)).toEqual(['lolos', 'lolos', 'anggaran']);
    expect(urutan.filter((x) => x.startsWith('mulai-'))).toHaveLength(2);
  });
});

describe('tingkat', () => {
  it('label dari penebak murah dan penguji Opus', () => {
    expect(tingkatOmongan({ pasangan: pas(9, 12), penebak_kuat: kuat(0) })).toBe('pemanasan');
    expect(tingkatOmongan({ pasangan: pas(5, 12), penebak_kuat: kuat(0) })).toBe('biasa');
    expect(tingkatOmongan({ pasangan: pas(2, 12), penebak_kuat: kuat(0) })).toBe('sulit');
    expect(tingkatOmongan({ pasangan: pas(2, 12), penebak_kuat: kuat(2) })).toBe('biasa');
    expect(tingkatOmongan({ pasangan: null, penebak_kuat: kuat(0) })).toBeNull();
  });
  it('mode sulit: penguji Opus benar ≥ 1 kali → tidak masuk bank, alasannya sampai ke agen; 0 kali → masuk', async () => {
    const gagal = alatDengan({ tingkat: 'sulit', opus: 1 });
    const h = await gagal.alat.ajukanBanyak([tigaDraf(gagal.alat)[0] as string]);
    expect(h.hasil[0]).toMatchObject({ lolos: false, berhenti: 'penebak-kuat' });
    expect(h.hasil[0]?.penolakan.join(' ')).toMatch(/mode sulit: penguji Opus tanpa kartu benar 1 dari 4; targetnya 0/);
    expect(bacaBank(gagal.folderBank, shaPaketBank(paket))).toHaveLength(0);
    const lolos = alatDengan({ tingkat: 'sulit', opus: 0 });
    expect((await lolos.alat.ajukanBanyak([tigaDraf(lolos.alat)[0] as string])).hasil[0]?.lolos).toBe(true);
  });
  it('mode biasa: penguji Opus yang menebak tidak menolak', async () => {
    const { alat } = alatDengan({ opus: 4 });
    expect((await alat.ajukanBanyak([tigaDraf(alat)[0] as string])).hasil[0]?.lolos).toBe(true);
  });
});

describe('petunjuk dan batas token', () => {
  it('pelajaran dari penolakan nyata ada di petunjuk; baris SULIT hanya di mode sulit', () => {
    const p = instruksiAgen(3, 5);
    expect(p).toMatch(/Pelajaran dari penolakan sebelumnya/);
    expect(p).toMatch(/Kembaran yang dibantah pesan teman sendiri selalu tertebak/);
    expect(p).not.toMatch(/\{[A-Z_]+\}/);
    expect(p).not.toMatch(/bertingkat SULIT/);
    expect(instruksiAgen(3, 5, 'sulit')).toMatch(/bertingkat SULIT/);
  });
  it('penguji Opus: max_tokens 32.000', () => {
    expect(SETELAN_PENEBAK_KUAT.maxTokens).toBe(32_000);
  });
});
