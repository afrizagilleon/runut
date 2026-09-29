/**
 * M2d-5: lingkar berperan generasi OpenRouter + TIRT (`GENERASI_M2D5`).
 *
 * Paket dan draf sungguhan (TIRT, terlacak dari M2d-1), validator sungguhan;
 * hanya model yang dipalsukan. Pembaca kartu dan penebak palsu membaca soal
 * dari PESAN yang benar-benar dikirim (bukan dari fixture), supaya posisi
 * kunci yang diatur kode (D-4) ikut teruji.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../skema/rujukan.ts';
import { GENERASI_M2D4, GENERASI_M2D5, jalankanPeran, type Generasi, type HasilPeran, type InfoPeran, type PanggilPeran } from './agen-peran.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { PencatatJejak, validasiJejak } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import type { PaketFakta } from './paket.ts';
import { PETUNJUK_PENJAWAB, PETUNJUK_PENJAWAB_BINGUNG, golongkanBingung, kartuOmongan, uraiJawabanKartuBingung } from './gerbang-kartu.ts';
import { kemiripan } from './gerbang-mirip.ts';
import { soalTebak } from './gerbang-tebak.ts';
import { gPenilaian } from './gerbang-penilaian.ts';
import { PENALARAN_M2D5, RUANG_JAWABAN_MIN } from './penalaran.ts';
import { POLA_KUNCI, aturPosisiKunci, hurufKunciKode, polaKunci, rujukanHuruf } from './posisi-kunci.ts';
import { rencanaSudut, type Sudut } from './sudut.ts';
import { pesanPaket, type JawabanModel, type SetelanPanggil } from './susun.ts';
import { validasiDraf } from './validasi.ts';

export const PAKET = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
const DRAF = (
  JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8')) as {
    draf: DrafSimulasi;
  }
).draf;
export const om = (no: number): OmonganDraf => JSON.parse(JSON.stringify(DRAF.omongan[no - 1])) as OmonganDraf;
const SUDUT_FIXTURE: Sudut[] = (() => {
  const awal = [1, 2, 3].map((no) => om(no).kartu_penentu[0] as string);
  const semua = rencanaSudut(PAKET);
  return [...awal.map((id) => semua.find((x) => x.fact_id === id) as Sudut), ...semua.filter((x) => !awal.includes(x.fact_id))];
})();

export interface Rekaman {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPeran;
}

export interface Skenario {
  tertebak?: (no: number, putaran: number, ke: number) => boolean;
  kritikus?: (no: number, putaran: number, ulang: number) => { teks: string; finish?: string } | Error;
  penulis?: (no: number, putaran: number) => OmonganDraf | string | undefined;
  /** Balasan pembaca kartu; bawaan: menjawab kunci, tanpa kalimat membingungkan. */
  kartu?: (no: number, putaran: number, kunci: KunciOpsi, soal: string) => string | undefined;
  /** Balasan mentah tambahan untuk tiap panggilan (mis. penyedia, finish). */
  jawaban?: (info: InfoPeran) => Partial<JawabanModel> | undefined;
}

export const TANPA_KEBERATAN = JSON.stringify({
  cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false },
  cek_pilihan: { juga_benar: [], alasan: '' },
  keberatan: [],
  arahan: '',
});

/** Pilihan a–d seperti tertulis di soal yang dikirim ke pembaca kartu/penebak. */
export function pilihanDiSoal(soal: string): Record<KunciOpsi, string> {
  const hasil = {} as Record<KunciOpsi, string>;
  for (const k of ['a', 'b', 'c', 'd'] as const) {
    const m = new RegExp(`^${k}\\) (.*)$`, 'm').exec(soal);
    hasil[k] = m?.[1] ?? '';
  }
  return hasil;
}

/** Huruf kunci di soal yang dikirim: pilihan yang teksnya sama dengan pilihan kunci draf fixture (posisi bisa sudah dipindah kode). */
export function kunciDiSoal(soal: string, o: OmonganDraf): KunciOpsi {
  const target = teksPolos(o.pilihan[o.kunci]);
  const p = pilihanDiSoal(soal);
  const k = (['a', 'b', 'c', 'd'] as const).find((x) => p[x] === target);
  if (k === undefined) throw new Error(`pilihan kunci "${target}" tidak ada di soal`);
  return k;
}

export function palsu(s: Skenario, drafNo: (no: number, putaran: number) => OmonganDraf = (no, p) => {
  const g = s.penulis?.(no, p);
  return typeof g === 'object' && g !== null ? g : om(no);
}): { panggil: PanggilPeran; rekaman: Rekaman[] } {
  const rekaman: Rekaman[] = [];
  const panggil: PanggilPeran = async (pesan, setelan, info) => {
    rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan }, info: { ...info } });
    const tambah = s.jawaban?.(info) ?? {};
    const j = (teks: string, finish = 'stop'): JawabanModel => ({
      teks, token_masuk: 1000, token_keluar: 500, latensi_ms: 3, finish_reason: finish, biaya_usd: 0.001, penyedia: 'DeepInfra', token_penalaran: 300, ...tambah,
    });
    const no = info.omongan ?? 0;
    if (info.jenis === 'susun' || info.jenis === 'tulis-ulang') {
      const ganti = s.penulis?.(no, info.putaran);
      if (typeof ganti === 'string') return j(ganti);
      return j(JSON.stringify({ omongan: [{ no, ...(ganti ?? om(no)) }] }));
    }
    const soal = pesan[1]?.content ?? '';
    const kunci = kunciDiSoal(soal, drafNo(no, info.putaran));
    const lain: KunciOpsi = kunci === 'a' ? 'c' : 'a';
    if (info.jenis === 'gerbang-kartu') {
      return j(s.kartu?.(no, info.putaran, kunci, soal) ?? JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'dari kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'gerbang-tebak') {
      const kena = s.tertebak?.(no, info.putaran, info.ke) ?? false;
      return j(JSON.stringify({ pilihan: kena ? kunci : lain, yakin: 60, alasan: 'nadanya' }));
    }
    const k = s.kritikus?.(no, info.putaran, info.ulang ?? 0) ?? { teks: TANPA_KEBERATAN };
    if (k instanceof Error) throw k;
    return j(k.teks, k.finish ?? 'stop');
  };
  return { panggil, rekaman };
}

export async function jalan(
  s: Skenario,
  generasi: Generasi = GENERASI_M2D5,
  maksPutaran?: number,
): Promise<{ hasil: HasilPeran; rekaman: Rekaman[]; jejak: PencatatJejak }> {
  const { panggil, rekaman } = palsu(s);
  const jam = (): Date => new Date('2026-09-30T00:00:00Z');
  const jejak = new PencatatJejak({
    paket: PAKET, model: MODEL_OR_DEEPSEEK, promptSistem: generasi.promptPenulis(), pesanPaket: pesanPaket(PAKET), ringkasanPrompt: 'uji',
    jalur: null, jam, versi: 2, dibuatOleh: 'factory/llm/agen-peran.ts',
    modelPeran: { penulis: MODEL_OR_DEEPSEEK, penebak: MODEL_OR_DEEPSEEK, 'pembaca-kartu': MODEL_OR_DEEPSEEK, kritikus: MODEL_OR_GLM },
  });
  const hasil = await jalankanPeran({
    paket: PAKET, panggil, validasi: validasiDraf, jam, jejak, rencanaSudut: SUDUT_FIXTURE, generasi,
    ...(maksPutaran === undefined ? {} : { maksPutaran }),
  });
  return { hasil, rekaman, jejak };
}

export const dari = (r: Rekaman[], peran: InfoPeran['peran']): Rekaman[] => r.filter((x) => x.info.peran === peran);

describe('M2d-5 — model OpenRouter per peran (D-1)', () => {
  it('penulis, pembaca kartu, penebak 1–2 = DeepSeek; kritikus dan penebak 3 = GLM — semua ID OpenRouter tanpa sufiks', async () => {
    const { hasil, rekaman } = await jalan({});
    expect(hasil.lolos).toBe(true);
    for (const r of rekaman) {
      const harap = r.info.peran === 'kritikus' || (r.info.peran === 'penebak' && r.info.ke === 3) ? MODEL_OR_GLM : MODEL_OR_DEEPSEEK;
      expect(r.info.model, `${r.info.peran}/${String(r.info.ke)}`).toBe(harap);
      expect(r.info.model).not.toContain(':');
    }
    expect(hasil.model_peran).toEqual({ penulis: MODEL_OR_DEEPSEEK, penebak: MODEL_OR_DEEPSEEK, 'pembaca-kartu': MODEL_OR_DEEPSEEK, kritikus: MODEL_OR_GLM });
    // M2d-4 tidak berubah: model Featherless.
    const m2d4 = await jalan({}, GENERASI_M2D4, 1);
    expect(m2d4.rekaman.every((r) => !r.info.model.startsWith('deepseek/') && !r.info.model.startsWith('z-ai/'))).toBe(true);
  });

  it('penyedia yang melayani (dari respons) dicatat di jejak setiap langkah bermodel', async () => {
    const { jejak } = await jalan({ jawaban: (i) => ({ penyedia: i.peran === 'kritikus' ? 'Z.AI' : 'DeepInfra' }) });
    const j = jejak.jejak();
    expect(validasiJejak(j)).toEqual([]);
    const bermodel = j.langkah.filter((l) => ['susun', 'gerbang-kartu', 'gerbang-tebak', 'kritikus'].includes(l.jenis));
    expect(bermodel.length).toBeGreaterThan(0);
    for (const l of bermodel) {
      expect(l.rincian['penyedia'], `${l.jenis}/${String(l.omongan)}`).toEqual(expect.arrayContaining([l.jenis === 'kritikus' ? 'Z.AI' : 'DeepInfra']));
    }
  });
});

describe('M2d-5 — batas penalaran (D-3)', () => {
  it('penulis: reasoning.max_tokens + max_tokens yang menyisakan ruang jawaban; cadangan tanpa berpikir = reasoning.enabled false', async () => {
    const { rekaman } = await jalan({ penulis: (no, p) => (no === 1 && p === 1 ? '{rusak' : undefined) }, GENERASI_M2D5, 1);
    const p1 = dari(rekaman, 'penulis').filter((r) => r.info.omongan === 1);
    expect(p1.map((r) => r.info.ulang)).toEqual([0, 1]);
    expect(p1[0]?.setelan).toMatchObject({ maxTokens: PENALARAN_M2D5.penulis.maxTokens, tambahanBadan: { reasoning: { max_tokens: PENALARAN_M2D5.penulis.penalaran } } });
    expect(p1[1]?.setelan.tambahanBadan).toEqual({ reasoning: { enabled: false } });
    expect(PENALARAN_M2D5.penulis.maxTokens - PENALARAN_M2D5.penulis.penalaran).toBeGreaterThanOrEqual(RUANG_JAWABAN_MIN.penulis);
  });

  it('kritikus dan penebak GLM membawa reasoning.max_tokens; penebak DeepSeek dan pembaca kartu tidak diubah', async () => {
    const { rekaman } = await jalan({});
    for (const r of dari(rekaman, 'kritikus')) {
      expect(r.setelan).toMatchObject({ maxTokens: PENALARAN_M2D5.kritikus.maxTokens, tambahanBadan: { reasoning: { max_tokens: PENALARAN_M2D5.kritikus.penalaran } } });
    }
    for (const r of dari(rekaman, 'penebak')) {
      if (r.info.ke === 3) {
        expect(r.setelan).toMatchObject({ maxTokens: PENALARAN_M2D5.penebakGlm.maxTokens, tambahanBadan: { reasoning: { max_tokens: PENALARAN_M2D5.penebakGlm.penalaran } } });
      } else {
        expect(r.setelan.tambahanBadan).toBeUndefined();
      }
    }
    for (const r of dari(rekaman, 'pembaca-kartu')) expect(r.setelan.tambahanBadan).toBeUndefined();
    expect(PENALARAN_M2D5.kritikus.maxTokens - PENALARAN_M2D5.kritikus.penalaran).toBeGreaterThanOrEqual(RUANG_JAWABAN_MIN.kritikus);
    expect(PENALARAN_M2D5.penebakGlm.maxTokens - PENALARAN_M2D5.penebakGlm.penalaran).toBeGreaterThanOrEqual(RUANG_JAWABAN_MIN.penebak);
    // M2d-4 tidak berubah: tanpa medan reasoning.
    const m2d4 = await jalan({}, GENERASI_M2D4, 1);
    for (const r of m2d4.rekaman) expect(JSON.stringify(r.setelan.tambahanBadan ?? {})).not.toContain('reasoning');
  });

  it('kritikus menjawab KOSONG (penalaran habis, finish stop) = terpotong: diulang sekali, lalu "tidak menjawab"; biaya kedua panggilan tetap tercatat', async () => {
    const { hasil, jejak } = await jalan({ kritikus: (no, p) => (no === 1 && p === 1 ? { teks: '' } : { teks: TANPA_KEBERATAN }) }, GENERASI_M2D5, 1);
    expect(hasil.riwayat[0]?.omongan[0]).toMatchObject({ status: 'kritikus-tidak-menjawab', kritik: { menjawab: false, terpotong: true } });
    const l = jejak.jejak().langkah.find((x) => x.jenis === 'kritikus' && x.omongan === 1);
    expect(l).toMatchObject({ panggilan: 2, biaya_usd: 0.002, rincian: { terpotong: true } });
  });

  it('penulis menjawab KOSONG = terpotong: cadangan tanpa berpikir menulis; biaya panggilan kosong tetap tercatat', async () => {
    let n = 0;
    const { hasil, jejak } = await jalan({ penulis: (no, p) => (no === 2 && p === 1 && n++ === 0 ? '' : undefined) }, GENERASI_M2D5, 1);
    expect(hasil.riwayat[0]?.panggilan.filter((x) => x.omongan === 2).map((x) => [x.mode_berpikir, x.terurai, x.biaya_usd])).toEqual([[true, false, 0.001], [false, true, 0.001]]);
    const ls = jejak.jejak().langkah.filter((x) => x.jenis === 'susun' && x.omongan === 2);
    expect(ls[0]?.rincian).toMatchObject({ terpotong: true });
    expect(ls[1]?.alasan[0]).toContain('cadangan tanpa berpikir (jawaban kosong (penalaran menghabiskan anggaran))');
  });
});

describe('M2d-5 — posisi kunci diatur kode (D-4)', () => {
  it('huruf kunci deterministik dari id paket + nomor omongan; 60 pola, tak satu pun seragam', () => {
    expect(POLA_KUNCI).toHaveLength(60);
    for (const [x, y, z] of POLA_KUNCI) expect(x === y && y === z).toBe(false);
    for (const id of ['tirt', 'ultj', 'dada', 'paket-lain']) {
      const h = [1, 2, 3].map((no) => hurufKunciKode(id, no));
      expect(new Set(h).size).toBeGreaterThan(1);
      expect([1, 2, 3].map((no) => hurufKunciKode(id, no))).toEqual(h);
      expect(polaKunci(id)).toEqual(h);
    }
    // Bergantung pada id paket (sha256), bukan hanya nomor omongan; TIRT dipatok supaya jalan ulang memberi huruf yang sama.
    expect(polaKunci('tirt')).toEqual(['c', 'd', 'd']);
    expect(new Set(['tirt', 'ultj', 'dada', 'aaaa', 'bbbb', 'cccc'].map((id) => polaKunci(id).join(''))).size).toBeGreaterThan(2);
  });

  it('aturPosisiKunci: teks kunci pindah ke huruf sasaran, pilihan lain bergeser dengan urutan tetap; validator tetap menerima', () => {
    const o = om(1);
    for (const ke of ['a', 'b', 'c', 'd'] as const) {
      const r = aturPosisiKunci(o, ke);
      expect(r?.omongan.kunci).toBe(ke);
      expect(r?.omongan.pilihan[ke]).toBe(o.pilihan[o.kunci]);
      const lamaLain = (['a', 'b', 'c', 'd'] as const).filter((h) => h !== o.kunci).map((h) => o.pilihan[h]);
      const baruLain = (['a', 'b', 'c', 'd'] as const).filter((h) => h !== ke).map((h) => r?.omongan.pilihan[h]);
      expect(baruLain).toEqual(lamaLain);
      expect(r?.omongan.penjelasan).toBe(o.penjelasan);
    }
    expect(aturPosisiKunci({ ...o, kunci: 'e' }, 'a')).toBeNull();
    expect(validasiDraf({ omongan: [1, 2, 3].map((no) => aturPosisiKunci(om(no), hurufKunciKode('tirt', no))?.omongan) }, PAKET)).toEqual([]);
  });

  it('di lingkar: kunci draf = huruf kode ("posisi kunci diatur kode" di jejak); pembaca kartu, kritikus, penebak melihat urutan sesudah dipindah', async () => {
    // Penulis menaruh ketiga kunci di "a" — tanpa kode, KUNCI_SERAGAM.
    const kunciA = (no: number): OmonganDraf => aturPosisiKunci(om(no), 'a')?.omongan as OmonganDraf;
    expect(validasiDraf({ omongan: [kunciA(1), kunciA(2), kunciA(3)] }, PAKET).map((m) => m.kode)).toContain('KUNCI_SERAGAM');
    const { hasil, rekaman, jejak } = await jalan({ penulis: (no) => kunciA(no) });
    expect(hasil.lolos).toBe(true);
    expect(hasil.draf?.omongan.map((o) => o.kunci)).toEqual(polaKunci('tirt'));
    for (const r of rekaman.filter((x) => x.info.peran !== 'penulis')) {
      const no = r.info.omongan ?? 0;
      expect(kunciDiSoal(r.pesan[1]?.content ?? '', om(no)), `${r.info.peran} ${String(no)}`).toBe(hurufKunciKode('tirt', no));
    }
    for (const r of dari(rekaman, 'kritikus')) expect(r.pesan[1]?.content).toContain(`KUNCI: ${hurufKunciKode('tirt', r.info.omongan ?? 0)}`);
    const tulis = jejak.jejak().langkah.filter((l) => l.jenis === 'susun');
    expect(tulis.map((l) => l.rincian['posisi_kunci'])).toEqual(
      [1, 2, 3].map((no) => expect.objectContaining({ catatan: 'posisi kunci diatur kode', dari: 'a', ke: hurufKunciKode('tirt', no) })),
    );
    // M2d-4: kunci tetap tulisan penulis.
    const m2d4 = await jalan({ penulis: (no) => kunciA(no) }, GENERASI_M2D4, 1);
    expect(m2d4.hasil.riwayat[0]?.masalah.map((m) => m.kode)).toContain('KUNCI_SERAGAM');
  });

  it('umpan balik yang menyebut huruf merujuk versi SESUDAH dipindah — versi itulah yang ditampilkan ulang ke penulis', async () => {
    let disebut = '';
    const s: Skenario = {
      kritikus: (no, p) => {
        if (!(no === 2 && p === 1)) return { teks: TANPA_KEBERATAN };
        const k = hurufKunciKode('tirt', 2);
        disebut = k === 'a' ? 'b' : 'a';
        return {
          teks: JSON.stringify({
            cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false },
            cek_pilihan: { juga_benar: [disebut], alasan: 'kartu 1 juga membenarkannya' },
            keberatan: [],
            arahan: '',
          }),
        };
      },
    };
    const { rekaman, hasil } = await jalan(s, GENERASI_M2D5, 2);
    const ulang = dari(rekaman, 'penulis').find((r) => r.info.putaran === 2 && r.info.omongan === 2)?.pesan[1]?.content ?? '';
    expect(ulang).toContain(`Pilihan ${disebut} juga benar menurut kartu`);
    const tampil = /Versi sebelumnya omongan 2 DITOLAK: (\{.*\})$/m.exec(ulang)?.[1] ?? '{}';
    const versi = JSON.parse(tampil) as OmonganDraf;
    expect(versi.kunci).toBe(hurufKunciKode('tirt', 2));
    // Teks yang ditunjuk kritikus = teks di huruf itu pada versi yang ditampilkan.
    const kritikSoal = dari(rekaman, 'kritikus').find((r) => r.info.omongan === 2 && r.info.putaran === 1)?.pesan[1]?.content ?? '';
    expect(teksPolos(versi.pilihan[disebut as KunciOpsi])).toBe(pilihanDiSoal(kritikSoal)[disebut as KunciOpsi]);
    expect(hasil.riwayat[0]?.omongan[1]?.status).toBe('ditolak-kritikus');
  });

  it('penjelasan yang merujuk huruf pilihan ditolak PEMERIKSA (HURUF_PILIHAN); M2d-4 tidak; penulis M2d-5 tidak diminta mengatur huruf kunci', async () => {
    expect(rujukanHuruf('Jadi pilihan b yang cocok, bukan (c) atau d) ini.')).toEqual(['pilihan b', '(c)', 'd)']);
    expect(rujukanHuruf('Harga adalah Rp48 dan data ada di kartu.')).toEqual([]);
    const o1 = om(1);
    const salah: OmonganDraf = { ...o1, penjelasan: `${o1.penjelasan} Jadi pilihan ${o1.kunci} yang cocok.` };
    const { hasil, rekaman } = await jalan({ penulis: (no, p) => (no === 1 && p === 1 ? salah : undefined) }, GENERASI_M2D5, 1);
    const r1 = hasil.riwayat[0]?.omongan[0];
    expect(r1?.status).toBe('ditolak-pemeriksa');
    expect(r1?.umpan.join('\n')).toContain('[pemeriksa: HURUF_PILIHAN] Penjelasan merujuk huruf pilihan');
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 1 && r.info.peran !== 'penulis')).toHaveLength(0);
    const m2d4 = await jalan({ penulis: (no, p) => (no === 1 && p === 1 ? salah : undefined) }, GENERASI_M2D4, 1);
    expect(m2d4.hasil.riwayat[0]?.omongan[0]?.status).toBe('lolos');
    // Tidak ada syarat huruf kunci di permintaan penulis M2d-5; prompt menyebut aturan huruf kunci.
    const tulis2 = dari(rekaman, 'penulis').map((r) => r.pesan[1]?.content ?? '');
    for (const t of tulis2) expect(t).not.toContain('huruf kunci omongan ini tidak boleh');
    expect(dari(rekaman, 'penulis')[0]?.pesan[0]?.content).toContain('HURUF KUNCI DIATUR KODE');
  });
});

describe('M2d-5 — G-penilaian dan G-mirip di pemeriksa (D-5, D-6)', () => {
  it('pesan dengan penilaian ("Aman lah.") ditolak PEMERIKSA sebelum peran model mana pun; M2d-4 meloloskannya', async () => {
    const o1 = om(1);
    const aman: OmonganDraf = { ...o1, pesan: `${o1.pesan} Aman lah.` };
    expect(validasiDraf({ omongan: [aman, om(2), om(3)] }, PAKET)).toEqual([]);
    const s: Skenario = { penulis: (no, p) => (no === 1 && p === 1 ? aman : undefined) };
    const { hasil, rekaman, jejak } = await jalan(s, GENERASI_M2D5, 2);
    const r1 = hasil.riwayat[0]?.omongan[0];
    expect(r1?.status).toBe('ditolak-pemeriksa');
    expect(r1?.umpan.join('\n')).toContain('[pemeriksa: G-penilaian] Pesan teman memuat penilaian/ajakan yang tak bisa dicek kartu: "Aman"');
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 1 && r.info.peran !== 'penulis')).toHaveLength(0);
    expect(dari(rekaman, 'penulis').find((r) => r.info.putaran === 2 && r.info.omongan === 1)?.pesan[1]?.content).toContain('[pemeriksa: G-penilaian]');
    const g = jejak.jejak().langkah.find((l) => l.jenis === 'gerbang-g' && l.omongan === 1 && l.putaran === 1);
    expect(g).toMatchObject({ putusan: 'tolak', rincian: { penilaian: { tolak: true, temuan: [{ frasa: 'Aman' }] } } });
    expect(validasiJejak(jejak.jejak())).toEqual([]);
    const m2d4 = await jalan(s, GENERASI_M2D4, 1);
    expect(m2d4.hasil.riwayat[0]?.omongan[0]?.status).toBe('lolos');
  });

  it('omongan yang pola pilihannya meniru omongan TERKUNCI ditolak G-mirip; bila keduanya baru, yang bernomor besar ditulis ulang', async () => {
    const o1 = om(1);
    const tiru = (no: number): OmonganDraf => ({ ...om(no), pilihan: { ...o1.pilihan }, kunci: o1.kunci, kartu: o1.kartu, kartu_penentu: [...om(no).kartu_penentu], penjelasan: om(no).penjelasan });
    expect(kemiripan(tiru(3).pilihan, o1.pilihan)).toBe(1);
    const { hasil } = await jalan({ penulis: (no, p) => (no === 3 && p === 1 ? tiru(3) : undefined) }, GENERASI_M2D5, 1);
    const r3 = hasil.riwayat[0]?.omongan[2];
    expect(r3?.umpan.join('\n')).toContain('[pemeriksa: G-mirip] Pola keempat pilihan omongan ini hampir sama dengan omongan 1');
    expect(hasil.riwayat[0]?.omongan[0]?.umpan.join('\n') ?? '').not.toContain('G-mirip');
  });

  it('contoh gaya yang memuat penilaian ("aman lah", v2-056/v2-061) tidak pernah ditunjukkan ke penulis M2d-5', async () => {
    const bank = GENERASI_M2D5.bank();
    expect(bank.map((k) => k.id)).not.toContain('v2-056');
    expect(bank.map((k) => k.id)).not.toContain('v2-061');
    expect(GENERASI_M2D4.bank().map((k) => k.id)).toContain('v2-056');
    for (const k of bank) expect(gPenilaian(k.teks).tolak, k.id).toBe(false);
  });
});

describe('M2d-5 — pembaca kartu menandai kalimat membingungkan (D-7)', () => {
  const soalDari = (no: number): { soal: ReturnType<typeof soalTebak>; kartu: ReturnType<typeof kartuOmongan> } => ({ soal: soalTebak(om(no)), kartu: kartuOmongan(om(no), PAKET) });

  it('petunjuk M2d-5 meminta "membingungkan" (kutipan persis); M2d-4 tetap petunjuk lama', async () => {
    expect(PETUNJUK_PENJAWAB_BINGUNG).toContain('"membingungkan": ["kalimat persis"]');
    const { rekaman } = await jalan({});
    for (const r of dari(rekaman, 'pembaca-kartu')) expect(r.pesan[0]?.content).toBe(PETUNJUK_PENJAWAB_BINGUNG);
    const m2d4 = await jalan({}, GENERASI_M2D4, 1);
    for (const r of dari(m2d4.rekaman, 'pembaca-kartu')) expect(r.pesan[0]?.content).toBe(PETUNJUK_PENJAWAB);
  });

  it('golongkan: kutipan pesan/pilihan = penulis; kutipan isi kartu = kartu (dengan fact_id); komentar lepas = tak dikenal', () => {
    const { soal, kartu } = soalDari(1);
    const pesan = soal.pesan.split(/[.!?]/)[0] ?? '';
    expect(golongkanBingung(pesan, soal, kartu)).toMatchObject({ sumber: 'penulis', bagian: 'pesan' });
    expect(golongkanBingung(soal.pilihan.b, soal, kartu)).toMatchObject({ sumber: 'penulis', bagian: 'pilihan b' });
    const k1 = kartu[0];
    expect(golongkanBingung(k1?.isi.split('.')[0] ?? '', soal, kartu)).toMatchObject({ sumber: 'kartu', fact_id: k1?.fact_id });
    expect(golongkanBingung('aku tidak paham maksud grafiknya', soal, kartu)).toMatchObject({ sumber: 'tak-dikenal', bagian: null });
  });

  it('kalimat TULISAN PENULIS yang ditandai → ditolak-kartu dengan kutipannya ke penulis; kritikus dan penebak tidak dipanggil', async () => {
    const kutip = soalTebak(om(2)).pesan.split(/[.!?]/)[0]?.trim() ?? '';
    const s: Skenario = {
      kartu: (no, p, kunci) => (no === 2 && p === 1 ? JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'x', membingungkan: [kutip] }) : undefined),
    };
    const { hasil, rekaman, jejak } = await jalan(s, GENERASI_M2D5, 2);
    const r2 = hasil.riwayat[0]?.omongan[1];
    expect(r2).toMatchObject({ status: 'ditolak-kartu', suara: { pemeriksa: true, kartu: false, kritikus: null, tebak: null } });
    expect(r2?.umpan[0]).toContain(`Pembaca yang memegang kartu bingung dengan kalimat tulisanmu: "${kutip}" (pesan)`);
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 2 && ['kritikus', 'penebak'].includes(r.info.peran))).toHaveLength(0);
    expect(dari(rekaman, 'penulis').find((r) => r.info.putaran === 2 && r.info.omongan === 2)?.pesan[1]?.content).toContain(kutip);
    const l = jejak.jejak().langkah.find((x) => x.jenis === 'gerbang-kartu' && x.omongan === 2 && x.putaran === 1);
    expect(l).toMatchObject({ putusan: 'tolak', rincian: { membingungkan: [{ kutipan: kutip, sumber: 'penulis', bagian: 'pesan' }] } });
  });

  it('kalimat TEKS KARTU paket yang ditandai → hanya dicatat (bahan D-8); omongan tetap lolos', async () => {
    const isi = kartuOmongan(om(1), PAKET)[0]?.isi.split('.')[0] ?? '';
    const s: Skenario = { kartu: (no, _p, kunci) => (no === 1 ? JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'x', membingungkan: [isi] }) : undefined) };
    const { hasil, jejak } = await jalan(s, GENERASI_M2D5, 1);
    expect(hasil.riwayat[0]?.omongan[0]?.status).toBe('lolos');
    const l = jejak.jejak().langkah.find((x) => x.jenis === 'gerbang-kartu' && x.omongan === 1);
    expect(l).toMatchObject({ putusan: 'lolos', rincian: { membingungkan: [{ kutipan: isi, sumber: 'kartu', fact_id: om(1).kartu[0] }] } });
    expect(l?.alasan.join(' ')).toContain(`dicatat (kartu, kartu 1): "${isi}"`);
  });

  it('jawaban tanpa medan "membingungkan" = tak terbaca: diulang sekali, lalu ditolak (konservatif)', async () => {
    const s: Skenario = { kartu: (no, p, kunci) => (no === 3 && p === 1 ? JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'x' }) : undefined) };
    const { hasil, rekaman } = await jalan(s, GENERASI_M2D5, 1);
    expect(dari(rekaman, 'pembaca-kartu').filter((r) => r.info.omongan === 3).map((r) => r.info.ulang)).toEqual([0, 1]);
    expect(hasil.riwayat[0]?.omongan[2]).toMatchObject({ status: 'ditolak-kartu' });
    expect(uraiJawabanKartuBingung('{"pilihan":"a","kartu":[1],"alasan":"x","membingungkan":[]}')).toMatchObject({ membingungkan: [] });
    expect(uraiJawabanKartuBingung('{"pilihan":"a","kartu":[1],"alasan":"x"}')).toBeNull();
  });
});
