/**
 * M2d-2 T-03: lingkar agen dengan klien palsu.
 *
 * Paket dan draf sungguhan (TIRT, terlacak dari M2d-1) dan validator
 * sungguhan; hanya model yang dipalsukan — satu fungsi yang menjawab menurut
 * jenis panggilan (penyusun, gerbang kartu, gerbang tebak). Yang dijaga:
 * batas 5 putaran, omongan lolos dikunci (versi baru dari model dibuang),
 * hanya omongan yang ditolak yang ditulis ulang, masalah seluruh draf
 * dibebankan ke omongan yang belum terkunci, pagu menghentikan lingkar
 * seketika, dan penebak tidak pernah melihat percakapan penyusun.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PesanChat } from './klien.ts';
import { MAKS_PUTARAN, SETELAN_PENYUSUN, jalankanAgen, promptAgen, type HasilAgen } from './agen.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import type { InfoPanggil, PanggilLlm } from './gerbang-tebak.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { pesanPaket, promptSistem, type JawabanModel, type SetelanPanggil } from './susun.ts';
import { validasiDraf } from './validasi.ts';

const PAKET = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
const DRAF = (
  JSON.parse(
    readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8'),
  ) as { draf: DrafSimulasi }
).draf;

function salin<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
function om(no: number): OmonganDraf {
  const o = DRAF.omongan[no - 1];
  if (o === undefined) throw new Error('fixture');
  return salin(o);
}
const KUNCI = [om(1).kunci, om(2).kunci, om(3).kunci];
const lain = (k: KunciOpsi): KunciOpsi => (k === 'a' ? 'c' : 'a');
const penuh = (omongan: unknown[]): string => JSON.stringify({ omongan });
const bernomor = (...no: number[]): string => JSON.stringify({ omongan: no.map((n) => ({ no: n, ...om(n) })) });

interface Rekaman {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPanggil;
}

interface Skenario {
  /** Keluaran penyusun per putaran. */
  penyusun: string[];
  /** Jawaban pembaca kartu: benar (kunci) kecuali fungsi ini berkata lain. */
  kartu?: (no: number, putaran: number) => KunciOpsi | null;
  /** Tebakan: `true` = penebak menebak kunci dengan yakin 60 (omongan ditolak). */
  tertebak: (no: number, putaran: number) => boolean;
  /** Lempar galat ini pada panggilan ke-n (1 = pertama). */
  lempar?: { ke: number; galat: Error };
}

function palsu(s: Skenario): { panggil: PanggilLlm; rekaman: Rekaman[] } {
  const rekaman: Rekaman[] = [];
  let penyusun = 0;
  const panggil: PanggilLlm = async (pesan, setelan, info) => {
    rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan }, info: { ...info } });
    if (s.lempar !== undefined && rekaman.length === s.lempar.ke) throw s.lempar.galat;
    const j = (teks: string): JawabanModel => ({
      teks,
      token_masuk: 1000,
      token_keluar: 500,
      latensi_ms: 3,
      finish_reason: 'stop',
      biaya_usd: 0.001,
    });
    if (info.jenis === 'susun' || info.jenis === 'tulis-ulang') {
      penyusun += 1;
      return j(s.penyusun[penyusun - 1] ?? '');
    }
    const no = info.omongan ?? 0;
    const kunci = KUNCI[no - 1] ?? 'a';
    if (info.jenis === 'gerbang-kartu') {
      const p = s.kartu?.(no, info.putaran) ?? kunci;
      return j(JSON.stringify({ pilihan: p, kartu: [1], alasan: 'dari kartu' }));
    }
    const kena = s.tertebak(no, info.putaran);
    return j(JSON.stringify({ pilihan: kena ? kunci : lain(kunci), yakin: 60, alasan: 'nadanya' }));
  };
  return { panggil, rekaman };
}

async function jalan(s: Skenario): Promise<{ hasil: HasilAgen; rekaman: Rekaman[] }> {
  const { panggil, rekaman } = palsu(s);
  const hasil = await jalankanAgen({ paket: PAKET, panggil, validasi: validasiDraf, jam: () => new Date('2026-09-28T00:00:00Z') });
  return { hasil, rekaman };
}

const penyusunDi = (r: Rekaman[]): Rekaman[] => r.filter((x) => x.info.jenis === 'susun' || x.info.jenis === 'tulis-ulang');

describe('lingkar agen — alur dasar', () => {
  it('fixture: draf TIRT M2d-1 lolos validator sungguhan', () => {
    expect(validasiDraf(DRAF, PAKET)).toEqual([]);
  });

  it('semua lolos di putaran 1: 1 panggilan penyusun + 3 × (1 kartu + 3 tebakan)', async () => {
    const { hasil, rekaman } = await jalan({ penyusun: [penuh(DRAF.omongan)], tertebak: () => false });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1, berhenti: null });
    expect(hasil.draf).toEqual(DRAF);
    expect(rekaman).toHaveLength(13);
    expect(rekaman.map((r) => r.info.jenis)).toEqual([
      'susun',
      ...Array.from({ length: 3 }, () => ['gerbang-kartu', 'gerbang-tebak', 'gerbang-tebak', 'gerbang-tebak']).flat(),
    ]);
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'lolos', 'lolos']);
  });

  it('penyusun memakai prompt agen (aturan M2d-1 + tambahan) dan setelan tetap di setiap putaran', async () => {
    const p = promptAgen();
    expect(p.startsWith(promptSistem())).toBe(true);
    expect(p).toContain('JAWABAN BENAR HARUS MELAWAN DUGAAN PERTAMA');
    expect(p).toContain('Jangan kegeeran dulu.');
    const { rekaman } = await jalan({
      penyusun: [penuh(DRAF.omongan), bernomor(1, 2, 3), bernomor(1, 2, 3)],
      tertebak: (_no, putaran) => putaran < 3,
    });
    for (const r of penyusunDi(rekaman)) {
      expect(r.setelan).toEqual({ ...SETELAN_PENYUSUN });
      expect(r.pesan[0]).toEqual({ role: 'system', content: p });
      expect(r.pesan[1]).toEqual({ role: 'user', content: pesanPaket(PAKET) });
    }
    expect(SETELAN_PENYUSUN).toEqual({ suhu: 0.3, maxTokens: 32_000 });
  });

  it('penebak dan pembaca kartu tidak pernah melihat percakapan penyusun', async () => {
    const { rekaman } = await jalan({
      penyusun: [penuh(DRAF.omongan), bernomor(2)],
      tertebak: (no, putaran) => no === 2 && putaran === 1,
    });
    const gerbang = rekaman.filter((r) => r.info.jenis === 'gerbang-kartu' || r.info.jenis === 'gerbang-tebak');
    expect(gerbang.length).toBeGreaterThan(0);
    for (const r of gerbang) {
      expect(r.pesan).toHaveLength(2);
      expect(r.pesan.map((x) => x.role)).toEqual(['system', 'user']);
      const teks = r.pesan.map((x) => x.content).join('\n');
      expect(teks).not.toContain('PAKET FAKTA');
      expect(teks).not.toContain(promptSistem().slice(0, 80));
      expect(teks).not.toContain('Draf di atas sudah diperiksa');
      expect(teks).not.toContain('Salah-kaprah');
    }
  });
});

describe('lingkar agen — batas putaran dan kunci omongan', () => {
  it(`paling banyak ${String(MAKS_PUTARAN)} putaran: soal yang selalu tertebak berhenti sesudah 5 panggilan penyusun`, async () => {
    const { hasil, rekaman } = await jalan({
      penyusun: [penuh(DRAF.omongan), ...Array.from({ length: 10 }, () => bernomor(1, 2, 3))],
      tertebak: () => true,
    });
    expect(MAKS_PUTARAN).toBe(5);
    expect(penyusunDi(rekaman)).toHaveLength(5);
    expect(rekaman).toHaveLength(5 + 5 * 3 * 4);
    expect(hasil).toMatchObject({ lolos: false, jumlah_putaran: 5, draf: null });
    expect(hasil.berhenti).toContain('batas 5 putaran');
  });

  it('omongan yang lolos DIKUNCI: versi baru dari model dibuang, gerbang tidak diulang, hanya yang ditolak ditulis ulang', async () => {
    const ubah1 = { ...om(1), nama: 'Palsu', pesan: 'Pesan yang diganti diam-diam.' , angka_pesan: [] };
    const ubah3 = { ...om(3), nama: 'Tiruan' };
    const putaran2 = JSON.stringify({ omongan: [{ no: 1, ...ubah1 }, { no: 2, ...om(2) }, { no: 3, ...ubah3 }] });
    const { hasil, rekaman } = await jalan({
      penyusun: [penuh(DRAF.omongan), putaran2],
      tertebak: (no, putaran) => no === 2 && putaran === 1,
    });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
    expect(hasil.draf?.omongan[0]).toEqual(om(1));
    expect(hasil.draf?.omongan[2]).toEqual(om(3));
    expect(hasil.riwayat[1]).toMatchObject({ jenis: 'tulis-ulang', diminta: [2], diabaikan: [1, 3] });
    expect(hasil.riwayat[1]?.omongan.map((o) => o.status)).toEqual(['terkunci-sebelumnya', 'lolos', 'terkunci-sebelumnya']);
    // Gerbang putaran 2 hanya untuk omongan 2.
    const gerbang2 = rekaman.filter((r) => r.info.putaran === 2 && r.info.jenis.startsWith('gerbang'));
    expect(new Set(gerbang2.map((r) => r.info.omongan))).toEqual(new Set([2]));
    // Permintaan tulis ulang: yang terkunci, yang ditolak, alasan gerbangnya.
    const minta = penyusunDi(rekaman)[1]?.pesan ?? [];
    expect(minta.map((x) => x.role)).toEqual(['system', 'user', 'assistant', 'user']);
    const teks = minta[3]?.content ?? '';
    expect(teks).toContain(`Omongan TERKUNCI`);
    expect(teks).toContain(`1 (${om(1).nama}, kunci "${om(1).kunci}" = Betul)`);
    expect(teks).toContain('Omongan yang DITOLAK: 2.');
    expect(teks).toContain('[gerbang tebak buta] 3/3 penebak TANPA kartu memilih kunci');
    expect(teks).toContain('Tulis ulang HANYA omongan 2.');
    expect(JSON.parse(minta[2]?.content ?? '{}')).toEqual({ omongan: DRAF.omongan });
  });

  it('pembaca kartu salah → ditolak gerbang kartu, gerbang tebak tidak dijalankan untuk omongan itu', async () => {
    const { hasil, rekaman } = await jalan({
      penyusun: [penuh(DRAF.omongan), bernomor(3)],
      kartu: (no, putaran) => (no === 3 && putaran === 1 ? lain(KUNCI[2] ?? 'a') : null),
      tertebak: () => false,
    });
    expect(hasil.riwayat[0]?.omongan[2]?.status).toBe('ditolak-kartu');
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 3 && r.info.jenis === 'gerbang-tebak')).toHaveLength(0);
    expect(penyusunDi(rekaman)[1]?.pesan[3]?.content).toContain('[gerbang kartu] Pembaca yang MEMEGANG kartu memilih');
    expect(hasil.lolos).toBe(true);
  });
});

describe('lingkar agen — validator di dalam lingkar', () => {
  it('masalah satu omongan: hanya omongan itu yang ditolak; gerbang berjalan untuk yang lain', async () => {
    const panjang = { ...om(2), pesan: `${om(2).pesan} ${'ya '.repeat(80)}` };
    const { hasil, rekaman } = await jalan({
      penyusun: [penuh([om(1), panjang, om(3)]), bernomor(2)],
      tertebak: () => false,
    });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'ditolak-validator', 'lolos']);
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 2)).toHaveLength(0);
    expect(penyusunDi(rekaman)[1]?.pesan[3]?.content).toContain('[validator PESAN_PANJANG]');
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });

  it('masalah seluruh draf (nama kembar) dibebankan ke semua omongan yang belum terkunci, tanpa gerbang', async () => {
    const kembar = [om(1), { ...om(2), nama: om(1).nama }, { ...om(3), nama: om(1).nama }];
    const { hasil, rekaman } = await jalan({ penyusun: [penuh(kembar), bernomor(1, 2, 3)], tertebak: () => false });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['ditolak-validator', 'ditolak-validator', 'ditolak-validator']);
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.jenis.startsWith('gerbang'))).toHaveLength(0);
    expect(hasil.riwayat[1]?.diminta).toEqual([1, 2, 3]);
    expect(penyusunDi(rekaman)[1]?.pesan[3]?.content).toContain('[validator NAMA_KEMBAR, seluruh draf]');
    expect(hasil.lolos).toBe(true);
  });

  it('JSON rusak di putaran 1 → putaran 2 menyusun ulang seluruh draf', async () => {
    const { hasil, rekaman } = await jalan({ penyusun: ['{"omongan": [', penuh(DRAF.omongan)], tertebak: () => false });
    expect(hasil.riwayat.map((r) => r.jenis)).toEqual(['susun', 'susun']);
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['tidak-ada', 'tidak-ada', 'tidak-ada']);
    expect(penyusunDi(rekaman)[1]?.pesan[3]?.content).toContain('Keluaranmu tidak bisa dipakai');
    expect(hasil.lolos).toBe(true);
  });
});

describe('lingkar agen — pagu', () => {
  it('PaguTercapai di tengah gerbang menghentikan lingkar seketika: tidak ada panggilan sesudahnya', async () => {
    const { hasil, rekaman } = await jalan({
      penyusun: [penuh(DRAF.omongan)],
      tertebak: () => false,
      lempar: { ke: 4, galat: new PaguTercapai(4.99, 0.02, 5, 'm') },
    });
    expect(rekaman).toHaveLength(4);
    expect(hasil.lolos).toBe(false);
    expect(hasil.berhenti).toMatch(/^pagu tercapai/);
  });
});
