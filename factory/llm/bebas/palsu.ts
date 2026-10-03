/**
 * Model palsu untuk mesin bebas (tes dan `npm run penyusun -- --palsu --mesin
 * bebas`): tanpa jaringan, tanpa biaya. Penulis = skenario (bawaan: draf
 * TIRT-7 M2d-11 diberi label + umpan balik, omongan 1 dengan kartu ke-3
 * supaya Rp89 ada di kartu, omongan 3 tanpa [[misal|…]]); penebak rotasi
 * berganti isi tiap rotasi (kunci 1/4); pembaca kartu memilih teks kunci;
 * kritikus tanpa keberatan. Gerbang kode SUNGGUHAN.
 */
import { readFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import type { PesanChat } from '../klien.ts';
import type { JawabanModel } from '../susun.ts';
import { NAMA_KESALAHAN, type JenisKesalahan } from '../templat/label.ts';
import { jawabPalsu, KRITIK_BERSIH } from '../templat/palsu.ts';
import type { InfoTemplat, PanggilTemplat } from '../templat/penulis.ts';
import { HURUF, type OmonganBebas } from './skema.ts';

/** Tambahkan label pengecoh + umpan balik + pertanyaan cek yang sah secara struktur. Murni. */
export function beriLabel(o: OmonganDraf, jenis: JenisKesalahan[] = ['salah-periode', 'nyaris-benar-angka', 'pertanyaan-lain']): OmonganBebas {
  const lain = HURUF.filter((h) => h !== o.kunci);
  const pengecoh = Object.fromEntries(
    lain.map((h, i) => {
      const j = jenis[i % jenis.length] as JenisKesalahan;
      const rujukan = o.kartu[i % o.kartu.length] ?? '';
      return [h, { jenis: j, rujukan, umpan_balik: `${NAMA_KESALAHAN[j]}: cocokkan lagi dengan kartu ${String(o.kartu.indexOf(rujukan) + 1)}.` }];
    }),
  );
  return { ...o, pengecoh, pertanyaan_cek: 'Angka ini milik tanggal yang mana menurut kartu?' };
}

/** Draf TIRT-7 M2d-11 (versi lulus) apa adanya. */
export function drafTirt7(): [OmonganDraf, OmonganDraf, OmonganDraf] {
  const h = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/hasil.json`, 'utf8')) as { kunci: Array<{ no: number; omongan: OmonganDraf }> };
  return [1, 2, 3].map((n) => h.kunci.find((k) => k.no === n)?.omongan as OmonganDraf) as [OmonganDraf, OmonganDraf, OmonganDraf];
}

/** Omongan 1 TIRT-7 dengan kartu 5 Desember ditambahkan (Rp89 kini ada di kartu). */
export function tirt7O1Diperbaiki(): OmonganBebas {
  const [o1] = drafTirt7();
  return beriLabel({ ...o1, kartu: [...o1.kartu, 'harga-2025-12-05'] });
}

export type PenulisPalsu = (versi: number, diminta: number[], pesan: PesanChat[], n: number) => string;

const keluaran = (xs: Array<[number, OmonganBebas]>): string => JSON.stringify({ omongan: xs.map(([no, o]) => ({ no, ...o })) });

/** Penulis palsu bawaan: ketiga omongan TIRT-7 berlabel (o1 & o3 melanggar angka-di-kartu di versi 1, o1 diperbaiki di versi 2). */
export const penulisPalsuBawaan: PenulisPalsu = (versi, diminta) => {
  const [o1, o2, o3] = drafTirt7();
  const per: Record<number, OmonganBebas> = { 1: versi === 1 ? beriLabel(o1) : tirt7O1Diperbaiki(), 2: beriLabel(o2), 3: beriLabel(o3) };
  return keluaran(diminta.map((n) => [n, per[n] as OmonganBebas]));
};

export interface SkenarioBebas {
  penulis?: PenulisPalsu;
  rotasi?: (info: InfoTemplat, opsi: Record<KunciOpsi, string>) => string;
  kritikus?: (info: InfoTemplat) => string;
  /** Galat yang dilempar sebelum panggilan ke-n (mis. PaguTercapai). */
  galatSebelum?: (info: InfoTemplat, n: number) => Error | null;
}

function opsiPesan(user: string): Record<KunciOpsi, string> {
  const h = {} as Record<KunciOpsi, string>;
  for (const x of HURUF) h[x] = new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] ?? '';
  return h;
}

export function panggilBebasPalsu(s: SkenarioBebas = {}): { panggil: PanggilTemplat; log: InfoTemplat[]; pesanPenulis: PesanChat[][] } {
  const log: InfoTemplat[] = [];
  const pesanPenulis: PesanChat[][] = [];
  const teksKunci = new Map<number, string>();
  let n = 0;
  let nPenulis = 0;
  const panggil: PanggilTemplat = async (pesan, _setelan, info): Promise<JawabanModel> => {
    n += 1;
    const g = s.galatSebelum?.(info, n) ?? null;
    if (g !== null) throw g;
    log.push(info);
    const user = pesan[1]?.content ?? '';
    if (info.jenis === 'tulis-bebas' || info.jenis === 'tulis-praperiksa') {
      nPenulis += 1;
      pesanPenulis.push(pesan);
      const diminta = info.putaran === 1 && info.jenis === 'tulis-bebas' && !user.includes('Tulis ulang HANYA') ? [1, 2, 3] : (/Tulis ulang HANYA omongan nomor ([\d, ]+)\./.exec(user)?.[1] ?? '').split(',').map((x) => Number(x.trim())).filter((x) => x > 0);
      const teks = (s.penulis ?? penulisPalsuBawaan)(info.putaran, diminta, pesan, nPenulis);
      for (const x of (JSON.parse(teks.startsWith('{') ? teks : '{"omongan":[]}') as { omongan: Array<OmonganBebas & { no: number }> }).omongan ?? []) {
        if (x.pilihan !== undefined) teksKunci.set(x.no, teksPolos(x.pilihan[x.kunci]));
      }
      return { ...jawabPalsu(teks, 1_500), token_masuk: 7_000, token_keluar: 3_000 };
    }
    if (info.jenis === 'gerbang-tebak') {
      const opsi = opsiPesan(user);
      if (s.rotasi !== undefined) return jawabPalsu(s.rotasi(info, opsi), 0);
      const r = (info.ke - 1) % 4;
      return jawabPalsu(JSON.stringify({ teks: opsi[HURUF[(2 * r) % 4] as KunciOpsi], alasan: 'tebakan' }), 0);
    }
    if (info.jenis === 'gerbang-kartu') {
      const opsi = opsiPesan(user);
      const h = HURUF.find((x) => opsi[x] === teksKunci.get(info.omongan ?? 0)) ?? 'a';
      return jawabPalsu(JSON.stringify({ pilihan: h, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'kritikus') return jawabPalsu(s.kritikus?.(info) ?? KRITIK_BERSIH, 5_000);
    throw new Error(`jenis ${info.jenis}`);
  };
  return { panggil, log, pesanPenulis };
}
