/**
 * `npm run kalibrasi:laporan` — laporan M2d-8 (kontrak D-5)
 * `docs/bukti/lingkar-agen-kalibrasi.md`, DITULIS dari keluaran mentah:
 * pra-registrasi (git), probe, kalibrasi (mentah + matriks + setelan), soal
 * pemanasan (jejak), jalan TIRT (riwayat + jejak), uji luar/putusan, draf
 * terbaik, ledger OpenRouter (biaya NYATA, tag `m2d8/`). Hanya "Catatan
 * penulis" yang ditulis tangan (`eval/keluaran-m2d8/laporan-tangan.md`).
 * Tanpa jaringan.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { HasilPengecoh, PemeriksaanPengecoh } from './agen-pengecoh.ts';
import { AKAR } from './env.ts';
import { gArtefak } from './gerbang-artefak.ts';
import { JALUR_MENTAH, bacaMentah, isiMatriks, lengkap, putusanSoalM2d8, type BarisMatriksM2d8, type MentahSoalM2d8 } from './kalibrasi-gerbang.ts';
import { FOLDER_M2D8, PAGU_BAGIAN_M2D8, PAGU_MILESTONE_M2D8 } from './kalibrasi-konfig.ts';
import { FOLDER_PEMANASAN, type PercobaanPemanasan } from './kalibrasi-pemanasan.ts';
import { FOLDER_PENGUJI_M2D8, type DrafTerbaik } from './kalibrasi-penguji.ts';
import { JALUR_PROBE_M2D8, bacaProbeM2d8, putusanPenalar, type HasilProbeM2d8 } from './kalibrasi-probe.ts';
import { SETELAN_AWAL, kodeMenolak, type SetelanGerbangM2d8 } from './kalibrasi-setelan.ts';
import { gerbangKode, soalHimpunanM2d8 } from './kalibrasi-soal.ts';
import { FOLDER_TIRT_M2D8, SETELAN_KALIBRASI_M2D8 } from './kalibrasi-susun.ts';
import { jsonDari } from './laporan.ts';
import { JALUR_LEDGER, type EntriLedger } from './pagu.ts';
import { PENALAR_M2D8 } from './penalaran.ts';
import type { PutusanTayang } from './pengecoh-putusan.ts';

export const JALUR_LAPORAN_M2D8 = `${AKAR}docs/bukti/lingkar-agen-kalibrasi.md`;
const JALUR_TANGAN = `${FOLDER_M2D8}/laporan-tangan.md`;

const baca = <T>(jalur: string): T => JSON.parse(readFileSync(jalur, 'utf8')) as T;
const usd = (n: number): string => `US$${n.toFixed(4)}`;
const angka = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('id-ID'));
const sel = (t: string): string => t.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const pecahan = (x: [number, number]): string => `${String(x[0])}/${String(x[1])}`;

export function bacaLedgerM2d8(jalur: string = JALUR_LEDGER): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger);
}

/** Bagian + peran satu panggilan M2d-8 dari tagnya. Murni. */
export function peranM2d8(tag: string): string {
  const bagian = tag.startsWith('m2d8/probe/') ? 'probe' : tag.startsWith('m2d8/kalibrasi/') ? 'kalibrasi' : tag.startsWith('m2d8/pemanasan/') ? 'pemanasan' : tag.startsWith('m2d8/jalan/') ? 'jalan TIRT' : 'lain';
  const peta: Array<[RegExp, string]> = [
    [/\/(tulis-pesan)\//, 'penulis (pesan)'], [/\/(tulis-pilihan)\//, 'penulis (pilihan)'], [/\/(tulis-penjelasan)\//, 'penulis (penjelasan)'], [/\/susun\//, 'penulis (pemanasan)'],
    [/gerbang-pilihan-saja/, 'pilihan-saja'], [/gerbang-kartu/, 'pembaca kartu'], [/kritikus/, 'kritikus'], [/gerbang-tebak|penebak/, 'penebak'],
  ];
  const peran = peta.find(([p]) => p.test(tag))?.[1] ?? 'lain';
  return `${bagian} · ${peran}`;
}

function kelompok<T>(x: readonly T[], k: (y: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const y of x) m.set(k(y), [...(m.get(k(y)) ?? []), y]);
  return m;
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: AKAR, encoding: 'utf8' }).trim();
}

function tabelMatriks(m: readonly BarisMatriksM2d8[]): string[] {
  return [
    '| gerbang | manusia ditolak | bocor ditolak | aman ditolak | tambahan ditolak |', '|---|---:|---:|---:|---:|',
    ...m.map((b) => `| ${b.gerbang}${b.dicatat ? ' (dicatat)' : ''} | ${pecahan(b.manusia)} | ${pecahan(b.bocor)} | ${pecahan(b.aman)} | ${pecahan(b.tambahan)} |`),
  ];
}

function ringkasTebak(t: MentahSoalM2d8['penebak']): string {
  return (t ?? []).map((x) => (x.terbaca ? `${String(x.pilihan)}/${String(x.yakin)}` : 'tak terbaca')).join(' · ');
}

function setelanTeks(s: SetelanGerbangM2d8): string {
  return `penebak tingkat ${String(s.tingkat.penebak)}, pilihan-saja ${String(s.tingkat.pilihan_saja)}, meresmikan ${String(s.tingkat.meresmikan)}, keseimbangan ${String(s.tingkat.keseimbangan)}, kritikus ${String(s.tingkat.kritikus)}, pembaca kartu ${String(s.tingkat.kartu)}; "dicatat": ${s.dicatat.length === 0 ? '—' : s.dicatat.join(', ')}; kode diturunkan: ${s.kode_dicatat.length === 0 ? '—' : s.kode_dicatat.join(', ')}`;
}

export function bangunLaporan(ledger: readonly EntriLedger[]): string {
  const m8 = ledger.filter((e) => e.tag.startsWith('m2d8/'));
  const b: string[] = [
    '# Bukti: kalibrasi gerbang terhadap soal manusia (M2d-8)',
    '',
    'Berkas ini ditulis oleh `npm run kalibrasi:laporan` dari keluaran mentah di `eval/keluaran-m2d8/` (probe, kalibrasi, soal pemanasan, jalan TIRT, uji luar/putusan, draf terbaik) dan ledger OpenRouter (biaya NYATA `usage.cost`, tag `m2d8/`). Hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d8/laporan-tangan.md`). Tidak ada yang dipasang ke produk.',
    '',
  ];

  // --- pra-registrasi
  const t00 = git(['log', '--format=%h %cI', '--diff-filter=A', '--', 'docs/bukti/m2d8-praregistrasi.md']).split('\n').at(-1) ?? '';
  const pertama = m8[0]?.waktu ?? '—';
  b.push(
    '## Pra-registrasi (D-0)', '',
    `\`docs/bukti/m2d8-praregistrasi.md\` di-commit **${t00}**; panggilan berbayar M2d-8 pertama di ledger: **${pertama}**. Berkas itu dan pra-registrasi M2d-7 dites tidak berubah sejak commit masing-masing. Isi: himpunan beku (6 soal manusia teks tayang \`ad0bf21\`, 4 bocor, 6 aman, 2 tambahan), tumpukan tujuh gerbang, kode pelindung, urutan dan batas pelonggaran, penurunan ke "dicatat", syarat ≥ 5/6 manusia diterima dan ≥ 3/4 bocor ditolak, aturan penalar "high", soal pemanasan, draf terbaik.`,
    '',
  );

  // --- penalar
  if (existsSync(JALUR_PROBE_M2D8)) {
    const probe = bacaProbeM2d8();
    const p = putusanPenalar(ledger, probe);
    b.push('## Penalar GLM `effort: "high"` (D-1)', '', '| panggilan | penyedia | selesai | token penalaran | biaya | hasil |', '|---|---|---|---:|---:|---|');
    for (const h of probe as HasilProbeM2d8[]) b.push(`| ${h.tag.replace('m2d8/probe/', '')} | ${h.penyedia ?? '—'} | ${h.finish_reason ?? (h.galat === undefined ? '—' : 'tidak dikirim (pagu)')} | ${angka(h.token_penalaran)} | ${h.biaya_usd === undefined ? '—' : usd(h.biaya_usd)} | ${sel(h.catatan ?? h.galat?.slice(0, 80) ?? '')} |`);
    b.push('', ...p.alasan.map((a) => `- ${a}`), '', `Setelan yang dipakai (\`PENALAR_M2D8\`): kritikus \`max_tokens\` ${angka(PENALAR_M2D8.kritikus.maxTokens)}, ambang ${angka(PENALAR_M2D8.kritikus.ambang)}; penebak ×3 \`max_tokens\` ${angka(PENALAR_M2D8.penebakGlm.maxTokens)}, ambang ${angka(PENALAR_M2D8.penebakGlm.ambang)}; \`provider.order\` ["wafer"].`, '');
  }

  // --- kalibrasi
  if (existsSync(JALUR_MENTAH)) {
    const mentah = bacaMentah() as { hasil: MentahSoalM2d8[]; biaya_kalibrasi_usd?: number; lanjutan?: { alasan: string; soal: string[] } };
    const isi = isiMatriks(mentah.hasil);
    const ukur = mentah.hasil.filter(lengkap);
    b.push(
      '## Kalibrasi (D-2)', '',
      `Biaya kalibrasi ${usd(mentah.biaya_kalibrasi_usd ?? 0)} dari pagu ${usd(PAGU_BAGIAN_M2D8.kalibrasi.usd)}. Terukur lengkap di semua gerbang: **${String(ukur.length)} soal** (${ukur.map((m) => m.id).join(', ')}); tidak lengkap: ${mentah.hasil.filter((m) => !lengkap(m)).map((m) => m.id).join(', ') || '—'}; belum dimulai: ${String(18 - mentah.hasil.length)} soal (semua soal bocor, aman, dan tambahan). Yang tidak terukur tidak dilengkapi tangan.`,
      '',
    );
    if (mentah.lanjutan !== undefined) b.push(`Jalan pertama (konkurensi 2) berhenti karena perkiraan maksimum panggilan kritikus yang sedang berjalan ikut dihitung pagu, sebelum biaya nyata mencapai pagu (\`mentah-jalan-1.json\`). Lanjutan (\`--lanjut\`, prosedur dan urutan sama, satu soal sekaligus, gerbang yang sudah terukur tidak diukur ulang): ${mentah.lanjutan.soal.join(', ')}.`, '');
    b.push('### Data mentah per soal', '', '| soal | kunci | kode | meresmikan / keseimbangan | pilihan-saja | pembaca kartu | kritikus (token penalaran) | penebak GLM "high" |', '|---|---|---|---|---|---|---|---|');
    for (const m of mentah.hasil) {
      const kode = [...new Set(m.kode.map((x) => x.kode))].join(', ') || '—';
      const mr = `${m.meresmikan.angka.length + m.meresmikan.kata.length === 0 ? '—' : [...m.meresmikan.angka, ...m.meresmikan.kata].join(', ')} / ${String(m.keseimbangan.rasio)}`;
      const ps = m.pilihan_saja === null ? '—' : m.pilihan_saja.map((t) => (t.terbaca ? `${String(t.pilihan)}/${String(t.yakin)}` : 'tak terbaca')).join(' · ');
      const kt = m.kartu === null ? '—' : `${String(m.kartu.pilihan)}${m.kartu.bingung_penulis.length > 0 ? ` (bingung: ${m.kartu.bingung_penulis.map((x) => `"${x}"`).join('; ')})` : ''}`;
      const kr = m.kritikus === null ? '—' : `${m.kritikus.menjawab ? (m.kritikus.keberatan.length === 0 ? 'tanpa keberatan' : m.kritikus.keberatan.map((x) => `${x.jenis}: ${x.alasan}`).join(' / ')) : 'tidak menjawab'} (${m.kritikus.token_penalaran.map((x) => angka(x)).join(' + ')})`;
      b.push(`| ${m.id} | ${m.kunci} | ${kode} | ${mr} | ${ps} | ${sel(kt)} | ${sel(kr)} | ${m.penebak === null ? '—' : ringkasTebak(m.penebak)} |`);
    }
    b.push('', 'Penebak "tak terbaca" = dua jawaban habis `max_tokens` 8.000 atau tidak terbukti berpikir (penjaga) — dihitung memilih kunci dengan yakin 100 (aturan M2d-2).', '');
    b.push('### Matriks sebelum (setelan §2)', '', ...tabelMatriks(isi.awal), '', '### Langkah aturan §3', '', ...isi.putusan.langkah.map((l) => `- ${l}`), '', '### Matriks sesudah', '', ...tabelMatriks(isi.akhir), '');
    const s = isi.putusan.syarat;
    b.push(
      `**Setelan hasil (dipakai persis oleh lingkar TIRT):** ${setelanTeks(isi.putusan.setelan)}.`, '',
      `**Syarat tumpukan:** manusia diterima ${String(s.manusia_diterima)}/${String(s.manusia_terukur)} → ${s.manusia_terpenuhi ? 'terpenuhi' : 'TIDAK terpenuhi'}; bocor ditolak ${String(s.bocor_ditolak)}/${String(s.bocor_terukur)} → ${s.bocor_terpenuhi ? 'terpenuhi' : 'TIDAK terpenuhi (tidak terukur)'}.`, '',
    );
    // gerbang yang diturunkan
    b.push('### Gerbang yang diturunkan menjadi "dicatat" (dengan data)', '');
    for (const g of isi.putusan.setelan.dicatat) {
      const kena = ukur.filter((m) => putusanSoalM2d8(m, { ...isi.putusan.setelan, dicatat: [] })[g]);
      b.push(`- **${g}** — di batas pelonggaran masih menolak ${String(kena.length)} soal manusia: ${kena.map((m) => `${m.id} (${g === 'kartu' ? `pembaca memilih ${String(m.kartu?.pilihan)}, kunci ${m.kunci}; alasannya "${sel(m.kartu?.alasan ?? '')}"` : 'lihat data mentah'})`).join('; ')}.`);
    }
    for (const k of isi.putusan.setelan.kode_dicatat) {
      const kena = ukur.filter((m) => m.kode.some((x) => x.kode === k));
      b.push(`- **kode ${k}** — menolak ${String(kena.length)} soal manusia: ${kena.map((m) => `${m.id} ("${sel(m.kode.find((x) => x.kode === k)?.alasan ?? '')}")`).join('; ')}.`);
    }
    b.push('');
    // exhaustion
    const kr = ukur.flatMap((m) => m.kritikus?.finish_reason ?? []);
    const pn = ukur.flatMap((m) => m.penebak ?? []);
    b.push(
      `Kritikus di kalibrasi: ${String(kr.length)} panggilan, habis token ${String(kr.filter((f) => f === 'length').length)} (target ≤ 1/10); penalaran ${ukur.map((m) => angka(m.kritikus?.token_penalaran[0])).join(', ')}. Penebak: ${String(pn.length)} tebakan, tak terbaca ${String(pn.filter((t) => !t.terbaca).length)}.`,
      '',
    );
    // pembanding (bukan putusan)
    const pembanding = soalHimpunanM2d8().filter((x) => x.kelompok === 'bocor' || x.kelompok === 'aman');
    b.push(
      '### Pembanding tanpa jaringan (BUKAN bagian putusan)', '',
      'Soal bocor/aman tidak terukur karena pagu. Gerbang yang gratis dan pasti (kode, meresmikan, keseimbangan) di bawah setelan hasil, hanya sebagai gambaran:', '',
      '| soal | kelompok | kode menolak | meresmikan | keseimbangan |', '|---|---|---|---|---|',
      ...pembanding.map((x) => {
        const s8 = SETELAN_KALIBRASI_M2D8;
        const a = gArtefak(x.omongan, { rasio: [1.3, 1.5][s8.tingkat.keseimbangan] ?? 1.3, maksKata: [2, 3][s8.tingkat.meresmikan] ?? 2, pilihanSajaYakin: null, penebakYakin: true });
        const k = gerbangKode(x.omongan, x.paket);
        return `| ${x.id}${x.tambahan ? ' (tambahan)' : ''} | ${x.kelompok} | ${kodeMenolak(k, s8.kode_dicatat) ? [...new Set(k.map((y) => y.kode))].filter((y) => !s8.kode_dicatat.includes(y)).join(', ') : '—'} | ${a.meresmikan.tolak ? 'tolak' : '—'} | ${a.keseimbangan.tolak ? 'tolak' : '—'} |`;
      }),
      '',
      'Penebak GLM "high" pada himpunan yang sama sudah pernah diukur di M2d-6 (susunan K3, `eval/keluaran-m2d6/kalibrasi/K3-s1.json`, penjaga ambang 300): keempat soal bocor ditolak menurut K-05, tetapi juga soal aman ULTJ o1/o2 (3/3 benar) — datanya dari milestone lain dan setelan penjaga lain, jadi tidak dipakai untuk syarat.',
      '',
    );
    void SETELAN_AWAL;
  }

  // --- pemanasan
  if (existsSync(`${FOLDER_PEMANASAN}/jejak.json`)) {
    const j = baca<{ lolos: boolean; berhenti: string | null; biaya_usd: number; percobaan: PercobaanPemanasan[]; kartu: string[]; huruf_kunci: string }>(`${FOLDER_PEMANASAN}/jejak.json`);
    b.push('## Soal pemanasan (D-3, mode dipandu)', '', `Kartu ${j.kartu.map((k) => `\`${k}\``).join(' + ')}, klaim teman Keliru, huruf kunci ${j.huruf_kunci} (kode). **${j.lolos ? 'Soal lolos semua gerbang' : `Tidak ada soal: ${String(j.berhenti)}`}.** Biaya ${usd(j.biaya_usd)}.`, '');
    if (j.lolos && existsSync(`${FOLDER_PEMANASAN}/soal.json`)) {
      const s = baca<{ pesan: { nama: string; jam: string; isi: string }; petunjuk: string; pilihan: Array<{ kunci: string; teks: string }>; jawaban: string; penjelasan: string; kartu: string[] }>(`${FOLDER_PEMANASAN}/soal.json`);
      b.push(`Petunjuk: ${s.petunjuk}`, '', `> **${s.pesan.nama} (${s.pesan.jam}):** ${s.pesan.isi}`, '', ...s.pilihan.map((p) => `- ${p.kunci === s.jawaban ? '**' : ''}${p.kunci}) ${teksPolos(p.teks)}${p.kunci === s.jawaban ? '** (kunci)' : ''}`), '', `Penjelasan: ${teksPolos(s.penjelasan)}`, '');
    }
    for (const c of j.percobaan) {
      const o = c.omongan;
      b.push(`**Percobaan ${String(c.ke)}** — ${c.putusan?.lolos === true ? 'lolos' : 'ditolak'} (${usd(c.biaya_usd)})`, '');
      if (o !== null) b.push(`> **${o.nama} (${o.jam}):** ${o.pesan}`, '', ...(['a', 'b', 'c', 'd'] as const).map((h) => `- ${h}) ${teksPolos(o.pilihan[h])}${h === o.kunci ? ' (kunci)' : ''}`), '', `Penjelasan: ${teksPolos(o.penjelasan)}`, '');
      else b.push('Keluaran penulis tak terbaca.', '');
      if (c.putusan !== null) b.push(...c.putusan.menolak.map((x) => `- menolak: ${sel(x)}`), ...c.putusan.dicatat.map((x) => `- dicatat: ${sel(x)}`), '');
    }
  }

  // --- TIRT
  if (existsSync(`${FOLDER_TIRT_M2D8}/riwayat.json`)) {
    const h = baca<HasilPengecoh>(`${FOLDER_TIRT_M2D8}/riwayat.json`);
    const jalanE = m8.filter((e) => e.tag.startsWith('m2d8/jalan/'));
    const status = kelompok(h.riwayat.flatMap((r) => r.omongan as PemeriksaanPengecoh[]).filter((o) => o.status !== 'terkunci-sebelumnya'), (o) => o.status);
    const dicatat = kelompok(h.riwayat.flatMap((r) => (r.omongan as PemeriksaanPengecoh[]).flatMap((o) => o.dicatat ?? [])), (d) => d.sumber);
    const kr = jalanE.filter((e) => /\/kritikus\//.test(e.tag));
    const krHabis = kr.filter((e) => (e.token_keluar ?? 0) >= PENALAR_M2D8.kritikus.maxTokens - 5);
    const dikunci = [1, 2, 3].filter((no) => h.riwayat.some((r) => r.omongan.some((o) => o.no === no && o.status === 'lolos')));
    b.push(
      '## Satu jalan TIRT (D-4)', '',
      `**${h.lolos ? 'TERBIT' : 'TIDAK TERBIT'}** sesudah ${String(h.jumlah_putaran)} putaran${h.berhenti === null ? '' : ` (${sel(h.berhenti)})`}; omongan dikunci: ${dikunci.length === 0 ? '—' : dikunci.join(', ')}; ${String(jalanE.length)} panggilan, ${usd(jalanE.reduce((a, e) => a + e.biaya_usd, 0))}.`, '',
      `- Status per versi: ${[...status.entries()].map(([k, v]) => `${k} ${String(v.length)}`).join(', ')}.`,
      `- Penolakan yang DICATAT (gerbang/kode yang diturunkan, tidak menolak): ${dicatat.size === 0 ? '—' : [...dicatat.entries()].map(([k, v]) => `${k} ${String(v.length)}`).join(', ')}.`,
      `- Kritikus: ${String(kr.length)} panggilan, habis token ${String(krHabis.length)} (target ≤ 1/10).`,
      ...h.sudut.map((s, i) => `- omongan ${String(i + 1)}: ${s.map((c) => `\`${c.fact_id}\` → ${c.hasil} (${String(c.putaran_mulai)}–${String(c.putaran_akhir ?? '…')})`).join('; ')}`),
      '',
    );
    const jp = `${FOLDER_PENGUJI_M2D8}/putusan.json`;
    if (existsSync(jp)) {
      const p = baca<PutusanTayang & { catatan?: string }>(jp);
      b.push(
        '### Uji luar dan putusan mekanis (pra-registrasi M2d-7, tidak diubah)', '',
        ...(p.catatan === undefined ? [] : [p.catatan, '']),
        '| syarat | hasil | terpenuhi |', '|---|---|---|',
        `| (a) terbit | ${p.a_terbit ? 'terbit' : 'tidak terbit'} | ${p.a_terbit ? 'ya' : '**tidak**'} |`,
        `| (b) tebak buta luar ${p.b_tebak.syarat} | ${String(p.b_tebak.lolos)}/${String(p.b_tebak.total)} | ${p.b_tebak.terpenuhi ? 'ya' : '**tidak**'} |`,
        `| (c) jawab-dengan-kartu K-05 penuh | ${String(p.c_kartu.lolos)}/${String(p.c_kartu.total)} | ${p.c_kartu.terpenuhi ? 'ya' : '**tidak**'} |`,
        `| (d) nol masalah makna | ${String(p.d_makna.masalah)} masalah | ${p.d_makna.terpenuhi ? 'ya' : '**tidak**'} |`,
        '', `**Putusan: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}.**`, '',
      );
      for (const o of p.omongan) b.push(`- omongan ${String(o.no)} (kunci ${o.kunci}): tebak ${o.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(' · ')} → ${o.lolos_tebak ? 'lolos' : 'tidak'}; kartu ${o.kartu.map((k) => `${k.pilihan}/${(Array.isArray(k.kartu) ? k.kartu : []).join('+')}`).join(' · ')} → ${o.lolos_kartu ? 'lolos' : 'tidak'}; masalah makna: ${o.masalah.map((x) => `${x.butir} (${x.sumber})`).join('; ') || '—'}`);
      if (p.omongan.length > 0) b.push('');
    }
    const jk = `${FOLDER_PENGUJI_M2D8}/kunci.json`;
    if (existsSync(jk)) {
      const kunci = baca<{ alami: Array<{ kelompok: number; label: Record<string, string> }> }>(jk);
      const skor: Record<string, number[]> = {};
      for (const n of [1, 2, 3]) {
        const f = `${FOLDER_PENGUJI_M2D8}/jawaban/alami-p${String(n)}.txt`;
        if (!existsSync(f)) continue;
        const j = jsonDari(readFileSync(f, 'utf8')) as { nilai?: Array<{ kelompok: number; label: string; skor: number }> };
        for (const x of j.nilai ?? []) {
          const sumber = kunci.alami.find((k) => k.kelompok === x.kelompok)?.label[x.label];
          if (sumber !== undefined) (skor[sumber] ??= []).push(x.skor);
        }
      }
      if (Object.keys(skor).length > 0) b.push(`Kealamian (3 penilai opus baru, dilaporkan, bukan syarat): ${Object.entries(skor).map(([k, v]) => `${k} ${v.join('/')} (rata-rata ${(v.reduce((a, x) => a + x, 0) / v.length).toFixed(2).replace('.', ',')})`).join('; ')}.`, '');
    }
    const jt = `${FOLDER_PENGUJI_M2D8}/draf-terbaik.json`;
    if (existsSync(jt)) {
      const d = baca<DrafTerbaik[]>(jt);
      b.push('### Draf terbaik untuk penyetuju (tidak disunting)', '', `Lengkap di \`eval/keluaran-m2d8/penguji/draf-terbaik.md\`. Ringkas: ${d.map((x) => `omongan ${String(x.no)} putaran ${String(x.putaran)} — ${x.status} (tahap terjauh: ${x.tahap_nama})`).join('; ')}.`, '');
    }
  }

  // --- biaya
  const total = m8.reduce((a, e) => a + e.biaya_usd, 0);
  const kum = ledger.filter((e) => /^m2d[5-8]\//.test(e.tag)).reduce((a, e) => a + e.biaya_usd, 0);
  b.push('## Biaya NYATA M2d-8 (OpenRouter, `usage.cost`)', '', `Entri ledger bertag \`m2d8/\`: **${usd(total)} dalam ${String(m8.length)} panggilan**, dari pagu milestone ${usd(PAGU_MILESTONE_M2D8)} (ditegakkan kode). Kumulatif ledger OpenRouter M2d-5…M2d-8: ${usd(kum)}.`, '', '| bagian · peran | panggilan | token keluar | biaya nyata |', '|---|---:|---:|---:|');
  for (const [k, v] of [...kelompok(m8, (e) => peranM2d8(e.tag))].sort()) b.push(`| ${k} | ${String(v.length)} | ${angka(v.reduce((a, e) => a + (e.token_keluar ?? 0), 0))} | ${usd(v.reduce((a, e) => a + e.biaya_usd, 0))} |`);
  b.push('', '| model · penyedia | panggilan | biaya nyata |', '|---|---:|---:|');
  for (const [k, v] of [...kelompok(m8, (e) => `${e.model} · ${e.penyedia ?? '(tidak disebut)'}`)].sort((x, y) => y[1].reduce((a, e) => a + e.biaya_usd, 0) - x[1].reduce((a, e) => a + e.biaya_usd, 0))) {
    b.push(`| ${k} | ${String(v.length)} | ${usd(v.reduce((a, e) => a + e.biaya_usd, 0))} |`);
  }
  b.push('');

  const tangan = existsSync(JALUR_TANGAN) ? readFileSync(JALUR_TANGAN, 'utf8').replace(/\r\n/g, '\n').trim() : '_(belum ditulis)_';
  b.push('## Catatan penulis', '', tangan, '');
  return b.join('\n');
}

function utama(): number {
  const md = bangunLaporan(bacaLedgerM2d8());
  writeFileSync(JALUR_LAPORAN_M2D8, md, 'utf8');
  console.log(`${JALUR_LAPORAN_M2D8.replace(AKAR, '')} ditulis (${String(md.length)} karakter).`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/kalibrasi-laporan.ts') === true) process.exitCode = utama();
