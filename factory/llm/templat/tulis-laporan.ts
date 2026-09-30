/**
 * `npm run templat:laporan` — `docs/bukti/lingkar-agen-templat.md` (kontrak
 * M2d-10 D-8) dari keluaran mentah: templat (kode), kalibrasi, soal
 * pemanasan, jalan TIRT lewat pintu penyusun, uji luar/putusan, dan ledger
 * OpenRouter (biaya NYATA `usage.cost`, tag `m2d10/` + `penyusun/m2d10-`).
 * Hanya bagian "Catatan penulis" yang ditulis tangan
 * (`eval/keluaran-m2d10/laporan-tangan.md`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import type { SoalPemanasan } from '../kalibrasi-pemanasan.ts';
import { JALUR_LEDGER, type EntriLedger } from '../pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type PaketFakta } from '../paket.ts';
import type { PutusanTayang } from '../pengecoh-putusan.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { lengkapTemplat, putusanKalibrasiTemplat, putusanSoalTemplat, SETELAN_S1, type MentahTemplat } from './kalibrasi.ts';
import { FOLDER_M2D10, PAGU_BAGIAN_M2D10, PAGU_MILESTONE_M2D10 } from './konfig.ts';
import type { CatatanPenyempurnaan, CatatanVersi, HasilTemplat } from './mesin.ts';
import type { PercobaanPemanasanTemplat } from './pemanasan.ts';
import { ASAL_POLA, URUTAN_POLA, semuaRencana } from './pola.ts';
import { evaluasi } from './proposisi.ts';

export const JALUR_LAPORAN_M2D10 = `${AKAR}docs/bukti/lingkar-agen-templat.md`;
const FOLDER_JALAN = (id: string): string => `${AKAR}eval/penyusun/${id}`;

const usd = (x: number): string => `US$${x.toFixed(4)}`;
const baca = <T>(j: string): T => JSON.parse(readFileSync(j, 'utf8')) as T;

function entriLedger(): EntriLedger[] {
  if (!existsSync(JALUR_LEDGER)) return [];
  return readFileSync(JALUR_LEDGER, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => JSON.parse(b) as EntriLedger)
    .filter((e) => e.tag.startsWith('m2d10/') || e.tag.startsWith('penyusun/m2d10-'));
}

export function bagianTag(tag: string): string {
  if (tag.startsWith('m2d10/kalibrasi/')) return 'kalibrasi';
  if (tag.startsWith('m2d10/pemanasan/')) return 'pemanasan';
  if (tag.startsWith('penyusun/m2d10-tirt-a1/')) return 'jalan TIRT A-1';
  if (tag.startsWith('penyusun/m2d10-')) return 'jalan TIRT';
  return 'lain';
}

export function peranTag(tag: string): string {
  const j = /\/(tulis-pesan|tulis-penjelasan|sempurnakan-pilihan|gerbang-tebak|gerbang-kartu|kritikus)\//.exec(`${tag}/`)?.[1] ?? '?';
  return ({ 'tulis-pesan': 'penulis (pesan)', 'tulis-penjelasan': 'penulis (penjelasan)', 'sempurnakan-pilihan': 'penyempurna', 'gerbang-tebak': 'penebak', 'gerbang-kartu': 'pembaca kartu', kritikus: 'kritikus' } as Record<string, string>)[j] ?? j;
}

function tabelBiaya(e: readonly EntriLedger[]): string[] {
  const kel = new Map<string, { n: number; usd: number; keluar: number }>();
  for (const x of e) {
    const k = `${bagianTag(x.tag)} · ${peranTag(x.tag)} · ${x.model}`;
    const v = kel.get(k) ?? { n: 0, usd: 0, keluar: 0 };
    v.n += 1;
    v.usd += x.biaya_usd;
    v.keluar += x.token_keluar ?? 0;
    kel.set(k, v);
  }
  const model = new Map<string, { n: number; usd: number }>();
  for (const x of e) {
    const v = model.get(x.model) ?? { n: 0, usd: 0 };
    v.n += 1;
    v.usd += x.biaya_usd;
    model.set(x.model, v);
  }
  return [
    '| bagian · peran · model | panggilan | token keluar | biaya nyata |',
    '|---|---:|---:|---:|',
    ...[...kel.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `| ${k} | ${String(v.n)} | ${v.keluar.toLocaleString('id-ID')} | ${usd(v.usd)} |`),
    '',
    '| model | panggilan | biaya nyata |',
    '|---|---:|---:|',
    ...[...model.entries()].sort((a, b) => b[1].usd - a[1].usd).map(([k, v]) => `| ${k} | ${String(v.n)} | ${usd(v.usd)} |`),
  ];
}

function omonganMd(o: OmonganDraf): string[] {
  return [
    `> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`,
    '',
    ...(['a', 'b', 'c', 'd'] as const).map((h) => `- ${h === o.kunci ? '**' : ''}${h}) ${teksPolos(o.pilihan[h])}${h === o.kunci ? '** (kunci)' : ''}`),
    '',
    `Kartu: ${o.kartu.map((k) => `\`${k}\`${o.kartu_penentu.includes(k) ? ' (penentu)' : ''}`).join(', ')}`,
    '',
    `Penjelasan: ${teksPolos(o.penjelasan)}`,
    '',
  ];
}

function bagianTemplat(paket: PaketFakta): string[] {
  const b: string[] = ['## Templat (D-1)', '', 'Enam pola diturunkan dari POLA enam soal tayang (Claude + pemilik), bukan dari kalimatnya (`factory/llm/templat/pola.ts`). Tiap pilihan membawa proposisi; nilai kebenarannya dihitung kode dari fakta paket (`proposisi.ts`), dan `bukti.ts` membuktikan tepat satu pilihan benar untuk SETIAP varian yang boleh dipilih penyempurna (tes: `templat.test.ts`, termasuk sabotase "dua pilihan benar").', '', '| pola | dari soal tayang |', '|---|---|'];
  for (const p of URUTAN_POLA) b.push(`| ${p} | ${ASAL_POLA[p]} |`);
  b.push('', `### Rencana di paket TIRT 10 Des 2025 (${String(semuaRencana(paket).length)} rencana, semua lolos bukti)`, '');
  for (const r of semuaRencana(paket)) {
    const bukti = buktiKunciTunggal(r, paket);
    b.push(`**${r.pola}** (sudut \`${r.sudut}\`, klaim ${r.klaim.label}, bukti ${bukti.sah ? 'sah' : 'TIDAK sah'}) — klaim: ${r.klaim.inti}`, '');
    for (const s of r.slot) {
      const v = s.varian[0];
      if (v === undefined) continue;
      b.push(`- ${s.slot} (${s.bentuk}): ${teksPolos(v.teks)} — proposisi ${evaluasi(v.proposisi, paket) ? 'BENAR' : 'salah'}`);
    }
    b.push('');
  }
  return b;
}

function bagianKalibrasi(): string[] {
  const j = `${FOLDER_M2D10}/kalibrasi/mentah.json`;
  if (!existsSync(j)) return ['## Kalibrasi (D-5)', '', 'Belum dijalankan.', ''];
  const mentah = baca<{ biaya_kalibrasi_usd: number; hasil: MentahTemplat[] }>(j);
  const p = putusanKalibrasiTemplat(mentah.hasil);
  const b: string[] = ['## Kalibrasi singkat (D-5)', '', `Biaya ${usd(mentah.biaya_kalibrasi_usd)} dari pagu US$${PAGU_BAGIAN_M2D10.kalibrasi.usd.toFixed(2)} (ditegakkan kode). Kritikus lima soal tayang = hasil M2d-8 (setelan & teks sama, dicek kode); kritikus ULTJ s3 diukur baru. Soal yang tidak lengkap tidak dilengkapi tangan.`, ''];
  b.push('| soal | kelompok | kunci | kode | penebak Haiku · DeepSeek · GLM | pembaca kartu | kritikus |', '|---|---|---|---|---|---|---|');
  for (const m of mentah.hasil) {
    const t = m.penebak?.map((x) => (x.terbaca ? `${String(x.pilihan)}/${String(x.yakin)}` : 'tak terbaca')).join(' · ') ?? '—';
    const k = m.kritikus === null ? '—' : `${m.kritikus.sumber}: ${m.kritikus.menjawab ? m.kritikus.keberatan.map((x) => x.jenis).join(', ') || 'tanpa keberatan' : 'tidak menjawab'}`;
    b.push(`| ${m.id} | ${m.kelompok} | ${m.kunci} | ${m.kode.map((x) => x.kode).join(', ') || '—'} | ${t} | ${String(m.kartu?.pilihan ?? '—')} | ${k}${m.galat === undefined ? '' : ` (${m.galat.slice(0, 80)})`} |`);
  }
  b.push('', 'Langkah aturan pra-registrasi §4:', '', ...p.langkah.map((l) => `- ${l}`), '', `**Setelan hasil (dipakai persis oleh mesin):** ${p.keadaan} — penebak ${p.setelan.penebak.aturan}${p.setelan.penebak.ambangHaiku === null ? '' : ` (A = ${String(p.setelan.penebak.ambangHaiku)})`}, pembaca kartu ${p.setelan.kartu}, kritikus ${p.setelan.kritikus.dicatat ? 'dicatat' : p.setelan.kritikus.jenis.join('/')}.`, '');
  b.push(`**Syarat:** soal tayang diterima ${String(p.syarat.tayang_diterima)}/${String(p.syarat.tayang_terukur)} (${p.syarat.terpenuhi ? 'terpenuhi' : 'TIDAK terpenuhi'}). Tangkapan soal bocor sebelum kritikus di bawah setelan hasil: ${String(p.syarat.bocor_tertangkap_sebelum_kritikus)}/${String(p.syarat.bocor_terukur)}.`, '');
  const ukur = mentah.hasil.filter(lengkapTemplat);
  const f = (s: typeof SETELAN_S1, k: 'tayang' | 'bocor', g: 'kode' | 'penebak' | 'kartu' | 'kritikus' | 'sebelum_kritikus' | 'ditolak'): string => {
    const x = ukur.filter((m) => m.kelompok === k);
    return `${String(x.filter((m) => putusanSoalTemplat(m, s)[g]).length)}/${String(x.length)}`;
  };
  b.push('| gerbang | S1: tayang ditolak | S1: bocor ditolak | hasil: tayang ditolak | hasil: bocor ditolak |', '|---|---:|---:|---:|---:|');
  for (const g of ['kode', 'penebak', 'kartu', 'kritikus', 'sebelum_kritikus', 'ditolak'] as const) b.push(`| ${g} | ${f(SETELAN_S1, 'tayang', g)} | ${f(SETELAN_S1, 'bocor', g)} | ${f(p.setelan, 'tayang', g)} | ${f(p.setelan, 'bocor', g)} |`);
  b.push('');
  return b;
}

function bagianPemanasan(): string[] {
  const j = `${FOLDER_M2D10}/pemanasan/jejak.json`;
  if (!existsSync(j)) return ['## Soal pemanasan (D-7a)', '', 'Belum dijalankan.', ''];
  const x = baca<{ rencana: string; lolos: boolean; berhenti: string | null; biaya_usd: number; percobaan: PercobaanPemanasanTemplat[] }>(j);
  const b: string[] = ['## Soal pemanasan (D-7a, mode dipandu)', '', `Rencana \`${x.rencana}\`; ${x.lolos ? `**LOLOS** di percobaan ${String(x.percobaan.length)}` : `**tidak ada soal** (${String(x.berhenti)})`}; biaya ${usd(x.biaya_usd)}. Tebak buta tidak disyaratkan (pra-registrasi §5).`, ''];
  for (const c of x.percobaan) {
    b.push(`**Percobaan ${String(c.ke)}** — ${c.menolak.length === 0 && c.putusan?.lolos === true ? 'lolos' : 'ditolak'}`, '');
    if (c.omongan !== null) b.push(...omonganMd(c.omongan));
    if (c.putusan !== null) b.push(`- pembaca kartu: ${c.putusan.kartu.map((k) => `${String(k.pilihan)} (kartu ${k.kartu_ditunjuk.join('+')})`).join(' · ')}`, `- kritikus: ${c.putusan.kritik === null ? '—' : c.putusan.kritik.menjawab ? c.putusan.kritik.keberatan.map((k) => `${k.jenis}: ${k.alasan}`).join(' | ') || 'tanpa keberatan' : 'tidak menjawab'}`);
    for (const m of c.menolak) b.push(`- menolak: ${m.slice(0, 300)}`);
    for (const m of c.dicatat) b.push(`- dicatat: ${m.slice(0, 300)}`);
    b.push('');
  }
  if (existsSync(`${FOLDER_M2D10}/pemanasan/soal.json`)) {
    const s = baca<SoalPemanasan>(`${FOLDER_M2D10}/pemanasan/soal.json`);
    b.push('### Soal pemanasan utuh (`eval/keluaran-m2d10/pemanasan/soal.json`, belum dipasang ke produk)', '', `Petunjuk: ${s.petunjuk ?? '—'}`, '', `Pertanyaan: ${s.tanya}`, '');
  }
  return b;
}

function bagianJalan(id = 'm2d10-tirt', judul = '## Jalan TIRT lewat pintu penyusun (D-7b)', perintah = 'npm run templat:jalan'): string[] {
  const JALAN = FOLDER_JALAN(id);
  if (!existsSync(`${JALAN}/hasil.json`)) return [judul, '', 'Belum dijalankan.', ''];
  const h = baca<HasilTemplat>(`${JALAN}/hasil.json`);
  const b: string[] = [judul, '', `\`${perintah}\` → pintu penyusun, mesin \`templat\`, TIRT 10 Des 2025, satu jalan (\`eval/penyusun/${id}/\`: aliran.jsonl, jejak-agen.json, hasil.json, keadaan.json, paket.json). Setelan: penebak ${h.setelan.penebak.aturan}${h.setelan.penebak.ambangHaiku === null ? '' : ' (A = ' + String(h.setelan.penebak.ambangHaiku) + ')'}, pembaca kartu ${h.setelan.kartu}, kritikus ${h.setelan.kritikus.dicatat ? 'dicatat' : h.setelan.kritikus.jenis.join('/')}.`, ''];
  b.push(`**${h.lolos ? 'TERBIT' : 'TIDAK TERBIT'}** sesudah ${String(h.jumlah_versi)} versi${h.berhenti === null ? '' : ` (${h.berhenti})`}. Rencana awal: ${h.rencana_awal.join(', ')}.`, '');
  b.push('### Distribusi: di gerbang mana tiap versi berhenti', '', '| berhenti | versi |', '|---|---:|', ...Object.entries(h.distribusi).filter(([, n]) => n > 0).map(([k, n]) => `| ${k} | ${String(n)} |`), '');
  const keKritikus = h.versi.filter((v) => v.kritik !== null).length;
  b.push(`Versi yang sampai ke kritikus: ${String(keKritikus)} dari ${String(h.versi.length)}.`, '');
  b.push('| omongan | rencana | versi | berhenti | alasan (ringkas) | penebak (dicatat/menolak) | pembaca kartu | titik buta |', '|---|---|---:|---|---|---|---|---|');
  for (const v of h.versi as CatatanVersi[]) {
    const t = v.penebak?.tebakan.map((x) => `${x.model.split('/')[1] ?? x.model} ${x.pilihan}/${String(x.yakin)}${x.benar ? '✓' : ''}`).join(' · ') ?? '—';
    b.push(`| ${String(v.no)} | ${v.rencana} | ${String(v.versi)} | ${v.berhenti} | ${(v.alasan[0] ?? '').replace(/\|/g, '/').slice(0, 160)} | ${t} | ${v.kartu === null ? '—' : `${String(v.kartu.pilihan)} (kunci ${v.omongan?.kunci ?? '?'})`} | ${v.titik_buta ? 'YA' : ''} |`);
  }
  b.push('', '### Penyempurna Haiku', '');
  const ps = h.penyempurnaan as CatatanPenyempurnaan[];
  if (ps.length === 0) b.push('Tidak dipanggil (tidak ada penolakan di pilihan oleh gerbang yang menolak).', '');
  for (const p of ps) b.push(`- omongan ${String(p.no)} versi ${String(p.putaran)} (${p.jenis}): diterima ${p.diterima.map((x) => `${x.slot}→${x.varian}`).join(', ') || '—'}; dibuang ${p.dibuang.map((x) => `${x.slot}: ${x.alasan.slice(0, 120)}`).join(' | ') || '—'}`);
  b.push('', '### Omongan yang dikunci', '');
  if (h.kunci.length === 0) b.push('Tidak ada.', '');
  for (const k of h.kunci) b.push(`**Omongan ${String(k.no)}** — ${k.rencana.pola} (\`${k.rencana.sudut}\`)${k.penyempurna_dipakai ? ', pilihan disempurnakan Haiku' : ''}`, '', ...omonganMd(k.omongan));
  const dicatat = h.versi.filter((v) => v.berhenti === 'lolos').flatMap((v) => v.dicatat.map((d) => `omongan ${String(v.no)}: ${d}`));
  if (dicatat.length > 0) b.push('Dicatat pada versi yang dikunci (gerbang "dicatat", tidak menolak):', '', ...dicatat.map((d) => `- ${d.slice(0, 300)}`), '');
  return b;
}

function bagianTambahan(): string[] {
  const j = `${FOLDER_M2D10}/penguji-tambahan/ringkasan.json`;
  if (!existsSync(j)) return [];
  const p = baca<PutusanTayang & { catatan: string }>(j);
  const b: string[] = ['### Uji luar TAMBAHAN (bukan putusan)', '', `${p.catatan} Prosedur sama (3 penguji tebak buta + 3 penguji kartu, subagent Claude opus baru, sinkron; bahan & jawaban mentah di \`eval/keluaran-m2d10/penguji-tambahan/\`). Omongan 1 dan 3 hampir sama (pola, kartu, dan pilihan yang sama; pesan berbeda).`, ''];
  for (const o of p.omongan) {
    b.push(`- ${String(o.no)} (kunci ${o.kunci}): tebak ${o.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(' · ')} → ${o.lolos_tebak ? 'lolos' : 'tidak lolos'}; kartu ${o.kartu.map((k) => `${k.pilihan}/${(Array.isArray(k.kartu) ? k.kartu : []).join('+')}${(k.kunci_lain ?? '') === '' ? '' : ` (kunci_lain ${String(k.kunci_lain)})`}`).join(' · ')} → ${o.lolos_kartu ? 'lolos' : 'tidak'}; masalah makna: ${o.masalah.map((m) => `${m.butir} (${m.sumber})`).join('; ') || 'tidak ada'}`);
  }
  b.push('');
  return b;
}

function bagianPutusan(folder = 'penguji'): string[] {
  const j = `${FOLDER_M2D10}/${folder}/putusan.json`;
  if (!existsSync(j)) return ['### Uji luar dan putusan mekanis', '', 'Belum ada.', ''];
  const p = baca<PutusanTayang & { catatan?: string }>(j);
  const b: string[] = ['### Uji luar dan putusan mekanis (pra-registrasi M2d-7, tidak diubah)', '', '| syarat | hasil | terpenuhi |', '|---|---|---|'];
  b.push(`| (a) terbit | ${p.a_terbit ? 'terbit' : 'tidak terbit'} | ${p.a_terbit ? 'ya' : '**tidak**'} |`);
  b.push(`| (b) tebak buta luar ≥ 2/6 | ${String(p.b_tebak.lolos)}/${String(p.b_tebak.total)} | ${p.b_tebak.terpenuhi ? 'ya' : '**tidak**'} |`);
  b.push(`| (c) jawab-dengan-kartu penuh | ${String(p.c_kartu.lolos)}/${String(p.c_kartu.total)} | ${p.c_kartu.terpenuhi ? 'ya' : '**tidak**'} |`);
  b.push(`| (d) nol masalah makna | ${String(p.d_makna.masalah)} masalah | ${p.d_makna.terpenuhi ? 'ya' : '**tidak**'} |`);
  b.push('', `**Putusan: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}.**`, '');
  for (const o of p.omongan) {
    b.push(`- omongan ${String(o.no)} (kunci ${o.kunci}): tebak ${o.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(' · ')} → ${o.lolos_tebak ? 'lolos' : 'tidak'}; kartu ${o.kartu.map((k) => `${k.pilihan}/${(Array.isArray(k.kartu) ? k.kartu : []).join('+')}`).join(' · ')} → ${o.lolos_kartu ? 'lolos' : 'tidak'}; masalah makna: ${o.masalah.map((m) => `${m.butir} (${m.sumber})`).join('; ') || 'tidak ada'}`);
  }
  b.push('');
  return b;
}

function bagianA1(): string[] {
  if (!existsSync(`${FOLDER_JALAN('m2d10-tirt-a1')}/hasil.json`)) return [];
  const t = execFileSync('git', ['log', '--format=%h %cI', '--diff-filter=A', '--', 'docs/bukti/m2d10-praregistrasi-a1.md'], { cwd: AKAR, encoding: 'utf8' }).trim().split(/\r?\n/).at(-1) ?? '';
  const pertama = entriLedger().find((x) => x.tag.startsWith('penyusun/m2d10-tirt-a1/'))?.waktu ?? '—';
  const krit = entriLedger().filter((x) => x.tag.startsWith('penyusun/m2d10-tirt-a1/') && x.tag.includes('/kritikus/'));
  return [
    '## Amandemen A-1: satu jalan TIRT lagi',
    '',
    `Pra-registrasi \`docs/bukti/m2d10-praregistrasi-a1.md\` di-commit **${t}**; panggilan berbayar A-1 pertama: **${pertama}**. Setelan S1 + pembaca kartu "dicatat" (penebak menolak); kritikus dikunci ke Wafer (\`order\` + \`allow_fallbacks: false\`); mesin yang diperbaiki; pagu jalan US$0,45.`,
    '',
    `Panggilan kritikus A-1: ${String(krit.length)}; penyedia: ${[...new Set(krit.map((x) => String(x.penyedia)))].join(', ') || '—'}; token penalaran: ${krit.map((x) => String(x.token_penalaran)).join(', ') || '—'}.`,
    '',
    ...bagianJalan('m2d10-tirt-a1', '### Jalan TIRT A-1', 'npm run templat:jalan -- --id m2d10-tirt-a1 --pagu 0.45').map((x) => (x.startsWith('### ') && x !== '### Jalan TIRT A-1' ? `#${x}` : x)),
    ...bagianPutusan('penguji-a1').map((x) => (x.startsWith('### ') ? `#${x}` : x)),
  ];
}

export function tulisLaporan(): string {
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  const e = entriLedger();
  const total = e.reduce((a, x) => a + x.biaya_usd, 0);
  const t00 = execFileSync('git', ['log', '--format=%h %cI', '--diff-filter=A', '--', 'docs/bukti/m2d10-praregistrasi.md'], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
  const pertama = e.find((x) => x.tag.startsWith('m2d10/'))?.waktu ?? '—';
  const tangan = existsSync(`${FOLDER_M2D10}/laporan-tangan.md`) ? readFileSync(`${FOLDER_M2D10}/laporan-tangan.md`, 'utf8').replace(/\r\n/g, '\n').trim() : '(belum ditulis)';
  const b: string[] = [
    '# Bukti: mesin penulis "templat" + penyempurna Haiku + penebak keluarga campur (M2d-10)',
    '',
    'Berkas ini ditulis oleh `npm run templat:laporan` dari keluaran mentah (`eval/keluaran-m2d10/`, `eval/penyusun/m2d10-tirt/`) dan ledger OpenRouter (biaya NYATA `usage.cost`, tag `m2d10/` dan `penyusun/m2d10-`). Hanya "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d10/laporan-tangan.md`). Soal DADA/ULTJ yang hidup disebut **soal tayang (Claude + pemilik)**. Tidak ada yang dipasang ke produk.',
    '',
    '## Pra-registrasi (D-0)',
    '',
    `\`docs/bukti/m2d10-praregistrasi.md\` di-commit **${t00}**; panggilan berbayar M2d-10 pertama di ledger: **${pertama}**. Berkas itu dan pra-registrasi M2d-7 dites tidak berubah sejak commit masing-masing (\`templat/praregistrasi.test.ts\`).`,
    '',
    ...bagianTemplat(paket),
    ...bagianKalibrasi(),
    ...bagianPemanasan(),
    ...bagianJalan(),
    ...bagianPutusan(),
    ...bagianTambahan(),
    ...bagianA1(),
    '## Biaya NYATA M2d-10 (OpenRouter, `usage.cost`)',
    '',
    `Entri ledger bertag \`m2d10/\` + \`penyusun/m2d10-\`: **${usd(total)} dalam ${String(e.length)} panggilan**, dari pagu milestone US$${PAGU_MILESTONE_M2D10.toFixed(2)} (ditegakkan kode).`,
    '',
    ...tabelBiaya(e),
    '',
    '## Catatan penulis',
    '',
    tangan,
    '',
  ];
  return b.join('\n');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/templat/tulis-laporan.ts') === true) {
  writeFileSync(JALUR_LAPORAN_M2D10, tulisLaporan(), 'utf8');
  console.log(`ditulis ${JALUR_LAPORAN_M2D10}`);
}
