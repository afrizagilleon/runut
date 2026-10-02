/**
 * Bentuk keluaran penulis bebas M2d-13 (pra-registrasi §3): `OmonganDraf`
 * M2d-11 + label pengecoh (jenis, rujukan kartu, umpan balik) + pertanyaan cek.
 */
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { JENIS_KESALAHAN, type JenisKesalahan } from '../templat/label.ts';

export interface PengecohBebas {
  jenis: JenisKesalahan;
  /** fact_id kartu yang menunjukkan kesalahannya. */
  rujukan: string;
  umpan_balik: string;
}

export interface OmonganBebas extends OmonganDraf {
  pengecoh: Partial<Record<KunciOpsi, PengecohBebas>>;
  pertanyaan_cek: string;
}

export const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

const teks = (x: unknown): x is string => typeof x === 'string';

/**
 * Urai satu omongan dari JSON penulis. `null` + alasan bila bentuknya tidak
 * bisa dipakai sama sekali (validator yang menilai isinya). Murni.
 */
export function uraiOmonganBebas(x: unknown): { omongan: OmonganBebas | null; alasan: string | null } {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { omongan: null, alasan: 'omongan bukan objek' };
  const o = x as Record<string, unknown>;
  const pil = o['pilihan'];
  if (typeof pil !== 'object' || pil === null || !HURUF.every((h) => teks((pil as Record<string, unknown>)[h]))) return { omongan: null, alasan: 'pilihan a–d tidak lengkap' };
  if (!teks(o['pesan']) || !teks(o['nama']) || !teks(o['penjelasan'])) return { omongan: null, alasan: 'nama/pesan/penjelasan tidak ada' };
  const kunci = o['kunci'];
  if (!teks(kunci) || !(HURUF as readonly string[]).includes(kunci)) return { omongan: null, alasan: 'kunci bukan a/b/c/d' };
  const daftar = (v: unknown): string[] => (Array.isArray(v) ? v.filter(teks) : []);
  const angka = Array.isArray(o['angka_pesan'])
    ? (o['angka_pesan'] as unknown[]).filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null).map((a) => ({
        teks: teks(a['teks']) ? a['teks'] : '',
        ...(teks(a['fact_id']) ? { fact_id: a['fact_id'] } : {}),
        ...(a['andaian'] === true ? { andaian: true } : {}),
      }))
    : [];
  const pengecoh: Partial<Record<KunciOpsi, PengecohBebas>> = {};
  const p = o['pengecoh'];
  if (typeof p === 'object' && p !== null) {
    for (const h of HURUF) {
      const e = (p as Record<string, unknown>)[h];
      if (typeof e !== 'object' || e === null) continue;
      const r = e as Record<string, unknown>;
      pengecoh[h] = {
        jenis: (teks(r['jenis']) ? r['jenis'] : '') as JenisKesalahan,
        rujukan: teks(r['rujukan']) ? r['rujukan'] : '',
        umpan_balik: teks(r['umpan_balik']) ? r['umpan_balik'] : '',
      };
    }
  }
  return {
    omongan: {
      nama: o['nama'] as string,
      jam: teks(o['jam']) ? o['jam'] : '',
      pesan: o['pesan'] as string,
      angka_pesan: angka,
      kartu: daftar(o['kartu']),
      kartu_penentu: daftar(o['kartu_penentu']),
      pilihan: { a: (pil as Record<KunciOpsi, string>).a, b: (pil as Record<KunciOpsi, string>).b, c: (pil as Record<KunciOpsi, string>).c, d: (pil as Record<KunciOpsi, string>).d },
      kunci: kunci as KunciOpsi,
      penjelasan: o['penjelasan'] as string,
      pengecoh,
      pertanyaan_cek: teks(o['pertanyaan_cek']) ? o['pertanyaan_cek'] : '',
    },
    alasan: null,
  };
}

/** Bagian `OmonganDraf` saja (untuk gerbang lama). Murni. */
export function drafDari(o: OmonganBebas): OmonganDraf {
  const { pengecoh: _p, pertanyaan_cek: _q, ...d } = o;
  return d;
}

export { JENIS_KESALAHAN };
