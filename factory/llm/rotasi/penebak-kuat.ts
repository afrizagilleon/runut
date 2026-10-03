/**
 * Penebak kuat satu-soal (M2d-16 D-3) — jalur gerbang berbayar BARU. Tidak
 * dijalankan di M2d-16; diuji dengan pemanggil palsu.
 *
 * Opus 5.5, effort "low", SATU soal per panggilan, 4 rotasi, tanpa kartu,
 * prompt SAMA dengan penebak rotasi kondisi pesan+pilihan (`pesanRotasi`).
 * Tolak bila isi kunci dipilih di ≥ 3 rotasi terbaca. Jawaban tak terbaca
 * dibuang (bukan dihitung kunci); ≥ 2 dari 4 tak terbaca (> 1/3) → tak-terukur.
 *
 * Dasar: audit Opus satu-soal tersimpan (M2d-13 + M2d-15, 15 butir): Opus
 * konsisten memilih KUNCI di 10 butir, konsisten memilih satu PENGECOH di 3,
 * tak konsisten di 2 — sinyalnya jauh di atas kebetulan (aturan lama penebak
 * murah: 44 % plasebo ditolak). `auditOpusTersimpan` menghitungnya dari berkas.
 *
 * Urutan gerbang baru (mesin v3): kode → saringan murah v2 → pembaca kartu
 * r0+r2 → penebak kuat → kritikus GLM.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import type { SetelanPanggil } from '../susun.ts';
import { uraiKeluaran } from '../susun.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { HURUF_ROTASI, normalTeks, pesanRotasi, putar, ROTASI, uraiSalinan, type JawabanRotasi } from './rotasi.ts';
import { BATAS_TAK_TERBACA, petakanSalinanV2, type PutusanSaringan } from './rotasi-v2.ts';

/** Isi kunci dipilih di ≥ sebanyak ini rotasi terbaca → tolak. */
export const KUAT_MIN_KUNCI = 3;

/**
 * Opus 5.5: berpikir selalu aktif dan adaptif; `effort` satu-satunya pengatur
 * (panduan resmi). `max_tokens` 128.000 = maksimum model, bukan pembatas
 * praktis (keputusan pemilik 3 Okt: jangan batasi token Opus). Suhu 1 (syarat
 * model saat berpikir). `exclude: false` = minta teks berpikir (ringkasan).
 */
export const SETELAN_PENEBAK_KUAT: SetelanPanggil = { suhu: 1, maxTokens: 128_000, tambahanBadan: { reasoning: { effort: 'low', exclude: false } } };

export interface PutusanKuat {
  putusan: PutusanSaringan;
  kunci: number;
  /** Rotasi terbaca. */
  n: number;
  tak_terbaca: number;
  /** Isi (indeks asal) yang dipilih ≥ 3 rotasi, bila ada — kunci ATAU pengecoh (catatan). */
  isi_konsisten: number | null;
  alasan: string;
}

/** Putusan penebak kuat atas jawaban 4 rotasi satu soal. Murni. */
export function putusanKuat(jawaban: readonly JawabanRotasi[]): PutusanKuat {
  const terbaca = jawaban.filter((x) => x.isi !== null);
  const tak = jawaban.length - terbaca.length;
  const kunci = terbaca.filter((x) => x.isi === x.isi_kunci).length;
  const hit = new Map<number, number>();
  for (const x of terbaca) hit.set(x.isi as number, (hit.get(x.isi as number) ?? 0) + 1);
  const isiK = [...hit].find(([, n]) => n >= KUAT_MIN_KUNCI)?.[0] ?? null;
  const dasar = { kunci, n: terbaca.length, tak_terbaca: tak, isi_konsisten: isiK };
  if (jawaban.length === 0 || tak > jawaban.length * BATAS_TAK_TERBACA + 1e-9) {
    return { ...dasar, putusan: 'tak-terukur', alasan: `penebak kuat: ${String(tak)} dari ${String(jawaban.length)} jawaban tak terbaca (lebih dari sepertiga) — tak terukur` };
  }
  const tolak = kunci >= KUAT_MIN_KUNCI;
  return {
    ...dasar,
    putusan: tolak ? 'tolak' : 'lulus',
    alasan: `penebak kuat (tanpa kartu, pilihan diputar): memilih isi kunci di ${String(kunci)} dari ${String(terbaca.length)} rotasi terbaca${tolak ? ' — jawabannya bisa ditebak tanpa membaca kartu' : ''}${tak > 0 ? `; ${String(tak)} tak terbaca dibuang` : ''}`,
  };
}

export interface HasilTebakKuat {
  jawaban: JawabanRotasi[];
  putusan: PutusanKuat;
  biaya_usd: number;
}

/** 4 panggilan Opus berurutan (satu soal per panggilan); tak terbaca diulang sekali. */
export async function tebakKuat(o: OmonganDraf, opsi: { panggil: PanggilTemplat; putaran: number; omongan: number }): Promise<HasilTebakKuat> {
  const isiKunci = HURUF_ROTASI.indexOf(o.kunci);
  const jawaban: JawabanRotasi[] = [];
  for (const r of ROTASI) {
    const p = putar(o, r);
    const pesan = pesanRotasi('pesan-pilihan', { nama: o.nama, jam: o.jam, pesan: o.pesan, pilihan: p.pilihan });
    let biaya = 0;
    let panggilan = 0;
    let jawab: Omit<JawabanRotasi, 'biaya_usd' | 'panggilan'> | null = null;
    let terakhir = '';
    for (let ulang = 0; ulang < 2 && jawab === null; ulang++) {
      const j = await opsi.panggil(pesan, SETELAN_PENEBAK_KUAT, { jenis: 'gerbang-tebak-kuat', putaran: opsi.putaran, omongan: opsi.omongan, ke: r + 1, ...(ulang > 0 ? { ulang } : {}), peran: 'penebak', model: MODEL_OR_OPUS });
      biaya += j.biaya_usd;
      panggilan += 1;
      terakhir = j.teks;
      const u = uraiSalinan(j.teks);
      if (u === null) continue;
      const peta = petakanSalinanV2(u.teks, p.pilihan);
      if (peta.huruf === null) continue;
      jawab = { model: MODEL_OR_OPUS, kondisi: 'pesan-pilihan', r, huruf: peta.huruf, isi: p.asal[peta.huruf], isi_kunci: isiKunci, terbaca: true, salinan: u.teks, skor: peta.skor, alasan: u.alasan };
    }
    jawaban.push({
      ...(jawab ?? { model: MODEL_OR_OPUS, kondisi: 'pesan-pilihan' as const, r, huruf: null, isi: null, isi_kunci: isiKunci, terbaca: false, salinan: terakhir.slice(0, 300), skor: null, alasan: '(tak terbaca/tak terpetakan)' }),
      biaya_usd: biaya,
      panggilan,
    });
  }
  return { jawaban, putusan: putusanKuat(jawaban), biaya_usd: jawaban.reduce((a, x) => a + x.biaya_usd, 0) };
}

/* ---------------------------------------------------------------------- */
/* audit Opus satu-soal tersimpan                                          */
/* ---------------------------------------------------------------------- */

export const FOLDER_AUDIT_OPUS_TERSIMPAN = ['eval/keluaran-m2d13/audit-opus', 'eval/keluaran-m2d15/audit-opus'] as const;

export interface ButirAuditOpus {
  sumber: string;
  id: string;
  /** Per rotasi: indeks isi (0 = kunci; 1…3 = pengecoh menurut teks) atau null. */
  isi: Array<number | null>;
  jawaban: JawabanRotasi[];
  kelas: 'kunci' | 'pengecoh' | 'tak-konsisten';
}

interface KunciSatuSoal {
  berkas: Array<{ nama: string; r: number; soal: Array<{ id: string; kunci: KunciOpsi; pilihan: Record<KunciOpsi, string> }> }>;
}

/**
 * Baca audit Opus satu-soal tersimpan (`kunci.json` + `jawaban/*.txt`): tiap
 * butir × 4 rotasi → isi yang dipilih (dikenali dari TEKS opsi, jadi sama di
 * semua rotasi). Isi 0 = kunci.
 */
export function auditOpusTersimpan(akar: string, folder: readonly string[] = FOLDER_AUDIT_OPUS_TERSIMPAN): ButirAuditOpus[] {
  const hasil: ButirAuditOpus[] = [];
  for (const f of folder) {
    const jalur = `${akar}${f}/kunci.json`;
    if (!existsSync(jalur)) continue;
    const kunci = JSON.parse(readFileSync(jalur, 'utf8')) as KunciSatuSoal;
    const per = new Map<string, { teks: string[]; isi: Array<number | null> }>();
    for (const b of [...kunci.berkas].sort((x, y) => x.r - y.r)) {
      const s = b.soal[0];
      if (s === undefined) continue;
      const x = per.get(s.id) ?? { teks: [normalTeks(s.pilihan[s.kunci])], isi: [] };
      const jj = `${akar}${f}/jawaban/${b.nama}.txt`;
      let huruf: KunciOpsi | null = null;
      if (existsSync(jj)) {
        const u = uraiKeluaran(readFileSync(jj, 'utf8'));
        const d = (u.ok ? (u.nilai as { jawaban?: Array<Record<string, unknown>> } | null) : null)?.jawaban?.[0];
        if (d !== undefined) {
          if (typeof d['teks'] === 'string') huruf = petakanSalinanV2(d['teks'], s.pilihan).huruf;
          const h = typeof d['pilihan'] === 'string' ? d['pilihan'].trim().toLowerCase() : '';
          if (huruf === null && (HURUF_ROTASI as readonly string[]).includes(h)) huruf = h as KunciOpsi;
        }
      }
      if (huruf === null) x.isi.push(null);
      else {
        const t = normalTeks(s.pilihan[huruf]);
        if (!x.teks.includes(t)) x.teks.push(t);
        x.isi.push(x.teks.indexOf(t));
      }
      per.set(s.id, x);
    }
    for (const [id, x] of [...per].sort(([a], [b]) => a.localeCompare(b))) {
      const jawaban: JawabanRotasi[] = x.isi.map((isi, r) => ({ model: 'opus (subagent audit)', kondisi: 'pesan-pilihan', r, huruf: null, isi, isi_kunci: 0, terbaca: isi !== null, salinan: null, skor: null, alasan: '', biaya_usd: 0, panggilan: 1 }));
      const p = putusanKuat(jawaban);
      hasil.push({ sumber: f, id, isi: x.isi, jawaban, kelas: p.isi_konsisten === null ? 'tak-konsisten' : p.isi_konsisten === 0 ? 'kunci' : 'pengecoh' });
    }
  }
  return hasil;
}

export function ringkasAuditOpus(butir: readonly ButirAuditOpus[]): { n: number; kunci: number; pengecoh: number; tak_konsisten: number } {
  const n = (k: ButirAuditOpus['kelas']): number => butir.filter((b) => b.kelas === k).length;
  return { n: butir.length, kunci: n('kunci'), pengecoh: n('pengecoh'), tak_konsisten: n('tak-konsisten') };
}

/** Plasebo: tiap pengecoh (isi 1…3) diperlakukan sebagai kunci → berapa yang ditolak penebak kuat. Murni. */
export function plaseboOpus(butir: readonly ButirAuditOpus[]): { n: number; ditolak: number } {
  let n = 0;
  let ditolak = 0;
  for (const b of butir) {
    for (const alt of [1, 2, 3]) {
      n += 1;
      if (putusanKuat(b.jawaban.map((x) => ({ ...x, isi_kunci: alt }))).putusan === 'tolak') ditolak += 1;
    }
  }
  return { n, ditolak };
}
