/**
 * Bank sudut M2d-15 D-2 (pra-registrasi `docs/bukti/m2d15-praregistrasi.md` §5):
 * statistik per SUDUT (= satu `fact_id` kartu penentu) dari berkas tersimpan
 * yang beku, dihitung kode:
 *
 * - jalan TIRT M2d-11 (mesin templat): `eval/penyusun/m2d11-tirt-1…7/hasil.json`;
 * - jalan penulis bebas M2d-13 (Opus, Haiku; DeepSeek tidak punya versi
 *   terbaca): `eval/penyusun/m2d13-{opus,haiku}-{1,2}/hasil.json`;
 * - uji ulang suntingan penyetuju M2d-14 (bukan tulisan penulis):
 *   `alat/penyusun/rekaman/uji-ulang/m2d13-opus-2/*.json`;
 * - audit Opus satu soal tanpa kartu: M2d-11 (`satu-soal/nilai.json`, hanya
 *   TIRT-7) dan M2d-13 (`audit-opus/nilai.json`).
 *
 * Butir dengan dua kartu penentu dihitung di keduanya (`penentu_ganda`).
 *
 * Label (pra-registrasi §5, urutan menentukan):
 * 1. **gagal** — Opus tanpa kartu Σk/Σn ≥ 0,75 dengan Σn ≥ 4, ATAU sampai
 *    tebak rotasi ≥ 2 kali dan semuanya tertebak penebak;
 * 2. **terbukti** — lulus semua gerbang ≥ 1 kali DAN Opus Σk/Σn ≤ 0,5 DAN
 *    (amandemen A1, docs/bukti/m2d15-amandemen-A1.md) tertebak penebak /
 *    sampai rotasi ≤ 0,5;
 * 3. **campuran** — dicoba, selain di atas;
 * 4. **belum dicoba** — tanpa versi.
 *
 * Prompt penulis v2 hanya menerima NAMA sudut (`fact_id`), deskripsi dari
 * paket (asal, tanggal terbit, jenis), statistik, dan label — tidak pernah
 * teks soal (dites: tidak ada potongan 5 kata dari versi yang lulus).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { tanggalId } from '../../format.ts';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';

export type SumberBank = 'm2d11' | 'm2d13' | 'm2d14';
export type LabelSudut = 'terbukti' | 'campuran' | 'gagal' | 'belum dicoba';

/** Satu versi omongan yang pernah diperiksa gerbang. */
export interface VersiBank {
  sumber: SumberBank;
  /** Id jalan (mis. `m2d13-opus-2`). */
  jalan: string;
  no: number;
  versi: number;
  kartu_penentu: string[];
  /** Gerbang tempat berhenti (`lolos` = lulus semua gerbang). */
  berhenti: string;
}

/** Satu butir audit Opus satu soal tanpa kartu (4 rotasi). */
export interface AuditBank {
  sumber: SumberBank;
  jalan: string;
  no: number;
  versi: number | null;
  kartu_penentu: string[];
  k: number;
  n: number;
}

export interface HitunganSudut {
  dicoba: number;
  sampai_rotasi: number;
  tertebak_penebak: number;
  ditolak_kode: number;
  ditolak_kartu: number;
  ditolak_kritikus: number;
  tulis_gagal: number;
  lulus: number;
}

export interface StatSudut {
  fact_id: string;
  deskripsi: string;
  per_sumber: Record<SumberBank, HitunganSudut>;
  total: HitunganSudut;
  opus: { k: number; n: number; butir: number };
  /** Versi/butir yang punya dua kartu penentu (dihitung juga di sudut lain). */
  penentu_ganda: number;
  label: LabelSudut;
}

export const SUMBER_BANK: readonly SumberBank[] = ['m2d11', 'm2d13', 'm2d14'];
export const JALAN_M2D11 = ['m2d11-tirt-1', 'm2d11-tirt-2', 'm2d11-tirt-3', 'm2d11-tirt-4', 'm2d11-tirt-5', 'm2d11-tirt-6', 'm2d11-tirt-7'] as const;
export const JALAN_M2D13 = ['m2d13-opus-1', 'm2d13-opus-2', 'm2d13-haiku-1', 'm2d13-haiku-2'] as const;
export const FOLDER_M2D14 = 'alat/penyusun/rekaman/uji-ulang/m2d13-opus-2';
/** Ambang label (pra-registrasi §5 + amandemen A1: terbukti juga butuh tertebak penebak ≤ 0,5 dari yang sampai rotasi). */
export const AMBANG_LABEL = { gagalOpus: 0.75, gagalOpusMinN: 4, gagalRotasiMin: 2, terbuktiOpus: 0.5, terbuktiTertebak: 0.5 } as const;

const nol = (): HitunganSudut => ({ dicoba: 0, sampai_rotasi: 0, tertebak_penebak: 0, ditolak_kode: 0, ditolak_kartu: 0, ditolak_kritikus: 0, tulis_gagal: 0, lulus: 0 });

function tambah(h: HitunganSudut, berhenti: string): void {
  h.dicoba += 1;
  if (berhenti === 'kode') h.ditolak_kode += 1;
  else if (berhenti === 'tulis-gagal') h.tulis_gagal += 1;
  else {
    h.sampai_rotasi += 1;
    if (berhenti === 'penebak') h.tertebak_penebak += 1;
    else if (berhenti === 'kartu') h.ditolak_kartu += 1;
    else if (berhenti === 'kritikus') h.ditolak_kritikus += 1;
    else if (berhenti === 'lolos') h.lulus += 1;
  }
}

/** Label menurut aturan pra-registrasi §5. Murni. */
export function labelSudut(total: HitunganSudut, opus: { k: number; n: number }): LabelSudut {
  if (total.dicoba === 0) return 'belum dicoba';
  const laju = opus.n === 0 ? null : opus.k / opus.n;
  if (laju !== null && opus.n >= AMBANG_LABEL.gagalOpusMinN && laju >= AMBANG_LABEL.gagalOpus) return 'gagal';
  if (total.sampai_rotasi >= AMBANG_LABEL.gagalRotasiMin && total.tertebak_penebak === total.sampai_rotasi) return 'gagal';
  const tertebak = total.sampai_rotasi === 0 ? null : total.tertebak_penebak / total.sampai_rotasi;
  if (total.lulus >= 1 && laju !== null && laju <= AMBANG_LABEL.terbuktiOpus && tertebak !== null && tertebak <= AMBANG_LABEL.terbuktiTertebak) return 'terbukti';
  return 'campuran';
}

/** Deskripsi sudut dari paket saja (asal, tanggal terbit, jenis). Murni. */
export function deskripsiSudut(paket: Pick<PaketFakta, 'fakta' | 'tanggal_t'>, factId: string): string {
  const f = paket.fakta.find((x) => x.fact_id === factId);
  if (f === undefined) return '(fakta tidak ada di paket)';
  const hari = f.terbit === paket.tanggal_t ? ' (hari simulasi)' : '';
  return `${f.jenis === 'hitungan' ? 'hitungan' : 'dokumen'} — ${f.asal}, terbit ${tanggalId(f.terbit)}${hari}`;
}

/** Statistik per sudut untuk SEMUA fakta paket. Murni. */
export function hitungBank(paket: Pick<PaketFakta, 'fakta' | 'tanggal_t'>, versi: readonly VersiBank[], audit: readonly AuditBank[]): StatSudut[] {
  return paket.fakta.map((f) => {
    const id = f.fact_id;
    const per = { m2d11: nol(), m2d13: nol(), m2d14: nol() } as Record<SumberBank, HitunganSudut>;
    const total = nol();
    let ganda = 0;
    for (const v of versi) {
      if (!v.kartu_penentu.includes(id)) continue;
      tambah(per[v.sumber], v.berhenti);
      tambah(total, v.berhenti);
      if (v.kartu_penentu.length > 1) ganda += 1;
    }
    const opus = { k: 0, n: 0, butir: 0 };
    for (const a of audit) {
      if (!a.kartu_penentu.includes(id)) continue;
      opus.k += a.k;
      opus.n += a.n;
      opus.butir += 1;
      if (a.kartu_penentu.length > 1) ganda += 1;
    }
    return { fact_id: id, deskripsi: deskripsiSudut(paket, id), per_sumber: per, total, opus, penentu_ganda: ganda, label: labelSudut(total, opus) };
  });
}

/* ---------------------------------------------------------------------- */
/* pembacaan berkas tersimpan (beku)                                       */
/* ---------------------------------------------------------------------- */

interface VersiTersimpan {
  no: number;
  versi: number;
  berhenti: string;
  omongan: { kartu_penentu?: string[] } | null;
}

const baca = <T>(jalur: string): T => JSON.parse(readFileSync(jalur, 'utf8')) as T;

/** Versi + audit dari berkas tersimpan (beku, pra-registrasi §5). */
export function bacaSumberBank(akar: string = AKAR): { versi: VersiBank[]; audit: AuditBank[]; berkas: string[] } {
  const versi: VersiBank[] = [];
  const audit: AuditBank[] = [];
  const berkas: string[] = [];
  const penentu = new Map<string, string[]>();
  for (const [sumber, daftar] of [['m2d11', JALAN_M2D11], ['m2d13', JALAN_M2D13]] as const) {
    for (const jalan of daftar) {
      const j = `eval/penyusun/${jalan}/hasil.json`;
      berkas.push(j);
      const h = baca<{ versi: VersiTersimpan[] }>(`${akar}${j}`);
      for (const v of h.versi) {
        const kp = v.omongan?.kartu_penentu ?? [];
        versi.push({ sumber, jalan, no: v.no, versi: v.versi, kartu_penentu: [...kp], berhenti: v.berhenti });
        penentu.set(`${jalan}|${String(v.no)}|${String(v.versi)}`, [...kp]);
      }
    }
  }
  const f14 = `${akar}${FOLDER_M2D14}`;
  if (existsSync(f14)) {
    for (const nama of readdirSync(f14).filter((x) => x.endsWith('.json')).sort()) {
      berkas.push(`${FOLDER_M2D14}/${nama}`);
      const u = baca<{ jalan: string; omongan: number; ke: number; omongan_diuji: { kartu_penentu: string[] }; hasil: { berhenti: string; lolos: boolean } }>(`${f14}/${nama}`);
      versi.push({ sumber: 'm2d14', jalan: `${u.jalan} (suntingan penyetuju)`, no: u.omongan, versi: u.ke, kartu_penentu: [...u.omongan_diuji.kartu_penentu], berhenti: u.hasil.lolos ? 'lolos' : u.hasil.berhenti });
    }
  }
  // audit M2d-11: hanya TIRT-7 (paket yang sama); penentu dari draf terbit.
  const a11 = 'eval/keluaran-m2d11/audit-opus/satu-soal/nilai.json';
  berkas.push(a11);
  const tirt7 = baca<{ draf: { omongan: Array<{ kartu_penentu: string[] }> } }>(`${akar}eval/penyusun/m2d11-tirt-7/hasil.json`);
  for (const s of baca<{ per_soal: Array<{ id: string; tanpa_kartu_benar: number; n: number }> }>(`${akar}${a11}`).per_soal) {
    const m = /^m2d11-tirt-7-o(\d)$/.exec(s.id);
    if (m === null) continue;
    const no = Number(m[1]);
    audit.push({ sumber: 'm2d11', jalan: 'm2d11-tirt-7', no, versi: null, kartu_penentu: [...(tirt7.draf.omongan[no - 1]?.kartu_penentu ?? [])], k: s.tanpa_kartu_benar, n: s.n });
  }
  const a13 = 'eval/keluaran-m2d13/audit-opus/nilai.json';
  berkas.push(a13);
  for (const b of baca<{ per_butir: Array<{ jalan: string; no: number; versi: number; tanpa_kartu_benar: number; n: number }> }>(`${akar}${a13}`).per_butir) {
    const kp = penentu.get(`${b.jalan}|${String(b.no)}|${String(b.versi)}`);
    if (kp === undefined) throw new Error(`audit M2d-13 ${b.jalan} o${String(b.no)} v${String(b.versi)} tidak ada di hasil.json`);
    audit.push({ sumber: 'm2d13', jalan: b.jalan, no: b.no, versi: b.versi, kartu_penentu: kp, k: b.tanpa_kartu_benar, n: b.n });
  }
  return { versi, audit, berkas };
}

/** Bank sudut beku untuk paket ini. */
export function bankSudut(paket: Pick<PaketFakta, 'fakta' | 'tanggal_t'>, akar: string = AKAR): StatSudut[] {
  const s = bacaSumberBank(akar);
  return hitungBank(paket, s.versi, s.audit);
}

/* ---------------------------------------------------------------------- */
/* teks untuk prompt penulis v2                                            */
/* ---------------------------------------------------------------------- */

const LABEL_TEKS: Readonly<Record<LabelSudut, string>> = { terbukti: 'TERBUKTI', campuran: 'CAMPURAN', gagal: 'GAGAL', 'belum dicoba': 'BELUM DICOBA' };
const URUT_LABEL: readonly LabelSudut[] = ['terbukti', 'campuran', 'gagal', 'belum dicoba'];

/**
 * Bank sebagai teks prompt: hanya nama, deskripsi, statistik, label. Murni.
 * Tidak menerima teks soal sama sekali (tipe masukannya tidak memuatnya).
 */
export function teksBank(bank: readonly StatSudut[]): string {
  const baris: string[] = [];
  for (const lab of URUT_LABEL.filter((l) => l !== 'belum dicoba')) {
    for (const s of bank.filter((x) => x.label === lab)) {
      const t = s.total;
      const opus = s.opus.n === 0 ? 'belum diaudit' : `${String(s.opus.k)}/${String(s.opus.n)} rotasi`;
      baris.push(
        `- ${s.fact_id} [${LABEL_TEKS[lab]}] — ${s.deskripsi}. Dicoba ${String(t.dicoba)} versi; ditolak aturan kode ${String(t.ditolak_kode)}; sampai uji tebak ${String(t.sampai_rotasi)}, tertebak tanpa kartu ${String(t.tertebak_penebak)}; ditolak pembaca kartu ${String(t.ditolak_kartu)}; ditolak kritikus ${String(t.ditolak_kritikus)}; lulus semua gerbang ${String(t.lulus)}. Auditor kuat tanpa kartu memilih kunci: ${opus}.${s.penentu_ganda > 0 ? ` (${String(s.penentu_ganda)} di antaranya berkartu penentu ganda.)` : ''}`,
      );
    }
  }
  const belum = bank.filter((x) => x.label === 'belum dicoba');
  if (belum.length > 0) baris.push(`- BELUM DICOBA sebagai kartu penentu: ${belum.map((s) => `${s.fact_id} (${s.deskripsi})`).join('; ')}.`);
  return baris.join('\n');
}
