/**
 * Bantuan uji lingkar TIRT generasi OpenRouter (dipindah dari
 * `agen-tirt.test.ts` di M2d-6 supaya tes lain bisa memakainya tanpa
 * menjalankan ulang tes M2d-5). Paket dan draf sungguhan (TIRT, terlacak dari
 * M2d-1), validator sungguhan; hanya model yang dipalsukan.
 */
import { readFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import { GENERASI_M2D5, jalankanPeran, type Generasi, type HasilPeran, type InfoPeran, type PanggilPeran } from './agen-peran.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { PencatatJejak } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import type { PaketFakta } from './paket.ts';
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
