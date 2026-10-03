/**
 * Model palsu untuk mesin v3 (tes dan `npm run penyusun:v3 -- --palsu`): tanpa
 * jaringan, tanpa biaya nyata. Penulis = skenario; penebak rotasi & penebak
 * kuat bawaan memilih HURUF yang sama di tiap rotasi (isi kunci 1/4); pembaca
 * kartu bawaan memilih teks kunci; kritikus bawaan tanpa keberatan. Gerbang
 * kode SUNGGUHAN.
 */
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi } from '../draf.ts';
import type { PesanChat } from '../klien.ts';
import type { JawabanModel } from '../susun.ts';
import { jawabPalsu, KRITIK_BERSIH } from '../templat/palsu.ts';
import type { InfoTemplat, PanggilTemplat } from '../templat/penulis.ts';
import { beriLabel, drafTirt7, tirt7O1Diperbaiki } from './palsu.ts';
import { HURUF, type OmonganBebas } from './skema.ts';

/** Tiga omongan TIRT-7 M2d-11 berlabel yang lolos gerbang kode satu-per-satu (tiga kartu penentu berbeda). */
export function tigaOmonganTirt7(): [OmonganBebas, OmonganBebas, OmonganBebas] {
  const [, o2, o3] = drafTirt7();
  return [
    tirt7O1Diperbaiki(),
    beriLabel(o2),
    beriLabel({ ...o3, pilihan: { ...o3.pilihan, b: 'Betul, selisih penutupannya [[naik-2025-11-26-2025-12-09|Rp58]] sejak [[kelipatan-2025-11-26-2025-12-09|26 November]].' } }),
  ];
}

export const keluaranV3 = (xs: readonly OmonganBebas[]): string => JSON.stringify({ omongan: xs });

export interface JawabPenulisPalsu {
  teks: string;
  finish_reason?: string;
  penalaran?: string | null;
}

export interface SkenarioV3 {
  /** Jawaban panggilan penulis ke-n (1, 2, …). */
  penulis: (n: number, pesan: PesanChat[], info: InfoTemplat) => string | JawabPenulisPalsu;
  /** Jawaban penebak rotasi (24 panggilan per omongan). */
  rotasi?: (info: InfoTemplat, opsi: Record<KunciOpsi, string>, teksKunci: string) => string;
  /** Jawaban penebak kuat (4 panggilan per omongan). */
  kuat?: (info: InfoTemplat, opsi: Record<KunciOpsi, string>, teksKunci: string) => string;
  kartu?: (info: InfoTemplat, opsi: Record<KunciOpsi, string>, teksKunci: string) => string;
  kritikus?: (info: InfoTemplat) => string;
  /** Galat yang dilempar sebelum panggilan ke-n (mis. `PaguTercapai`). */
  galatSebelum?: (info: InfoTemplat, n: number) => Error | null;
}

function opsiPesan(user: string): Record<KunciOpsi, string> {
  const h = {} as Record<KunciOpsi, string>;
  for (const x of HURUF) h[x] = new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] ?? '';
  return h;
}

const salin = (teks: string): string => JSON.stringify({ teks, alasan: 'tebakan' });

export function panggilV3Palsu(s: SkenarioV3): { panggil: PanggilTemplat; log: InfoTemplat[]; pesanPenulis: PesanChat[][] } {
  const log: InfoTemplat[] = [];
  const pesanPenulis: PesanChat[][] = [];
  /** `${putaran}/${urut}` → teks polos kunci omongan itu. */
  const teksKunci = new Map<string, string>();
  let n = 0;
  let nPenulis = 0;
  const panggil: PanggilTemplat = (pesan, _setelan, info): Promise<JawabanModel> => {
    n += 1;
    const g = s.galatSebelum?.(info, n) ?? null;
    if (g !== null) return Promise.reject(g);
    log.push(info);
    const user = pesan.at(-1)?.content ?? '';
    const kunci = teksKunci.get(`${String(info.putaran)}/${String(info.omongan)}`) ?? '';
    if (info.jenis === 'tulis-bebas') {
      nPenulis += 1;
      pesanPenulis.push(pesan);
      const r = s.penulis(nPenulis, pesan, info);
      const j: JawabPenulisPalsu = typeof r === 'string' ? { teks: r } : r;
      try {
        const daftar = (JSON.parse(j.teks) as { omongan?: OmonganBebas[] }).omongan ?? [];
        daftar.filter((x) => x?.pilihan !== undefined && x.kunci !== undefined).forEach((x, i) => teksKunci.set(`${String(info.putaran)}/${String(i + 1)}`, teksPolos(x.pilihan[x.kunci])));
      } catch {
        // keluaran penulis tak terurai: tidak ada kunci yang dicatat
      }
      return Promise.resolve({ ...jawabPalsu(j.teks, 4_000), token_masuk: 3_000, token_keluar: 9_000, biaya_usd: 0.19, finish_reason: j.finish_reason ?? 'stop', penalaran: j.penalaran === undefined ? 'ringkasan berpikir penulis (palsu)' : j.penalaran, penyedia: 'Anthropic' });
    }
    const opsi = opsiPesan(user);
    const r = (info.ke - 1) % 4;
    if (info.jenis === 'gerbang-tebak') return Promise.resolve(jawabPalsu(s.rotasi?.(info, opsi, kunci) ?? salin(opsi[HURUF[(2 * r) % 4] as KunciOpsi]), 0));
    if (info.jenis === 'gerbang-tebak-kuat') return Promise.resolve({ ...jawabPalsu(s.kuat?.(info, opsi, kunci) ?? salin(opsi.a), 700), biaya_usd: 0.02, penyedia: 'Anthropic', penalaran: 'ringkasan berpikir penebak (palsu)' });
    if (info.jenis === 'gerbang-kartu') {
      const h = HURUF.find((x) => opsi[x] === kunci) ?? 'a';
      return Promise.resolve(jawabPalsu(s.kartu?.(info, opsi, kunci) ?? JSON.stringify({ pilihan: h, kartu: [1], alasan: 'kartu 1', membingungkan: [] })));
    }
    if (info.jenis === 'kritikus') return Promise.resolve(jawabPalsu(s.kritikus?.(info) ?? KRITIK_BERSIH, 5_000));
    return Promise.reject(new Error(`jenis ${info.jenis} tidak dikenal pemanggil palsu v3`));
  };
  return { panggil, log, pesanPenulis };
}
