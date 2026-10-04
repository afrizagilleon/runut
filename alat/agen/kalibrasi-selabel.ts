/**
 * Kalibrasi ukuran selabel (M2d-21) atas jawaban penebak yang SUDAH tersimpan —
 * nol panggilan berbayar.
 *
 * Data: 33 butir uji-ulang M2d-11 (6 soal tayang + 27 omongan lama yang pernah
 * diuji penguji luar; `eval/keluaran-m2d11/uji-ulang/mentah.json`) dan omongan
 * agen M2d-18/19 yang sampai ke saringan tebak.
 *
 * Untuk tiap butir dihitung putusan v2 (kunci vs acak 25 %) dan putusan
 * selabel (kunci vs kembaran selabel, acak 50 %), pada kunci asli dan pada
 * PLASEBO (kembaran selabel diperlakukan sebagai kunci): aturan yang sehat
 * menolak plasebo sejarang ia menolak kebetulan.
 *
 *   node --experimental-strip-types alat/agen/kalibrasi-selabel.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { drafDari, type OmonganBebas } from '../../factory/llm/bebas/skema.ts';
import type { KunciOpsi, OmonganDraf } from '../../factory/llm/draf.ts';
import { AKAR } from '../../factory/llm/env.ts';
import { omonganLama, soalTayang } from '../../factory/llm/patokan/bank-lama.ts';
import { agregasiRotasiV2, binomEkor } from '../../factory/llm/rotasi/rotasi-v2.ts';
import { HURUF_ROTASI, type JawabanRotasi } from '../../factory/llm/rotasi/rotasi.ts';
import { agregasiSelabel, AMBANG_P_SELABEL, labelBetul, MIN_SELABEL } from '../../factory/llm/rotasi/selabel.ts';

interface Butir {
  id: string;
  kelompok: string;
  o: OmonganDraf;
  jawaban: JawabanRotasi[];
  /** Nasib di gerbang yang sekarang / uji luar (catatan). */
  catatan: string;
}

const bank = new Map([...soalTayang(), ...omonganLama()].map((b) => [b.id, b]));
const mentah = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d11/uji-ulang/mentah.json`, 'utf8')) as { hasil: Array<{ id: string; kelompok: string; tertebak_luar: boolean; rotasi: { jawaban: JawabanRotasi[] } }> };
const butir: Butir[] = [];
for (const e of mentah.hasil) {
  const b = bank.get(e.id);
  if (b === undefined) throw new Error(`butir ${e.id} tidak ada di bank lama`);
  butir.push({ id: e.id, kelompok: e.kelompok === 'tayang' ? 'tayang' : e.tertebak_luar ? 'lama-tertebak-opus-luar' : 'lama-tak-tertebak', o: b.omongan, jawaban: e.rotasi.jawaban, catatan: e.kelompok === 'tayang' ? 'soal tayang' : e.tertebak_luar ? 'penguji luar Opus menebak ≥ 2/3' : 'penguji luar tidak menebak' });
}
for (const nama of readdirSync(`${AKAR}eval/penyusun`).sort()) {
  const jh = `${AKAR}eval/penyusun/${nama}/hasil.json`;
  if (!/^m2d1[89]-/.test(nama) || !existsSync(jh)) continue;
  type N = { putaran: number; berhenti: string; omongan: OmonganBebas; saringan: { jawaban: JawabanRotasi[] } | null };
  const h = JSON.parse(readFileSync(jh, 'utf8')) as { nilai?: N[]; keadaan?: { nilai?: N[] } };
  for (const n of h.nilai ?? h.keadaan?.nilai ?? []) {
    if (n.saringan !== null) butir.push({ id: `${nama.replace('m2d', '')}-p${String(n.putaran)}`, kelompok: 'agen', o: drafDari(n.omongan), jawaban: n.saringan.jawaban, catatan: `gerbang sekarang: ${n.berhenti}` });
  }
}

function hitung(b: Butir, isiKunci: number): { n_s: number; k: number; p: number | null } {
  const label = labelBetul(b.o.pilihan);
  const t = b.jawaban.filter((j) => j.kondisi === 'pesan-pilihan' && j.isi !== null);
  const s = t.filter((j) => label[j.isi as number] === label[isiKunci]);
  const k = s.filter((j) => j.isi === isiKunci).length;
  return { n_s: s.length, k, p: s.length === 0 ? null : binomEkor(k, s.length, 0.5) };
}
const kembaran = (b: Butir, isiKunci: number): number => {
  const label = labelBetul(b.o.pilihan);
  return [0, 1, 2, 3].find((i) => i !== isiKunci && label[i] === label[isiKunci]) ?? -1;
};

const baris: Array<Record<string, unknown>> = [];
console.log(`Butir: ${String(butir.length)}. Aturan selabel terpasang: tolak bila p < ${String(AMBANG_P_SELABEL)} dan jawaban selabel ≥ ${String(MIN_SELABEL)}.\n`);
console.log('id'.padEnd(34), 'kelompok'.padEnd(24), 'jwb'.padEnd(7), 'v2'.padEnd(12), 'selabel'.padEnd(8), 'kunci/selabel/terbaca', ' p', ' %Betul', '| catatan');
for (const b of butir) {
  const isiKunci = HURUF_ROTASI.indexOf(b.o.kunci as KunciOpsi);
  const betul = labelBetul(b.o.pilihan)[isiKunci] === true;
  const v2 = agregasiRotasiV2(b.jawaban);
  const s = agregasiSelabel(b.jawaban, b.o.pilihan);
  const kb = kembaran(b, isiKunci);
  const pl = kb < 0 ? null : hitung(b, kb);
  const plTolak = pl !== null && pl.p !== null && pl.n_s >= MIN_SELABEL && pl.p < AMBANG_P_SELABEL;
  baris.push({ id: b.id, kelompok: b.kelompok, jawaban: betul ? 'Betul' : 'Keliru', v2: v2.putusan, v2_kunci: v2.kondisi['pesan-pilihan'].kunci, v2_n: v2.kondisi['pesan-pilihan'].n, selabel: s.putusan, kunci: s.kunci, n_selabel: s.n_selabel, n: s.n, p: s.p, bagian_betul: s.bagian_betul, plasebo_tolak: plTolak, catatan: b.catatan });
  console.log(b.id.slice(0, 33).padEnd(34), b.kelompok.padEnd(24), (betul ? 'Betul' : 'Keliru').padEnd(7), `${v2.putusan} ${String(v2.kondisi['pesan-pilihan'].kunci)}/${String(v2.kondisi['pesan-pilihan'].n)}`.padEnd(12), s.putusan.padEnd(8), `${String(s.kunci)}/${String(s.n_selabel)}/${String(s.n)}`.padEnd(21), s.p === null ? '  - ' : s.p.toFixed(2), s.bagian_betul === null ? '  - ' : ` ${String(Math.round(s.bagian_betul * 100)).padStart(3)}%`, '|', b.catatan, plTolak ? '| PLASEBO DITOLAK' : '');
}

console.log('\n===== RINGKASAN per kelompok: ditolak v2 | ditolak selabel | plasebo selabel ditolak =====');
const kelompok = [...new Set(baris.map((x) => x['kelompok'] as string))];
for (const k of [...kelompok, 'SEMUA']) {
  const x = baris.filter((y) => k === 'SEMUA' || y['kelompok'] === k);
  for (const jw of ['Betul', 'Keliru']) {
    const y = x.filter((z) => z['jawaban'] === jw);
    if (y.length === 0) continue;
    console.log(`  ${k.padEnd(24)} ${jw.padEnd(7)} n=${String(y.length).padStart(2)} | v2 tolak ${String(y.filter((z) => z['v2'] === 'tolak').length).padStart(2)} | selabel tolak ${String(y.filter((z) => z['selabel'] === 'tolak').length).padStart(2)} | plasebo ${String(y.filter((z) => z['plasebo_tolak'] === true).length).padStart(2)}`);
  }
}

console.log('\n===== SAPUAN ambang (kunci asli ditolak / plasebo ditolak, dari semua butir) =====');
for (const a of [0.1, 0.05, 0.02, 0.01]) {
  for (const m of [4, 5, 6]) {
    let asli = 0;
    let pl = 0;
    let tayang = 0;
    for (const b of butir) {
      const ik = HURUF_ROTASI.indexOf(b.o.kunci as KunciOpsi);
      const h = hitung(b, ik);
      const t = h.p !== null && h.n_s >= m && h.p < a;
      if (t) asli += 1;
      if (t && b.kelompok === 'tayang') tayang += 1;
      const kb = kembaran(b, ik);
      const hp = kb < 0 ? null : hitung(b, kb);
      if (hp !== null && hp.p !== null && hp.n_s >= m && hp.p < a) pl += 1;
    }
    console.log(`  p < ${String(a).padEnd(4)} min ${String(m)}: kunci asli ${String(asli).padStart(2)}/${String(butir.length)} | plasebo ${String(pl).padStart(2)}/${String(butir.length)} | soal tayang ditolak ${String(tayang)}/6`);
  }
}
writeFileSync(`${AKAR}eval/penyusun/kalibrasi-selabel.json`, `${JSON.stringify({ aturan: { ambang_p: AMBANG_P_SELABEL, min_selabel: MIN_SELABEL }, butir: baris }, null, 2)}\n`, 'utf8');
