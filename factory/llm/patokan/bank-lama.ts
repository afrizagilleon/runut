/**
 * Bank uji ulang M2d-11 (kontrak D-1 kalibrasi, D-3 uji ulang): 6 soal tayang
 * (Claude + pemilik) + SEMUA omongan yang pernah dikirim ke penguji luar tebak
 * buta di M2d-3…M2d-10 A-2 (omongan yang dikunci lingkar, dua versi tambahan
 * M2d-10, dan soal pemanasan M2d-10).
 *
 * Teks tiap omongan dimuat dari keluaran jalan asalnya (riwayat/hasil), lalu
 * DICOCOKKAN dengan bahan yang benar-benar dikirim ke penguji luar
 * (`tebak.md`): pesan dan keempat pilihan harus sama persis (teks polos).
 * Hasil penguji luar dibaca dari jawaban mentah (`jawaban/tebak-p1..3.txt`,
 * `kartu-p1..3.txt`) dan `kunci.json` milestone itu — tidak ditulis tangan.
 */
import { existsSync, readFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import { soalManusiaM2d8 } from '../kalibrasi-soal.ts';
import type { PaketFakta } from '../paket.ts';
import { bacaJawaban, type JawabKartu, type JawabTebak } from '../pengecoh-putusan.ts';

export const HURUF_OPSI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

export interface HasilLuar {
  /** Folder penguji asal (relatif akar). */
  folder: string;
  id_tebak: string;
  /** Jawaban tebak buta mentah (3 penguji). */
  tebak: Array<{ pilihan: string; yakin: number }>;
  /** Berapa penguji tebak buta memilih kunci. */
  tebak_benar: number;
  /** Penguji kartu: berapa memilih kunci (dari 3); null bila tidak ada. */
  kartu_benar: number | null;
  kartu_total: number;
}

export interface ButirBank {
  id: string;
  kelompok: 'tayang' | 'lama';
  /** Asal (milestone, jalan, versi). */
  asal: string;
  omongan: OmonganDraf;
  paket: PaketFakta;
  no: number;
  luar: HasilLuar | null;
  /** Masuk himpunan recall: ditebak benar ≥ 2/3 penguji luar. */
  tertebak_luar: boolean;
}

interface KunciLama {
  tebak: Array<{ id: string; paket?: string; no: number; kunci: string; putaran?: number }>;
  kartu: Array<{ id: string; paket?: string; no: number; kunci: string; penentu: number[] }>;
}

function json<T>(rel: string): T {
  return JSON.parse(readFileSync(`${AKAR}${rel}`, 'utf8')) as T;
}

/** Blok "### Qn" dari bahan tebak buta: pesan + empat pilihan, teks polos. Murni. */
export function uraiBahanTebak(md: string): Map<string, { nama: string; jam: string; pesan: string; pilihan: Record<KunciOpsi, string> }> {
  const hasil = new Map<string, { nama: string; jam: string; pesan: string; pilihan: Record<KunciOpsi, string> }>();
  const blok = md.replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const b of blok) {
    const baris = b.split('\n');
    const id = (baris[0] ?? '').trim();
    const m = /^Pesan dari (.+?) \((\d{2}\.\d{2})\): "(.*)"$/.exec(baris[1] ?? '');
    if (m === null) continue;
    const pilihan = {} as Record<KunciOpsi, string>;
    for (const h of HURUF_OPSI) {
      const x = baris.find((l) => l.startsWith(`${h}) `));
      pilihan[h] = x === undefined ? '' : x.slice(3);
    }
    hasil.set(id, { nama: m[1] ?? '', jam: m[2] ?? '', pesan: m[3] ?? '', pilihan });
  }
  return hasil;
}

/** Omongan cocok dengan bahan yang dikirim ke penguji luar (teks polos)? Murni. */
export function cocokBahan(o: OmonganDraf, b: { nama: string; jam: string; pesan: string; pilihan: Record<KunciOpsi, string> }): string[] {
  const m: string[] = [];
  if (teksPolos(o.pesan) !== b.pesan) m.push('pesan berbeda');
  if (o.nama !== b.nama) m.push('nama berbeda');
  for (const h of HURUF_OPSI) if (teksPolos(o.pilihan[h]) !== b.pilihan[h]) m.push(`pilihan ${h} berbeda`);
  return m;
}

function hasilLuar(folder: string, idTebak: string, kunci: string, idKartu: string | null): HasilLuar {
  const tebak = [1, 2, 3].map((n) => bacaJawaban<JawabTebak>('tebak', n, `${AKAR}${folder}/jawaban`).find((x) => x.id === idTebak));
  const t = tebak.filter((x): x is JawabTebak => x !== undefined).map((x) => ({ pilihan: String(x.pilihan).trim().toLowerCase(), yakin: Number(x.yakin) }));
  let kartuBenar: number | null = null;
  let kartuTotal = 0;
  if (idKartu !== null && existsSync(`${AKAR}${folder}/jawaban/kartu-p1.txt`)) {
    const k = [1, 2, 3].map((n) => bacaJawaban<JawabKartu>('kartu', n, `${AKAR}${folder}/jawaban`).find((x) => x.id === idKartu)).filter((x): x is JawabKartu => x !== undefined);
    kartuTotal = k.length;
    kartuBenar = k.filter((x) => String(x.pilihan).trim().toLowerCase() === kunci).length;
  }
  return { folder, id_tebak: idTebak, tebak: t, tebak_benar: t.filter((x) => x.pilihan === kunci).length, kartu_benar: kartuBenar, kartu_total: kartuTotal };
}

function draf(o: OmonganDraf | null | undefined, asal: string): OmonganDraf {
  if (o === null || o === undefined) throw new Error(`${asal}: omongan tidak ada`);
  return o;
}

interface SumberRiwayat {
  milestone: 'm2d3' | 'm2d4' | 'm2d5' | 'm2d6' | 'm2d8';
  folderPenguji: string;
  folderJalan: (paket: string) => string;
}

const SUMBER_RIWAYAT: readonly SumberRiwayat[] = [
  { milestone: 'm2d3', folderPenguji: 'eval/keluaran-m2d3/penguji', folderJalan: (p) => `eval/keluaran-m2d3/${p}` },
  { milestone: 'm2d4', folderPenguji: 'eval/keluaran-m2d4/penguji', folderJalan: (p) => `eval/keluaran-m2d4/${p}` },
  { milestone: 'm2d5', folderPenguji: 'eval/keluaran-m2d5/penguji', folderJalan: (p) => `eval/keluaran-m2d5/${p}` },
  { milestone: 'm2d6', folderPenguji: 'eval/keluaran-m2d6/penguji', folderJalan: (p) => `eval/keluaran-m2d6/jalan-1/${p}` },
  { milestone: 'm2d8', folderPenguji: 'eval/keluaran-m2d8/penguji', folderJalan: (p) => `eval/keluaran-m2d8/jalan/${p}` },
];

function dariRiwayat(s: SumberRiwayat): ButirBank[] {
  const k = json<KunciLama>(`${s.folderPenguji}/kunci.json`);
  const bahan = uraiBahanTebak(readFileSync(`${AKAR}${s.folderPenguji}/tebak.md`, 'utf8'));
  return k.tebak.map((t) => {
    const paketId = t.paket ?? 'tirt';
    const asal = `${s.milestone} ${paketId} omongan ${String(t.no)} putaran ${String(t.putaran)}`;
    const r = json<{ riwayat: Array<{ putaran: number; draf: Array<OmonganDraf | null> }> }>(`${s.folderJalan(paketId)}/riwayat.json`);
    const o = draf(r.riwayat.find((x) => x.putaran === t.putaran)?.draf[t.no - 1], asal);
    const b = bahan.get(t.id);
    if (b === undefined) throw new Error(`${asal}: ${t.id} tidak ada di tebak.md`);
    const beda = cocokBahan(o, b);
    if (beda.length > 0 || o.kunci !== t.kunci) throw new Error(`${asal}: teks tidak sama dengan bahan penguji (${beda.join(', ')})`);
    const kartu = k.kartu.find((x) => x.no === t.no && (x.paket ?? 'tirt') === paketId);
    const luar = hasilLuar(s.folderPenguji, t.id, t.kunci, kartu?.id ?? null);
    return {
      id: `${s.milestone}-${paketId}-o${String(t.no)}`,
      kelompok: 'lama' as const,
      asal,
      omongan: o,
      paket: json<PaketFakta>(`${s.folderJalan(paketId)}/paket.json`),
      no: t.no,
      luar,
      tertebak_luar: luar.tebak_benar >= 2,
    };
  });
}

interface HasilJalanTemplat {
  versi: Array<{ putaran: number; no: number; rencana: string; berhenti: string; omongan: OmonganDraf | null }>;
  kunci: Array<{ no: number; omongan: OmonganDraf }>;
}

interface SoalPemanasan {
  kartu: string[];
  kartu_penentu: string[];
  pesan: { nama: string; jam: string; isi: string };
  pilihan: Array<{ kunci: KunciOpsi; teks: string }>;
  jawaban: KunciOpsi;
  penjelasan: string;
}

/** Soal pemanasan M2d-10 dalam bentuk `OmonganDraf`. */
export function omonganPemanasanM2d10(): OmonganDraf {
  const s = json<SoalPemanasan>('eval/keluaran-m2d10/pemanasan/soal.json');
  return {
    nama: s.pesan.nama,
    jam: s.pesan.jam,
    pesan: s.pesan.isi,
    angka_pesan: [],
    kartu: [...s.kartu],
    kartu_penentu: [...s.kartu_penentu],
    pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>,
    kunci: s.jawaban,
    penjelasan: s.penjelasan,
  };
}

function dariTemplat(): ButirBank[] {
  const hasil: ButirBank[] = [];
  // M2d-10 jalan pertama: dua versi yang sampai ke kritikus + soal pemanasan (penguji tambahan).
  {
    const folder = 'eval/keluaran-m2d10/penguji-tambahan';
    const k = json<KunciLama>(`${folder}/kunci.json`);
    const bahan = uraiBahanTebak(readFileSync(`${AKAR}${folder}/tebak.md`, 'utf8'));
    const h = json<HasilJalanTemplat>('eval/penyusun/m2d10-tirt/hasil.json');
    const paket = json<PaketFakta>('eval/penyusun/m2d10-tirt/paket.json');
    const sumber: Record<number, { id: string; asal: string; o: OmonganDraf }> = {
      1: { id: 'm2d10-tirt-v1', asal: 'M2d-10 jalan pertama, versi 1 (sebab-resmi; sampai ke kritikus)', o: draf(h.versi.find((v) => v.putaran === 1)?.omongan, 'm2d10 v1') },
      2: { id: 'm2d10-tirt-v2', asal: 'M2d-10 jalan pertama, versi 2 (besaran-hitungan; sampai ke kritikus)', o: draf(h.versi.find((v) => v.putaran === 2)?.omongan, 'm2d10 v2') },
      3: { id: 'm2d10-pemanasan', asal: 'soal pemanasan M2d-10 (percobaan 1, LOLOS gerbang)', o: omonganPemanasanM2d10() },
    };
    for (const t of k.tebak) {
      const s = sumber[t.no];
      const b = bahan.get(t.id);
      if (s === undefined || b === undefined) throw new Error(`tambahan ${t.id} tidak lengkap`);
      const beda = cocokBahan(s.o, b);
      if (beda.length > 0 || s.o.kunci !== t.kunci) throw new Error(`${s.id}: teks tidak sama dengan bahan penguji (${beda.join(', ')})`);
      const kartu = k.kartu.find((x) => x.no === t.no);
      const luar = hasilLuar(folder, t.id, t.kunci, kartu?.id ?? null);
      hasil.push({ id: s.id, kelompok: 'lama', asal: s.asal, omongan: s.o, paket, no: t.no === 3 ? 1 : t.no, luar, tertebak_luar: luar.tebak_benar >= 2 });
    }
  }
  for (const [jalan, folder, nama] of [
    ['m2d10-tirt-a1', 'eval/keluaran-m2d10/penguji-a1', 'm2d10a1'],
    ['m2d10-tirt-a2', 'eval/keluaran-m2d10/penguji-a2', 'm2d10a2'],
  ] as const) {
    const k = json<KunciLama>(`${folder}/kunci.json`);
    const bahan = uraiBahanTebak(readFileSync(`${AKAR}${folder}/tebak.md`, 'utf8'));
    const h = json<HasilJalanTemplat>(`eval/penyusun/${jalan}/hasil.json`);
    const paket = json<PaketFakta>(`eval/penyusun/${jalan}/paket.json`);
    for (const t of k.tebak) {
      const o = draf(h.kunci.find((x) => x.no === t.no)?.omongan, `${jalan} o${String(t.no)}`);
      const b = bahan.get(t.id);
      if (b === undefined) throw new Error(`${jalan}: ${t.id} tidak ada di tebak.md`);
      const beda = cocokBahan(o, b);
      if (beda.length > 0 || o.kunci !== t.kunci) throw new Error(`${jalan} o${String(t.no)}: teks tidak sama dengan bahan penguji (${beda.join(', ')})`);
      const kartu = k.kartu.find((x) => x.no === t.no);
      const luar = hasilLuar(folder, t.id, t.kunci, kartu?.id ?? null);
      hasil.push({ id: `${nama}-tirt-o${String(t.no)}`, kelompok: 'lama', asal: `M2d-10 ${jalan}, omongan ${String(t.no)} dikunci`, omongan: o, paket, no: t.no, luar, tertebak_luar: luar.tebak_benar >= 2 });
    }
  }
  return hasil;
}

/** Enam soal tayang (Claude + pemilik). */
export function soalTayang(): ButirBank[] {
  return soalManusiaM2d8().map((s) => ({
    id: `tayang-${s.id}`,
    kelompok: 'tayang' as const,
    asal: 'soal tayang (Claude + pemilik), cases/*.json',
    omongan: s.omongan,
    paket: s.paket,
    no: s.no,
    luar: null,
    tertebak_luar: false,
  }));
}

/** Semua omongan lama yang pernah diuji luar, urut milestone. */
export function omonganLama(): ButirBank[] {
  return [...SUMBER_RIWAYAT.flatMap(dariRiwayat), ...dariTemplat()];
}

/** Bank lengkap: tayang dulu, lalu omongan lama. */
export function bankUjiUlang(): ButirBank[] {
  return [...soalTayang(), ...omonganLama()];
}

/**
 * Urutan uji ulang berbayar D-3 (pra-registrasi §4): soal tayang → himpunan
 * recall (tertebak luar ≥ 2/3) → sisanya, masing-masing urut bank. Pagu bisa
 * berhenti di tengah; yang terdepan paling penting. Murni.
 */
export function urutUjiUlang(bank: readonly ButirBank[]): ButirBank[] {
  return [...bank.filter((b) => b.kelompok === 'tayang'), ...bank.filter((b) => b.kelompok === 'lama' && b.tertebak_luar), ...bank.filter((b) => b.kelompok === 'lama' && !b.tertebak_luar)];
}
