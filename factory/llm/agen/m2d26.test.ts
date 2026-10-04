/** M2d-26: langkah "tingkatkan", aturan minimal satu Keliru di validator produk, petunjuk mode kode, penyamaran pengenal kunci. */
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bacaBank, pilihSimulasi, shaPaketBank, type EntriBank } from '../bebas/bank.ts';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import type { OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import { samarkan } from '../klien.ts';
import type { PaketFakta } from '../paket.ts';
import { buatAlat, kunciBetul, lebihSulit, peningkatanDari, tingkatEntri, ukuranTebak } from './alat.ts';
import { instruksiAgen, instruksiTingkatkan } from './prompt.ts';

const muat = (f: string): PaketFakta => JSON.parse(readFileSync(`${AKAR}${f}`, 'utf8')) as PaketFakta;
const alii = muat('eval/penyusun/paket-alii-2025-11-10/paket.json');
const sha = shaPaketBank(alii);
type Catat = (n: NilaiOmonganV3) => void;
const pas = (kunci: number, n: number) => ({ putusan: { kunci, n }, jawaban: [] }) as unknown as NilaiOmonganV3['pasangan'];
const kuat = (kunci: number) => ({ putusan: { kunci, n: 4, putusan: kunci >= 3 ? 'tolak' : 'lulus', alasan: 'x' }, jawaban: [] }) as unknown as NilaiOmonganV3['penebak_kuat'];

/** Alat di atas SALINAN bank ALII nyata (simulasi sudah terakit); gerbang berbayar diganti tiruan. */
function alatAlii(o: { murah: number; opus: number }) {
  const folderBank = mkdtempSync(join(tmpdir(), 'bank-m2d26-'));
  cpSync(`${AKAR}eval/bank-omongan/${sha}`, join(folderBank, sha), { recursive: true });
  let dipanggil = 0;
  const nilai = (async (om: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: Catat): Promise<NilaiOmonganV3> => {
    dipanggil += 1;
    const n = { putaran, urut, omongan: om, berhenti: 'lolos', alasan: [], dicatat: [], saringan: null, kartu_rotasi: null, pasangan: pas(o.murah, 12), penebak_kuat: kuat(o.opus), kritik: null, biaya_gerbang_usd: 0.05, id_bank: null } as NilaiOmonganV3;
    catat(n);
    return n;
  }) as never;
  const alat = buatAlat({ paket: alii, folderBank, idJalan: 'tes-naik', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai });
  return { alat, folderBank, dipanggil: () => dipanggil };
}
/** Tiga omongan versi asal dari bank ALII nyata. */
const asalAlii = (): EntriBank[] => bacaBank(`${AKAR}eval/bank-omongan`, sha).filter((e) => peningkatanDari(e) === null);

describe('ukuran lebih sulit', () => {
  it('bagian penebak murah harus turun, dan penguji Opus tidak boleh naik', () => {
    const u = (k: number, n: number, q: number) => ukuranTebak({ pasangan: pas(k, n), penebak_kuat: kuat(q) });
    expect(lebihSulit(u(3, 12, 0), u(6, 12, 0))).toBe(true);
    expect(lebihSulit(u(6, 12, 0), u(6, 12, 0))).toBe(false);
    expect(lebihSulit(u(3, 12, 1), u(6, 12, 0))).toBe(false);
    // 4 dari 9 = 0,44 > 5 dari 12 = 0,42: jawaban tak terbaca tidak membuat "lebih sulit".
    expect(lebihSulit(u(4, 9, 0), u(5, 12, 0))).toBe(false);
    expect(lebihSulit(ukuranTebak({}), u(6, 12, 0))).toBe(false);
  });
});

describe('langkah tingkatkan', () => {
  it('lihat_simulasi: tiga omongan versi asal dengan ukurannya', () => {
    const { alat } = alatAlii({ murah: 3, opus: 0 });
    const s = alat.lihatSimulasi();
    expect(s.omongan).toHaveLength(3);
    expect(s.omongan.every((x) => /memilih kunci \d+ dari \d+/.test(x.penebak_tanpa_kartu) && x.versi_lebih_sulit.length === 0)).toBe(true);
    expect(alat.semuaNaik()).toBe(false);
  });
  it('versi baru yang lolos dan terukur lebih sulit disimpan di samping versi asal; simulasi dasar tidak berubah', async () => {
    const { alat, folderBank } = alatAlii({ murah: 2, opus: 0 });
    const asal = asalAlii()[0] as EntriBank;
    const draf = alat.periksaKode({ ...asal.omongan, jam: '17.05' });
    expect(draf.lolos).toBe(true);
    const h = await alat.tingkatkan(asal.id, draf.id_draf as string);
    expect(h.lolos).toBe(true);
    expect(h.catatan.join(' ')).toMatch(/Lebih sulit dari versi asal: penebak tanpa kartu memilih kunci 2 dari 12 \(versi asal \d+ dari \d+\)/);
    const semua = bacaBank(folderBank, sha);
    const baru = semua.filter((e) => peningkatanDari(e) === asal.id);
    expect(baru).toHaveLength(1);
    expect(baru[0]?.omongan.nama).toBe(asal.omongan.nama);
    expect(tingkatEntri(baru[0] as EntriBank)).toBe('sulit');
    expect(semua).toHaveLength(4);
    expect(alat.keadaan().jumlah_omongan).toBe(3);
    expect(alat.selesai()).toBe(true);
    expect(alat.jumlahNaik()).toBe(1);
    expect(alat.lihatSimulasi().omongan.find((x) => x.id_asal === asal.id)?.versi_lebih_sulit).toHaveLength(1);
  });
  it('lolos gerbang tetapi tidak lebih sulit → tidak disimpan, alasannya membandingkan dengan versi asal', async () => {
    const { alat, folderBank } = alatAlii({ murah: 11, opus: 0 });
    const asal = asalAlii()[0] as EntriBank;
    const h = await alat.tingkatkan(asal.id, alat.periksaKode({ ...asal.omongan, jam: '17.05' }).id_draf as string);
    expect(h).toMatchObject({ lolos: false, berhenti: 'tidak-naik' });
    expect(h.penolakan.join(' ')).toMatch(/tidak lebih sulit dari versi asal/);
    expect(bacaBank(folderBank, sha)).toHaveLength(3);
  });
  it('jawaban atau kartu penentu berubah, atau id_asal tak dikenal → ditolak GRATIS (gerbang tidak dijalankan)', async () => {
    const { alat, dipanggil } = alatAlii({ murah: 2, opus: 0 });
    const semua = asalAlii();
    const a = semua[0] as EntriBank;
    const bedaJawaban = semua.find((e) => kunciBetul(e.omongan) !== kunciBetul(a.omongan)) as EntriBank;
    const samaJawaban = semua.find((e) => e.id !== a.id && kunciBetul(e.omongan) === kunciBetul(a.omongan));
    const d1 = alat.periksaKode({ ...bedaJawaban.omongan, jam: '17.05' }).id_draf as string;
    expect((await alat.tingkatkan(a.id, d1)).berhenti).toBe('kebutuhan');
    if (samaJawaban !== undefined) {
      const d2 = alat.periksaKode({ ...samaJawaban.omongan, jam: '18.10' }).id_draf as string;
      expect((await alat.tingkatkan(a.id, d2)).penolakan.join(' ')).toMatch(/Kartu penentu versi baru/);
    }
    expect((await alat.tingkatkan('tidak-ada', d1)).penolakan.join(' ')).toMatch(/bukan omongan simulasi ini/);
    expect(dipanggil()).toBe(0);
  });
});

describe('validator produk: minimal satu Betul DAN satu Keliru (pemilik 4 Okt)', () => {
  it('tiga omongan BOLT berjawaban "Betul" tidak lagi terakit oleh validator produk', () => {
    const bolt = muat('eval/penyusun/paket-bolt-2026-05-07/paket.json');
    const bank = bacaBank(`${AKAR}eval/bank-omongan`, shaPaketBank(bolt)).filter((e) => kunciBetul(e.omongan));
    expect(bank.length).toBeGreaterThanOrEqual(3);
    const r = pilihSimulasi(bank, bolt);
    expect(r.draf).toBeNull();
    expect(r.alasan.join(' ')).toContain('TIDAK_ADA_KELIRU');
  });
});

describe('petunjuk', () => {
  it('mode kode menyebut dua alat data; mode paket tidak', () => {
    const k = instruksiAgen(3, 5, 'biasa', true);
    expect(k).toMatch(/`usulkan_hari`/);
    expect(k).toMatch(/`periksa_saham`.*33 aturan verifikasi/);
    expect(k).toMatch(/Mulailah dengan `usulkan_hari`/);
    expect(instruksiAgen(3, 5)).not.toMatch(/usulkan_hari|periksa_saham/);
    expect(instruksiAgen(3, 5)).toMatch(/Mulailah dengan `lihat_fakta` dan `lihat_bank`\./);
  });
  it('petunjuk tingkatkan: tanpa isian tersisa, menyebut yang tidak boleh berubah dan "cukup sampai di sini"', () => {
    const t = instruksiTingkatkan();
    expect(t).not.toMatch(/\{[A-Z_]+\}/);
    expect(t).toMatch(/Yang tidak boleh berubah dari versi asal: kartu penentunya, dan jawabannya/);
    expect(t).toMatch(/cukup sampai di sini/);
  });
});

describe('penyamaran', () => {
  it('pengenal kunci di URL galat OpenRouter ikut disamarkan', () => {
    const teks = 'https://openrouter.ai/workspaces/default/keys/0123456789abcdef0123456789abcdef0123 penuh';
    expect(samarkan(teks, [])).toBe('https://openrouter.ai/workspaces/default/keys/[disamarkan] penuh');
  });
  it('berkas percobaan yang ikut repo tidak memuat pengenal kunci', () => {
    for (const f of ['eval/penyusun/m2d24-bolt-1/hasil.json', 'eval/penyusun/m2d24-bolt-1/mentah-agen.jsonl']) expect(readFileSync(`${AKAR}${f}`, 'utf8')).not.toMatch(/\/keys\/[A-Za-z0-9]{16,}/);
  });
});
