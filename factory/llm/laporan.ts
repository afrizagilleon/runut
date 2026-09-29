/**
 * `npm run llm:laporan` — hitung hasil uji tanding dari keluaran mentah dan
 * tulis `docs/bukti/uji-tanding-model.md` + `eval/keluaran-m2d/ringkasan.json`
 * + `eval/keluaran-m2d/ledger-ringkas.json` (M2d D-6).
 *
 * Tidak ada angka yang ditulis tangan di laporan: semuanya dihitung di sini
 * dari berkas sel (dua putaran), ledger biaya, kunci penguji, dan jawaban
 * mentah penguji. Aturan peringkat (`ATURAN_PERINGKAT`) ditetapkan sebelum
 * satu pun jawaban penguji dibaca dan tidak disetel sesudahnya. Bagian
 * "Rekomendasi" dan "Keterbatasan" ditulis tangan di
 * `eval/keluaran-m2d/laporan-tangan.md` dan ditempel apa adanya.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tanggalId } from '../format.ts';
import { AKAR } from './env.ts';
import { HARGA_FEATHERLESS_USANG as HARGA } from './harga.ts';
import { MODEL_TANDING } from './model.ts';
import { bacaLedgerSemua, type EntriLedger } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { FOLDER_PENGUJI, type KunciPenguji } from './penguji.ts';
import { PUTARAN, SUHU, type HasilSusun } from './susun.ts';
import { FOLDER, URUTAN_PAKET, folderPutaran, namaSel } from './tanding.ts';

export const ATURAN_PERINGKAT = [
  '1. jumlah sel yang lolos validator, dijumlah atas kedua putaran (dari 6) — draf yang tidak lolos tidak bisa dipakai sama sekali;',
  '2. proporsi omongan yang lolos uji tebak buta K-05 (≤ 1 dari 3 penguji benar dan rata-rata keyakinan penebak benar < 40%);',
  '3. rata-rata skor kealamian bahasa Indonesia;',
  '4. biaya per simulasi yang lolos, atas kedua putaran (lebih murah lebih baik);',
  '5. rata-rata percobaan sampai lolos (lebih sedikit lebih baik).',
].join('\n');

export const BATAS_TEBAK_BENAR = 1;
export const BATAS_TEBAK_YAKIN = 40;

/** K-05: lolos bila ≤ 1 dari 3 benar dan rata-rata keyakinan penebak yang benar < 40%. */
export function lolosTebak(jawaban: Array<{ pilihan: string; yakin: number }>, kunci: string): {
  benar: number;
  yakinBenar: number | null;
  lolos: boolean;
} {
  const benar = jawaban.filter((j) => j.pilihan === kunci);
  const yakinBenar = rata(benar.map((j) => j.yakin));
  return {
    benar: benar.length,
    yakinBenar,
    lolos: benar.length <= BATAS_TEBAK_BENAR && (yakinBenar ?? 0) < BATAS_TEBAK_YAKIN,
  };
}

function baca<T>(jalur: string): T {
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}

/** JSON pertama di teks jawaban mentah subagent. */
export function jsonDari(teks: string): unknown {
  const pagar = /```(?:json)?\s*([\s\S]*?)```/.exec(teks);
  const k = pagar?.[1] ?? teks;
  const a = k.indexOf('{');
  const b = k.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('tidak ada JSON di jawaban penguji');
  return JSON.parse(k.slice(a, b + 1)) as unknown;
}

function rata(x: number[]): number | null {
  return x.length === 0 ? null : x.reduce((a, b) => a + b, 0) / x.length;
}

function f(n: number | null, d = 2): string {
  if (n === null) return '—';
  return n.toFixed(d).replace('.', ',');
}

function usd(n: number): string {
  return `US$${n.toFixed(4)}`;
}

function ribuan(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

interface Sel {
  putaran: 1 | 2;
  paket: string;
  model: string;
  hasil: HasilSusun | null;
  biaya: number;
  tokenMasuk: number;
  tokenKeluar: number;
  latensi: number[];
  terpotong: number;
}

function bacaSel(ledger: EntriLedger[]): Sel[] {
  const sel: Sel[] = [];
  for (const putaran of [1, 2] as const) {
    const tag = putaran === 2 ? 'tanding2' : 'tanding';
    for (const paket of URUTAN_PAKET) {
      for (const model of MODEL_TANDING) {
        const jalur = `${FOLDER}/${folderPutaran(putaran)}/${namaSel(paket, model)}.json`;
        const hasil = existsSync(jalur) ? baca<HasilSusun>(jalur) : null;
        const e = ledger.filter((x) => x.tag === `${tag}/${paket}/${model}`);
        sel.push({
          putaran,
          paket,
          model,
          hasil,
          biaya: e.reduce((a, x) => a + x.biaya_usd, 0),
          tokenMasuk: e.reduce((a, x) => a + (x.token_masuk ?? 0), 0),
          tokenKeluar: e.reduce((a, x) => a + (x.token_keluar ?? 0), 0),
          latensi: e.filter((x) => x.status === 200 && x.token_keluar !== null).map((x) => x.latensi_ms),
          terpotong: (hasil?.percobaan ?? []).filter((p) => p.finish_reason === 'length').length,
        });
      }
    }
  }
  return sel;
}

interface HasilTebak {
  bundel: string;
  id: string;
  paket: string;
  sumber: string;
  putaran: 1 | 2 | null;
  omongan: number;
  kunci: string;
  jawaban: Array<{ pilihan: string; yakin: number }>;
  benar: number;
  yakinBenar: number | null;
  lolos: boolean;
}

interface NilaiAlami {
  penilai: string;
  kelompok: number;
  paket: string;
  label: string;
  sumber: string;
  putaran: 1 | 2 | null;
  skor: number;
  alasan: string;
}

function bacaPenguji(): { kunci: KunciPenguji | null; tebak: HasilTebak[]; alami: NilaiAlami[] } {
  const jalurKunci = `${FOLDER_PENGUJI}/kunci.json`;
  const kunci = existsSync(jalurKunci) ? baca<KunciPenguji>(jalurKunci) : null;
  const folderJawaban = `${FOLDER_PENGUJI}/jawaban`;
  const berkas = existsSync(folderJawaban) ? readdirSync(folderJawaban).sort() : [];
  const tebak: HasilTebak[] = [];
  const alami: NilaiAlami[] = [];
  if (kunci === null) return { kunci, tebak, alami };

  for (const b of kunci.tebak) {
    const jawabanPenguji = berkas
      .filter((n) => n.startsWith(`tebak-${b.bundel}-`))
      .map(
        (n) =>
          jsonDari(readFileSync(`${folderJawaban}/${n}`, 'utf8')) as {
            jawaban: Array<{ id: string; pilihan: string; yakin: number }>;
          },
      );
    for (const butir of b.butir) {
      const jawaban = jawabanPenguji
        .map((j) => j.jawaban.find((x) => x.id === butir.id))
        .filter((x): x is { id: string; pilihan: string; yakin: number } => x !== undefined)
        .map((x) => ({ pilihan: String(x.pilihan).trim().toLowerCase(), yakin: Number(x.yakin) }));
      tebak.push({
        bundel: b.bundel,
        id: butir.id,
        paket: butir.paket,
        sumber: butir.sumber,
        putaran: butir.putaran,
        omongan: butir.omongan,
        kunci: butir.kunci,
        jawaban,
        ...lolosTebak(jawaban, butir.kunci),
      });
    }
  }

  for (const n of berkas.filter((x) => x.startsWith('alami-'))) {
    const j = jsonDari(readFileSync(`${folderJawaban}/${n}`, 'utf8')) as {
      nilai: Array<{ kelompok: number; label: string; skor: number; alasan: string }>;
    };
    for (const v of j.nilai) {
      const kel = kunci.alami.find((k) => k.kelompok === Number(v.kelompok));
      const huruf = String(v.label).trim().toUpperCase();
      const sumber = kel?.label[huruf];
      if (kel === undefined || sumber === undefined) continue;
      alami.push({
        penilai: n.replace(/\.(txt|json|md)$/, ''),
        kelompok: kel.kelompok,
        paket: kel.paket,
        label: huruf,
        sumber,
        putaran: kel.putaran[huruf] ?? null,
        skor: Number(v.skor),
        alasan: String(v.alasan),
      });
    }
  }
  return { kunci, tebak, alami };
}

interface PerModel {
  model: string;
  lolos_p1: number;
  lolos_p2: number;
  sel_per_putaran: number;
  percobaan_sampai_lolos: number[];
  terpotong: [number, number];
  percobaan: [number, number];
  tebak_lolos: number;
  tebak_total: number;
  tebak_benar_rata: number | null;
  alami_rata: number | null;
  alami_n: number;
  token_masuk: [number, number];
  token_keluar: [number, number];
  biaya: [number, number];
  biaya_per_lolos: number | null;
  latensi_rata_ms: [number | null, number | null];
  alasan_tolak: Array<[string, number]>;
}

function hitungPerModel(sel: Sel[], tebak: HasilTebak[], alami: NilaiAlami[]): PerModel[] {
  return MODEL_TANDING.map((model): PerModel => {
    const s1 = sel.filter((x) => x.model === model && x.putaran === 1);
    const s2 = sel.filter((x) => x.model === model && x.putaran === 2);
    const semua = [...s1, ...s2];
    const lolos = semua.filter((x) => x.hasil?.lolos === true);
    const t = tebak.filter((x) => x.sumber === model);
    const a = alami.filter((x) => x.sumber === model);
    const alasan = new Map<string, number>();
    for (const x of semua) {
      for (const p of x.hasil?.percobaan ?? []) {
        const kode = new Set(p.masalah.map((m) => m.kode));
        if (p.galat !== null) kode.add('GALAT_PANGGILAN');
        for (const k of kode) alasan.set(k, (alasan.get(k) ?? 0) + 1);
      }
    }
    const jumlah = (xs: Sel[], g: (x: Sel) => number): number => xs.reduce((acc, x) => acc + g(x), 0);
    const biayaTotal = jumlah(semua, (x) => x.biaya);
    return {
      model,
      lolos_p1: s1.filter((x) => x.hasil?.lolos === true).length,
      lolos_p2: s2.filter((x) => x.hasil?.lolos === true).length,
      sel_per_putaran: URUTAN_PAKET.length,
      percobaan_sampai_lolos: lolos.map((x) => x.hasil?.lolos_di ?? 0),
      terpotong: [jumlah(s1, (x) => x.terpotong), jumlah(s2, (x) => x.terpotong)],
      percobaan: [jumlah(s1, (x) => x.hasil?.percobaan.length ?? 0), jumlah(s2, (x) => x.hasil?.percobaan.length ?? 0)],
      tebak_lolos: t.filter((x) => x.lolos).length,
      tebak_total: t.length,
      tebak_benar_rata: rata(t.map((x) => x.benar)),
      alami_rata: rata(a.map((x) => x.skor)),
      alami_n: a.length,
      token_masuk: [jumlah(s1, (x) => x.tokenMasuk), jumlah(s2, (x) => x.tokenMasuk)],
      token_keluar: [jumlah(s1, (x) => x.tokenKeluar), jumlah(s2, (x) => x.tokenKeluar)],
      biaya: [jumlah(s1, (x) => x.biaya), jumlah(s2, (x) => x.biaya)],
      biaya_per_lolos: lolos.length === 0 ? null : biayaTotal / lolos.length,
      latensi_rata_ms: [rata(s1.flatMap((x) => x.latensi)), rata(s2.flatMap((x) => x.latensi))],
      alasan_tolak: [...alasan.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])),
    };
  });
}

function urutkan(perModel: PerModel[]): PerModel[] {
  const proporsi = (m: PerModel): number => (m.tebak_total === 0 ? 0 : m.tebak_lolos / m.tebak_total);
  return [...perModel].sort(
    (p, q) =>
      q.lolos_p1 + q.lolos_p2 - (p.lolos_p1 + p.lolos_p2) ||
      proporsi(q) - proporsi(p) ||
      (q.alami_rata ?? 0) - (p.alami_rata ?? 0) ||
      (p.biaya_per_lolos ?? Infinity) - (q.biaya_per_lolos ?? Infinity) ||
      (rata(p.percobaan_sampai_lolos) ?? 9) - (rata(q.percobaan_sampai_lolos) ?? 9),
  );
}

function utama(): number {
  // Seluruh riwayat: ledger yang diarsipkan (M2d-4) + ledger kini.
  const ledger: EntriLedger[] = bacaLedgerSemua();
  const sel = bacaSel(ledger);
  const { tebak, alami } = bacaPenguji();
  const perModel = hitungPerModel(sel, tebak, alami);
  const peringkat = urutkan(perModel);
  const manusia = alami.filter((x) => x.sumber === 'manusia');
  const totalLedger = ledger.reduce((a, x) => a + x.biaya_usd, 0);

  writeFileSync(
    `${FOLDER}/ringkasan.json`,
    JSON.stringify(
      {
        suhu: SUHU,
        putaran: PUTARAN,
        aturan_peringkat: ATURAN_PERINGKAT,
        per_model: perModel,
        manusia_alami_rata: rata(manusia.map((x) => x.skor)),
        peringkat: peringkat.map((x) => x.model),
        tebak,
        alami,
        total_ledger_usd: totalLedger,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  // Ledger ringkas (terlacak): model, token, biaya, waktu — tanpa rahasia.
  const perJenis: Record<string, { panggilan: number; biaya_usd: number; token_masuk: number; token_keluar: number }> = {};
  for (const e of ledger) {
    const k = `${e.tag.split('/')[0] ?? ''}/${e.model}`;
    const x = perJenis[k] ?? { panggilan: 0, biaya_usd: 0, token_masuk: 0, token_keluar: 0 };
    x.panggilan += 1;
    x.biaya_usd += e.biaya_usd;
    x.token_masuk += e.token_masuk ?? 0;
    x.token_keluar += e.token_keluar ?? 0;
    perJenis[k] = x;
  }
  writeFileSync(
    `${FOLDER}/ledger-ringkas.json`,
    JSON.stringify({ total_usd: totalLedger, panggilan: ledger.length, per_jenis_model: perJenis, entri: ledger }, null, 2) + '\n',
    'utf8',
  );

  writeFileSync(`${AKAR}docs/bukti/uji-tanding-model.md`, tulis(sel, perModel, peringkat, tebak, alami, manusia, totalLedger), 'utf8');
  console.log(`Total ledger: ${usd(totalLedger)} (${String(ledger.length)} panggilan).`);
  console.log(`Peringkat: ${peringkat.map((x) => x.model).join(' > ')}`);
  for (const m of perModel) {
    console.log(
      `  ${m.model}: lolos p1 ${String(m.lolos_p1)}/3, p2 ${String(m.lolos_p2)}/3; tebak ${String(m.tebak_lolos)}/${String(m.tebak_total)}; ` +
        `alami ${f(m.alami_rata)} (n=${String(m.alami_n)}); biaya ${usd(m.biaya[0] + m.biaya[1])}`,
    );
  }
  console.log(`  manusia: alami ${f(rata(manusia.map((x) => x.skor)))} (n=${String(manusia.length)})`);
  return 0;
}

function tulis(
  sel: Sel[],
  perModel: PerModel[],
  peringkat: PerModel[],
  tebak: HasilTebak[],
  alami: NilaiAlami[],
  manusia: NilaiAlami[],
  totalLedger: number,
): string {
  const b: string[] = [];
  const paket: Partial<Record<string, PaketFakta>> = {};
  for (const id of URUTAN_PAKET) {
    const j = `${FOLDER}/paket/${id}.json`;
    if (existsSync(j)) paket[id] = baca<PaketFakta>(j);
  }
  const tangan = `${FOLDER}/laporan-tangan.md`;
  const tambahan = existsSync(tangan) ? readFileSync(tangan, 'utf8') : '';

  b.push('# Bukti: uji tanding tiga model penyusun (M2d)', '');
  b.push(
    'Berkas ini ditulis oleh `npm run llm:laporan` dari keluaran mentah di `eval/keluaran-m2d/` (sel dua putaran, paket, ' +
      'ledger biaya, bahan dan jawaban mentah penguji). Semua angka dihitung ulang tiap kali perintah itu dijalankan; ' +
      'hanya bagian di bawah "Rekomendasi" yang ditulis tangan (`eval/keluaran-m2d/laporan-tangan.md`).',
    '',
  );

  b.push('## Yang diuji', '');
  b.push(
    `Tiga model di Featherless, lewat klien OpenAI-compatible buatan sendiri (\`factory/llm/klien.ts\`), × tiga paket fakta. ` +
      `Prompt sistem sama (\`factory/llm/prompt-susun.md\`), pesan paket sama, suhu ${String(SUHU)}, paling banyak 3 percobaan per sel ` +
      `dengan umpan balik validator (\`factory/llm/validasi.ts\`). **Putaran 1**: \`max_tokens\` ${ribuan(PUTARAN[1].maxTokens)}. ` +
      `**Putaran 2**: \`max_tokens\` ${ribuan(PUTARAN[2].maxTokens)} — dinaikkan untuk ketiga model sekaligus sesudah putaran 1 ` +
      'menunjukkan kedua model GLM menghabiskan seluruh batas untuk penalaran. Draf LLM **tidak** dipasang ke produk.',
    '',
  );
  b.push('| paket | T | samaran | fakta di paket | tersingkir | peristiwa |', '|---|---|---|---:|---:|---|');
  for (const id of URUTAN_PAKET) {
    const p = paket[id];
    if (p === undefined) continue;
    b.push(
      `| ${id.toUpperCase()} | ${tanggalId(p.tanggal_t)} | ${p.nama_samaran} | ${String(p.fakta.length)} | ${String(p.disingkirkan.length)} | ${p.peristiwa} |`,
    );
  }
  b.push('');

  b.push('## Hasil per model', '');
  b.push(
    '| model | lolos validator p1 / p2 | percobaan sampai lolos | keluaran terpotong (p1 / p2) | tebak buta lolos (omongan) | rata-rata penguji benar (dari 3) | kealamian rata-rata (n) | biaya p1 / p2 | biaya per simulasi lolos | latensi rata-rata per panggilan p1 / p2 |',
    '|---|---|---|---|---:|---:|---:|---|---:|---|',
  );
  for (const m of perModel) {
    b.push(
      `| \`${m.model}\` | ${String(m.lolos_p1)}/3 · ${String(m.lolos_p2)}/3 | ${m.percobaan_sampai_lolos.join(', ') || '—'} | ` +
        `${String(m.terpotong[0])}/${String(m.percobaan[0])} · ${String(m.terpotong[1])}/${String(m.percobaan[1])} | ` +
        `${String(m.tebak_lolos)}/${String(m.tebak_total)} | ${f(m.tebak_benar_rata)} | ${f(m.alami_rata)} (${String(m.alami_n)}) | ` +
        `${usd(m.biaya[0])} · ${usd(m.biaya[1])} | ${m.biaya_per_lolos === null ? '—' : usd(m.biaya_per_lolos)} | ` +
        `${m.latensi_rata_ms.map((x) => (x === null ? '—' : `${f(x / 1000, 1)} s`)).join(' · ')} |`,
    );
  }
  b.push('');
  b.push('Token masuk / keluar per model (p1 · p2):', '');
  for (const m of perModel) {
    b.push(
      `- \`${m.model}\`: ${ribuan(m.token_masuk[0])} / ${ribuan(m.token_keluar[0])} · ${ribuan(m.token_masuk[1])} / ${ribuan(m.token_keluar[1])}`,
    );
  }
  b.push('');
  b.push(
    `Pembanding manusia (omongan DADA dan ULTJ yang sekarang hidup, dinilai buta di antara draf model): kealamian rata-rata ` +
      `**${f(rata(manusia.map((x) => x.skor)))}** (n = ${String(manusia.length)}).`,
    '',
  );
  b.push(`**Total biaya menurut ledger** (seluruh panggilan milestone, termasuk sonda ketersediaan): **${usd(totalLedger)}** dari pagu US$5,00.`, '');
  b.push('Harga per juta token yang dipakai (konservatif, `factory/llm/harga.ts`):', '');
  for (const [model, h] of Object.entries(HARGA)) b.push(`- \`${model}\`: masuk ${String(h.masuk)}, keluar ${String(h.keluar)} — ${h.sumber}`);
  b.push('');

  for (const putaran of [1, 2] as const) {
    b.push(`## Per sel — putaran ${String(putaran)} (\`max_tokens\` ${ribuan(PUTARAN[putaran].maxTokens)})`, '');
    b.push(
      '| paket | model | lolos | kode penolakan / hasil per percobaan | token masuk / keluar | biaya | latensi per percobaan |',
      '|---|---|---|---|---|---:|---|',
    );
    for (const s of sel.filter((x) => x.putaran === putaran)) {
      const h = s.hasil;
      const kode = (h?.percobaan ?? [])
        .map((p) => {
          const potong = p.finish_reason === 'length' ? ' (terpotong)' : '';
          if (p.galat !== null) return `p${String(p.ke)}: GALAT ${p.galat.slice(0, 80)}`;
          if (p.lolos) return `p${String(p.ke)}: lolos`;
          return `p${String(p.ke)}: ${[...new Set(p.masalah.map((m) => m.kode))].join(', ')}${potong}`;
        })
        .join('<br>');
      b.push(
        `| ${s.paket.toUpperCase()} | \`${s.model}\` | ${h === null ? 'tidak dijalankan' : h.lolos ? `ya (p${String(h.lolos_di)})` : 'tidak'} | ` +
          `${kode || '—'} | ${ribuan(s.tokenMasuk)} / ${ribuan(s.tokenKeluar)} | ${usd(s.biaya)} | ` +
          `${s.latensi.map((x) => `${f(x / 1000, 1)} s`).join(', ') || '—'} |`,
      );
    }
    b.push('');
  }

  b.push('## Alasan penolakan terbanyak', '');
  b.push('Dihitung per percobaan yang ditolak, kedua putaran (satu kode dihitung sekali per percobaan).', '');
  const semua = new Map<string, number>();
  for (const m of perModel) for (const [k, n] of m.alasan_tolak) semua.set(k, (semua.get(k) ?? 0) + n);
  b.push('| kode | seluruhnya | ' + perModel.map((m) => `\`${m.model}\``).join(' | ') + ' |');
  b.push('|---|---:|' + perModel.map(() => '---:').join('|') + '|');
  for (const [k, n] of [...semua.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0]))) {
    b.push(`| ${k} | ${String(n)} | ` + perModel.map((m) => String(m.alasan_tolak.find((x) => x[0] === k)?.[1] ?? 0)).join(' | ') + ' |');
  }
  b.push('');

  b.push('## Uji tebak buta (K-05)', '');
  b.push(
    'Draf yang diuji: satu draf lolos per (paket, model) — dari putaran 2, atau putaran 1 bila putaran 2 tidak menghasilkan draf ' +
      'lolos untuk sel itu (kolom "putaran"). Tiga penguji subagent (opus, tanpa konteks eksekutor) per bundel; tiap bundel ' +
      'memuat paling banyak satu draf per paket (bujur sangkar latin), jadi tidak ada penguji yang melihat dua versi omongan ' +
      `tentang fakta yang sama. Penguji melihat pesan, judul pertanyaan, dan empat pilihan — **tanpa kartu**. Lolos bila ≤ ` +
      `${String(BATAS_TEBAK_BENAR)} dari 3 benar dan rata-rata keyakinan penebak yang benar < ${String(BATAS_TEBAK_YAKIN)}%. ` +
      'Bahan: `eval/keluaran-m2d/penguji/tebak-B*.md`; jawaban mentah: `penguji/jawaban/`.',
    '',
  );
  const kalibrasi = tebak.filter((t) => t.sumber === 'manusia');
  if (kalibrasi.length > 0) {
    b.push(
      `**Kalibrasi penguji** (bundel BM: keenam omongan DADA dan ULTJ yang sekarang hidup, prosedur dan petunjuk yang sama, ` +
        `tiga penguji subagent baru): **${String(kalibrasi.filter((t) => t.lolos).length)}/${String(kalibrasi.length)}** omongan lolos, ` +
        `rata-rata ${f(rata(kalibrasi.map((t) => t.benar)))} dari 3 penguji menebak benar. Baris "manusia" di tabel di bawah.`,
      '',
    );
  }
  b.push(
    '| paket | model | putaran | omongan | kunci | jawaban penguji (pilihan/yakin) | benar | yakin penebak benar | lolos |',
    '|---|---|---:|---:|---|---|---:|---:|---|',
  );
  for (const t of [...tebak].sort((p, q) => p.paket.localeCompare(q.paket) || p.sumber.localeCompare(q.sumber) || p.omongan - q.omongan)) {
    b.push(
      `| ${t.paket.toUpperCase()} | \`${t.sumber}\` | ${String(t.putaran ?? '—')} | ${String(t.omongan)} | ${t.kunci} | ` +
        `${t.jawaban.map((j) => `${j.pilihan}/${String(j.yakin)}`).join(', ')} | ${String(t.benar)}/${String(t.jawaban.length)} | ` +
        `${t.yakinBenar === null ? '—' : f(t.yakinBenar, 0)} | ${t.lolos ? 'ya' : 'tidak'} |`,
    );
  }
  b.push('');

  b.push('## Kealamian bahasa', '');
  b.push(
    'Tiga penilai subagent buta: draf diberi label acak per kelompok (kunci label di `penguji/kunci.json`, tidak dikirim ke ' +
      'penilai), model tidak disebut, omongan manusia yang hidup ikut di antara draf DADA dan ULTJ. Skala 1–5, satu kalimat alasan.',
    '',
  );
  b.push('| paket | sumber | penilai | skor | alasan |', '|---|---|---|---:|---|');
  for (const a of [...alami].sort((p, q) => p.paket.localeCompare(q.paket) || p.sumber.localeCompare(q.sumber) || p.penilai.localeCompare(q.penilai))) {
    b.push(
      `| ${a.paket.toUpperCase()} | ${a.sumber === 'manusia' ? 'manusia (hidup)' : `\`${a.sumber}\``} | ${a.penilai} | ${String(a.skor)} | ${a.alasan.replace(/\|/g, '/').replace(/\n/g, ' ')} |`,
    );
  }
  b.push('');

  b.push('## Draf terbaik per model (utuh)', '');
  b.push('Per model: draf lolos dengan omongan lolos tebak buta terbanyak, lalu kealamian tertinggi, lalu putaran 2 lebih dulu.', '');
  for (const m of perModel) {
    const kandidat = sel.filter((s) => s.model === m.model && s.hasil?.lolos === true);
    const nilai = (s: Sel): [number, number] => [
      tebak.filter((t) => t.sumber === m.model && t.paket === s.paket && t.putaran === s.putaran && t.lolos).length,
      rata(alami.filter((a) => a.sumber === m.model && a.paket === s.paket && a.putaran === s.putaran).map((a) => a.skor)) ?? 0,
    ];
    const terbaik = [...kandidat].sort((p, q) => {
      const [a1, a2] = nilai(p);
      const [b1, b2] = nilai(q);
      return b1 - a1 || b2 - a2 || q.putaran - p.putaran;
    })[0];
    b.push(`### \`${m.model}\``, '');
    if (terbaik === undefined || terbaik.hasil === null) {
      b.push('Tidak ada draf yang lolos validator.', '');
      continue;
    }
    b.push(`Paket ${terbaik.paket.toUpperCase()}, putaran ${String(terbaik.putaran)}, lolos di percobaan ${String(terbaik.hasil.lolos_di)}.`, '');
    b.push('```json', JSON.stringify(terbaik.hasil.draf, null, 2), '```', '');
  }

  b.push('## Aturan peringkat', '');
  b.push('Ditetapkan sebelum satu pun jawaban penguji dibaca, dan tidak disetel sesudahnya:', '', ATURAN_PERINGKAT, '');
  b.push(`Peringkat menurut aturan itu: ${peringkat.map((m, i) => `${String(i + 1)}. \`${m.model}\``).join(' · ')}.`, '');
  if (tambahan.trim() !== '') b.push(tambahan.trim(), '');
  return b.join('\n');
}

// Nama berkas persis: `agen-laporan.ts` (M2d-2) juga berakhiran "laporan.ts" dan mengimpor modul ini;
// dengan endsWith saja, menjalankannya ikut membangun ulang keluaran M2d-1.
if (/(^|[\\/])laporan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
