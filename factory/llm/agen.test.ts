/**
 * M2d-2 T-03/T-05: lingkar agen dengan klien palsu.
 *
 * Paket dan draf sungguhan (TIRT, terlacak dari M2d-1) dan validator
 * sungguhan; hanya model yang dipalsukan — satu fungsi yang menjawab menurut
 * jenis panggilan (penyusun per omongan, gerbang kartu, gerbang tebak). Yang
 * dijaga: batas 5 putaran, satu panggilan penyusun per omongan, omongan lolos
 * dikunci (objek lain dari model dibuang), hanya omongan yang ditolak yang
 * ditulis ulang, masalah seluruh draf dibebankan ke omongan yang belum
 * terkunci, pagu menghentikan lingkar seketika, dan penebak tidak pernah
 * melihat percakapan penyusun.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PesanChat } from './klien.ts';
import { MAKS_PUTARAN, SETELAN_CADANGAN, SETELAN_PENYUSUN, jalankanAgen, pesanTulisOmongan, promptAgen, type HasilAgen } from './agen.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import type { InfoPanggil, PanggilLlm } from './gerbang-tebak.ts';
import { GalatLlm } from './klien.ts';
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
/** Keluaran penyusun untuk satu omongan, bentuk yang diminta (satu objek bernomor). */
const satu = (no: number, o: unknown = om(no)): string => JSON.stringify({ omongan: [{ no, ...(o as object) }] });

interface Rekaman {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPanggil;
}

interface Skenario {
  /** Keluaran penyusun untuk (omongan, putaran); bawaan: omongan fixture itu. */
  penyusun?: (no: number, putaran: number) => string;
  /** Jawaban pembaca kartu; bawaan: kunci. */
  kartu?: (no: number, putaran: number) => KunciOpsi | null;
  /** `true` = penebak menebak kunci dengan yakin 60 (omongan ditolak). */
  tertebak: (no: number, putaran: number) => boolean;
  /** Lempar galat ini pada panggilan ke-n (1 = pertama). */
  lempar?: { ke: number; galat: Error };
  /** Panggilan penyusun BERPIKIR untuk (omongan, putaran) terpotong: teks kosong, finish length. */
  terpotong?: (no: number, putaran: number) => boolean;
}

function palsu(s: Skenario): { panggil: PanggilLlm; rekaman: Rekaman[] } {
  const rekaman: Rekaman[] = [];
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
    const no = info.omongan ?? 0;
    if (info.jenis === 'susun' || info.jenis === 'tulis-ulang') {
      if (setelan.tambahanBadan === undefined && s.terpotong?.(no, info.putaran) === true) {
        return { ...j(''), token_keluar: 32_768, finish_reason: 'length' };
      }
      return j(s.penyusun?.(no, info.putaran) ?? satu(no));
    }
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

const penyusunDi = (r: Rekaman[], putaran?: number): Rekaman[] =>
  r.filter((x) => (x.info.jenis === 'susun' || x.info.jenis === 'tulis-ulang') && (putaran === undefined || x.info.putaran === putaran));
const permintaan = (r: Rekaman | undefined): string => r?.pesan[1]?.content ?? '';

describe('lingkar agen — alur dasar', () => {
  it('fixture: draf TIRT M2d-1 lolos validator sungguhan', () => {
    expect(validasiDraf(DRAF, PAKET)).toEqual([]);
  });

  it('semua lolos di putaran 1: 3 panggilan penyusun (satu per omongan) + 3 × (1 kartu + 3 tebakan)', async () => {
    const { hasil, rekaman } = await jalan({ tertebak: () => false });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1, berhenti: null });
    expect(hasil.draf).toEqual(DRAF);
    expect(rekaman).toHaveLength(15);
    expect(rekaman.slice(0, 3).map((r) => `${r.info.jenis}:${String(r.info.omongan)}`)).toEqual(['susun:1', 'susun:2', 'susun:3']);
    expect(rekaman.slice(3).map((r) => r.info.jenis)).toEqual(
      Array.from({ length: 3 }, () => ['gerbang-kartu', 'gerbang-tebak', 'gerbang-tebak', 'gerbang-tebak']).flat(),
    );
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'lolos', 'lolos']);
  });

  it('penyusun: prompt agen (aturan M2d-1 + tambahan), paket + permintaan SATU omongan, setelan tetap', async () => {
    const p = promptAgen();
    expect(p.startsWith(promptSistem())).toBe(true);
    expect(p).toContain('JAWABAN BENAR HARUS MELAWAN DUGAAN PERTAMA');
    expect(p).toContain('Jangan kegeeran dulu.');
    const { rekaman } = await jalan({ tertebak: (_no, putaran) => putaran < 3 });
    for (const r of penyusunDi(rekaman)) {
      expect(r.setelan).toEqual({ ...SETELAN_PENYUSUN });
      expect(r.pesan).toHaveLength(2);
      expect(r.pesan[0]).toEqual({ role: 'system', content: p });
      expect(permintaan(r).startsWith(pesanPaket(PAKET))).toBe(true);
      expect(permintaan(r)).toContain(`tulis HANYA omongan nomor ${String(r.info.omongan)}`);
    }
    expect(SETELAN_PENYUSUN).toEqual({ suhu: 0.3, maxTokens: 32_768 });
  });

  it('penebak dan pembaca kartu tidak pernah melihat percakapan penyusun', async () => {
    const { rekaman } = await jalan({ tertebak: (no, putaran) => no === 2 && putaran === 1 });
    const gerbang = rekaman.filter((r) => r.info.jenis === 'gerbang-kartu' || r.info.jenis === 'gerbang-tebak');
    expect(gerbang.length).toBeGreaterThan(0);
    for (const r of gerbang) {
      expect(r.pesan).toHaveLength(2);
      expect(r.pesan.map((x) => x.role)).toEqual(['system', 'user']);
      const teks = r.pesan.map((x) => x.content).join('\n');
      expect(teks).not.toContain('PAKET FAKTA');
      expect(teks).not.toContain(promptSistem().slice(0, 80));
      expect(teks).not.toContain('TUGAS PANGGILAN INI');
      expect(teks).not.toContain('Salah-kaprah');
    }
  });
});

describe('lingkar agen — batas putaran dan kunci omongan', () => {
  it(`paling banyak ${String(MAKS_PUTARAN)} putaran: soal yang selalu tertebak berhenti sesudah 5 putaran (15 panggilan penyusun)`, async () => {
    const { hasil, rekaman } = await jalan({ tertebak: () => true });
    expect(MAKS_PUTARAN).toBe(5);
    expect(penyusunDi(rekaman)).toHaveLength(15);
    expect(Math.max(...rekaman.map((r) => r.info.putaran))).toBe(5);
    expect(rekaman).toHaveLength(15 + 5 * 3 * 4);
    expect(hasil).toMatchObject({ lolos: false, jumlah_putaran: 5, draf: null });
    expect(hasil.berhenti).toContain('batas 5 putaran');
  });

  it('omongan yang lolos DIKUNCI: hanya yang ditolak diminta lagi, objek lain dari model dibuang, gerbang tidak diulang', async () => {
    const serakah = JSON.stringify({
      omongan: [
        { no: 1, ...om(1), nama: 'Palsu', pesan: 'Pesan yang diganti diam-diam.', angka_pesan: [] },
        { no: 2, ...om(2) },
        { no: 3, ...om(3), nama: 'Tiruan' },
      ],
    });
    const { hasil, rekaman } = await jalan({
      penyusun: (no, putaran) => (putaran === 2 ? serakah : satu(no)),
      tertebak: (no, putaran) => no === 2 && putaran === 1,
    });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
    expect(hasil.draf?.omongan[0]).toEqual(om(1));
    expect(hasil.draf?.omongan[2]).toEqual(om(3));
    expect(penyusunDi(rekaman, 2).map((r) => r.info.omongan)).toEqual([2]);
    expect(hasil.riwayat[1]).toMatchObject({ jenis: 'tulis-ulang', diminta: [2], diabaikan: [1, 3] });
    expect(hasil.riwayat[1]?.omongan.map((o) => o.status)).toEqual(['terkunci-sebelumnya', 'lolos', 'terkunci-sebelumnya']);
    const gerbang2 = rekaman.filter((r) => r.info.putaran === 2 && r.info.jenis.startsWith('gerbang'));
    expect(new Set(gerbang2.map((r) => r.info.omongan))).toEqual(new Set([2]));
    const teks = permintaan(penyusunDi(rekaman, 2)[0]);
    expect(teks).toContain('- omongan 1 (TERKUNCI):');
    expect(teks).toContain('- omongan 3 (TERKUNCI):');
    expect(teks).toContain(`Versi sebelumnya omongan 2 DITOLAK: ${JSON.stringify(om(2))}`);
    expect(teks).toContain('[gerbang tebak buta] 3/3 penebak TANPA kartu memilih kunci');
    expect(teks).toContain('tulis HANYA omongan nomor 2');
  });

  it('pembaca kartu salah → ditolak gerbang kartu, gerbang tebak tidak dijalankan untuk omongan itu', async () => {
    const { hasil, rekaman } = await jalan({
      kartu: (no, putaran) => (no === 3 && putaran === 1 ? lain(KUNCI[2] ?? 'a') : null),
      tertebak: () => false,
    });
    expect(hasil.riwayat[0]?.omongan[2]?.status).toBe('ditolak-kartu');
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 3 && r.info.jenis === 'gerbang-tebak')).toHaveLength(0);
    expect(permintaan(penyusunDi(rekaman, 2)[0])).toContain('[gerbang kartu] Pembaca yang MEMEGANG kartu memilih');
    expect(hasil.lolos).toBe(true);
  });
});

describe('lingkar agen — validator di dalam lingkar', () => {
  it('masalah satu omongan: hanya omongan itu yang ditolak; gerbang berjalan untuk yang lain', async () => {
    const panjang = { ...om(2), pesan: `${om(2).pesan} ${'ya '.repeat(80)}` };
    const { hasil, rekaman } = await jalan({
      penyusun: (no, putaran) => (no === 2 && putaran === 1 ? satu(2, panjang) : satu(no)),
      tertebak: () => false,
    });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'ditolak-validator', 'lolos']);
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 2 && r.info.jenis.startsWith('gerbang'))).toHaveLength(0);
    expect(permintaan(penyusunDi(rekaman, 2)[0])).toContain('[validator PESAN_PANJANG]');
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });

  it('masalah seluruh draf (nama kembar) dibebankan ke semua omongan yang belum terkunci, tanpa gerbang', async () => {
    const { hasil, rekaman } = await jalan({
      penyusun: (no, putaran) => (putaran === 1 ? satu(no, { ...om(no), nama: om(1).nama }) : satu(no)),
      tertebak: () => false,
    });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['ditolak-validator', 'ditolak-validator', 'ditolak-validator']);
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.jenis.startsWith('gerbang'))).toHaveLength(0);
    expect(hasil.riwayat[1]?.diminta).toEqual([1, 2, 3]);
    expect(permintaan(penyusunDi(rekaman, 2)[0])).toContain('[validator NAMA_KEMBAR, seluruh draf]');
    expect(hasil.lolos).toBe(true);
  });

  it('JSON rusak untuk satu omongan → omongan itu "tidak-ada" dan diminta lagi; yang lain tetap diperiksa', async () => {
    const { hasil, rekaman } = await jalan({
      penyusun: (no, putaran) => (no === 2 && putaran === 1 ? '{"omongan": [' : satu(no)),
      tertebak: () => false,
    });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'tidak-ada', 'lolos']);
    expect(permintaan(penyusunDi(rekaman, 2)[0])).toContain('[bentuk] keluaran bukan JSON yang sah');
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });

  it('permintaan satu omongan menyebut aturan antar-omongan dari omongan lain', () => {
    // om(2) dan om(3) sama-sama Keliru → omongan yang tersisa HARUS Betul.
    const t = pesanTulisOmongan(1, [null, om(2), om(3)], new Set([2, 3]), undefined);
    expect(t).toContain('HARUS ternyata BETUL');
    expect(t).toContain(`nama pengirim berbeda dari "${om(2).nama}" dan "${om(3).nama}"`);
    const sama = pesanTulisOmongan(1, [null, { ...om(2), kunci: 'b' }, om(3)], new Set(), undefined);
    expect(sama).toContain('huruf kunci omongan ini tidak boleh "b"');
  });
});

describe('lingkar agen — pagu', () => {
  it('PaguTercapai di tengah gerbang menghentikan lingkar seketika: tidak ada panggilan sesudahnya', async () => {
    const { hasil, rekaman } = await jalan({
      tertebak: () => false,
      lempar: { ke: 5, galat: new PaguTercapai(4.99, 0.02, 5, 'm') },
    });
    expect(rekaman).toHaveLength(5);
    expect(hasil.lolos).toBe(false);
    expect(hasil.berhenti).toMatch(/^pagu tercapai/);
  });

  it('panggilan berpikir terpotong → SATU cadangan tanpa berpikir di putaran yang sama; keduanya gagal → tidak-ada', async () => {
    const { hasil, rekaman } = await jalan({ tertebak: () => false, terpotong: (no, putaran) => no === 3 && putaran === 1 });
    const o3 = penyusunDi(rekaman, 1).filter((r) => r.info.omongan === 3);
    expect(o3.map((r) => r.setelan)).toEqual([{ ...SETELAN_PENYUSUN }, { ...SETELAN_CADANGAN }]);
    expect(SETELAN_CADANGAN.tambahanBadan).toEqual({ chat_template_kwargs: { thinking: false } });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'lolos', 'lolos']);
    const rusak = await jalan({ tertebak: () => false, penyusun: (no, p) => (no === 2 && p === 1 ? '{"omongan": [' : satu(no)) });
    expect(penyusunDi(rusak.rekaman, 1).filter((r) => r.info.omongan === 2)).toHaveLength(2);
    expect(rusak.hasil.riwayat[0]?.omongan[1]?.status).toBe('tidak-ada');
  });

  it('galat penyedia (bukan pagu) di penyusun menggagalkan panggilan itu saja; cadangan mengisi omongannya', async () => {
    const { hasil, rekaman } = await jalan({
      tertebak: () => false,
      lempar: { ke: 2, galat: new GalatLlm('Panggilan m: HTTP 200 tanpa choices — no_output', 200) },
    });
    // Panggilan ke-3 = cadangan tanpa berpikir untuk omongan 2, putaran yang sama.
    expect(rekaman[2]?.info).toMatchObject({ jenis: 'susun', omongan: 2, ulang: 1 });
    expect(rekaman[2]?.setelan).toEqual({ ...SETELAN_CADANGAN });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['lolos', 'lolos', 'lolos']);
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1, berhenti: null });
  });

  it('galat penyedia di gerbang: omongan itu "galat-gerbang", tidak dikunci, diminta lagi', async () => {
    const { hasil } = await jalan({
      tertebak: () => false,
      lempar: { ke: 5, galat: new GalatLlm('Panggilan m gagal: HTTP 503', 503) },
    });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['galat-gerbang', 'lolos', 'lolos']);
    expect(hasil.riwayat[1]?.diminta).toEqual([1]);
    expect(hasil.lolos).toBe(true);
  });

  it('PaguTercapai di penyusun juga menghentikan seketika', async () => {
    const { hasil, rekaman } = await jalan({
      tertebak: () => false,
      lempar: { ke: 2, galat: new PaguTercapai(4.99, 0.02, 5, 'm') },
    });
    expect(rekaman).toHaveLength(2);
    expect(hasil.berhenti).toMatch(/^pagu tercapai/);
  });
});
