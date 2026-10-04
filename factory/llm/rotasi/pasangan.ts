/**
 * Penebak berpasangan (M2d-23) — pengganti saringan tebak di jalur agen.
 *
 * Kenapa: penebak tanpa kartu yang diberi empat pilihan cenderung mengiyakan
 * teman (±90 % jawabannya jatuh di pilihan "Betul"). Akibatnya omongan
 * "Keliru" sering lolos TANPA terukur: di bank 4 Okt, Rara 0 dari 12 dan Bayu
 * 2 dari 12 jawaban berada di label kunci, terlalu sedikit untuk menilai kunci
 * lawan kembarannya.
 *
 * Di sini penebak hanya diberi DUA pilihan — kunci dan kembaran selabelnya —
 * sesudah diberi tahu labelnya ("anggap omongan itu betul/keliru") dan bahwa
 * omongan seperti ini bisa betul, bisa keliru. Semua jawaban terpakai, untuk
 * "Betul" maupun "Keliru", dan arah penebak tidak lagi ikut terukur.
 *
 * 3 model × 2 urutan × 2 rumusan = 12 jawaban. Peluang acak 0,5. Tak terbaca
 * dibuang; lebih dari sepertiga tak terbaca → "tak-terukur". Tolak bila
 * P(X ≥ kunci | n; 0,5) < `AMBANG_P_PASANGAN`.
 */
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import type { PesanChat } from '../klien.ts';
import { uraiKeluaran } from '../susun.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { BATAS_TAK_TERBACA, binomEkor, type PutusanSaringan } from './rotasi-v2.ts';
import { HURUF_ROTASI, MODEL_ROTASI, type JawabanRotasi } from './rotasi.ts';
import { labelBetul } from './selabel.ts';

export const AMBANG_P_PASANGAN = 0.02;
/** Varian satu model: urutan (kunci di 1 atau di 2) × rumusan. */
export const VARIAN_PASANGAN = [
  { kunciDi: 1, rumusan: 0 },
  { kunciDi: 2, rumusan: 0 },
  { kunciDi: 1, rumusan: 1 },
  { kunciDi: 2, rumusan: 1 },
] as const;

export const PETUNJUK_PASANGAN = [
  'Kamu ikut menguji soal latihan tentang saham. Seorang teman mengirim pesan di grup obrolan.',
  'Omongan seperti ini bisa betul, bisa keliru. Kamu TIDAK diberi dokumen apa pun.',
  'Balas HANYA dengan JSON berbentuk: {"pilih": 1, "alasan": "<paling banyak 12 kata>"} — "pilih" adalah 1 atau 2.',
].join('\n');

const RUMUSAN: ReadonlyArray<(label: string) => string> = [
  (l) => `Anggap omongan itu ${l}. Dari dua pernyataan ini, mana yang lebih mungkin tertulis di dokumennya?`,
  (l) => `Kalau ternyata omongan itu ${l}, mana dari dua pernyataan ini yang lebih mungkin sesuai dokumennya?`,
];

/** Indeks isi (0–3) kembaran selabel kunci; -1 bila tidak ada. Murni. */
export function isiKembaran(o: Pick<OmonganDraf, 'pilihan' | 'kunci'>): number {
  const label = labelBetul(o.pilihan);
  const k = HURUF_ROTASI.indexOf(o.kunci);
  return [0, 1, 2, 3].find((i) => i !== k && label[i] === label[k]) ?? -1;
}

/** Pesan untuk satu varian. Murni. */
export function pesanPasangan(o: Pick<OmonganDraf, 'nama' | 'jam' | 'pesan' | 'pilihan' | 'kunci'>, v: (typeof VARIAN_PASANGAN)[number]): PesanChat[] {
  const k = HURUF_ROTASI.indexOf(o.kunci);
  const t = isiKembaran(o);
  if (t < 0) throw new Error('omongan tanpa kembaran selabel (pilihan tidak dua-dua)');
  const label = labelBetul(o.pilihan)[k] === true ? 'betul' : 'keliru';
  const teks = (i: number): string => teksPolos(o.pilihan[HURUF_ROTASI[i] as KunciOpsi]);
  const [satu, dua] = v.kunciDi === 1 ? [k, t] : [t, k];
  return [
    { role: 'system', content: PETUNJUK_PASANGAN },
    { role: 'user', content: [`Pesan dari ${o.nama} (${o.jam}): "${teksPolos(o.pesan)}"`, '', (RUMUSAN[v.rumusan] as (l: string) => string)(label), `1) ${teks(satu as number)}`, `2) ${teks(dua as number)}`].join('\n') },
  ];
}

/** Urai `{"pilih": 1|2, "alasan": "…"}`. Murni. */
export function uraiPilih(teks: string): { pilih: 1 | 2; alasan: string } | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null) return null;
  const n = u.nilai as Record<string, unknown>;
  const p = typeof n['pilih'] === 'string' ? Number(n['pilih']) : n['pilih'];
  if (p !== 1 && p !== 2) return null;
  return { pilih: p, alasan: typeof n['alasan'] === 'string' ? n['alasan'] : '' };
}

export interface PutusanPasangan {
  aturan: 'pasangan-binomial';
  putusan: PutusanSaringan;
  /** Jawaban terbaca. */
  n: number;
  tak_terbaca: number;
  /** Jawaban terbaca yang memilih kunci. */
  kunci: number;
  p: number | null;
  alasan: string[];
}

const koma = (x: number, d: number): string => x.toFixed(d).replace('.', ',');

/** Putusan dari jawaban berpasangan satu soal. Murni. */
export function agregasiPasangan(jawaban: readonly JawabanRotasi[]): PutusanPasangan {
  const terbaca = jawaban.filter((j) => j.isi !== null);
  const takTerbaca = jawaban.length - terbaca.length;
  const kunci = terbaca.filter((j) => j.isi === j.isi_kunci).length;
  const p = terbaca.length === 0 ? null : binomEkor(kunci, terbaca.length, 0.5);
  const dasar = { aturan: 'pasangan-binomial' as const, n: terbaca.length, tak_terbaca: takTerbaca, kunci, p };
  if (jawaban.length === 0 || p === null || takTerbaca > jawaban.length * BATAS_TAK_TERBACA + 1e-9) {
    return { ...dasar, putusan: 'tak-terukur', alasan: [`penebak berpasangan: ${String(takTerbaca)} dari ${String(jawaban.length)} jawaban tak terbaca (lebih dari sepertiga) — tak terukur`] };
  }
  const tolak = p < AMBANG_P_PASANGAN;
  return {
    ...dasar,
    putusan: tolak ? 'tolak' : 'lulus',
    alasan: [`tanpa kartu, diberi kunci dan kembaran selabelnya saja, penebak memilih kunci ${String(kunci)} dari ${String(terbaca.length)} (peluang kebetulan ${koma(p, 4)}; batas ${koma(AMBANG_P_PASANGAN, 2)})${tolak ? ' — kunci bisa dibedakan dari kembarannya tanpa membaca kartu' : ''}${takTerbaca > 0 ? `; ${String(takTerbaca)} tak terbaca dibuang` : ''}`],
  };
}

export interface HasilTebakPasangan {
  jawaban: JawabanRotasi[];
  putusan: PutusanPasangan;
  biaya_usd: number;
}

/** Jalankan 3 model × 4 varian. Jawaban tak terbaca diulang sekali. */
export async function tebakPasangan(o: OmonganDraf, opsi: { panggil: PanggilTemplat; putaran: number; omongan: number }): Promise<HasilTebakPasangan> {
  const isiKunci = HURUF_ROTASI.indexOf(o.kunci);
  const kembaran = isiKembaran(o);
  const perModel = MODEL_ROTASI.map(async (m, mi) => {
    const hasil: JawabanRotasi[] = [];
    for (const [vi, v] of VARIAN_PASANGAN.entries()) {
      const pesan = pesanPasangan(o, v);
      let biaya = 0;
      let panggilan = 0;
      let pilih: { pilih: 1 | 2; alasan: string } | null = null;
      let terakhir = '';
      for (let ulang = 0; ulang < 2 && pilih === null; ulang++) {
        const j = await opsi.panggil(pesan, { ...m.setelan }, { jenis: 'gerbang-tebak', putaran: opsi.putaran, omongan: opsi.omongan, ke: mi * VARIAN_PASANGAN.length + vi + 1, ...(ulang > 0 ? { ulang } : {}), peran: 'penebak', model: m.model });
        biaya += j.biaya_usd;
        panggilan += 1;
        terakhir = j.teks;
        pilih = uraiPilih(j.teks);
      }
      const isi = pilih === null ? null : (pilih.pilih === v.kunciDi ? isiKunci : kembaran);
      hasil.push({ model: m.model, kondisi: 'pesan-pilihan', r: vi, huruf: isi === null ? null : (HURUF_ROTASI[isi] as KunciOpsi), isi, isi_kunci: isiKunci, terbaca: isi !== null, salinan: pilih === null ? terakhir.slice(0, 300) : String(pilih.pilih), skor: isi === null ? null : 1, alasan: pilih?.alasan ?? '(tak terbaca)', biaya_usd: biaya, panggilan });
    }
    return hasil;
  });
  const hasil = await Promise.allSettled(perModel);
  const gagal = hasil.find((x): x is PromiseRejectedResult => x.status === 'rejected');
  if (gagal !== undefined) throw gagal.reason instanceof Error ? gagal.reason : new Error(String(gagal.reason));
  const jawaban = hasil.flatMap((x) => (x.status === 'fulfilled' ? x.value : []));
  return { jawaban, putusan: agregasiPasangan(jawaban), biaya_usd: jawaban.reduce((a, x) => a + x.biaya_usd, 0) };
}
