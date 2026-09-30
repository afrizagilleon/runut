/**
 * M2d-8 T-02/T-04: lingkar TIRT memakai setelan kalibrasi PERSIS — kode yang
 * diturunkan dan gerbang "dicatat" tetap dijalankan dan dicatat, tidak
 * menolak; tingkat penebak/kritikus/pembaca kartu; penalar "high".
 * Validator, bank, dan semua gerbang kode sungguhan; hanya model palsu.
 */
import { describe, expect, it } from 'vitest';
import type { PemeriksaanPengecoh } from './agen-pengecoh.ts';
import { TULISAN, jalanP, type RekamanP } from './bantu-uji-pengecoh.ts';
import { SETELAN_AWAL, type SetelanGerbangM2d8 } from './kalibrasi-setelan.ts';
import { validasiM2d8 } from './kalibrasi-soal.ts';
import { GENERASI_M2D8, SETELAN_KALIBRASI_M2D8, generasiM2d8, tagJalanM2d8 } from './kalibrasi-susun.ts';
import { PENALAR_M2D8 } from './penalaran.ts';

const setel = (ubah: { tingkat?: Partial<SetelanGerbangM2d8['tingkat']>; dicatat?: SetelanGerbangM2d8['dicatat']; kode_dicatat?: string[] }): SetelanGerbangM2d8 => ({
  tingkat: { ...SETELAN_AWAL.tingkat, ...(ubah.tingkat ?? {}) },
  dicatat: ubah.dicatat ?? [],
  kode_dicatat: ubah.kode_dicatat ?? [],
});
const status = (h: Awaited<ReturnType<typeof jalanP>>['hasil'], no: number, putaran = 1): PemeriksaanPengecoh =>
  h.riwayat[putaran - 1]?.omongan.find((o) => o.no === no) as PemeriksaanPengecoh;
const jalan8 = (s: Parameters<typeof jalanP>[0], setelan: SetelanGerbangM2d8, maks = 1): ReturnType<typeof jalanP> => jalanP(s, maks, [], generasiM2d8(setelan), validasiM2d8);
const keberatan = (jenis: string): string =>
  JSON.stringify({ cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' }, keberatan: [{ jenis, bagian: 'pesan', alasan: 'uji' }], arahan: 'uji' });

describe('generasi M2d-8', () => {
  it('penalar GLM effort "high" (bukan "max"): kritikus 40.000/1.000, penebak 8.000/250; setelan = konstanta kalibrasi', async () => {
    const { rekaman } = await jalan8({}, SETELAN_AWAL);
    const satu = (j: string): RekamanP => rekaman.find((x) => x.info.jenis === j) as RekamanP;
    expect(satu('kritikus').setelan).toMatchObject({ maxTokens: PENALAR_M2D8.kritikus.maxTokens, tambahanBadan: { reasoning: { effort: 'high' } }, ambangPenalaran: 1_000 });
    expect(satu('gerbang-tebak').setelan).toMatchObject({ maxTokens: 8_000, tambahanBadan: { reasoning: { effort: 'high' } }, ambangPenalaran: 250 });
    expect(GENERASI_M2D8.nama).toBe('m2d8');
    expect(GENERASI_M2D8.kalibrasi).toEqual(SETELAN_KALIBRASI_M2D8);
    expect(tagJalanM2d8({ jenis: 'gerbang-tebak', putaran: 3, omongan: 2, ke: 1, ulang: 1 })).toBe('m2d8/jalan/tirt/p3/gerbang-tebak/o2/t1/u1');
  });

  it('ambang artefak diturunkan dari tingkat setelan', () => {
    expect(generasiM2d8(setel({ tingkat: { keseimbangan: 1, meresmikan: 1, pilihan_saja: 1, penebak: 1 } })).ambang).toEqual({ rasio: 1.5, maksKata: 3, pilihanSajaYakin: 60, penebakYakin: false });
    expect(generasiM2d8(SETELAN_AWAL).ambang).toEqual({ rasio: 1.3, maksKata: 2, pilihanSajaYakin: null, penebakYakin: true });
  });
});

describe('gerbang "dicatat" tidak menolak, tetap dicatat', () => {
  it('penebak: tingkat 0 (K-05) menolak 3/3 benar; "dicatat" → lolos dengan catatan', async () => {
    const t = (no: number, putaran: number): boolean => no === 1 && putaran === 1;
    const a = await jalan8({ tertebak: t }, SETELAN_AWAL);
    expect(status(a.hasil, 1).status).toBe('ditolak-tebak');
    const b = await jalan8({ tertebak: t }, setel({ tingkat: { penebak: 2 }, dicatat: ['penebak'] }));
    expect(status(b.hasil, 1).status).toBe('lolos');
    expect(status(b.hasil, 1).dicatat?.map((d) => d.sumber)).toContain('penebak tanpa kartu');
  });

  it('penebak tingkat 2: dua benar lolos, tiga benar ditolak', async () => {
    const dua = await jalan8({ tertebak: (no, p, ke) => no === 1 && p === 1 && ke <= 2 }, setel({ tingkat: { penebak: 2 } }));
    expect(status(dua.hasil, 1).status).toBe('lolos');
    const tiga = await jalan8({ tertebak: (no, p) => no === 1 && p === 1 }, setel({ tingkat: { penebak: 2 } }));
    expect(status(tiga.hasil, 1).status).toBe('ditolak-tebak');
  });

  it('pilihan-saja "dicatat": keduanya memilih kunci (yakin 70) → lanjut ke pembaca kartu, dicatat', async () => {
    const s = { pilihanSajaKena: (no: number, p: number) => no === 3 && p === 1 };
    expect(status((await jalan8(s, SETELAN_AWAL)).hasil, 3).status).toBe('ditolak-artefak');
    const b = await jalan8(s, setel({ tingkat: { pilihan_saja: 1 }, dicatat: ['pilihan_saja'] }));
    expect(status(b.hasil, 3).status).toBe('lolos');
    expect(status(b.hasil, 3).dicatat?.map((d) => d.sumber)).toContain('gerbang pilihan-saja');
  });

  it('kritikus tingkat 1: keberatan "bahasa" tidak menolak (dicatat); "kunci" tetap menolak', async () => {
    const bahasa = await jalan8({ kritikus: (no, p) => (no === 2 && p === 1 ? keberatan('bahasa') : undefined) }, setel({ tingkat: { kritikus: 1 } }));
    expect(status(bahasa.hasil, 2).status).toBe('lolos');
    expect(status(bahasa.hasil, 2).dicatat?.some((d) => d.sumber === 'kritikus' && d.alasan.includes('bahasa'))).toBe(true);
    const kunci = await jalan8({ kritikus: (no, p) => (no === 2 && p === 1 ? keberatan('kunci') : undefined) }, setel({ tingkat: { kritikus: 1 } }));
    expect(status(kunci.hasil, 2).status).toBe('ditolak-kritikus');
    const awal = await jalan8({ kritikus: (no, p) => (no === 2 && p === 1 ? keberatan('bahasa') : undefined) }, SETELAN_AWAL);
    expect(status(awal.hasil, 2).status).toBe('ditolak-kritikus');
  });

  it('kritikus tidak menjawab tetap dibawa (bukan lolos) kecuali kritikus "dicatat"', async () => {
    const a = await jalan8({ kritikus: (no, p) => (no === 1 && p === 1 ? 'bukan json' : undefined) }, setel({ tingkat: { kritikus: 2 } }));
    expect(status(a.hasil, 1).status).toBe('kritikus-tidak-menjawab');
    const b = await jalan8({ kritikus: (no, p) => (no === 1 && p === 1 ? 'bukan json' : undefined) }, setel({ tingkat: { kritikus: 2 }, dicatat: ['kritikus'] }));
    expect(status(b.hasil, 1).status).toBe('lolos');
  });

  it('pembaca kartu tingkat 1: kalimat membingungkan tidak menolak; jawaban salah tetap menolak', async () => {
    const bingung = (no: number, p: number, kunci: string): string | undefined =>
      no === 1 && p === 1 ? JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'k', membingungkan: [TULISAN[1]?.pesan.pesan ?? ''] }) : undefined;
    expect(status((await jalan8({ kartu: bingung }, SETELAN_AWAL)).hasil, 1).status).toBe('ditolak-kartu');
    expect(status((await jalan8({ kartu: bingung }, setel({ tingkat: { kartu: 1 } }))).hasil, 1).status).toBe('lolos');
    const salah = (no: number, p: number, kunci: string): string | undefined => (no === 1 && p === 1 ? JSON.stringify({ pilihan: kunci === 'a' ? 'b' : 'a', kartu: [1], alasan: 'k', membingungkan: [] }) : undefined);
    expect(status((await jalan8({ kartu: salah }, setel({ tingkat: { kartu: 1 } }))).hasil, 1).status).toBe('ditolak-kartu');
  });

  it('kode yang diturunkan (G-register) tidak menolak dan dicatat; kode pelindung tetap menolak', async () => {
    const gue = (no: number, _p: number, bagian: string): unknown => (no === 1 && bagian === 'pesan' ? { ...TULISAN[1]?.pesan, pesan: 'Gue denger sahamnya disetop bursa hari ini, katanya gara-gara bursa ragu usahanya bisa jalan terus.' } : undefined);
    expect(status((await jalan8({ tulis: gue }, SETELAN_AWAL)).hasil, 1).status).toBe('ditolak-pemeriksa');
    const b = await jalan8({ tulis: gue }, setel({ kode_dicatat: ['G-register'] }));
    expect(status(b.hasil, 1).status).toBe('lolos');
    expect(status(b.hasil, 1).dicatat?.map((d) => d.sumber)).toContain('pemeriksa: G-register');
    const murah = (no: number, _p: number, bagian: string): unknown => (no === 1 && bagian === 'pesan' ? { ...TULISAN[1]?.pesan, pesan: 'Sahamnya disetop bursa hari ini, padahal lagi murah, katanya bursa ragu usahanya jalan.' } : undefined);
    const c = await jalan8({ tulis: murah }, setel({ kode_dicatat: ['KATA_PENILAIAN', 'G-penilaian'] }));
    expect(status(c.hasil, 1).status).toBe('ditolak-pemeriksa');
  });

  it('validator M2d-8: "kabar buruk" (pengecualian M2d-5) tidak menolak; "buruk" sendirian menolak', async () => {
    const kabar = (no: number, _p: number, bagian: string): unknown => (no === 1 && bagian === 'pesan' ? { ...TULISAN[1]?.pesan, pesan: 'Sahamnya disetop bursa hari ini, pasti ada kabar buruk soal usahanya yang diragukan bursa.' } : undefined);
    expect(status((await jalan8({ tulis: kabar }, SETELAN_AWAL)).hasil, 1).umpan.join(' ')).not.toContain('KATA_PENILAIAN');
    const buruk = (no: number, _p: number, bagian: string): unknown => (no === 1 && bagian === 'pesan' ? { ...TULISAN[1]?.pesan, pesan: 'Sahamnya disetop bursa hari ini, usahanya buruk kata bursa.' } : undefined);
    expect(status((await jalan8({ tulis: buruk }, SETELAN_AWAL)).hasil, 1).umpan.join(' ')).toContain('KATA_PENILAIAN');
  });
});
