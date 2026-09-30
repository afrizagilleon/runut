/**
 * Setelan tumpukan gerbang M2d-8 dan putusan per gerbang (murni, tanpa
 * jaringan): langkah pelonggaran pra-registrasi §3, kode pelindung §2.
 * Dipakai kalibrasi (`kalibrasi-gerbang.ts`) dan lingkar TIRT M2d-8
 * (`agen-pengecoh.ts`, `GenerasiPengecoh.kalibrasi`) — satu sumber.
 */
import { JENIS_KEBERATAN, type JenisKeberatan, type Keberatan } from './kritikus.ts';
import { lolosTebak } from './laporan.ts';
import type { TebakMentah } from './pengecoh-kalibrasi.ts';

export interface ButirKode {
  /** Kode aturan: kode validator (mis. `OPSI_PANJANG_TIMPANG`) atau nama gerbang (`G-kaku`). */
  kode: string;
  alasan: string;
}

/**
 * Kode PELINDUNG: fakta, rujukan, tanggal, emiten, penilaian/ajakan, dan bentuk
 * K-05. Tidak pernah dilonggarkan atau diturunkan (pra-registrasi); bila
 * menolak soal manusia, itu temuan tentang soal itu, dilaporkan.
 */
export const KODE_PELINDUNG: readonly string[] = [
  'SKEMA', 'FAKTA_DI_LUAR_PAKET', 'ANGKA_TAK_COCOK', 'ANGKA_TANPA_RUJUKAN', 'ANGKA_PESAN_TAK_ADA', 'ANGKA_PESAN_TANPA_JEJAK',
  'ANDAIAN_DI_OMONGAN_BETUL', 'HARI_INI_TAK_COCOK', 'TANGGAL_SESUDAH_T', 'EMITEN_TERBUKA', 'KATA_PENILAIAN',
  'AJAKAN_TRANSAKSI', 'KUNCI_TAK_ADA', 'KUNCI_TAK_TERBUKTI_KARTU', 'KARTU_JUMLAH', 'KARTU_KEMBAR', 'PENENTU_JUMLAH', 'PENENTU_BUKAN_KARTU',
  'OPSI_TANPA_LABEL', 'OPSI_TAK_DUA_DUA', 'PESAN_KOSONG', 'G-penilaian',
];

export type Gerbang = 'kode' | 'penebak' | 'pilihan_saja' | 'meresmikan' | 'keseimbangan' | 'kritikus' | 'kartu';
export type GerbangBertingkat = Exclude<Gerbang, 'kode'>;
export const URUTAN_PELONGGARAN: readonly Gerbang[] = ['kode', 'penebak', 'pilihan_saja', 'meresmikan', 'keseimbangan', 'kritikus', 'kartu'];
export const SEMUA_GERBANG: readonly Gerbang[] = ['kode', 'meresmikan', 'keseimbangan', 'pilihan_saja', 'kartu', 'kritikus', 'penebak'];

export type AturanPenebak = 'k05' | 'dua-dari-tiga' | 'tiga-dari-tiga';
const JENIS_MENOLAK_SEMUA: readonly JenisKeberatan[] = JENIS_KEBERATAN.filter((j) => j !== 'tidak-menjawab');

/** Tingkat 0 = setelan §2; indeks terakhir = batas. */
export const LANGKAH = {
  penebak: ['k05', 'dua-dari-tiga', 'tiga-dari-tiga'] as readonly AturanPenebak[],
  pilihan_saja: [null, 60] as ReadonlyArray<number | null>,
  meresmikan: [2, 3] as readonly number[],
  keseimbangan: [1.3, 1.5] as readonly number[],
  kritikus: [JENIS_MENOLAK_SEMUA, ['kunci', 'makna', 'aturan'], ['kunci', 'makna']] as ReadonlyArray<readonly JenisKeberatan[]>,
  /** Kalimat membingungkan menolak? */
  kartu: [true, false] as readonly boolean[],
} as const;

export interface SetelanGerbangM2d8 {
  tingkat: Record<GerbangBertingkat, number>;
  /** Gerbang yang diturunkan menjadi "dicatat" (tetap dijalankan, tidak menolak). */
  dicatat: GerbangBertingkat[];
  /** Kode bukan-pelindung yang diturunkan menjadi "dicatat". */
  kode_dicatat: string[];
}

export const SETELAN_AWAL: SetelanGerbangM2d8 = {
  tingkat: { penebak: 0, pilihan_saja: 0, meresmikan: 0, keseimbangan: 0, kritikus: 0, kartu: 0 },
  dicatat: [],
  kode_dicatat: [],
};

export const aturanPenebak = (s: SetelanGerbangM2d8): AturanPenebak => LANGKAH.penebak[s.tingkat.penebak] ?? 'k05';
export const yakinPilihanSaja = (s: SetelanGerbangM2d8): number | null => LANGKAH.pilihan_saja[s.tingkat.pilihan_saja] ?? null;
export const maksKataResmi = (s: SetelanGerbangM2d8): number => LANGKAH.meresmikan[s.tingkat.meresmikan] ?? 2;
export const rasioKeseimbangan = (s: SetelanGerbangM2d8): number => LANGKAH.keseimbangan[s.tingkat.keseimbangan] ?? 1.3;
export const jenisKritikus = (s: SetelanGerbangM2d8): readonly JenisKeberatan[] => LANGKAH.kritikus[s.tingkat.kritikus] ?? JENIS_MENOLAK_SEMUA;
export const bingungMenolak = (s: SetelanGerbangM2d8): boolean => LANGKAH.kartu[s.tingkat.kartu] ?? true;

/** Tebakan penebak (tak terbaca = kunci, yakin 100) menolak menurut aturan. Murni. */
export function penebakMenolak(tebakan: ReadonlyArray<{ pilihan: string | null; yakin: number | null; terbaca: boolean }>, kunci: string, aturan: AturanPenebak): boolean {
  const jawab = tebakan.map((t) => (t.terbaca ? { pilihan: t.pilihan ?? '', yakin: t.yakin ?? 0 } : { pilihan: kunci, yakin: 100 }));
  const n = lolosTebak(jawab, kunci);
  if (aturan === 'k05') return !n.lolos;
  if (aturan === 'dua-dari-tiga') return n.benar >= 2;
  return n.benar >= 3;
}

/** Pilihan-saja menolak: keduanya memilih kunci (tak terbaca = kunci, yakin 100) dan, bila ada, rata-rata yakin ≥ ambang. Murni. */
export function pilihanSajaMenolak(tebakan: readonly TebakMentah[], kunci: string, yakinMin: number | null): boolean {
  const kena = tebakan.filter((t) => !t.terbaca || t.pilihan === kunci);
  const yakin = kena.map((t) => (t.terbaca ? (t.yakin ?? 0) : 100));
  const rata = yakin.length === 0 ? 0 : yakin.reduce((a, b) => a + b, 0) / yakin.length;
  return tebakan.length > 0 && kena.length >= tebakan.length && (yakinMin === null || rata >= yakinMin);
}

/** Kritikus menolak: tidak menjawab, atau ada keberatan berjenis yang menolak. Murni. */
export function kritikusMenolak(k: { menjawab: boolean; keberatan: ReadonlyArray<Pick<Keberatan, 'jenis'>> }, jenis: readonly JenisKeberatan[]): boolean {
  return !k.menjawab || k.keberatan.some((x) => jenis.includes(x.jenis));
}

/** Kode menolak: ada butir yang bukan kode yang diturunkan. Kode pelindung tidak bisa diturunkan. Murni. */
export function kodeMenolak(butir: readonly ButirKode[], kodeDicatat: readonly string[]): boolean {
  return butir.some((b) => KODE_PELINDUNG.includes(b.kode) || !kodeDicatat.includes(b.kode));
}

