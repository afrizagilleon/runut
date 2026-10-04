/**
 * Ukuran tebak "selabel" (M2d-21) — BERDAMPINGAN dengan `agregasiRotasiV2`,
 * yang tidak diubah.
 *
 * Kenapa: penebak tanpa kartu cenderung mengiyakan teman. Terukur pada tiga
 * jenis penebak (model murah, Opus, Jev): hampir seluruh pilihannya jatuh di
 * pilihan berlabel "Betul". Dengan ambang "kunci vs acak 25 %", semua kunci
 * "Keliru" lolos dan kunci "Betul" jatuh — soal tayang DADA s2 ("Betul") pun
 * ikut ditebak. Yang terukur adalah arah penebak, bukan bocornya soal.
 *
 * Ukuran selabel membuang arah itu: dari jawaban terbaca kondisi pesan+pilihan,
 * yang dihitung hanya jawaban yang memilih pilihan BERLABEL SAMA dengan kunci
 * (kunci atau kembarannya). Di antara itu, kunci vs kembaran = peluang acak
 * 0,5. Soal bocor bila penebak yang sudah berada di label kunci tetap bisa
 * memilih kunci, bukan kembarannya, jauh di atas kebetulan.
 *
 * - tak terbaca dibuang; tak terbaca > 1/3 → "tak-terukur" (sama dengan v2);
 * - jawaban selabel < `MIN_SELABEL` → tidak cukup bukti untuk menolak → lulus
 *   (dicatat);
 * - tolak bila P(X ≥ kunci | n selabel; 0,5) < `AMBANG_P_SELABEL`.
 */
import type { KunciOpsi } from '../draf.ts';
import { teksPolos } from '../../skema/rujukan.ts';
import { BATAS_TAK_TERBACA, binomEkor, type PutusanSaringan } from './rotasi-v2.ts';
import { HURUF_ROTASI, type JawabanRotasi } from './rotasi.ts';

export const PELUANG_SELABEL = 0.5;
/**
 * Kalibrasi 4 Okt atas 43 butir tersimpan (`alat/agen/kalibrasi-selabel.ts`):
 * p < 0,05 menolak soal tayang DADA s2 (7 dari 8, p = 0,035) dan 2/43 plasebo;
 * p < 0,02 menolak 0/6 soal tayang, 1/43 plasebo, 9/43 kunci asli.
 */
export const AMBANG_P_SELABEL = 0.02;
export const MIN_SELABEL = 5;

/** Label tiap ISI asal (indeks 0–3 = pilihan a–d): `true` = "Betul, …". Murni. */
export function labelBetul(pilihan: Record<KunciOpsi, string>): boolean[] {
  return HURUF_ROTASI.map((h) => /^\s*betul\b/i.test(teksPolos(pilihan[h as KunciOpsi])));
}

export interface PutusanSelabel {
  aturan: 'selabel-binomial';
  putusan: PutusanSaringan;
  /** Jawaban terbaca kondisi pesan+pilihan. */
  n: number;
  tak_terbaca: number;
  /** Di antaranya yang memilih pilihan berlabel sama dengan kunci. */
  n_selabel: number;
  /** Di antaranya yang memilih kunci. */
  kunci: number;
  /** P(X ≥ kunci | n_selabel; 0,5); `null` bila n_selabel = 0. */
  p: number | null;
  /** Bagian jawaban terbaca yang memilih pilihan "Betul" (arah penebak; catatan). */
  bagian_betul: number | null;
  alasan: string[];
}

const koma = (x: number, d: number): string => x.toFixed(d).replace('.', ',');

/** Putusan selabel dari jawaban rotasi satu soal. Murni. */
export function agregasiSelabel(jawaban: readonly JawabanRotasi[], pilihan: Record<KunciOpsi, string>): PutusanSelabel {
  const pp = jawaban.filter((j) => j.kondisi === 'pesan-pilihan');
  const terbaca = pp.filter((j) => j.isi !== null);
  const takTerbaca = pp.length - terbaca.length;
  const label = labelBetul(pilihan);
  const isiKunci = pp[0]?.isi_kunci ?? -1;
  const labelKunci = label[isiKunci];
  const selabel = terbaca.filter((j) => label[j.isi as number] === labelKunci);
  const kunci = selabel.filter((j) => j.isi === isiKunci).length;
  const p = selabel.length === 0 ? null : binomEkor(kunci, selabel.length, PELUANG_SELABEL);
  const bagianBetul = terbaca.length === 0 ? null : terbaca.filter((j) => label[j.isi as number] === true).length / terbaca.length;
  const dasar = { aturan: 'selabel-binomial' as const, n: terbaca.length, tak_terbaca: takTerbaca, n_selabel: selabel.length, kunci, p, bagian_betul: bagianBetul };
  const namaLabel = labelKunci === true ? 'Betul' : 'Keliru';
  if (pp.length === 0 || terbaca.length === 0 || takTerbaca > pp.length * BATAS_TAK_TERBACA + 1e-9) {
    return { ...dasar, putusan: 'tak-terukur', alasan: [`pesan+pilihan: ${String(takTerbaca)} dari ${String(pp.length)} jawaban tak terbaca (lebih dari sepertiga) — tak terukur`] };
  }
  const arah = bagianBetul === null ? '' : `; ${String(Math.round(bagianBetul * 100))} % jawaban memilih pilihan "Betul"`;
  if (selabel.length < MIN_SELABEL || p === null) {
    return { ...dasar, putusan: 'lulus', alasan: [`tanpa kartu, hanya ${String(selabel.length)} dari ${String(terbaca.length)} jawaban memilih pilihan "${namaLabel}" (label kunci); terlalu sedikit untuk menilai kunci lawan kembarannya${arah}`] };
  }
  const tolak = p < AMBANG_P_SELABEL;
  return {
    ...dasar,
    putusan: tolak ? 'tolak' : 'lulus',
    alasan: [`tanpa kartu, dari ${String(selabel.length)} jawaban yang memilih pilihan "${namaLabel}", ${String(kunci)} memilih kunci dan ${String(selabel.length - kunci)} memilih kembarannya (peluang kebetulan ${koma(p, 4)}; batas ${koma(AMBANG_P_SELABEL, 2)})${tolak ? ' — kunci bisa dibedakan dari kembarannya tanpa membaca kartu' : ''}${arah}`],
  };
}
