/**
 * `npm run rotasi:plasebo` (M2d-16 D-2) — uji plasebo gerbang tebak atas data
 * rotasi TERSIMPAN. Gratis: tidak ada panggilan model.
 *
 * Data: `eval/keluaran-m2d11/uji-ulang/mentah.json` (33 soal lama) + semua
 * `eval/penyusun/m2d1[135]-<...>/hasil.json` (versi jalan yang sampai ke tebak
 * rotasi). Tiap butir punya 24 jawaban (3 model × 4 rotasi × 2 kondisi).
 *
 * Plasebo: tiap PENGECOH diperlakukan seolah-olah kunci (3 kunci palsu per
 * butir). Aturan yang sehat hampir tidak pernah "menolak" kunci palsu —
 * penebak tidak bisa "menebak" jawaban yang salah. Laju tolak kunci palsu =
 * batas bawah laju tolak-palsu aturan itu.
 *
 * `--tulis` menulis `docs/bukti/gerbang-tebak-v2.md` (dites sama dengan
 * keluaran skrip).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { KunciOpsi } from '../draf.ts';
import { AKAR } from '../env.ts';
import { auditOpusTersimpan, plaseboOpus, ringkasAuditOpus } from './penebak-kuat.ts';
import { agregasiRotasi, putar, uraiSalinan, type JawabanRotasi } from './rotasi.ts';
import { AMBANG_P_SARINGAN, agregasiRotasiV2, ambangTolak, petakanSalinanV2, type PutusanSaringan } from './rotasi-v2.ts';

export const JALUR_MENTAH_UJI_ULANG_M2D11 = 'eval/keluaran-m2d11/uji-ulang/mentah.json';
export const FOLDER_JALAN = 'eval/penyusun';
export const POLA_JALAN = /^m2d1[135]-/;
export const JALUR_LAPORAN_PLASEBO = 'docs/bukti/gerbang-tebak-v2.md';

export interface ButirRotasi {
  nama: string;
  jawaban: JawabanRotasi[];
  /** Pilihan asal (bila tersimpan bersama jawabannya) — untuk memetakan ulang salinan. */
  pilihan: Record<KunciOpsi, string> | null;
  kunci: KunciOpsi | null;
}

/** Semua butir berdata rotasi, urutan tetap (uji ulang, lalu jalan menurut nama folder). */
export function bacaButirRotasi(akar: string = AKAR): ButirRotasi[] {
  const hasil: ButirRotasi[] = [];
  const m = JSON.parse(readFileSync(`${akar}${JALUR_MENTAH_UJI_ULANG_M2D11}`, 'utf8')) as { hasil: Array<{ id: string; rotasi: { jawaban: JawabanRotasi[] } | null }> };
  for (const e of m.hasil) if (e.rotasi !== null && e.rotasi.jawaban.length > 0) hasil.push({ nama: `uji-ulang:${e.id}`, jawaban: e.rotasi.jawaban, pilihan: null, kunci: null });
  for (const f of readdirSync(`${akar}${FOLDER_JALAN}`).filter((x) => POLA_JALAN.test(x)).sort()) {
    const jalur = `${akar}${FOLDER_JALAN}/${f}/hasil.json`;
    if (!existsSync(jalur)) continue;
    const h = JSON.parse(readFileSync(jalur, 'utf8')) as { versi?: Array<{ no: number; versi: number; omongan?: { pilihan?: Record<KunciOpsi, string>; kunci?: KunciOpsi } | null; rotasi?: { jawaban?: JawabanRotasi[] } | null }> };
    for (const v of h.versi ?? []) {
      const j = v.rotasi?.jawaban;
      if (j === undefined || j.length === 0) continue;
      hasil.push({ nama: `${f}:o${String(v.no)}v${String(v.versi)}`, jawaban: j, pilihan: v.omongan?.pilihan ?? null, kunci: v.omongan?.kunci ?? null });
    }
  }
  return hasil;
}

const denganKunci = (j: readonly JawabanRotasi[], kunci: number): JawabanRotasi[] => j.map((x) => ({ ...x, isi_kunci: kunci }));

/** Aturan lama (M2d-11): ditolak = putusan bukan "lulus" (gagal, abu-abu, tak-terukur). */
export const ditolakLama = (j: readonly JawabanRotasi[], kunci: number): boolean => agregasiRotasi(denganKunci(j, kunci)).putusan !== 'lulus';
export const putusanV2 = (j: readonly JawabanRotasi[], kunci: number): PutusanSaringan => agregasiRotasiV2(denganKunci(j, kunci)).putusan;

export interface RingkasAturan {
  asli_ditolak: number;
  asli_tak_terukur: number;
  plasebo_ditolak: number;
  plasebo_tak_terukur: number;
  tayang: number;
  tayang_tidak_ditolak: number;
  tayang_tak_terukur: number;
  /** Nama soal tayang → putusan. */
  per_tayang: Array<{ nama: string; putusan: string }>;
}

export interface HasilPlasebo {
  n: number;
  n_plasebo: number;
  lama: RingkasAturan;
  v2: RingkasAturan;
  /** Ditolak aturan lama tetapi tidak ditolak v2 (versi jalan agen saja). */
  beda: Array<{ nama: string; lama: string; v2: string; kunci_pp: string }>;
}

/** Laju tolak kunci asli vs kunci palsu untuk aturan lama dan v2. Murni. */
export function ujiPlasebo(butir: readonly ButirRotasi[]): HasilPlasebo {
  const kosong = (): RingkasAturan => ({ asli_ditolak: 0, asli_tak_terukur: 0, plasebo_ditolak: 0, plasebo_tak_terukur: 0, tayang: 0, tayang_tidak_ditolak: 0, tayang_tak_terukur: 0, per_tayang: [] });
  const lama = kosong();
  const v2 = kosong();
  const beda: HasilPlasebo['beda'] = [];
  let nPlasebo = 0;
  for (const b of butir) {
    const kunci = b.jawaban[0]?.isi_kunci ?? 0;
    const pl = agregasiRotasi(b.jawaban).putusan;
    const pv = agregasiRotasiV2(b.jawaban);
    if (pl !== 'lulus') lama.asli_ditolak += 1;
    if (pl === 'tak-terukur') lama.asli_tak_terukur += 1;
    if (pv.putusan === 'tolak') v2.asli_ditolak += 1;
    if (pv.putusan === 'tak-terukur') v2.asli_tak_terukur += 1;
    if (b.nama.includes('tayang')) {
      lama.tayang += 1;
      v2.tayang += 1;
      if (pl === 'lulus') lama.tayang_tidak_ditolak += 1;
      if (pv.putusan !== 'tolak') v2.tayang_tidak_ditolak += 1;
      if (pv.putusan === 'tak-terukur') v2.tayang_tak_terukur += 1;
      lama.per_tayang.push({ nama: b.nama, putusan: pl });
      v2.per_tayang.push({ nama: b.nama, putusan: pv.putusan });
    }
    if (!b.nama.startsWith('uji-ulang:') && pl !== 'lulus' && pv.putusan !== 'tolak') {
      const pp = pv.kondisi['pesan-pilihan'];
      beda.push({ nama: b.nama, lama: pl, v2: pv.putusan, kunci_pp: `${String(pp.kunci)}/${String(pp.n)}` });
    }
    for (const alt of [0, 1, 2, 3]) {
      if (alt === kunci) continue;
      nPlasebo += 1;
      const al = agregasiRotasi(denganKunci(b.jawaban, alt)).putusan;
      if (al !== 'lulus') lama.plasebo_ditolak += 1;
      if (al === 'tak-terukur') lama.plasebo_tak_terukur += 1;
      const av = putusanV2(b.jawaban, alt);
      if (av === 'tolak') v2.plasebo_ditolak += 1;
      if (av === 'tak-terukur') v2.plasebo_tak_terukur += 1;
    }
  }
  return { n: butir.length, n_plasebo: nPlasebo, lama, v2, beda };
}

export interface PetaUlang {
  /** Jawaban tak terbaca (pencocok lama) pada butir yang pilihannya tersimpan. */
  tak_terbaca_lama: number;
  /** Di antaranya yang terbaca oleh pencocok v2. */
  terbaca_v2: number;
  per_butir: Array<{ nama: string; tak_terbaca_lama: number; terbaca_v2: number; kunci: number; pengecoh: number; putusan_v2_sesudah: PutusanSaringan }>;
}

function teksSalinan(mentah: string): string | null {
  const u = uraiSalinan(mentah);
  if (u !== null) return u.teks;
  // salinan tersimpan dipotong 300 karakter: JSON bisa tidak utuh
  return /"teks"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(mentah)?.[1]?.replace(/\\"/g, '"') ?? null;
}

/** Petakan ulang salinan tersimpan yang "tak terbaca" dengan pencocok v2 (butir jalan yang pilihannya tersimpan). */
export function petakanUlangTersimpan(akar: string = AKAR): PetaUlang {
  const hasil: PetaUlang = { tak_terbaca_lama: 0, terbaca_v2: 0, per_butir: [] };
  for (const b of bacaButirRotasi(akar)) {
    if (b.pilihan === null || b.kunci === null) continue;
    const tak = b.jawaban.filter((x) => x.isi === null);
    if (tak.length === 0) continue;
    let terbaca = 0;
    let kunci = 0;
    const baru = b.jawaban.map((x) => {
      if (x.isi !== null || x.salinan === null) return x;
      const t = teksSalinan(x.salinan);
      if (t === null) return x;
      const p = putar({ pilihan: b.pilihan as Record<KunciOpsi, string>, kunci: b.kunci as KunciOpsi }, x.r);
      const peta = petakanSalinanV2(t, p.pilihan);
      if (peta.huruf === null) return x;
      terbaca += 1;
      const isi = p.asal[peta.huruf];
      if (isi === x.isi_kunci) kunci += 1;
      return { ...x, huruf: peta.huruf, isi, terbaca: true };
    });
    hasil.tak_terbaca_lama += tak.length;
    hasil.terbaca_v2 += terbaca;
    hasil.per_butir.push({ nama: b.nama, tak_terbaca_lama: tak.length, terbaca_v2: terbaca, kunci, pengecoh: terbaca - kunci, putusan_v2_sesudah: agregasiRotasiV2(baru).putusan });
  }
  return hasil;
}

const persen = (a: number, n: number): string => `${((a * 100) / n).toFixed(1).replace('.', ',')} %`;

/** Isi `docs/bukti/gerbang-tebak-v2.md` — seluruh angka dihitung dari data tersimpan. */
export function laporanPlasebo(akar: string = AKAR): string {
  const butir = bacaButirRotasi(akar);
  const h = ujiPlasebo(butir);
  const u = petakanUlangTersimpan(akar);
  const opus = auditOpusTersimpan(akar);
  const ro = ringkasAuditOpus(opus);
  const po = plaseboOpus(opus);
  const tak = new Map<string, [number, number]>();
  for (const b of butir) for (const j of b.jawaban) {
    const x = tak.get(j.model) ?? [0, 0];
    tak.set(j.model, [x[0] + (j.isi === null ? 1 : 0), x[1] + 1]);
  }
  const baris = (nama: string, r: RingkasAturan): string =>
    `| ${nama} | ${String(r.asli_ditolak)}/${String(h.n)} (${persen(r.asli_ditolak, h.n)}) | ${String(r.plasebo_ditolak)}/${String(h.n_plasebo)} (${persen(r.plasebo_ditolak, h.n_plasebo)}) | ${String(r.tayang_tidak_ditolak)}/${String(r.tayang)} | ${String(r.asli_tak_terukur)} asli, ${String(r.plasebo_tak_terukur)} palsu |`;
  const o2 = u.per_butir.find((x) => x.nama === 'm2d15-opus-3:o2v2');
  const L: string[] = [
    '# Gerbang tebak v2 — uji plasebo atas data tersimpan (M2d-16 D-1, D-2, D-3)',
    '',
    'Dibuat `npm run rotasi:plasebo -- --tulis` (`factory/llm/rotasi/plasebo.ts`). Semua angka dihitung ulang dari berkas tersimpan; tidak ada panggilan model. Tes `factory/llm/rotasi/plasebo.test.ts` menggagalkan build bila berkas ini berbeda dari keluaran skrip.',
    '',
    '## 1. Kenapa aturan lama diganti',
    '',
    'Aturan lama (`agregasiRotasi`, pra-registrasi M2d-11 §3.4): sebuah soal gagal bila SATU model di SALAH SATU dari dua kondisi memilih isi kunci di ≥ 3 dari 4 rotasi, atau bila proporsi kunci pesan+pilihan > 5/12. Penebak disetel suhu 0, jadi tiap model cenderung memilih isi yang sama di semua rotasi — apa pun isinya. Laju tolak-palsu aturan itu tidak pernah dihitung sebelum dipra-registrasi (audit 3 Okt, Temuan 1). Aturan lama, pra-registrasinya, dan laporannya TIDAK diubah; v2 berdiri di sampingnya.',
    '',
    '## 2. Cara uji plasebo',
    '',
    `- Data: \`${JALUR_MENTAH_UJI_ULANG_M2D11}\` (${String(butir.filter((b) => b.nama.startsWith('uji-ulang:')).length)} soal lama) + semua \`${FOLDER_JALAN}/m2d1[135]-*/hasil.json\` (${String(butir.filter((b) => !b.nama.startsWith('uji-ulang:')).length)} versi jalan yang sampai ke tebak rotasi) = ${String(h.n)} butir, masing-masing 24 jawaban tersimpan (3 model × 4 rotasi × 2 kondisi).`,
    `- Kunci palsu: tiap pengecoh diperlakukan seolah-olah kunci → ${String(h.n_plasebo)} kunci palsu. Penebak tidak bisa "menebak" jawaban yang salah, jadi aturan yang sehat hampir tidak pernah menolak kunci palsu.`,
    '- "Ditolak" aturan lama = putusan bukan `lulus` (gagal, abu-abu, tak-terukur) — begitulah mesin memperlakukannya. "Ditolak" v2 = putusan `tolak`; `tak-terukur` dihitung terpisah (bukan lulus, bukan tolak).',
    '- Jawaban memakai pemetaan salinan yang TERSIMPAN (pencocok lama), supaya angka sebanding dengan skrip acuan reviewer. Pengaruh pencocok v2 dilaporkan terpisah di §5.',
    '',
    '## 3. Aturan v2 (saringan murah)',
    '',
    '`agregasiRotasiV2` (`factory/llm/rotasi/rotasi-v2.ts`):',
    '',
    '- jawaban tak terbaca DIBUANG dari hitungan dan dilaporkan jumlahnya (aturan lama menghitungnya sebagai "memilih kunci");',
    '- tak terbaca lebih dari sepertiga jawaban kondisi pesan+pilihan → `tak-terukur`;',
    `- uji binomial satu sisi atas jawaban pesan+pilihan, semua model digabung, terhadap peluang acak 0,25: tolak bila p < ${String(AMBANG_P_SARINGAN).replace('.', ',')} (untuk 12 jawaban terbaca: kunci ≥ ${String(ambangTolak(12))});`,
    '- tidak ada aturan "satu model ≥ 3/4" dan tidak ada model yang diabaikan karena bias huruf;',
    '- kondisi pilihan-saja hanya diagnosis yang dicatat, bukan penolak.',
    '',
    '## 4. Hasil',
    '',
    '| aturan | kunci asli ditolak | kunci palsu ditolak | soal tayang tidak ditolak | tak-terukur |',
    '|---|---|---|---|---|',
    baris('lama (M2d-11)', h.lama),
    baris('v2 (binomial p < 0,01, pesan+pilihan)', h.v2),
    '',
    `Angka acuan reviewer memakai pembulatan ke bawah: lama 72 % / 44 %, v2 22 % / 8 % — sama dengan hitungan di atas (${String(h.lama.asli_ditolak)}/${String(h.n)}, ${String(h.lama.plasebo_ditolak)}/${String(h.n_plasebo)}, ${String(h.v2.asli_ditolak)}/${String(h.n)}, ${String(h.v2.plasebo_ditolak)}/${String(h.n_plasebo)}).`,
    '',
    'Soal tayang (disusun bersama pemilik) per aturan:',
    '',
    '| soal tayang | lama | v2 |',
    '|---|---|---|',
    ...h.lama.per_tayang.map((t, i) => `| ${t.nama.replace('uji-ulang:', '')} | ${t.putusan} | ${h.v2.per_tayang[i]?.putusan ?? '?'} |`),
    '',
    `Versi jalan agen yang ditolak aturan lama tetapi tidak ditolak v2: ${String(h.beda.length)}.`,
    '',
    '| butir | lama | v2 | kunci pesan+pilihan (terbaca) |',
    '|---|---|---|---|',
    ...h.beda.map((b) => `| ${b.nama} | ${b.lama} | ${b.v2} | ${b.kunci_pp} |`),
    '',
    `Tak terbaca per model (pencocok lama, ${String(h.n)} butir): ${[...tak].map(([m, [a, n]]) => `${m} ${String(a)}/${String(n)}`).join('; ')}.`,
    '',
    '## 5. Pencocok salinan v2',
    '',
    'Pencocok lama (Dice bigram, harus unggul ≥ 0,05 dari opsi kedua) menandai salinan PERSIS sebagai tak terbaca bila pilihan-pilihannya mirip — justru soal berpilihan sejajar yang diminta aturan penulisan. `petakanSalinanV2` mendahulukan cocok persis sesudah normalisasi (rujukan `[[id|teks]]` → teks, huruf kecil, tanda baca → spasi); Dice hanya dipakai bila tidak ada yang persis.',
    '',
    `Atas salinan tersimpan butir jalan yang pilihannya ikut tersimpan: ${String(u.tak_terbaca_lama)} jawaban tak terbaca (pencocok lama), ${String(u.terbaca_v2)} di antaranya terbaca oleh pencocok v2. Salinan tersimpan dipotong 300 karakter, jadi ini batas bawah.`,
    ...(o2 === undefined ? [] : ['', `Contoh: \`m2d15-opus-3\` omongan 2 versi 2 — ${String(o2.tak_terbaca_lama)} tak terbaca menjadi ${String(o2.terbaca_v2)} terbaca (${String(o2.kunci)} memilih kunci, ${String(o2.pengecoh)} memilih pengecoh); aturan lama menghitung semuanya sebagai kunci. Dengan jawaban yang dipetakan ulang, putusan v2 butir ini: \`${o2.putusan_v2_sesudah}\`.`]),
    '',
    '## 6. Penebak kuat satu-soal (D-3)',
    '',
    'Jalur gerbang berbayar baru (`factory/llm/rotasi/penebak-kuat.ts`; belum pernah dijalankan berbayar): Opus 5.5, effort "low", SATU soal per panggilan, 4 rotasi, tanpa kartu, prompt sama dengan penebak rotasi pesan+pilihan. Tolak bila isi kunci dipilih di ≥ 3 rotasi terbaca. Urutan gerbang baru: kode → saringan murah v2 → pembaca kartu r0+r2 → penebak kuat → kritikus GLM.',
    '',
    `Dasar dari audit Opus satu-soal tersimpan (\`eval/keluaran-m2d13/audit-opus\`, \`eval/keluaran-m2d15/audit-opus\`; ${String(ro.n)} butir × 4 rotasi): Opus konsisten (≥ 3/4) memilih KUNCI di ${String(ro.kunci)} butir, konsisten memilih satu PENGECOH di ${String(ro.pengecoh)}, tak konsisten di ${String(ro.tak_konsisten)}.`,
    '',
    `Perkiraan laju tolak-palsu, dengan jujur: (a) plasebo — tiap pengecoh diperlakukan sebagai kunci: ${String(po.ditolak)}/${String(po.n)} (${persen(po.ditolak, po.n)}) ditolak; (b) dari ${String(ro.n - ro.kunci)} butir yang kuncinya tidak dipilih konsisten, Opus tetap konsisten pada satu isi di ${String(ro.pengecoh)} — bila soal yang tak tertebak membuat Opus "menempel" pada satu isi sesering itu dan isi itu acak di antara empat, kunci terkena kebetulan ±${persen(ro.pengecoh, (ro.n - ro.kunci) * 4)}. Kedua angka berasal dari ${String(ro.n)} butir saja (selang kepercayaannya lebar), dari audit yang memakai subagent Opus dan prompt audit (dengan "yakin 0–100"), BUKAN dari jalur API effort "low" dengan prompt penebak rotasi yang akan dipakai gerbang. Angka sebenarnya baru diketahui sesudah gerbang ini dijalankan pada soal baru.`,
    '',
    '## 7. Batas',
    '',
    '- Aturan v2 dipilih SESUDAH melihat data ini (reviewer mencoba beberapa aturan pada 70 butir yang sama). Angka di atas karena itu optimistis; aturan harus dikonfirmasi pada soal baru sebelum dijadikan dasar klaim.',
    '- Uji plasebo mengukur tolak-palsu, bukan daya tangkap: aturan v2 lebih longgar daripada aturan lama, jadi soal yang memang tertebak lebih mungkin lolos saringan murah. Karena itu saringan murah bukan gerbang terakhir — penebak kuat (§6) berdiri sesudahnya.',
    '- 70 butir bukan sampel acak: 33 soal lama + versi jalan tiga milestone pada satu emiten (TIRT), banyak yang serumpun.',
    '- Kunci palsu bukan soal "tak tertebak" murni: pengecoh ditulis supaya tampak masuk akal, tetapi juga bisa lebih atau kurang menarik daripada kunci yang tak tertebak.',
    '',
  ];
  return L.join('\n');
}

if (/(^|[\\/])rotasi[\\/]plasebo\.ts$/.test(process.argv[1] ?? '')) {
  const teks = laporanPlasebo();
  if (process.argv.includes('--tulis')) {
    writeFileSync(`${AKAR}${JALUR_LAPORAN_PLASEBO}`, teks, 'utf8');
    console.log(`ditulis: ${JALUR_LAPORAN_PLASEBO}`);
  } else console.log(teks);
}
