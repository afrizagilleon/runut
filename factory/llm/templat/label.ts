/**
 * Pengecoh berlabel jenis kesalahan + umpan balik mengajar (M2d-11 D-4,
 * pra-registrasi `docs/bukti/m2d11-praregistrasi.md` §1 syarat 4–5 dan §5).
 *
 * Tiap pengecoh templat diberi SATU jenis kesalahan membaca kartu dan satu
 * rujukan kartu (dinyatakan per pola, bukan dicari). Kode memvalidasi label
 * dari proposisinya (aturan §5); varian yang labelnya tidak sah dibuang dari
 * rencana, rencana yang kehabisan varian di suatu slot tidak dipakai.
 * Umpan balik (kartu penentu, kalimat per pengecoh, pertanyaan cek) disusun
 * kode dan divalidasi; disimpan di draf, tidak dipasang ke produk.
 */
import { tanggalId } from '../../format.ts';
import type { KunciOpsi } from '../draf.ts';
import type { PaketFakta } from '../paket.ts';
import { fakta, kelas } from './fakta.ts';
import type { IdPola, Label, NamaSlot, RencanaSoal, SlotPilihan, VarianPilihan } from './pola.ts';
import { bacaanLain, evaluasi, faktaDisebut, type Proposisi } from './proposisi.ts';
import { hurufSlotSeimbang } from './rakit.ts';

export type JenisKesalahan = 'salah-periode' | 'salah-entitas' | 'nyaris-benar-angka' | 'pertanyaan-lain' | 'sebagian-benar' | 'percaya-otoritas';
export const JENIS_KESALAHAN: readonly JenisKesalahan[] = ['salah-periode', 'salah-entitas', 'nyaris-benar-angka', 'pertanyaan-lain', 'sebagian-benar', 'percaya-otoritas'];

export const NAMA_KESALAHAN: Readonly<Record<JenisKesalahan, string>> = {
  'salah-periode': 'salah periode',
  'salah-entitas': 'salah entitas',
  'nyaris-benar-angka': 'angka nyaris benar',
  'pertanyaan-lain': 'menjawab pertanyaan lain',
  'sebagian-benar': 'sebagian benar',
  'percaya-otoritas': 'percaya omongan tanpa cek',
};

const ARTI_KESALAHAN: Readonly<Record<JenisKesalahan, string>> = {
  'salah-periode': 'isinya milik tanggal lain, bukan hari yang dibicarakan',
  'salah-entitas': 'isinya tentang hal lain di kartu, bukan yang ditanyakan',
  'nyaris-benar-angka': 'angkanya dekat, tetapi bukan angka di kartu',
  'pertanyaan-lain': 'kalimat ini menjawab hal lain, bukan apakah omongan teman cocok',
  'sebagian-benar': 'sebagian isinya cocok, tetapi ada bagian yang tidak cocok dengan kartu',
  'percaya-otoritas': 'ini mengulang omongan teman tanpa dicek ke kartu',
};

export interface LabelPengecoh {
  jenis: JenisKesalahan;
  /** fact_id kartu yang menunjukkan kesalahannya (harus kartu soal). */
  rujukan: string;
}

/* ---------------------------------------------------------------------- */
/* label per pola (niat perancang; divalidasi kode)                        */
/* ---------------------------------------------------------------------- */

type Penentu = (r: RencanaSoal) => string | undefined;
const sudut: Penentu = (r) => r.sudut;
const kartuKe = (i: number): Penentu => (r) => r.kartu[i];

/** Label tiap slot pengecoh per pola. `null` = pola tidak dipakai M2d-11 (ada pengecoh tanpa jenis yang sah). */
export const LABEL_POLA: Readonly<Record<IdPola, Record<Exclude<NamaSlot, 'kunci'>, { jenis: JenisKesalahan; rujukan: Penentu }> | null>> = {
  'sebab-resmi': {
    p1: { jenis: 'salah-periode', rujukan: kartuKe(1) },
    p2: { jenis: 'percaya-otoritas', rujukan: sudut },
    p3: { jenis: 'sebagian-benar', rujukan: sudut },
  },
  'angka-lain-waktu': {
    p1: { jenis: 'salah-periode', rujukan: kartuKe(1) },
    p2: { jenis: 'pertanyaan-lain', rujukan: kartuKe(1) },
    p3: { jenis: 'nyaris-benar-angka', rujukan: sudut },
  },
  'setengah-benar': {
    p1: { jenis: 'percaya-otoritas', rujukan: sudut },
    p2: { jenis: 'sebagian-benar', rujukan: sudut },
    p3: { jenis: 'sebagian-benar', rujukan: kartuKe(0) },
  },
  // Pengecoh "menyangkal rangkaian yang tercatat" (p1) bukan satu dari enam jenis kesalahan membaca.
  'benar-berincian': null,
  'arah-kali-tingkat': {
    p1: { jenis: 'sebagian-benar', rujukan: sudut },
    p2: { jenis: 'percaya-otoritas', rujukan: sudut },
    p3: { jenis: 'sebagian-benar', rujukan: sudut },
  },
  'besaran-hitungan': {
    p1: { jenis: 'nyaris-benar-angka', rujukan: sudut },
    p2: { jenis: 'sebagian-benar', rujukan: sudut },
    p3: { jenis: 'pertanyaan-lain', rujukan: sudut },
  },
};

/* ---------------------------------------------------------------------- */
/* validasi label (pra-registrasi §5)                                      */
/* ---------------------------------------------------------------------- */

const sama = (a: Proposisi, b: Proposisi): boolean => JSON.stringify(a) === JSON.stringify(b);

function nilaiSalah(p: Proposisi): Array<{ fact_id: string; v: number }> {
  if (p.k === 'nilai') return [{ fact_id: p.fact_id, v: p.nilai }];
  if (p.k === 'naik-beruntun') return [{ fact_id: p.fact_id, v: p.hari }];
  if (p.k === 'dan') return p.p.flatMap(nilaiSalah);
  return [];
}

function aman(f: () => boolean): boolean {
  try {
    return f();
  } catch {
    return false;
  }
}

/** Masalah label satu varian pengecoh (kosong = sah). Murni. */
export function validasiLabel(l: LabelPengecoh, v: VarianPilihan, r: RencanaSoal, paket: PaketFakta): string[] {
  const m: string[] = [];
  const P = v.proposisi;
  const tempat = `${v.id} (${l.jenis})`;
  if (!JENIS_KESALAHAN.includes(l.jenis)) return [`${tempat}: jenis kesalahan tidak dikenal`];
  if (!r.kartu.includes(l.rujukan)) m.push(`${tempat}: rujukan "${l.rujukan}" bukan kartu soal`);
  if (aman(() => evaluasi(P, paket))) m.push(`${tempat}: proposisi pengecoh BENAR`);
  const labelBenar: Label = aman(() => evaluasi(r.klaim.proposisi, paket)) ? 'Betul' : 'Keliru';
  const disebut = faktaDisebut(P);
  let sah = false;
  switch (l.jenis) {
    case 'salah-periode':
      sah = bacaanLain(P, paket).some((x) => aman(() => evaluasi(x, paket)) && faktaDisebut(x).includes(l.rujukan));
      break;
    case 'salah-entitas':
      sah =
        !disebut.includes(l.rujukan) &&
        disebut.length > 0 &&
        disebut.every((id) => kelas(id) !== kelas(l.rujukan)) &&
        disebut.some((id) => aman(() => fakta(paket, id).terbit === fakta(paket, l.rujukan).terbit));
      break;
    case 'nyaris-benar-angka':
      sah = nilaiSalah(P).some((x) =>
        aman(() => {
          const t = fakta(paket, x.fact_id).nilai;
          if (typeof t !== 'number' || t === 0) return false;
          const d = Math.abs(x.v - t) / Math.abs(t);
          return d > 0 && d <= 0.5 && x.fact_id === l.rujukan;
        }),
      );
      break;
    case 'pertanyaan-lain':
      sah = disebut.length > 0 && !disebut.some((id) => r.kartu_penentu.includes(id));
      break;
    case 'sebagian-benar':
      sah = (P.k === 'dan' && P.p.some((x) => aman(() => evaluasi(x, paket)))) || v.label === labelBenar;
      break;
    case 'percaya-otoritas':
      sah = v.label === 'Betul' && r.klaim.label === 'Keliru' && (sama(P, r.klaim.proposisi) || (P.k === 'dan' && P.p.some((x) => sama(x, r.klaim.proposisi))));
      break;
  }
  if (!sah) m.push(`${tempat}: isi pengecoh tidak cocok dengan aturan jenis "${l.jenis}"`);
  return m;
}

/** Slot pengecoh berlabel. */
export interface SlotBerlabel extends SlotPilihan {
  kesalahan?: LabelPengecoh;
}

/**
 * Rencana M2d-11: tiap slot pengecoh diberi label pola; varian yang labelnya
 * tidak sah dibuang. `null` bila pola tanpa label atau sebuah slot kehabisan
 * varian. Murni.
 */
export function rencanaBerlabel(r: RencanaSoal, paket: PaketFakta): { rencana: RencanaSoal | null; masalah: string[] } {
  const peta = LABEL_POLA[r.pola];
  if (peta === null) return { rencana: null, masalah: [`pola ${r.pola} tidak dipakai M2d-11: ada pengecoh tanpa jenis kesalahan yang sah`] };
  const masalah: string[] = [];
  const slot = r.slot.map((s): SlotBerlabel => {
    if (s.slot === 'kunci') return s;
    const d = peta[s.slot];
    const rujukan = d.rujukan(r);
    if (rujukan === undefined) {
      masalah.push(`${s.slot}: rujukan kartu tidak ada`);
      return { ...s, varian: [] };
    }
    const l: LabelPengecoh = { jenis: d.jenis, rujukan };
    const varian = s.varian.filter((v) => {
      const x = validasiLabel(l, v, r, paket);
      masalah.push(...x);
      return x.length === 0;
    });
    return { ...s, varian, kesalahan: l };
  }) as RencanaSoal['slot'];
  if (slot.some((s) => s.varian.length === 0)) return { rencana: null, masalah };
  return { rencana: { ...r, slot }, masalah };
}

export function labelSlot(r: RencanaSoal, s: Exclude<NamaSlot, 'kunci'>): LabelPengecoh | null {
  return (r.slot.find((x) => x.slot === s) as SlotBerlabel | undefined)?.kesalahan ?? null;
}

/* ---------------------------------------------------------------------- */
/* umpan balik (syarat 5)                                                  */
/* ---------------------------------------------------------------------- */

export const PERTANYAAN_CEK: Readonly<Record<IdPola, string>> = {
  'sebab-resmi': 'Penghentian tanggal berapa yang dibicarakan, dan apa alasan resminya di kartu?',
  'angka-lain-waktu': 'Angka ini milik tanggal yang mana menurut kartu?',
  'setengah-benar': 'Apakah setiap bagian omongan ini cocok dengan kartu, bukan hanya satu bagian?',
  'benar-berincian': 'Berapa hari persisnya menurut kartu, dan adakah hari yang turun?',
  'arah-kali-tingkat': 'Ke arah mana harganya bergerak, dan sampai tingkat berapa menurut kartu?',
  'besaran-hitungan': 'Ini kelipatan harga atau selisih rupiah, dan berapa angkanya di kartu?',
};

export interface UmpanBalikSoal {
  penentu: string;
  per_pengecoh: Array<{ huruf: KunciOpsi; slot: string; jenis: JenisKesalahan; rujukan: string; kartu_no: number; kalimat: string }>;
  pertanyaan_cek: string;
}

function noKartu(r: RencanaSoal, id: string): number {
  return r.kartu.indexOf(id) + 1;
}

/** Umpan balik soal dari rencana berlabel + huruf kunci. Murni. */
export function umpanBalik(r: RencanaSoal, paket: PaketFakta, hurufKunci: KunciOpsi): UmpanBalikSoal {
  const peta = hurufSlotSeimbang(hurufKunci, r);
  const penentu = r.kartu_penentu.map((id) => `kartu ${String(noKartu(r, id))} (terbit ${tanggalId(fakta(paket, id).terbit)})`).join(' dan ');
  const per = (['p1', 'p2', 'p3'] as const).flatMap((s) => {
    const l = labelSlot(r, s);
    if (l === null) return [];
    const no = noKartu(r, l.rujukan);
    return [{ huruf: peta[s], slot: s, jenis: l.jenis, rujukan: l.rujukan, kartu_no: no, kalimat: `${peta[s]}) ${NAMA_KESALAHAN[l.jenis]}: ${ARTI_KESALAHAN[l.jenis]} — cek kartu ${String(no)}.` }];
  });
  return {
    penentu: `Yang menentukan jawabannya: ${penentu}.`,
    per_pengecoh: per.sort((a, b) => a.huruf.localeCompare(b.huruf)),
    pertanyaan_cek: PERTANYAAN_CEK[r.pola],
  };
}

/** Masalah umpan balik (kosong = sah; syarat 5). Murni. */
export function validasiUmpanBalik(u: UmpanBalikSoal, r: RencanaSoal): string[] {
  const m: string[] = [];
  if (!r.kartu_penentu.some((id) => u.penentu.includes(`kartu ${String(noKartu(r, id))}`))) m.push('umpan balik tidak menyebut kartu penentu');
  if (u.per_pengecoh.length !== 3) m.push(`umpan balik untuk ${String(u.per_pengecoh.length)} pengecoh; harus 3`);
  for (const p of u.per_pengecoh) {
    if (!p.kalimat.includes(NAMA_KESALAHAN[p.jenis])) m.push(`${p.huruf}: kalimat tidak menyebut nama jenis kesalahan`);
    if (p.kartu_no < 1 || p.kartu_no > r.kartu.length || !p.kalimat.includes(`kartu ${String(p.kartu_no)}`)) m.push(`${p.huruf}: kalimat tidak menyebut nomor kartu rujukan`);
  }
  const q = u.pertanyaan_cek.trim();
  if (!q.endsWith('?')) m.push('pertanyaan cek tidak diakhiri "?"');
  if (q.split(/\s+/).length > 20) m.push('pertanyaan cek lebih dari 20 kata');
  return m;
}
