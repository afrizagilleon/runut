/**
 * `npm run pengecoh:laporan` — laporan M2d-7 (kontrak D-9)
 * `docs/bukti/lingkar-agen-pengecoh.md`, DITULIS dari keluaran mentah:
 * pra-registrasi (git), probe, bukti urutan penyedia, kalibrasi, riwayat
 * jalan TIRT, jawaban mentah penguji luar + putusan mekanis, ledger
 * OpenRouter (biaya NYATA `usage.cost`), dan ringkasan M2d-6 (pembanding
 * M2d-4…M2d-6). Hanya "Catatan penulis" yang ditulis tangan
 * (`eval/keluaran-m2d7/laporan-tangan.md`). Tanpa jaringan.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { HasilPengecoh, PemeriksaanPengecoh } from './agen-pengecoh.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { jsonDari } from './laporan.ts';
import { JALUR_LEDGER, type EntriLedger } from './pagu.ts';
import { PENALAR_M2D7 } from './penalaran.ts';
import { SOAL_KALIBRASI } from './penalar-kalibrasi.ts';
import { AMBANG_AWAL, TAMBAHAN_M2D6, JALUR_HIMPUNAN, JALUR_MANUSIA, JALUR_MATRIKS, bacaHasil, matriksK, putusanSoal, type AmbangK, type HasilSoalK } from './pengecoh-kalibrasi.ts';
import { FOLDER_M2D7, PAGU_BAGIAN_M2D7, PAGU_MILESTONE_M2D7 } from './pengecoh-konfig.ts';
import { JALUR_PROBE_M2D7, bacaProbe, putusanProbe } from './pengecoh-probe.ts';
import { FOLDER_PENGUJI_M2D7, type PutusanTayang } from './pengecoh-putusan.ts';
import { folderJalanM2d7 } from './pengecoh-susun.ts';
import { omonganLolosPeran } from './peran-penguji.ts';
import { URUTAN_GLM_M2D7 } from './penyedia-urutan.ts';

export const JALUR_LAPORAN_M2D7 = `${AKAR}docs/bukti/lingkar-agen-pengecoh.md`;
const JALUR_TANGAN = `${FOLDER_M2D7}/laporan-tangan.md`;

function baca<T>(jalur: string): T {
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}
function median(x: readonly number[]): number | null {
  if (x.length === 0) return null;
  const s = [...x].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 1 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
}
const usd = (n: number): string => `US$${n.toFixed(4)}`;
const angka = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('id-ID'));
const sel = (t: string): string => t.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function bacaLedger(jalur: string = JALUR_LEDGER): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger);
}

/** Peran satu panggilan M2d-7 dari tagnya. Murni. */
export function peranM2d7(tag: string): string {
  if (tag.startsWith('m2d7/probe/')) return 'probe';
  if (tag.startsWith('m2d7/kalibrasi/')) return tag.includes('/penebak/') ? 'kalibrasi (penebak)' : 'kalibrasi (pilihan-saja)';
  const m = /\/p\d+\/([a-z-]+)\//.exec(tag)?.[1];
  const peta: Record<string, string> = {
    'tulis-pesan': 'penulis (pesan)', 'tulis-pilihan': 'penulis (pilihan)', 'tulis-penjelasan': 'penulis (penjelasan)',
    'gerbang-pilihan-saja': 'pilihan-saja', 'gerbang-kartu': 'pembaca-kartu', kritikus: 'kritikus', 'gerbang-tebak': 'penebak',
  };
  return peta[m ?? ''] ?? 'lain';
}

function kelompok<T>(x: readonly T[], k: (y: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const y of x) m.set(k(y), [...(m.get(k(y)) ?? []), y]);
  return m;
}

interface RingkasJalan {
  jalan: number;
  terbit: boolean;
  putaran: number;
  berhenti: string | null;
  dikunci: Array<{ no: number; putaran: number; sudut: string }>;
  sudut: string[];
  status: Record<string, number>;
  sumber_tolak: Record<string, number>;
  ditulis: { pesan: number; pilihan_penuh: number; pilihan_sebagian: number; penjelasan: number };
  perbaikan_maks: number;
  kritikus: { putusan: number; menjawab: number; tanpa_keberatan: number; penalaran: number[] };
  penebak: { tebakan: number; benar: number; penalaran: number[] };
  pilihan_saja: { diperiksa: number; ditolak: number };
  biaya: number;
  panggilan: number;
}

export function ringkasJalan(n: number, h: HasilPengecoh, ledger: readonly EntriLedger[]): RingkasJalan {
  const semua = h.riwayat.flatMap((r) => r.omongan.filter((o) => o.status !== 'terkunci-sebelumnya').map((o) => ({ r, o: o as PemeriksaanPengecoh })));
  const status: Record<string, number> = {};
  const sumber: Record<string, number> = {};
  for (const { o } of semua) {
    status[o.status] = (status[o.status] ?? 0) + 1;
    for (const u of o.umpan_terarah ?? []) sumber[u.sumber] = (sumber[u.sumber] ?? 0) + 1;
  }
  const d = { pesan: 0, pilihan_penuh: 0, pilihan_sebagian: 0, penjelasan: 0 };
  for (const r of h.riwayat) {
    for (const b of r.bagian_ditulis ?? []) {
      if (b.pesan) d.pesan++;
      if (b.pilihan.length === 4) d.pilihan_penuh++;
      else if (b.pilihan.length > 0) d.pilihan_sebagian++;
      if (b.penjelasan) d.penjelasan++;
    }
  }
  const kr = semua.filter(({ o }) => o.kritik !== null && o.kritik !== undefined).map(({ o }) => o.kritik as NonNullable<PemeriksaanPengecoh['kritik']>);
  const tb = semua.filter(({ o }) => o.tebak !== null && o.tebak !== undefined).map(({ o }) => o.tebak as NonNullable<PemeriksaanPengecoh['tebak']>);
  const ps = semua.filter(({ o }) => o.pilihan_saja !== null && o.pilihan_saja !== undefined);
  const awalan = `m2d7/jalan-${String(n)}/`;
  const e = ledger.filter((x) => x.tag.startsWith(awalan));
  return {
    jalan: n,
    terbit: h.lolos,
    putaran: h.jumlah_putaran,
    berhenti: h.berhenti,
    dikunci: omonganLolosPeran('tirt', h).map((l) => ({ no: l.no, putaran: l.putaran, sudut: l.sudut })),
    sudut: h.sudut.map((s, i) => `omongan ${String(i + 1)} (klaim ${h.label[i] ?? '?'}): ${s.map((c) => `${String(c.ke)}. \`${c.fact_id}\` → ${c.hasil} (${String(c.putaran_mulai)}–${String(c.putaran_akhir ?? '…')})`).join('; ')}`),
    status,
    sumber_tolak: sumber,
    ditulis: d,
    perbaikan_maks: Math.max(0, ...semua.map(({ o }) => Math.max(o.perbaikan?.pesan ?? 0, o.perbaikan?.pilihan ?? 0, o.perbaikan?.penjelasan ?? 0))),
    kritikus: {
      putusan: kr.length, menjawab: kr.filter((k) => k.menjawab).length, tanpa_keberatan: kr.filter((k) => k.tanpa_keberatan).length,
      penalaran: kr.flatMap((k) => k.panggilan.map((p) => p.token_penalaran ?? 0)),
    },
    penebak: {
      tebakan: tb.reduce((a, t) => a + t.tebakan.length, 0), benar: tb.reduce((a, t) => a + t.tebakan.filter((x) => x.benar).length, 0),
      penalaran: tb.flatMap((t) => t.tebakan.flatMap((x) => x.panggilan.map((p) => p.token_penalaran ?? 0))),
    },
    pilihan_saja: { diperiksa: ps.length, ditolak: ps.filter(({ o }) => o.pilihan_saja?.tolak === true).length },
    biaya: e.reduce((a, x) => a + x.biaya_usd, 0),
    panggilan: e.length,
  };
}

function tulisOmongan(o: OmonganDraf): string[] {
  return [
    `> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`,
    '',
    ...(['a', 'b', 'c', 'd'] as const).map((h) => (h === o.kunci ? `- **${h}) ${teksPolos(o.pilihan[h])}** (kunci)` : `- ${h}) ${teksPolos(o.pilihan[h])}`)),
    '',
    `Kartu: ${o.kartu.map((k) => `\`${k}\`${o.kartu_penentu.includes(k) ? ' (penentu)' : ''}`).join(', ')}`,
    '',
    `Penjelasan: ${teksPolos(o.penjelasan)}`,
    '',
  ];
}

function statPenalaran(e: readonly EntriLedger[]): string {
  const t = e.map((x) => x.token_penalaran).filter((x): x is number => typeof x === 'number');
  return `${String(t.length)} panggilan, median ${angka(median(t))}, maks ${angka(t.length === 0 ? null : Math.max(...t))}`;
}

export function bangunLaporan(ledger: readonly EntriLedger[]): { md: string; ringkasan: unknown } {
  const b: string[] = [];
  const m7 = ledger.filter((e) => e.tag.startsWith('m2d7/'));
  const total = m7.reduce((a, e) => a + e.biaya_usd, 0);

  b.push(
    '# Bukti: pengecoh dari data di lingkar agen TIRT (M2d-7)',
    '',
    'Berkas ini ditulis oleh `npm run pengecoh:laporan` dari keluaran mentah di `eval/keluaran-m2d7/` (probe, kalibrasi, riwayat dan jejak jalan TIRT, jawaban mentah penguji luar, putusan mekanis), ledger OpenRouter (biaya NYATA `usage.cost`), dan ringkasan M2d-6. Angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d7/laporan-tangan.md`). Draf **tidak** dipasang ke produk.',
    '',
  );

  // --- pra-registrasi
  const git = (arg: string[]): string => {
    try {
      return execFileSync('git', arg, { cwd: AKAR, encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  };
  const t00 = git(['log', '--format=%h %cI', '--diff-filter=A', '--', 'docs/bukti/m2d7-praregistrasi.md']).split('\n').at(-1) ?? '';
  const pertama = m7.map((e) => e.waktu).sort()[0] ?? '—';
  b.push(
    '## Pra-registrasi (D-0)',
    '',
    `Patokan "layak tayang" (keputusan pemilik: **setara soal manusia**) ditulis di \`docs/bukti/m2d7-praregistrasi.md\` dan di-commit **${t00 === '' ? '—' : t00}**; panggilan berbayar M2d-7 pertama di ledger: **${pertama}**. Berkas itu dites tidak berubah sejak commit tersebut, dan kode putusan (\`pengecoh-putusan.ts\`) dites sama dengan teksnya (petunjuk kartu, daftar kosong, 2/6, mayoritas 2 dari 3).`,
    '',
    '(a) terbit · (b) tebak buta luar: proporsi lolos ≥ 2/6 soal manusia, yaitu ≥ 1 dari 3 omongan · (c) jawab-dengan-kartu K-05 3/3 · (d) nol masalah makna (≥ 2 dari 3 penguji kartu pada butir yang sama, atau `gPenilaian`/`gKembar`). Kealamian dilaporkan, bukan syarat.',
    '',
  );

  // --- gerbang yang tertidur
  const e5 = ledger.filter((e) => e.tag.startsWith('m2d5/') && /\/kritikus\//.test(e.tag) && e.status === 200);
  const e6 = ledger.filter((e) => e.tag.startsWith('m2d6/jalan-') && /\/kritikus\//.test(e.tag) && e.status === 200);
  const e7 = m7.filter((e) => e.tag.startsWith('m2d7/jalan-') && /\/kritikus\//.test(e.tag) && e.status === 200);
  const w5 = e5.filter((e) => e.penyedia === 'Wafer');
  const w6 = e6.filter((e) => e.penyedia === 'Wafer');
  b.push(
    '## Gerbang yang tertidur: `max_tokens` bukan `effort` (bahan README)',
    '',
    'Kritikus GLM-5.3 memutuskan apakah soal lolos. Di M2d-5 ia dikirimi `reasoning.max_tokens` — itu hanya BATAS ATAS, dan penyedia boleh berpikir jauh lebih sedikit. Di M2d-6 permintaannya diganti `reasoning.effort` dan buktinya dibaca dari respons (`usage.completion_tokens_details.reasoning_tokens`). Data ledger, penyedia yang SAMA:',
    '',
    '| milestone | parameter | kritikus (semua penyedia) | kritikus di Wafer |',
    '|---|---|---|---|',
    `| M2d-5 | \`reasoning.max_tokens\` | ${statPenalaran(e5)} | ${statPenalaran(w5)} |`,
    `| M2d-6 | \`reasoning.effort: "high"\` | ${statPenalaran(e6)} | ${statPenalaran(w6)} |`,
    `| M2d-7 | \`reasoning.effort: "max"\` | ${statPenalaran(e7)} | ${statPenalaran(e7.filter((e) => e.penyedia === 'Wafer'))} |`,
    '',
    `Di M2d-7 (\`"max"\`) arah masalahnya berbalik: ${String(e7.filter((e) => (e.token_keluar ?? 0) >= 16_000 && (e.token_penalaran ?? 0) >= (e.token_keluar ?? 0) - 2).length)} dari ${String(e7.length)} panggilan kritikus di jalan TIRT berpikir sampai seluruh \`max_tokens\` habis (16.000 di jalan 1, 24.000 di jalan 2) tanpa jawaban — dibayar, dibaca "tidak menjawab".`,
    '',
    'Pelajarannya: gerbang yang "menjawab" belum tentu berpikir. Kritikus M2d-5 tidak mengajukan satu keberatan pun; gerbang itu tampak bekerja dan tertidur. Bukti berpikir harus dibaca dari respons, bukan dari badan permintaan.',
    '',
  );

  // --- metode
  const mat = existsSync(JALUR_MATRIKS) ? baca<{ putusan: { ambang: AmbangK; langkah: string[] } }>(JALUR_MATRIKS) : null;
  b.push(
    '## Metode M2d-7 (ditetapkan kode, `GENERASI_M2D7` di `agen-pengecoh.ts`)',
    '',
    `- **D-1 GLM \`effort: "max"\`** untuk kritikus (\`max_tokens\` ${angka(PENALAR_M2D7.kritikus.maxTokens)}, ambang ${angka(PENALAR_M2D7.kritikus.ambang)}) dan penebak ×3 (\`max_tokens\` ${angka(PENALAR_M2D7.penebakGlm.maxTokens)}, ambang ${angka(PENALAR_M2D7.penebakGlm.ambang)}), tanpa \`reasoning.max_tokens\`; \`provider.order\` ${JSON.stringify(URUTAN_GLM_M2D7)} dari bukti ledger (fallback tetap), pengecualian M2d-6 tetap.`,
    '- **D-2 Bank pengecoh dari data** (`bank-pengecoh.ts`): kandidat = nilai nyata fakta lain di paket (periode keliru, operand keliru, konsep lain, alasan lain, pengumuman lain); tiap rujukan lolos validator; tanpa kandidat senilai kunci.',
    '- **D-3 Penulis dipecah**: pesan (fakta sudut + salah kaprah dari bank; label BETUL/KELIRU ditetapkan kode) → pilihan (kunci + tiga pengecoh DIPILIH dari bank, sumber tiap pilihan dicatat dan diperiksa G-ikatan-bank) → penjelasan. Kartu dan huruf kunci dari kode.',
    `- **D-4 Gerbang artefak** sebelum kritikus: pilihan-saja (DeepSeek ×2, hanya empat pilihan), meresmikan, keseimbangan. Ambang akhir sesudah kalibrasi: ${mat === null ? '—' : `\`${JSON.stringify(mat.putusan.ambang)}\``}.`,
    '- **D-5 Umpan balik beralternatif**: tiap penolakan = lokasi + nilai teramati + alternatif yang diizinkan (kandidat bank yang belum dipakai); hanya bagian gagal ditulis ulang; maks 2 perbaikan per bagian, lalu sudut baru.',
    '',
  );

  // --- probe
  if (existsSync(JALUR_PROBE_M2D7)) {
    const pr = bacaProbe();
    const pp = putusanProbe(pr);
    b.push('## Probe `effort: "max"` (D-1)', '', 'Putusan: `eval/keluaran-m2d7/probe/putusan.md`.', '', '| panggilan | penyedia | selesai | token penalaran | biaya | hasil |', '|---|---|---|---:|---:|---|');
    for (const h of pr) b.push(`| ${h.tag.replace('m2d7/probe/', '')} | ${String(h.penyedia ?? '—')} | ${String(h.finish_reason ?? h.galat ?? '—')} | ${angka(h.token_penalaran)} | ${usd(h.biaya_usd ?? 0)} | ${sel(h.catatan ?? '')} |`);
    b.push('', ...pp.alasan.map((a) => `- ${a}`), '');
  }

  // --- kalibrasi
  if (existsSync(JALUR_HIMPUNAN) && mat !== null) {
    const hk = bacaHasil(JALUR_HIMPUNAN);
    const mh = existsSync(JALUR_MANUSIA) ? bacaHasil(JALUR_MANUSIA).hasil : [];
    const tulisM = (a: AmbangK): string[] => matriksK(hk.hasil, a).map((x) => `| ${x.gerbang} | ${String(x.bocor_ditolak)}/${String(x.bocor_total)} | ${String(x.aman_ditolak)}/${String(x.aman_total)} |`);
    const k7 = m7.filter((e) => e.tag.startsWith(PAGU_BAGIAN_M2D7.kalibrasi.awalanTag));
    const luar = new Map<string, string>([...SOAL_KALIBRASI.map((x): [string, string] => [x.id, x.luar]), ...TAMBAHAN_M2D6.map((x): [string, string] => [x.id, x.luar])]);
    b.push(
      '## Kalibrasi ulang cepat (D-4, D-6)',
      '',
      `Himpunan = himpunan bocor/aman M2d-6 (label dari jawaban mentah penguji luar). Biaya ${usd(k7.reduce((a, e) => a + e.biaya_usd, 0))} dari pagu ${usd(PAGU_BAGIAN_M2D7.kalibrasi.usd)} (ditegakkan kode). ${hk.selesai ? '' : `**Kalibrasi berhenti di pagu**: ${String(hk.hasil.filter((x) => !x.tambahan).length)} dari 10 soal inti dan ${String(hk.hasil.filter((x) => x.tambahan).length)} dari 2 soal tambahan terukur; yang tidak terukur tidak dilengkapi tangan.`}`,
      '',
      '| gerbang (ambang awal) | bocor ditolak | aman ditolak |', '|---|---:|---:|', ...tulisM(AMBANG_AWAL), '',
      '| gerbang (ambang akhir) | bocor ditolak | aman ditolak |', '|---|---:|---:|', ...tulisM(mat.putusan.ambang), '',
      'Langkah aturan penurunan ambang (dihitung ulang dari data mentah):', '', ...mat.putusan.langkah.map((l) => `- ${l}`), '',
      '| soal | kelompok | uji luar | meresmikan | keseimbangan | pilihan-saja | penebak (GLM "max") |', '|---|---|---|---|---|---|---|',
    );
    for (const h of hk.hasil) {
      const p = putusanSoal(h, AMBANG_AWAL);
      const t = (x: HasilSoalK['penebak']): string => (x === null ? '—' : x.map((y) => `${String(y.pilihan ?? '?')}/${String(y.yakin ?? '-')}`).join(' '));
      b.push(`| ${h.id} (kunci ${h.kunci})${h.tambahan ? ' *tambahan*' : ''} | ${h.kelompok} | ${sel(luar.get(h.id) ?? '')} | ${p.meresmikan ? '**tolak**' : 'lolos'} (${[...h.meresmikan.angka, ...h.meresmikan.kata].join(', ') || '—'}) | ${p.keseimbangan ? '**tolak**' : 'lolos'} (${String(h.keseimbangan.rasio)}) | ${p.pilihan_saja === true ? '**tolak**' : 'lolos'} (${t(h.pilihan_saja)}) | ${p.penebak === true ? '**tolak**' : p.penebak === null ? '—' : 'lolos'} (${t(h.penebak)}) |`);
    }
    b.push('', 'Pilihan-saja atas keenam soal manusia yang hidup (D-4):', '', '| soal | pilihan-saja | ambang awal | ambang akhir |', '|---|---|---|---|');
    for (const h of mh) b.push(`| ${h.id.replace('manusia-', '')} (kunci ${h.kunci}) | ${(h.pilihan_saja ?? []).map((y) => `${String(y.pilihan ?? '?')}/${String(y.yakin ?? '-')}`).join(' ')} | ${putusanSoal(h, AMBANG_AWAL).ditolak ? '**tolak**' : 'lolos'} | ${putusanSoal(h, mat.putusan.ambang).ditolak ? '**tolak**' : 'lolos'} |`);
    b.push('');
  }

  // --- jalan
  const jalan: RingkasJalan[] = [];
  const hasilJalan: Array<{ n: number; h: HasilPengecoh }> = [];
  for (let n = 1; n <= 2; n++) {
    const f = `${folderJalanM2d7(n)}/riwayat.json`;
    if (!existsSync(f)) continue;
    const h = baca<HasilPengecoh>(f);
    hasilJalan.push({ n, h });
    jalan.push(ringkasJalan(n, h, ledger));
  }
  b.push('## Hasil TIRT (D-7)', '', '| jalan | hasil | putaran | omongan dikunci | panggilan | biaya NYATA |', '|---:|---|---:|---:|---:|---:|');
  for (const s of jalan) b.push(`| ${String(s.jalan)} | ${s.terbit ? '**terbit**' : `tidak terbit (${sel(String(s.berhenti))})`} | ${String(s.putaran)} | ${String(s.dikunci.length)} | ${String(s.panggilan)} | ${usd(s.biaya)} |`);
  b.push('');
  for (const s of jalan) {
    b.push(
      `### Jalan ${String(s.jalan)}`, '',
      ...s.sudut.map((x) => `- ${x}`),
      `- Status per versi: ${Object.entries(s.status).map(([k, v]) => `${k} ${String(v)}`).join(', ')}.`,
      `- Sumber penolakan (butir umpan terarah): ${Object.entries(s.sumber_tolak).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${String(v)}`).join(', ') || '—'}.`,
      `- Bagian yang ditulis: pesan ${String(s.ditulis.pesan)}, pilihan penuh ${String(s.ditulis.pilihan_penuh)}, pilihan SEBAGIAN ${String(s.ditulis.pilihan_sebagian)}, penjelasan ${String(s.ditulis.penjelasan)}; perbaikan terbanyak satu bagian di satu sudut: ${String(s.perbaikan_maks)}.`,
      `- Pilihan-saja: ${String(s.pilihan_saja.diperiksa)} versi diperiksa, ${String(s.pilihan_saja.ditolak)} ditolak.`,
      `- Kritikus: ${String(s.kritikus.putusan)} putusan, menjawab ${String(s.kritikus.menjawab)}, tanpa keberatan ${String(s.kritikus.tanpa_keberatan)}; penalaran median ${angka(median(s.kritikus.penalaran))}.`,
      `- Penebak (GLM "max", tanpa kartu): ${String(s.penebak.benar)}/${String(s.penebak.tebakan)} tebakan benar; penalaran median ${angka(median(s.penebak.penalaran))}.`,
      '',
    );
  }
  b.push('### Draf', '');
  const diuji = existsSync(`${FOLDER_PENGUJI_M2D7}/kunci.json`) ? baca<{ jalan: number; terbit: boolean }>(`${FOLDER_PENGUJI_M2D7}/kunci.json`) : null;
  const hj = hasilJalan.find((x) => x.n === diuji?.jalan) ?? hasilJalan.at(-1);
  if (hj !== undefined) {
    if (hj.h.lolos && hj.h.draf !== null) {
      b.push(`Jalan ${String(hj.n)}: TIRT **terbit** — draf utuh apa adanya (tidak disunting tangan):`, '');
      hj.h.draf.omongan.forEach((o, i) => b.push(`**Omongan ${String(i + 1)}**`, '', ...tulisOmongan(o)));
    } else {
      const l = omonganLolosPeran('tirt', hj.h);
      b.push(`Jalan ${String(hj.n)}: TIRT tidak terbit; omongan yang dikunci (${String(l.length)}):`, '');
      for (const x of l) b.push(`**Omongan ${String(x.no)}** (dikunci di putaran ${String(x.putaran)}, sudut \`${x.sudut}\`)`, '', ...tulisOmongan(x.omongan));
    }
  }
  // Versi yang paling jauh (sampai kritikus atau penebak) di tiap jalan — apa adanya, untuk dibaca reviewer.
  const URUT = ['ditolak-tebak', 'ditolak-kritikus', 'kritikus-tidak-menjawab'];
  for (const { n, h } of hasilJalan) {
    const jauh = h.riwayat.flatMap((r) => r.omongan.map((o) => ({ r, o: o as PemeriksaanPengecoh }))).filter(({ o }) => URUT.includes(o.status));
    if (jauh.length === 0) continue;
    b.push(`Versi yang sampai kritikus/penebak di jalan ${String(n)} (${String(jauh.length)}; ditampilkan yang pertama per omongan):`, '');
    const sudah = new Set<number>();
    for (const { r, o } of jauh) {
      if (sudah.has(o.no)) continue;
      sudah.add(o.no);
      const d = r.draf[o.no - 1];
      if (d === null || d === undefined) continue;
      b.push(`**Jalan ${String(n)} putaran ${String(r.putaran)}, omongan ${String(o.no)}** — ${o.status}: ${sel((o.umpan[0] ?? '').slice(0, 300))}`, '', ...tulisOmongan(d));
    }
  }

  // --- uji luar
  const jalurPutusan = `${FOLDER_PENGUJI_M2D7}/putusan.json`;
  let putusan: (PutusanTayang & { jalan: number }) | null = null;
  if (existsSync(jalurPutusan)) {
    putusan = baca<PutusanTayang & { jalan: number }>(jalurPutusan);
    const p = putusan;
    b.push(
      '## Uji luar dan putusan mekanis (D-8)', '',
      `Penguji: subagent Claude model **opus** yang **baru**, sinkron, masing-masing hanya menerima isi satu berkas bahan (\`eval/keluaran-m2d7/penguji/\`); jawaban mentah di \`penguji/jawaban/\`. Draf yang diuji: jalan ${String(p.jalan)} (${p.a_terbit ? 'terbit' : 'tidak terbit — omongan yang dikunci'}).`, '',
      ...(p.omongan.length === 0 ? [] : ['| omongan | kunci | tebak di luar | lolos tebak | kartu di luar (pilihan/kartu) | K-05 kartu | masalah makna |', '|---:|---|---|---|---|---|---|']),
      ...p.omongan.map((o) => `| ${String(o.no)} | ${o.kunci} | ${o.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(', ')} | ${o.lolos_tebak ? 'ya' : '**tidak**'} | ${o.kartu.map((k) => `${k.pilihan}/${(Array.isArray(k.kartu) ? k.kartu : []).join('+')}`).join(', ')} | ${o.lolos_kartu ? 'ya' : '**tidak**'} | ${sel(o.masalah.map((m) => `${m.butir} (${m.sumber})`).join('; ')) || '—'} |`),
      '',
      '| syarat pra-registrasi | hasil | terpenuhi |', '|---|---|---|',
      `| (a) terbit | ${p.a_terbit ? 'terbit' : 'tidak terbit'} | ${p.a_terbit ? 'ya' : '**tidak**'} |`,
      `| (b) tebak buta luar ${p.b_tebak.syarat} | ${String(p.b_tebak.lolos)}/${String(p.b_tebak.total)} | ${p.b_tebak.terpenuhi ? 'ya' : '**tidak**'} |`,
      `| (c) jawab-dengan-kartu K-05 penuh | ${String(p.c_kartu.lolos)}/${String(p.c_kartu.total)} | ${p.c_kartu.terpenuhi ? 'ya' : '**tidak**'} |`,
      `| (d) nol masalah makna | ${String(p.d_makna.masalah)} masalah | ${p.d_makna.terpenuhi ? 'ya' : '**tidak**'} |`,
      '', `**Putusan: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}.**`, '',
    );
    if (p.omongan.length === 0) b.push(`Catatan: ${String((p as { catatan?: string }).catatan ?? 'tidak ada omongan yang diuji')}. Tidak ada subagent penguji yang dijalankan (pra-registrasi: yang diuji hanya omongan yang dikunci).`, '');
    // kealamian
    const kunci = existsSync(`${FOLDER_PENGUJI_M2D7}/kunci.json`)
      ? baca<{ alami: Array<{ kelompok: number; paket: string; label: Record<string, string> }> }>(`${FOLDER_PENGUJI_M2D7}/kunci.json`)
      : { alami: [] };
    const skor: Array<{ paket: string; sumber: string; skor: number }> = [];
    for (let n = 1; n <= 3; n++) {
      const f = `${FOLDER_PENGUJI_M2D7}/jawaban/alami-p${String(n)}.txt`;
      if (!existsSync(f)) continue;
      const j = jsonDari(readFileSync(f, 'utf8')) as { nilai?: Array<{ kelompok: number; label: string; skor: number }> };
      for (const x of j.nilai ?? []) {
        const k = kunci.alami.find((y) => y.kelompok === x.kelompok);
        if (k !== undefined) skor.push({ paket: k.paket, sumber: k.label[x.label] ?? '?', skor: x.skor });
      }
    }
    if (skor.length > 0) {
      b.push('### Kealamian bahasa (dilaporkan, bukan syarat)', '', '| kelompok · sumber | rata-rata | penilai |', '|---|---:|---:|');
      for (const [k, v] of kelompok(skor, (x) => `${x.paket} · ${x.sumber}`)) b.push(`| ${k} | ${(v.reduce((a, x) => a + x.skor, 0) / v.length).toFixed(2).replace('.', ',')} | ${String(v.length)} |`);
      b.push('');
    }
  } else {
    b.push('## Uji luar dan putusan mekanis (D-8)', '', 'Belum dijalankan.', '');
  }

  // --- biaya
  b.push('## Biaya NYATA M2d-7 (OpenRouter, `usage.cost`)', '', `Entri ledger bertag \`m2d7/\`: **${usd(total)} dalam ${String(m7.length)} panggilan**, dari pagu milestone ${usd(PAGU_MILESTONE_M2D7)} (ditegakkan kode). Kumulatif ledger OpenRouter (M2d-5…M2d-7): ${usd(ledger.filter((e) => /^m2d[567]\//.test(e.tag)).reduce((a, e) => a + e.biaya_usd, 0))}.`, '', '| peran | panggilan | token keluar | biaya nyata |', '|---|---:|---:|---:|');
  for (const [k, v] of [...kelompok(m7, (e) => peranM2d7(e.tag))].sort((a, c) => a[0].localeCompare(c[0]))) {
    b.push(`| ${k} | ${String(v.length)} | ${angka(v.reduce((a, e) => a + (e.token_keluar ?? 0), 0))} | ${usd(v.reduce((a, e) => a + e.biaya_usd, 0))} |`);
  }
  b.push('', '| model · penyedia | panggilan | biaya nyata |', '|---|---:|---:|');
  for (const [k, v] of [...kelompok(m7, (e) => `${e.model} · ${e.penyedia ?? '(tidak disebut)'}`)].sort((a, c) => c[1].reduce((x, e) => x + e.biaya_usd, 0) - a[1].reduce((x, e) => x + e.biaya_usd, 0))) {
    b.push(`| ${k} | ${String(v.length)} | ${usd(v.reduce((a, e) => a + e.biaya_usd, 0))} |`);
  }
  b.push('');

  // --- perbandingan
  const r6 = baca<{ pembanding: Record<string, { terbit: boolean; putaran: number; dikunci: number; tebak_lolos: number; kartu_lolos: number; biaya: number }>; alami_rata: Record<string, number | null> }>(`${AKAR}eval/keluaran-m2d6/ringkasan.json`);
  const j7 = jalan.find((x) => x.jalan === putusan?.jalan) ?? jalan.at(-1);
  const ya = (x: boolean | undefined): string => (x === undefined ? '—' : x ? 'ya' : 'tidak');
  const p4 = r6.pembanding['m2d4'];
  const p5 = r6.pembanding['m2d5'];
  const p6 = r6.pembanding['m2d6'];
  b.push(
    '## TIRT: M2d-4 → M2d-5 → M2d-6 → M2d-7', '',
    '| ukuran | M2d-4 (Featherless) | M2d-5 (OpenRouter) | M2d-6 (penalar) | M2d-7 (pengecoh dari data) |', '|---|---|---|---|---|',
    `| terbit (putaran) | ${ya(p4?.terbit)} (${String(p4?.putaran)}) | ${ya(p5?.terbit)} (${String(p5?.putaran)}) | ${ya(p6?.terbit)} (${String(p6?.putaran)}) | ${ya(j7?.terbit)} (${String(j7?.putaran ?? '—')}) |`,
    `| omongan dikunci | ${String(p4?.dikunci)} | ${String(p5?.dikunci)} | ${String(p6?.dikunci)} | ${String(j7?.dikunci.length ?? '—')} |`,
    `| tebak buta luar lolos | ${String(p4?.tebak_lolos)}/${String(p4?.dikunci)} | ${String(p5?.tebak_lolos)}/${String(p5?.dikunci)} | ${String(p6?.tebak_lolos)}/${String(p6?.dikunci)} | ${putusan === null ? '—' : `${String(putusan.b_tebak.lolos)}/${String(putusan.b_tebak.total)}`} |`,
    `| jawab-dengan-kartu K-05 | ${String(p4?.kartu_lolos)}/${String(p4?.dikunci)} | ${String(p5?.kartu_lolos)}/${String(p5?.dikunci)} | ${String(p6?.kartu_lolos)}/${String(p6?.dikunci)} | ${putusan === null ? '—' : `${String(putusan.c_kartu.lolos)}/${String(putusan.c_kartu.total)}`} |`,
    `| biaya jalan TIRT | ${usd(p4?.biaya ?? 0)} (tabel tebakan) | ${usd(p5?.biaya ?? 0)} | ${usd(p6?.biaya ?? 0)} | ${jalan.length === 0 ? '—' : `${usd(jalan.reduce((a, x) => a + x.biaya, 0))} (${jalan.map((x) => `jalan ${String(x.jalan)} ${usd(x.biaya)}`).join(' + ')})`} |`,
    `| kealamian TIRT (penilai milestone itu) | ${String(r6.alami_rata['tirt_m2d4'] ?? '—')} | ${String(r6.alami_rata['tirt_m2d5'] ?? '—')} | ${String(r6.alami_rata['tirt_m2d6'] ?? '—')} | — (tidak ada omongan yang diuji) |`,
    '',
  );

  const tangan = existsSync(JALUR_TANGAN) ? readFileSync(JALUR_TANGAN, 'utf8').trim() : '_(belum ditulis)_';
  b.push('## Catatan penulis', '', tangan, '');
  const ringkasan = { biaya: { total_m2d7: total, panggilan: m7.length }, jalan, putusan: putusan === null ? null : { layak_tayang: putusan.layak_tayang, jalan: putusan.jalan } };
  return { md: b.join('\n'), ringkasan };
}

function utama(): number {
  const ledger = bacaLedger();
  const { md, ringkasan } = bangunLaporan(ledger);
  writeFileSync(JALUR_LAPORAN_M2D7, md, 'utf8');
  writeFileSync(`${FOLDER_M2D7}/ringkasan.json`, JSON.stringify(ringkasan, null, 2) + '\n', 'utf8');
  const m7 = ledger.filter((e) => e.tag.startsWith('m2d7/'));
  const ringkasLedger = [...kelompok(m7, (e) => peranM2d7(e.tag))].map(([peran, v]) => ({ peran, panggilan: v.length, biaya_usd: v.reduce((a, e) => a + e.biaya_usd, 0) }));
  writeFileSync(`${FOLDER_M2D7}/ledger-ringkas.json`, JSON.stringify({ total_usd: m7.reduce((a, e) => a + e.biaya_usd, 0), per_peran: ringkasLedger }, null, 2) + '\n', 'utf8');
  console.log(`${JALUR_LAPORAN_M2D7.replace(AKAR, '')} ditulis (${String(md.length)} karakter).`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/pengecoh-laporan.ts') === true) process.exitCode = utama();
