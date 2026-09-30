/**
 * `npm run kalibrasi:penguji -- <--bahan | --terbaik>` / tanpa argumen —
 * uji luar + putusan mekanis jalan TIRT M2d-8 terhadap pra-registrasi M2d-7
 * (`docs/bukti/m2d7-praregistrasi.md`, TIDAK diubah), dan draf terbaik untuk
 * penyetuju (pra-registrasi M2d-8 §8).
 *
 * - `--bahan`: bahan uji luar (`eval/keluaran-m2d8/penguji/`: tebak.md,
 *   kartu.md, alami.md, kunci.json) dari omongan yang dikunci jalan M2d-8 —
 *   prosedur M2d-7 persis (`bangunBahanTirt`, benih tetap, petunjuk kartu
 *   pra-registrasi M2d-7). Tanpa omongan yang dikunci: tidak ada bahan,
 *   putusan tetap diturunkan (TIDAK, syarat (a)).
 * - tanpa argumen: baca jawaban mentah penguji (`penguji/jawaban/`) →
 *   `putusanTayang` (kode M2d-7) → `putusan.json`.
 * - `--terbaik`: draf terbaik per posisi omongan (`drafTerbaik`) →
 *   `draf-terbaik.json` + `draf-terbaik.md`. Tidak disunting.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { HasilPengecoh, PemeriksaanPengecoh } from './agen-pengecoh.ts';
import type { OmonganDraf } from './draf.ts';
import { FOLDER_M2D8 } from './kalibrasi-konfig.ts';
import { FOLDER_JALAN_M2D8, FOLDER_TIRT_M2D8 } from './kalibrasi-susun.ts';
import { FOLDER_M2D6 } from './penalar-susun.ts';
import { PETUNJUK_KARTU_M2D7, bacaJawaban, putusanTayang, type JawabKartu, type JawabTebak, type OmonganUji } from './pengecoh-putusan.ts';
import { PETUNJUK_KARTU_M2D5, bangunBahanTirt, type KunciPengujiM2d5, type OpsiBahanTirt } from './tirt-penguji.ts';
import { FOLDER_M2D5 } from './tirt-susun.ts';

export const FOLDER_PENGUJI_M2D8 = `${FOLDER_M2D8}/penguji`;
export const BENIH_M2D8 = 20261004;

export const opsiBahanM2d8 = (): OpsiBahanTirt => ({
  benih: BENIH_M2D8,
  label: 'agen-m2d8',
  pembanding: [[`${FOLDER_M2D6}/jalan-1`, 'agen-m2d6'], [FOLDER_M2D5, 'agen-m2d5']],
});

/** Bahan uji luar M2d-8: prosedur M2d-7 persis (petunjuk kartu = pra-registrasi M2d-7). */
export function bangunBahanM2d8(folder: string = FOLDER_JALAN_M2D8): { tebak: string; kartu: string; alami: string; kunci: KunciPengujiM2d5 } {
  const b = bangunBahanTirt(folder, opsiBahanM2d8());
  if (!b.kartu.startsWith(PETUNJUK_KARTU_M2D5)) throw new Error('bahan kartu tidak diawali petunjuk M2d-5');
  return { tebak: b.tebak, kartu: PETUNJUK_KARTU_M2D7 + b.kartu.slice(PETUNJUK_KARTU_M2D5.length), alami: b.alami, kunci: b.kunci };
}

/* ---------------------------------------------------------------------- */
/* draf terbaik (pra-registrasi §8)                                        */
/* ---------------------------------------------------------------------- */

/** Tahap terjauh di urutan tumpukan: kode 0 → artefak 1 → pilihan-saja 2 → pembaca kartu 3 → kritikus 4 → penebak 5 → dikunci 6. */
export function tahap(e: Pick<PemeriksaanPengecoh, 'status' | 'umpan_terarah'>): number | null {
  switch (e.status) {
    case 'lolos':
      return 6;
    case 'ditolak-tebak':
      return 5;
    case 'ditolak-kritikus':
    case 'kritikus-tidak-menjawab':
      return 4;
    case 'ditolak-kartu':
      return 3;
    case 'ditolak-artefak':
      return 2;
    case 'ditolak-pemeriksa': {
      const u = e.umpan_terarah ?? [];
      return u.length > 0 && u.every((x) => x.sumber.startsWith('gerbang artefak:')) ? 1 : 0;
    }
    default:
      return null;
  }
}

export const NAMA_TAHAP = ['kode', 'artefak (meresmikan/keseimbangan)', 'pilihan-saja', 'pembaca kartu', 'kritikus', 'penebak', 'dikunci'] as const;

export interface DrafTerbaik {
  no: number;
  putaran: number;
  status: string;
  tahap: number;
  tahap_nama: string;
  butir_penolakan: number;
  umpan: string[];
  dicatat: Array<{ sumber: string; alasan: string }>;
  omongan: OmonganDraf;
}

/** Per posisi: versi dikunci; selain itu tahap terjauh → butir penolakan paling sedikit → putaran paling akhir. Murni. */
export function drafTerbaik(h: Pick<HasilPengecoh, 'riwayat'>): DrafTerbaik[] {
  const hasil: DrafTerbaik[] = [];
  for (const no of [1, 2, 3]) {
    let terbaik: DrafTerbaik | null = null;
    for (const r of h.riwayat) {
      const e = r.omongan.find((x) => x.no === no) as PemeriksaanPengecoh | undefined;
      const o = r.draf[no - 1];
      if (e === undefined || o === null || o === undefined) continue;
      const t = tahap(e);
      if (t === null) continue;
      const calon: DrafTerbaik = {
        no, putaran: r.putaran, status: e.status, tahap: t, tahap_nama: NAMA_TAHAP[t] ?? '?', butir_penolakan: (e.umpan_terarah ?? []).length || e.umpan.length,
        umpan: e.umpan, dicatat: e.dicatat ?? [], omongan: o,
      };
      if (e.status === 'lolos') calon.butir_penolakan = 0;
      if (terbaik === null || calon.tahap > terbaik.tahap || (calon.tahap === terbaik.tahap && (calon.butir_penolakan < terbaik.butir_penolakan || (calon.butir_penolakan === terbaik.butir_penolakan && calon.putaran > terbaik.putaran)))) terbaik = calon;
    }
    if (terbaik !== null) hasil.push(terbaik);
  }
  return hasil;
}

export function mdDrafTerbaik(d: readonly DrafTerbaik[]): string {
  const b: string[] = ['# Draf terbaik jalan TIRT M2d-8 (untuk penyetuju; tidak disunting)', '', 'Aturan (pra-registrasi M2d-8 §8): per posisi omongan, versi yang dikunci; bila tidak ada, versi yang sampai paling jauh di urutan tumpukan (kode → artefak → pilihan-saja → pembaca kartu → kritikus → penebak), seri → butir penolakan paling sedikit → putaran paling akhir.', ''];
  for (const x of d) {
    const o = x.omongan;
    b.push(`## Omongan ${String(x.no)} — putaran ${String(x.putaran)}, ${x.status} (tahap terjauh: ${x.tahap_nama})`, '');
    b.push(`> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`, '');
    for (const h of ['a', 'b', 'c', 'd'] as const) b.push(`- ${h === o.kunci ? '**' : ''}${h}) ${teksPolos(o.pilihan[h])}${h === o.kunci ? '** (kunci)' : ''}`);
    b.push('', `Kartu: ${o.kartu.map((k) => `\`${k}\`${o.kartu_penentu.includes(k) ? ' (penentu)' : ''}`).join(', ')}`, '', `Penjelasan: ${teksPolos(o.penjelasan)}`, '');
    if (x.umpan.length > 0) b.push('Alasan ditolak:', ...x.umpan.map((u) => `- ${u.slice(0, 400)}`), '');
    if (x.dicatat.length > 0) b.push('Dicatat (gerbang yang diturunkan, tidak menolak):', ...x.dicatat.map((u) => `- ${u.sumber}: ${u.alasan.slice(0, 300)}`), '');
  }
  return b.join('\n') + '\n';
}

/* ---------------------------------------------------------------------- */
/* putusan                                                                  */
/* ---------------------------------------------------------------------- */

export function omonganUjiM2d8(kunci: KunciPengujiM2d5, h: Pick<HasilPengecoh, 'riwayat'>): OmonganUji[] {
  return kunci.tebak
    .map((t) => {
      const k = kunci.kartu.find((x) => x.no === t.no);
      const o = h.riwayat.find((r) => r.putaran === t.putaran)?.draf[t.no - 1];
      if (k === undefined || o === null || o === undefined) throw new Error(`omongan ${String(t.no)} tidak lengkap`);
      return { no: t.no, kunci: t.kunci, id_tebak: t.id, id_kartu: k.id, penentu: k.penentu, omongan: o };
    })
    .sort((a, b) => a.no - b.no);
}

function bacaHasil(): HasilPengecoh & { lolos: boolean } {
  return JSON.parse(readFileSync(`${FOLDER_TIRT_M2D8}/riwayat.json`, 'utf8')) as HasilPengecoh;
}

function utama(argumen: string[]): number {
  if (!existsSync(`${FOLDER_TIRT_M2D8}/riwayat.json`)) {
    console.error('Jalan TIRT M2d-8 belum ada.');
    return 1;
  }
  const h = bacaHasil();
  mkdirSync(FOLDER_PENGUJI_M2D8, { recursive: true });
  if (argumen.includes('--terbaik')) {
    const d = drafTerbaik(h);
    writeFileSync(`${FOLDER_PENGUJI_M2D8}/draf-terbaik.json`, JSON.stringify(d, null, 2) + '\n', 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D8}/draf-terbaik.md`, mdDrafTerbaik(d), 'utf8');
    for (const x of d) console.log(`omongan ${String(x.no)}: putaran ${String(x.putaran)} ${x.status} (${x.tahap_nama}), ${String(x.butir_penolakan)} butir`);
    return 0;
  }
  if (argumen.includes('--bahan')) {
    const b = bangunBahanM2d8();
    if (b.kunci.tebak.length === 0) {
      const p = putusanTayang(h.lolos, [], [], []);
      writeFileSync(`${FOLDER_PENGUJI_M2D8}/putusan.json`, JSON.stringify({ catatan: 'jalan M2d-8 tidak mengunci satu omongan pun: tidak ada bahan uji luar', ...p }, null, 2) + '\n', 'utf8');
      console.log(`Tidak ada omongan yang dikunci — bahan uji luar tidak ditulis. PUTUSAN: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'} ((a) terbit: ${String(p.a_terbit)}).`);
      return 0;
    }
    mkdirSync(`${FOLDER_PENGUJI_M2D8}/jawaban`, { recursive: true });
    writeFileSync(`${FOLDER_PENGUJI_M2D8}/tebak.md`, b.tebak, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D8}/kartu.md`, b.kartu, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D8}/alami.md`, b.alami, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D8}/kunci.json`, JSON.stringify({ ...b.kunci, terbit: h.lolos }, null, 2) + '\n', 'utf8');
    console.log(`${h.lolos ? 'terbit' : 'tidak terbit'} — ${String(b.kunci.tebak.length)} omongan dikunci; ${String(b.kunci.alami.length)} kelompok kealamian.`);
    return 0;
  }
  const kunci = JSON.parse(readFileSync(`${FOLDER_PENGUJI_M2D8}/kunci.json`, 'utf8')) as KunciPengujiM2d5 & { terbit: boolean };
  const uji = omonganUjiM2d8(kunci, h);
  const folder = `${FOLDER_PENGUJI_M2D8}/jawaban`;
  const tebak = [1, 2, 3].map((n) => bacaJawaban<JawabTebak>('tebak', n, folder));
  const kartu = [1, 2, 3].map((n) => bacaJawaban<JawabKartu>('kartu', n, folder));
  const p = putusanTayang(kunci.terbit, uji, tebak, kartu);
  writeFileSync(`${FOLDER_PENGUJI_M2D8}/putusan.json`, JSON.stringify(p, null, 2) + '\n', 'utf8');
  console.log(`(a) terbit: ${String(p.a_terbit)}; (b) ${String(p.b_tebak.lolos)}/${String(p.b_tebak.total)}: ${String(p.b_tebak.terpenuhi)}; (c) ${String(p.c_kartu.lolos)}/${String(p.c_kartu.total)}: ${String(p.c_kartu.terpenuhi)}; (d) ${String(p.d_makna.masalah)}: ${String(p.d_makna.terpenuhi)}`);
  console.log(`PUTUSAN: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}`);
  return 0;
}

if (/(^|[\\/])kalibrasi-penguji\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama(process.argv.slice(2));
