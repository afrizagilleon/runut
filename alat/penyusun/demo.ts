/**
 * Mode demo pintu penyusun (M2d-14 D-1):
 * `npm run penyusun -- --demo eval/penyusun/<jalan> --draf akhir --suntingan <berkas> [--pagu-uji-ulang 0.15]`.
 *
 * Satu alur penuh dalam satu halaman:
 * - tahap 1–4 HIDUP tanpa biaya model (kode → usulan hari dari cache gudang →
 *   33 aturan → paket fakta → perkiraan biaya) lewat jalur yang sama dengan
 *   jalan biasa (`alur.ts`); paket hidup harus SAMA PERSIS (sha256) dengan
 *   paket jalan rekaman, selain itu demo menolak;
 * - klik setuju → tahap agen = TAYANG ULANG log jalan nyata `<jalan>` (baris
 *   log apa adanya, `tayang-ulang.ts`), dengan penanda rekaman dan kalimat
 *   transisi di layar;
 * - panel penyetuju HIDUP pada draf terpilih: tiap suntingan dicatat (dari →
 *   ke), gerbang KODE diuji ulang langsung (gratis), gerbang AI diuji ulang
 *   sungguhan HANYA dengan `--pagu-uji-ulang` (maks US$0,15, biaya nyata
 *   ledger, ditegakkan `PencatatBiaya` sebelum setiap panggilan). Hasil uji
 *   ulang sungguhan disimpan (`rekaman/uji-ulang/<jalan>/<sha>.jsonl`) dan
 *   diputar lagi tanpa panggilan untuk rekaman video berikutnya — dengan
 *   label "diputar dari uji ulang nyata <waktu>";
 * - "Setujui" hanya bila setiap omongan lolos semua gerbang untuk teksnya
 *   yang sekarang; menulis SATU berkas `eval/penyusun/<jalan>/persetujuan-demo.json`
 *   (bukan `cases/`).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { periksaKodeBebas } from '../../factory/llm/bebas/mesin.ts';
import { drafDari, HURUF, type OmonganBebas, type PengecohBebas } from '../../factory/llm/bebas/skema.ts';
import type { KunciOpsi } from '../../factory/llm/draf.ts';
import { validasiM2d8 } from '../../factory/llm/kalibrasi-soal.ts';
import { umpanKritik } from '../../factory/llm/kritikus.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from '../../factory/llm/model.ts';
import { PaguTercapai } from '../../factory/llm/pagu.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { kartuRotasi, tebakRotasi } from '../../factory/llm/rotasi/jalan.ts';
import { kritikusMakna, kritikusMenolakTemplat } from '../../factory/llm/templat/gerbang.ts';
import { SETELAN_TEMPLAT_M2D11 } from '../../factory/llm/templat/m2d11.ts';
import type { PanggilTemplat } from '../../factory/llm/templat/penulis.ts';
import { Aliran } from './aliran.ts';
import { biayaAwalan } from './biaya.ts';
import type { HasilMesin, HasilUjiUlang, MesinPenulis, PerkiraanBiaya } from './mesin.ts';
import { barisLog, bacaRekaman, jadwalTayang, RUMUS_JEDA, type Rekaman } from './tayang-ulang.ts';

/** Pagu uji ulang gerbang AI paling besar yang boleh diminta (isian reviewer M2d-14). */
export const PAGU_UJI_ULANG_MAKS_USD = 0.15;
/** Semua panggilan uji ulang demo bertag awalan ini (pagu milestone sendiri; tidak masuk laporan M2d-13). */
export const AWALAN_TAG_DEMO = 'm2d14/';
/**
 * Amandemen teknis M2d-14: `max_tokens` kritikus saat uji ulang demo. Setelan
 * kritikus M2d-11 (≈ 40.000) membuat perkiraan maksimum SATU panggilan
 * ≈ US$0,185 > pagu uji ulang US$0,15, jadi kritikus tidak akan pernah
 * dikirim. 16.000 = 1,7× token keluar terbesar kritikus di jalan ini
 * (9.166); effort, ambang penalaran, prompt, dan penyedia tetap.
 */
export const MAKS_TOKEN_KRITIKUS_DEMO = 16_000;
/**
 * Tempo putar mode demo: rumus jeda M2d-12 dengan batas lebih pendek supaya
 * alur penuh muat ≤ 150 d. Setiap jeda tetap diumumkan di layar
 * ("Dipercepat ×N: jeda asli …, diputar …").
 */
export const RUMUS_JEDA_DEMO = { ...RUMUS_JEDA, MIN_MS: 550, BATAS_MS: 1_250 } as const;
/** Folder hasil uji ulang sungguhan yang disimpan (diputar ulang tanpa panggilan). */
export const FOLDER_SIMPAN_BAWAAN = fileURLToPath(new URL('./rekaman/uji-ulang/', import.meta.url));

export type LokasiDemo = 'pesan' | 'pilihan-a' | 'pilihan-b' | 'pilihan-c' | 'pilihan-d' | 'penjelasan' | 'umpan-balik-a' | 'umpan-balik-b' | 'umpan-balik-c' | 'umpan-balik-d';
export const LOKASI_DEMO: readonly LokasiDemo[] = ['pesan', 'pilihan-a', 'pilihan-b', 'pilihan-c', 'pilihan-d', 'penjelasan', 'umpan-balik-a', 'umpan-balik-b', 'umpan-balik-c', 'umpan-balik-d'];

export interface UbahTeks {
  omongan: number;
  lokasi: LokasiDemo;
  teks: string;
}
export interface UbahTukar {
  omongan: number;
  /** Tukar isi dua pilihan (teks + label pengecoh); huruf kunci ikut pindah. */
  tukar: [KunciOpsi, KunciOpsi];
}
export type Ubah = UbahTeks | UbahTukar;

export interface PutaranSuntingan {
  ke: number;
  oleh: string;
  alasan: string;
  ubah: Ubah[];
}

export interface BerkasSuntingan {
  keterangan?: string;
  jalan: string;
  draf: string;
  penyetuju: string;
  putaran: PutaranSuntingan[];
}

export class GalatDemo extends Error {
  readonly status: number;
  constructor(status: number, pesan: string) {
    super(pesan);
    this.name = 'GalatDemo';
    this.status = status;
  }
}

const adalahTukar = (u: Ubah): u is UbahTukar => 'tukar' in u;

/** Kunci JSON diurutkan supaya sidik tidak bergantung pada urutan pembuatan objek. Murni. */
export function jsonKanonik(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonKanonik).join(',')}]`;
  if (x !== null && typeof x === 'object') {
    return `{${Object.keys(x as Record<string, unknown>)
      .sort()
      .filter((k) => (x as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${jsonKanonik((x as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x);
}

export const sha256 = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
/** Sidik satu omongan (teks + kartu + label + kunci): kunci hasil uji ulang tersimpan. */
export const sidikOmongan = (o: OmonganBebas): string => sha256(jsonKanonik(o));

/* ---------------------------------------------------------------------- */
/* berkas suntingan penyetuju                                              */
/* ---------------------------------------------------------------------- */

export function uraiBerkasSuntingan(x: unknown): BerkasSuntingan {
  const o = x as Partial<BerkasSuntingan> | null;
  if (o === null || typeof o !== 'object') throw new GalatDemo(400, 'Berkas suntingan bukan objek JSON.');
  if (typeof o.jalan !== 'string' || typeof o.draf !== 'string' || typeof o.penyetuju !== 'string' || !Array.isArray(o.putaran)) {
    throw new GalatDemo(400, 'Berkas suntingan wajib berisi jalan, draf, penyetuju, dan putaran[].');
  }
  o.putaran.forEach((p, i) => {
    if (p.ke !== i + 1) throw new GalatDemo(400, `Putaran suntingan ke-${String(i + 1)} bernomor ${String(p.ke)}.`);
    if (typeof p.oleh !== 'string' || typeof p.alasan !== 'string' || !Array.isArray(p.ubah) || p.ubah.length === 0) throw new GalatDemo(400, `Putaran ${String(p.ke)}: oleh, alasan, ubah[] wajib.`);
    for (const u of p.ubah) {
      if (!Number.isInteger(u.omongan) || u.omongan < 1 || u.omongan > 3) throw new GalatDemo(400, `Putaran ${String(p.ke)}: nomor omongan harus 1–3.`);
      if (adalahTukar(u)) {
        if (!Array.isArray(u.tukar) || u.tukar.length !== 2 || !u.tukar.every((h) => (HURUF as readonly string[]).includes(h)) || u.tukar[0] === u.tukar[1]) {
          throw new GalatDemo(400, `Putaran ${String(p.ke)}: tukar harus dua huruf a–d yang berbeda.`);
        }
      } else if (!(LOKASI_DEMO as readonly string[]).includes(u.lokasi) || typeof u.teks !== 'string' || u.teks.trim() === '') {
        throw new GalatDemo(400, `Putaran ${String(p.ke)}: lokasi/teks suntingan tidak sah.`);
      }
    }
  });
  return o as BerkasSuntingan;
}

export function muatBerkasSuntingan(jalur: string): BerkasSuntingan {
  if (!existsSync(jalur)) throw new GalatDemo(400, `Berkas suntingan ${jalur} tidak ada.`);
  return uraiBerkasSuntingan(JSON.parse(readFileSync(jalur, 'utf8')) as unknown);
}

/* ---------------------------------------------------------------------- */
/* draf terpilih dari hasil.json jalan                                     */
/* ---------------------------------------------------------------------- */

interface VersiTersimpan {
  no: number;
  versi: number;
  berhenti: string;
  alasan: string[];
  omongan: OmonganBebas | null;
}

export interface OmonganTerpilih {
  no: number;
  versi: number;
  /** Lolos semua gerbang di jalan aslinya. */
  lulus_jalan: boolean;
  berhenti: string;
  alasan: string[];
  omongan: OmonganBebas;
}

/**
 * `akhir` = versi terakhir yang terbaca tiap omongan (`hasil.json` → `akhir`);
 * atau daftar eksplisit `o1v2,o2v2,o3v2`. Murni terhadap isi berkas.
 */
export function drafTerpilih(folderJalan: string, pilih: string): OmonganTerpilih[] {
  const jalur = join(folderJalan, 'hasil.json');
  if (!existsSync(jalur)) throw new GalatDemo(400, `Tidak ada ${jalur}; mode demo butuh hasil.json jalan mesin bebas.`);
  const h = JSON.parse(readFileSync(jalur, 'utf8')) as { versi?: VersiTersimpan[]; akhir?: Array<{ no: number; versi: number; lulus: boolean; omongan: OmonganBebas } | null> };
  const versi = h.versi ?? [];
  const cari = (no: number, v: number): VersiTersimpan | undefined => versi.find((x) => x.no === no && x.versi === v && x.omongan !== null);
  let pasangan: Array<[number, number]>;
  if (pilih === 'akhir') {
    pasangan = [1, 2, 3].map((no) => {
      const a = h.akhir?.[no - 1];
      if (a === null || a === undefined) throw new GalatDemo(400, `Omongan ${String(no)} tidak punya versi terbaca di ${jalur}.`);
      return [no, a.versi];
    });
  } else {
    const m = /^o1v(\d+),o2v(\d+),o3v(\d+)$/.exec(pilih);
    if (m === null) throw new GalatDemo(400, '--draf harus "akhir" atau "o1v<n>,o2v<n>,o3v<n>".');
    pasangan = [1, 2, 3].map((no) => [no, Number(m[no])]);
  }
  return pasangan.map(([no, v]) => {
    const x = cari(no, v);
    if (x === undefined || x.omongan === null) throw new GalatDemo(400, `Omongan ${String(no)} versi ${String(v)} tidak ada di ${jalur}.`);
    return { no, versi: v, lulus_jalan: x.berhenti === 'lolos', berhenti: x.berhenti, alasan: x.alasan, omongan: x.omongan };
  });
}

/* ---------------------------------------------------------------------- */
/* suntingan: terapkan dan catat                                           */
/* ---------------------------------------------------------------------- */

export function teksLokasi(o: OmonganBebas, lokasi: LokasiDemo): string {
  if (lokasi === 'pesan') return o.pesan;
  if (lokasi === 'penjelasan') return o.penjelasan;
  const h = lokasi.slice(-1) as KunciOpsi;
  if (lokasi.startsWith('pilihan-')) return o.pilihan[h];
  return o.pengecoh[h]?.umpan_balik ?? '';
}

export interface HasilTerapkan {
  baru: OmonganBebas;
  lokasi: string;
  dari: string;
  ke: string;
  catatan: string[];
}

/** Terapkan satu suntingan ke salinan omongan. Murni. */
export function terapkanUbah(o: OmonganBebas, u: Ubah): HasilTerapkan {
  const baru: OmonganBebas = structuredClone(o);
  const catatan: string[] = [];
  if (adalahTukar(u)) {
    const [x, y] = u.tukar;
    baru.pilihan = { ...o.pilihan, [x]: o.pilihan[y], [y]: o.pilihan[x] };
    const p: Partial<Record<KunciOpsi, PengecohBebas>> = { ...o.pengecoh };
    const px = o.pengecoh[x];
    const py = o.pengecoh[y];
    delete p[x];
    delete p[y];
    if (py !== undefined) p[x] = py;
    if (px !== undefined) p[y] = px;
    baru.pengecoh = p;
    if (o.kunci === x) baru.kunci = y;
    else if (o.kunci === y) baru.kunci = x;
    catatan.push(`isi pilihan ${x} dan ${y} ditukar beserta label pengecohnya; kunci ${o.kunci} → ${baru.kunci}`);
    return { baru, lokasi: `tukar ${x} ↔ ${y}`, dari: `kunci ${o.kunci}`, ke: `kunci ${baru.kunci}`, catatan };
  }
  const t = u.teks.trim();
  const dari = teksLokasi(o, u.lokasi);
  if (t === dari) throw new GalatDemo(400, 'Tidak ada yang berubah.');
  if (t.length > 600) throw new GalatDemo(400, 'Teks terlalu panjang.');
  const h = u.lokasi.slice(-1) as KunciOpsi;
  if (u.lokasi === 'pesan') {
    baru.pesan = t;
    const tetap = o.angka_pesan.filter((a) => t.includes(a.teks));
    const buang = o.angka_pesan.filter((a) => !t.includes(a.teks));
    baru.angka_pesan = tetap;
    if (buang.length > 0) catatan.push(`angka pesan ${buang.map((a) => a.teks).join(', ')} dilepas dari daftar angka_pesan karena tidak tertulis lagi di pesan`);
  } else if (u.lokasi === 'penjelasan') baru.penjelasan = t;
  else if (u.lokasi.startsWith('pilihan-')) baru.pilihan = { ...o.pilihan, [h]: t };
  else {
    const p = o.pengecoh[h];
    if (p === undefined) throw new GalatDemo(400, `Pilihan ${h} tidak punya label pengecoh (huruf kunci).`);
    baru.pengecoh = { ...o.pengecoh, [h]: { ...p, umpan_balik: t } };
  }
  return { baru, lokasi: u.lokasi, dari, ke: t, catatan };
}

/* ---------------------------------------------------------------------- */
/* gerbang kode (gratis, langsung)                                         */
/* ---------------------------------------------------------------------- */

/** Yang diperiksa gerbang kode — sama dengan langkah 1 mesin bebas + validator seluruh draf. */
export const DAFTAR_GERBANG_KODE: readonly string[] = [
  'validator draf',
  'gerbang G (satu klausa, angka cukup, panjang)',
  'gaya, huruf pilihan, kembar, penilaian, mirip, artefak',
  'kalender (A-2)',
  'detektor D1–D9',
  'angka/tanggal harus di kartu omongan ini',
  'label pengecoh dan umpan balik',
  'sudut berbeda, anti-salin',
  'validator seluruh draf (tiga omongan)',
];

export interface HasilKode {
  lolos: boolean;
  menolak: Array<{ sumber: string; alasan: string }>;
  dicatat: Array<{ sumber: string; alasan: string }>;
  seluruh_draf: string[];
  diperiksa: readonly string[];
}

/**
 * Gerbang kode untuk omongan `no` di draf tiga omongan: `periksaKodeBebas`
 * (sama persis dengan langkah 1 mesin bebas M2d-13) + validator seluruh draf
 * (di mesin bebas dijalankan sesudah ketiganya lolos; di sini lebih dulu
 * karena gratis — urutan tidak mengubah putusan). Murni.
 */
export function gerbangKodeDemo(no: number, draf: readonly OmonganBebas[], paket: PaketFakta, lulusLain: ReadonlySet<number>): HasilKode {
  const o = draf[no - 1];
  if (o === undefined) throw new GalatDemo(404, 'Omongan tidak ada.');
  const k = periksaKodeBebas(no, o, paket, draf, lulusLain);
  const seluruh = validasiM2d8({ omongan: draf.map((x) => drafDari(x)) }, paket)
    .filter((m) => m.omongan === null)
    .map((m) => `[${m.kode}] ${m.pesan}`);
  return { lolos: k.menolak.length === 0 && seluruh.length === 0, menolak: k.menolak, dicatat: k.dicatat, seluruh_draf: seluruh, diperiksa: DAFTAR_GERBANG_KODE };
}

/* ---------------------------------------------------------------------- */
/* gerbang AI (berbayar, berpagu)                                          */
/* ---------------------------------------------------------------------- */

export type BerhentiAi = 'lolos' | 'penebak' | 'kartu' | 'kritikus' | 'pagu' | 'galat';

export interface HasilAi {
  lolos: boolean;
  berhenti: BerhentiAi;
  alasan: string[];
  biaya_usd: number;
  panggilan: number;
}

export type LaporUji = (judul: string, isi: Record<string, unknown>) => void;

const jumlah = <T>(x: readonly T[], f: (y: T) => number): number => x.reduce((a, y) => a + f(y), 0);

/** Bungkus pemanggil: kritikus memakai `MAKS_TOKEN_KRITIKUS_DEMO` (amandemen teknis); yang lain apa adanya. */
export function bungkusKritikusDemo(p: PanggilTemplat): PanggilTemplat {
  return (pesan, setelan, info) => p(pesan, info.jenis === 'kritikus' ? { ...setelan, maxTokens: Math.min(setelan.maxTokens, MAKS_TOKEN_KRITIKUS_DEMO) } : setelan, info);
}

/**
 * Gerbang AI untuk satu omongan, urutan & putusan SAMA dengan langkah 2–4
 * mesin bebas (`factory/llm/bebas/mesin.ts`): tebak rotasi tanpa kartu →
 * pembaca kartu r0+r2 → kritikus GLM (tidak menjawab → sekali lagi). Berhenti
 * di gerbang pertama yang menolak. `PaguTercapai` → berhenti "pagu" (panggilan
 * itu tidak dikirim).
 */
export async function ujiGerbangAi(o: OmonganBebas, paket: PaketFakta, no: number, ke: number, panggil: PanggilTemplat, lapor: LaporUji): Promise<HasilAi> {
  const d = drafDari(o);
  let total = 0;
  let panggilan = 0;
  const kirim = (peran: string, apa: string, putusan: 'lolos' | 'tolak', alasan: string, model: string, n: number, biaya: number): void => {
    total += biaya;
    panggilan += n;
    lapor(`uji ulang ${String(ke)} · omongan ${String(no)} · ${peran}: ${apa} → ${putusan === 'lolos' ? 'lolos' : 'TOLAK'}${alasan === '' ? '' : ` — ${alasan.length > 160 ? `${alasan.slice(0, 159)}…` : alasan}`}`, {
      ke, omongan: no, peran, putusan, alasan: alasan === '' ? [] : [alasan.length > 600 ? `${alasan.slice(0, 599)}…` : alasan], model, panggilan: n, biaya_usd: Math.round(biaya * 1e6) / 1e6, total_usd: Math.round(total * 1e6) / 1e6,
    });
  };
  const hasil = (berhenti: BerhentiAi, alasan: string[]): HasilAi => ({ lolos: berhenti === 'lolos', berhenti, alasan, biaya_usd: Math.round(total * 1e6) / 1e6, panggilan });
  try {
    // 2. tebak rotasi
    const tr = await tebakRotasi(d, { panggil, putaran: ke, omongan: no });
    const pr = tr.putusan;
    const ringkasIsi = (['pilihan-saja', 'pesan-pilihan'] as const)
      .map((kd) => `${kd}: ${pr.kondisi[kd].per_model.map((m) => `${m.model.split('/')[1] ?? m.model} isi ${m.isi_konsisten === null ? '-' : `opsi asal ${'abcd'[m.isi_konsisten] ?? '?'}`}${m.diabaikan ? ' (diabaikan)' : ''}`).join(', ')}`)
      .join('; ');
    const alasanR = `tebak rotasi ${pr.putusan}: ${pr.alasan.join('; ')} [${ringkasIsi}] — kunci = pilihan ${d.kunci}`;
    kirim('penebak', 'tebak tanpa kartu', pr.putusan === 'lulus' ? 'lolos' : 'tolak', alasanR, 'haiku + deepseek + glm (rotasi)', jumlah(tr.jawaban, (x) => x.panggilan), tr.biaya_usd);
    if (pr.putusan !== 'lulus') return hasil('penebak', [`${alasanR}; tanpa kartu, penebak memilih isi kunci terlalu sering`]);
    // 3. pembaca kartu r0 + r2
    const kr2 = await kartuRotasi(d, paket, { panggil, putaran: ke, omongan: no });
    const alasanK = kr2.per_rotasi.map((x) => `r${String(x.r)}: memilih ${String(x.pilihan)} (kunci ${x.kunci})${x.benar ? '' : ` — ${x.alasan}`}`).join('; ');
    kirim('pembaca kartu', 'jawab dengan kartu', kr2.lulus ? 'lolos' : 'tolak', `pembaca kartu 2 rotasi: ${alasanK}`, MODEL_OR_DEEPSEEK, jumlah(kr2.per_rotasi, (x) => x.putusan.panggilan.length), jumlah(kr2.per_rotasi, (x) => x.biaya_usd));
    if (!kr2.lulus) return hasil('kartu', [`pembaca yang memegang kartu tidak memilih kunci di kedua rotasi (pilihan diputar): ${alasanK}`]);
    // 4. kritikus GLM
    const kartu0 = kr2.per_rotasi[0]?.putusan ?? null;
    let kr = await kritikusMakna(d, paket, kartu0, panggil, ke, no);
    if (!kr.menjawab) {
      const ulang = await kritikusMakna(d, paket, kartu0, panggil, ke, no);
      kr = { ...ulang, panggilan: [...kr.panggilan, ...ulang.panggilan] };
    }
    const tolakR = kritikusMenolakTemplat(kr, SETELAN_TEMPLAT_M2D11.kritikus);
    const umpan = kr.tanpa_keberatan ? ['kritikus tidak keberatan'] : umpanKritik(kr);
    kirim('kritikus', 'kritikus makna', tolakR ? 'tolak' : 'lolos', umpan[0] ?? '', MODEL_OR_GLM, kr.panggilan.length, jumlah(kr.panggilan, (x) => x.biaya_usd));
    if (tolakR) return hasil('kritikus', kr.menjawab ? umpanKritik(kr) : ['kritikus tidak menjawab (dua kali)']);
    return hasil('lolos', []);
  } catch (galat) {
    const teks = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
    lapor(`uji ulang ${String(ke)} · omongan ${String(no)} · berhenti: ${galat instanceof PaguTercapai ? 'pagu uji ulang' : 'galat'} → TOLAK — ${teks.slice(0, 160)}`, {
      ke, omongan: no, peran: 'pagu', putusan: 'tolak', alasan: [teks], model: null, panggilan: 0, biaya_usd: 0, total_usd: Math.round(total * 1e6) / 1e6,
    });
    return hasil(galat instanceof PaguTercapai ? 'pagu' : 'galat', [teks]);
  }
}

/* ---------------------------------------------------------------------- */
/* simpanan uji ulang sungguhan                                            */
/* ---------------------------------------------------------------------- */

export interface RingkasUjiTersimpan {
  keterangan: string;
  jalan: string;
  omongan: number;
  sidik: string;
  omongan_diuji: OmonganBebas;
  ke: number;
  tag: string;
  waktu_mulai: string;
  waktu_selesai: string;
  pagu_usd: number;
  setelan: { kritikus_max_tokens: number; catatan: string };
  hasil: HasilAi;
  /** Jumlah biaya entri ledger bertag `tag` sesudah selesai (usage.cost). */
  biaya_ledger_usd: number;
  berkas_log: string;
}

export function jalurSimpan(folderSimpan: string, jalan: string, sidik: string): { log: string; ringkas: string } {
  const d = join(folderSimpan, jalan);
  return { log: join(d, `${sidik.slice(0, 16)}.jsonl`), ringkas: join(d, `${sidik.slice(0, 16)}.json`) };
}

export function bacaSimpanan(folderSimpan: string, jalan: string, sidik: string): RingkasUjiTersimpan | null {
  const j = jalurSimpan(folderSimpan, jalan, sidik);
  if (!existsSync(j.ringkas) || !existsSync(j.log)) return null;
  const r = JSON.parse(readFileSync(j.ringkas, 'utf8')) as RingkasUjiTersimpan;
  return r.sidik === sidik ? r : null;
}

/** Rekaman (untuk `putarRekaman`) dari log uji ulang tersimpan: baris apa adanya. */
export function rekamanUji(jalurLog: string, id: string): Rekaman {
  const baris = barisLog(readFileSync(jalurLog, 'utf8'));
  const peristiwa = baris.map((b) => JSON.parse(b) as Rekaman['peristiwa'][number]);
  return { id, folder: dirname(jalurLog), folderInduk: dirname(dirname(jalurLog)), baris, peristiwa, jadwal: jadwalTayang(peristiwa, RUMUS_JEDA_DEMO), berkas: { keadaan: false, hasil: false, jejak: false, paket: false } };
}

/* ---------------------------------------------------------------------- */
/* mesin pengganti untuk tahap 1–4 hidup                                   */
/* ---------------------------------------------------------------------- */

/**
 * Mesin demo: perkiraan biaya = perkiraan yang tercatat di jalan rekaman
 * (mesin & setelan sama); paket hidup harus sama persis dengan paket jalan
 * rekaman; agen TIDAK PERNAH dijalankan (klik setuju memutar log).
 */
export function mesinDemo(keadaanRekaman: { mesin?: { nama?: string; keterangan?: string } | null; perkiraan?: PerkiraanBiaya | null }, shaPaketRekaman: string, shaPaket: (p: PaketFakta) => string, idRekaman: string): MesinPenulis {
  const tolak = (): Promise<never> => Promise.reject(new Error('mode demo: agen tidak dijalankan; bagian agen diputar dari log jalan rekaman'));
  const perkiraan = keadaanRekaman.perkiraan;
  if (perkiraan === null || perkiraan === undefined) throw new GalatDemo(400, 'keadaan.json jalan rekaman tidak memuat perkiraan biaya.');
  return {
    nama: keadaanRekaman.mesin?.nama ?? 'rekaman',
    keterangan: keadaanRekaman.mesin?.keterangan ?? 'mesin jalan rekaman',
    palsu: false,
    siap: () => ({ siap: true, alasan: null }),
    perkiraan: () => perkiraan,
    cukupPaket: (p: PaketFakta) => {
      const sama = shaPaket(p) === shaPaketRekaman;
      return { cukup: sama, jumlah: sama ? p.fakta.length : 0, satuan: sama ? `fakta (paket sama persis dengan jalan ${idRekaman})` : `fakta — paket ini tidak sama dengan paket jalan ${idRekaman}; mode demo hanya bisa memutar jalan itu` };
    },
    jalankan: (): Promise<HasilMesin> => tolak(),
    perkiraanUjiUlang: () => 0,
    ujiUlang: (): Promise<HasilUjiUlang> => tolak(),
  };
}

/* ---------------------------------------------------------------------- */
/* keadaan demo                                                            */
/* ---------------------------------------------------------------------- */

export interface CatatanSuntingDemo {
  ke: number;
  putaran: number | null;
  /** Sama persis dengan suntingan berikutnya di berkas penyetuju? */
  sesuai_berkas: boolean;
  omongan: number;
  lokasi: string;
  dari: string;
  ke_teks: string;
  catatan: string[];
  waktu: string;
}

export interface UjiUlangDemo {
  ke: number;
  omongan: number;
  sidik: string;
  /** "langsung" = panggilan sungguhan sekarang; "tersimpan" = hasil uji ulang sungguhan sebelumnya, diputar tanpa panggilan. */
  sumber: 'langsung' | 'tersimpan';
  selesai: boolean;
  hasil: HasilAi | null;
  biaya_ledger_usd: number | null;
  waktu_uji: string;
  tag: string;
  berkas_log: string;
}

export interface StatusOmongan {
  no: number;
  versi_jalan: number;
  lulus_jalan: boolean;
  berhenti_jalan: string;
  alasan_jalan: string[];
  disunting: boolean;
  /** Sidik teks omongan SEKARANG (untuk membedakan hasil uji ulang teks lama). */
  sidik: string;
  kode: HasilKode | null;
  /** Hasil gerbang AI untuk teks SEKARANG (sidik sama), bila ada. */
  ai: HasilAi | null;
  lolos_sekarang: boolean;
  keterangan: string;
}

export interface OpsiDemo {
  akar: string;
  folderJalan: string;
  pilihDraf: string;
  jalurSuntingan: string;
  /** null = tanpa pagu: gerbang AI tidak diuji ulang (kecuali hasil tersimpan). */
  paguUjiUlangUsd: number | null;
  jam: () => Date;
  log: (b: string) => void;
  folderSimpan?: string;
  /** Pembuat pemanggil sungguhan (awalan tag, pagu) — hanya dipakai bila ada pagu. */
  buatPanggil?: (awalanTag: string, paguUsd: number) => PanggilTemplat;
}

const rel = (akar: string, jalur: string): string => {
  const r = relative(akar, jalur);
  return r.startsWith('..') || isAbsolute(r) ? jalur.split(/[\\/]/).slice(-3).join('/') : r.split(sep).join('/');
};

export class Demo {
  readonly o: OpsiDemo;
  readonly rekaman: Rekaman;
  readonly id: string;
  readonly paket: PaketFakta;
  readonly keadaanRekaman: Record<string, unknown>;
  readonly terpilih: OmonganTerpilih[];
  readonly berkas: BerkasSuntingan;
  readonly folderSimpan: string;
  draf: OmonganBebas[];
  disunting = new Set<number>();
  suntingan: CatatanSuntingDemo[] = [];
  kode = new Map<number, HasilKode>();
  ujiUlang: UjiUlangDemo[] = [];
  /** Aliran uji ulang yang sedang/terakhir berjalan (langsung) atau rekaman tersimpan yang diputar. */
  aliranUji: { jenis: 'langsung'; aliran: Aliran } | { jenis: 'tersimpan'; rekaman: Rekaman } | null = null;
  sibuk = false;
  putusan: { putusan: 'disetujui' | 'ditolak'; alasan: string | null; waktu: string; berkas: string } | null = null;

  constructor(o: OpsiDemo) {
    this.o = o;
    const r = bacaRekaman(o.folderJalan);
    this.rekaman = { ...r, jadwal: jadwalTayang(r.peristiwa, RUMUS_JEDA_DEMO) };
    this.id = this.rekaman.id;
    const jalurPaket = join(this.rekaman.folder, 'paket.json');
    const jalurKeadaan = join(this.rekaman.folder, 'keadaan.json');
    if (!existsSync(jalurPaket) || !existsSync(jalurKeadaan)) throw new GalatDemo(400, 'Mode demo butuh paket.json dan keadaan.json jalan rekaman.');
    this.paket = JSON.parse(readFileSync(jalurPaket, 'utf8')) as PaketFakta;
    this.keadaanRekaman = JSON.parse(readFileSync(jalurKeadaan, 'utf8')) as Record<string, unknown>;
    this.terpilih = drafTerpilih(this.rekaman.folder, o.pilihDraf);
    this.berkas = muatBerkasSuntingan(o.jalurSuntingan);
    if (this.berkas.jalan !== this.id) throw new GalatDemo(400, `Berkas suntingan untuk jalan ${this.berkas.jalan}, bukan ${this.id}.`);
    if (this.berkas.draf !== o.pilihDraf) throw new GalatDemo(400, `Berkas suntingan untuk draf "${this.berkas.draf}", bukan "${o.pilihDraf}".`);
    if (o.paguUjiUlangUsd !== null && !(o.paguUjiUlangUsd > 0 && o.paguUjiUlangUsd <= PAGU_UJI_ULANG_MAKS_USD)) {
      throw new GalatDemo(400, `--pagu-uji-ulang harus > 0 dan ≤ US$${PAGU_UJI_ULANG_MAKS_USD.toFixed(2)}.`);
    }
    this.folderSimpan = o.folderSimpan ?? FOLDER_SIMPAN_BAWAAN;
    this.draf = this.terpilih.map((t) => structuredClone(t.omongan));
  }

  /** Urutan suntingan di berkas, rata (putaran, ubah). */
  private urutanBerkas(): Array<{ putaran: number; ubah: Ubah }> {
    return this.berkas.putaran.flatMap((p) => p.ubah.map((u) => ({ putaran: p.ke, ubah: u })));
  }

  /** Putaran suntingan berkas yang sedang berlaku (suntingan berikutnya), atau null bila semua sudah diterapkan. */
  putaranAktif(): PutaranSuntingan | null {
    const n = this.suntingan.filter((s) => s.sesuai_berkas).length;
    const u = this.urutanBerkas()[n];
    return u === undefined ? null : (this.berkas.putaran[u.putaran - 1] ?? null);
  }

  /** Omongan yang sekarang lolos semua gerbang (untuk G-mirip/sudut omongan lain). */
  private lolosSekarang(no: number): boolean {
    const t = this.terpilih[no - 1];
    if (t === undefined) return false;
    const o = this.draf[no - 1] as OmonganBebas;
    if (!this.disunting.has(no)) return t.lulus_jalan;
    const k = this.kode.get(no);
    const ai = this.aiUntuk(no, o);
    return k !== undefined && k.lolos && ai !== null && ai.lolos;
  }

  private aiUntuk(no: number, o: OmonganBebas): HasilAi | null {
    const s = sidikOmongan(o);
    const u = [...this.ujiUlang].reverse().find((x) => x.omongan === no && x.sidik === s && x.selesai);
    return u?.hasil ?? null;
  }

  sunting(u: Ubah): { catatan: CatatanSuntingDemo; kode: HasilKode } {
    if (this.putusan !== null) throw new GalatDemo(409, 'Draf demo ini sudah diputus penyetuju.');
    if (this.sibuk) throw new GalatDemo(409, 'Uji ulang gerbang AI sedang berjalan; tunggu hasilnya.');
    const o = this.draf[u.omongan - 1];
    if (o === undefined) throw new GalatDemo(404, 'Omongan tidak ada.');
    const t = terapkanUbah(o, u);
    const n = this.suntingan.filter((s) => s.sesuai_berkas).length;
    const harap = this.urutanBerkas()[n];
    const sesuai = harap !== undefined && jsonKanonik({ ...harap.ubah, ...('teks' in harap.ubah ? { teks: harap.ubah.teks.trim() } : {}) }) === jsonKanonik({ ...u, ...('teks' in u ? { teks: u.teks.trim() } : {}) });
    this.draf[u.omongan - 1] = t.baru;
    this.disunting.add(u.omongan);
    const c: CatatanSuntingDemo = {
      ke: this.suntingan.length + 1,
      putaran: sesuai ? (harap?.putaran ?? null) : null,
      sesuai_berkas: sesuai,
      omongan: u.omongan,
      lokasi: t.lokasi,
      dari: t.dari,
      ke_teks: t.ke,
      catatan: t.catatan,
      waktu: this.o.jam().toISOString(),
    };
    this.suntingan.push(c);
    const lulusLain = new Set([1, 2, 3].filter((x) => x !== u.omongan && this.lolosSekarang(x)));
    const kode = gerbangKodeDemo(u.omongan, this.draf, this.paket, lulusLain);
    this.kode.set(u.omongan, kode);
    this.o.log(`demo: suntingan ${String(c.ke)} omongan ${String(u.omongan)} ${t.lokasi} → gerbang kode ${kode.lolos ? 'lolos' : `menolak ${String(kode.menolak.length + kode.seluruh_draf.length)}`}`);
    return { catatan: c, kode };
  }

  /** Omongan yang disunting, lolos gerbang kode, tetapi belum punya hasil gerbang AI untuk teksnya sekarang. */
  perluUjiAi(): number[] {
    return [...this.disunting].sort().filter((no) => this.kode.get(no)?.lolos === true && this.aiUntuk(no, this.draf[no - 1] as OmonganBebas) === null);
  }

  terpakaiUsd(): number {
    return biayaAwalan(this.o.akar, AWALAN_TAG_DEMO);
  }

  /**
   * Mulai uji ulang gerbang AI untuk SATU omongan (yang pertama perlu diuji).
   * Hasil tersimpan untuk sidik yang sama → diputar tanpa panggilan. Selain
   * itu wajib ada pagu (`--pagu-uji-ulang`); tanpa pagu → 409.
   */
  mulaiUjiAi(setuju: unknown): UjiUlangDemo {
    if (this.putusan !== null) throw new GalatDemo(409, 'Draf demo ini sudah diputus penyetuju.');
    if (this.sibuk) throw new GalatDemo(409, 'Uji ulang sedang berjalan.');
    const no = this.perluUjiAi()[0];
    if (no === undefined) {
      const ditolak = [...this.disunting].filter((x) => this.kode.get(x)?.lolos !== true);
      throw new GalatDemo(409, ditolak.length > 0 ? `Gerbang kode masih menolak omongan ${ditolak.join(', ')}; gerbang AI tidak dijalankan sebelum gerbang kode lolos.` : 'Tidak ada suntingan yang perlu diuji ulang gerbang AI.');
    }
    const o = structuredClone(this.draf[no - 1] as OmonganBebas);
    const sidik = sidikOmongan(o);
    const ke = this.ujiUlang.length + 1;
    const simpanan = bacaSimpanan(this.folderSimpan, this.id, sidik);
    if (simpanan !== null) {
      const u: UjiUlangDemo = {
        ke, omongan: no, sidik, sumber: 'tersimpan', selesai: true, hasil: simpanan.hasil, biaya_ledger_usd: simpanan.biaya_ledger_usd,
        waktu_uji: simpanan.waktu_mulai, tag: simpanan.tag, berkas_log: rel(this.o.akar, jalurSimpan(this.folderSimpan, this.id, sidik).log),
      };
      this.ujiUlang.push(u);
      this.aliranUji = { jenis: 'tersimpan', rekaman: rekamanUji(jalurSimpan(this.folderSimpan, this.id, sidik).log, `${this.id}-uji`) };
      this.o.log(`demo: uji ulang ${String(ke)} omongan ${String(no)} → hasil tersimpan ${sidik.slice(0, 16)} (${simpanan.hasil.lolos ? 'lolos' : simpanan.hasil.berhenti}); tanpa panggilan`);
      return u;
    }
    const pagu = this.o.paguUjiUlangUsd;
    if (pagu === null || this.o.buatPanggil === undefined) throw new GalatDemo(409, 'Gerbang AI belum diuji ulang: demo ini berjalan tanpa --pagu-uji-ulang, dan tidak ada hasil uji ulang tersimpan untuk teks ini.');
    if (setuju !== true) throw new GalatDemo(400, `Uji ulang gerbang AI memakai biaya OpenRouter (pagu US$${pagu.toFixed(2)}); setujui di layar dulu.`);
    const tag = `${AWALAN_TAG_DEMO}uji-ulang/${this.id}/${sidik.slice(0, 12)}/`;
    const j = jalurSimpan(this.folderSimpan, this.id, sidik);
    mkdirSync(dirname(j.log), { recursive: true });
    rmSync(j.log, { force: true });
    const aliran = new Aliran(`${this.id}-uji`, j.log, this.o.jam);
    this.aliranUji = { jenis: 'langsung', aliran };
    const u: UjiUlangDemo = { ke, omongan: no, sidik, sumber: 'langsung', selesai: false, hasil: null, biaya_ledger_usd: null, waktu_uji: this.o.jam().toISOString(), tag, berkas_log: rel(this.o.akar, j.log) };
    this.ujiUlang.push(u);
    this.sibuk = true;
    const panggil = bungkusKritikusDemo(this.o.buatPanggil(tag, pagu));
    const mulai = this.o.jam().toISOString();
    void (async () => {
      try {
        const h = await ujiGerbangAi(o, this.paket, no, ke, panggil, (judul, isi) => aliran.kirim('uji-ulang', judul, isi));
        u.hasil = h;
        u.biaya_ledger_usd = biayaAwalan(this.o.akar, tag);
        const ringkas: RingkasUjiTersimpan = {
          keterangan: 'Uji ulang gerbang AI SUNGGUHAN (M2d-14, mode demo) atas satu omongan yang disunting penyetuju. Diputar ulang tanpa panggilan bila teksnya sama (sidik).',
          jalan: this.id, omongan: no, sidik, omongan_diuji: o, ke, tag, waktu_mulai: mulai, waktu_selesai: this.o.jam().toISOString(), pagu_usd: pagu,
          setelan: { kritikus_max_tokens: MAKS_TOKEN_KRITIKUS_DEMO, catatan: 'amandemen teknis M2d-14: max_tokens kritikus diturunkan agar perkiraan maksimum satu panggilan muat di pagu uji ulang; hal lain sama dengan mesin bebas M2d-13' },
          hasil: h, biaya_ledger_usd: u.biaya_ledger_usd, berkas_log: basename(j.log),
        };
        writeFileSync(j.ringkas, `${JSON.stringify(ringkas, null, 2)}\n`, 'utf8');
        this.o.log(`demo: uji ulang ${String(ke)} omongan ${String(no)} → ${h.lolos ? 'LOLOS' : `TIDAK LOLOS (${h.berhenti})`}; biaya ledger US$${(u.biaya_ledger_usd ?? 0).toFixed(6)}`);
      } catch (galat) {
        u.hasil = { lolos: false, berhenti: 'galat', alasan: [galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal'], biaya_usd: 0, panggilan: 0 };
        u.biaya_ledger_usd = biayaAwalan(this.o.akar, tag);
      } finally {
        u.selesai = true;
        this.sibuk = false;
        aliran.tutup();
      }
    })();
    return u;
  }

  statusOmongan(): StatusOmongan[] {
    return this.terpilih.map((t) => {
      const o = this.draf[t.no - 1] as OmonganBebas;
      const disunting = this.disunting.has(t.no);
      const kode = this.kode.get(t.no) ?? null;
      const ai = disunting ? this.aiUntuk(t.no, o) : null;
      const lolos = this.lolosSekarang(t.no);
      let ket: string;
      if (!disunting) ket = t.lulus_jalan ? `lolos semua gerbang di versi ${String(t.versi)} (dari log, tidak disunting)` : `ditolak ${t.berhenti === 'kode' ? 'gerbang kode' : t.berhenti} di versi ${String(t.versi)} (dari log)`;
      else if (kode === null || !kode.lolos) ket = 'disunting; gerbang kode masih menolak';
      else if (ai === null) ket = 'disunting; gerbang kode lolos; gerbang AI belum diuji ulang';
      else ket = ai.lolos ? 'disunting; lolos gerbang kode dan gerbang AI (uji ulang)' : `disunting; gerbang AI menolak (${ai.berhenti})`;
      return { no: t.no, versi_jalan: t.versi, lulus_jalan: t.lulus_jalan, berhenti_jalan: t.berhenti, alasan_jalan: t.alasan, disunting, sidik: sidikOmongan(o), kode, ai, lolos_sekarang: lolos, keterangan: ket };
    });
  }

  /** Validator seluruh draf (tiga omongan sekarang). */
  seluruhDraf(): string[] {
    return validasiM2d8({ omongan: this.draf.map((x) => drafDari(x)) }, this.paket)
      .filter((m) => m.omongan === null)
      .map((m) => `[${m.kode}] ${m.pesan}`);
  }

  boleh(): { boleh: boolean; alasan: string | null } {
    if (this.putusan !== null) return { boleh: false, alasan: 'Sudah diputus penyetuju.' };
    if (this.sibuk) return { boleh: false, alasan: 'Uji ulang gerbang AI sedang berjalan.' };
    const st = this.statusOmongan();
    const belum = st.filter((s) => !s.lolos_sekarang);
    if (belum.length > 0) return { boleh: false, alasan: `Masih ditolak: ${belum.map((s) => `omongan ${String(s.no)} (${s.keterangan})`).join('; ')}.` };
    const seluruh = this.seluruhDraf();
    if (seluruh.length > 0) return { boleh: false, alasan: `Masih ditolak validator seluruh draf: ${seluruh.join('; ')}` };
    return { boleh: true, alasan: null };
  }

  /** Setujui (demo): hanya bila semua lolos; menulis HANYA `<folder jalan>/persetujuan-demo.json`. */
  setujui(): string {
    const b = this.boleh();
    if (!b.boleh) throw new GalatDemo(409, b.alasan ?? 'Belum boleh disetujui.');
    return this.tulisPutusan('disetujui', null);
  }

  /**
   * Tolak (demo): penyetuju mencatat bahwa draf TIDAK disetujui, dengan alasan.
   * Menulis berkas yang sama (`persetujuan-demo.json`, putusan "ditolak").
   */
  tolak(alasan: unknown): string {
    if (this.putusan !== null) throw new GalatDemo(409, 'Draf demo ini sudah diputus penyetuju.');
    if (this.sibuk) throw new GalatDemo(409, 'Uji ulang gerbang AI sedang berjalan; tunggu hasilnya.');
    const a = typeof alasan === 'string' ? alasan.trim() : '';
    if (a.length < 5) throw new GalatDemo(400, 'Tulis alasan penolakan (paling sedikit 5 huruf).');
    return this.tulisPutusan('ditolak', a);
  }

  private tulisPutusan(putusan: 'disetujui' | 'ditolak', alasan: string | null): string {
    const waktu = this.o.jam().toISOString();
    const jalur = join(this.rekaman.folder, 'persetujuan-demo.json');
    const isi = {
      keterangan:
        putusan === 'disetujui'
          ? 'Putusan penyetuju DEMO (M2d-14): DISETUJUI. Draf = versi terpilih jalan agen AI ini + suntingan penyetuju yang lolos uji ulang gerbang yang sama. BUKAN cases/: tidak dipasang ke produk; memasang adalah langkah terpisah dengan izin deploy.'
          : 'Putusan penyetuju DEMO (M2d-14): TIDAK DISETUJUI (ditolak dengan alasan). Draf = versi terpilih jalan agen AI ini + suntingan penyetuju; uji ulang gerbang yang sama masih menolak. BUKAN cases/: tidak dipasang ke produk.',
      mode: 'demo',
      putusan,
      alasan,
      jalan: this.id,
      draf_pilihan: this.o.pilihDraf,
      oleh: { penyetuju: this.berkas.penyetuju, cara: 'suntingan diketik di halaman dari berkas suntingan penyetuju (perekam), lalu tombol putusan', waktu },
      berkas_suntingan: rel(this.o.akar, this.o.jalurSuntingan),
      sha256_berkas_suntingan: sha256(readFileSync(this.o.jalurSuntingan, 'utf8')),
      semua_suntingan_sesuai_berkas: this.suntingan.every((x) => x.sesuai_berkas),
      suntingan: this.suntingan,
      gerbang_kode: Object.fromEntries([...this.kode].map(([no, k]) => [`omongan_${String(no)}`, k])),
      uji_ulang_ai: this.ujiUlang,
      biaya_uji_ulang_ledger_usd: Math.round(this.ujiUlang.reduce((a, u) => a + (u.sumber === 'langsung' ? (u.biaya_ledger_usd ?? 0) : 0), 0) * 1e6) / 1e6,
      biaya_uji_ulang_tersimpan_usd: Math.round(this.ujiUlang.reduce((a, u) => a + (u.sumber === 'tersimpan' ? (u.biaya_ledger_usd ?? 0) : 0), 0) * 1e6) / 1e6,
      status_omongan: this.statusOmongan().map(({ kode: _k, ...x }) => x),
      validator_seluruh_draf: this.seluruhDraf(),
      boleh_disetujui: this.boleh(),
      draf: { omongan: this.draf },
    };
    writeFileSync(jalur, `${JSON.stringify(isi, null, 2)}\n`, 'utf8');
    this.putusan = { putusan, alasan, waktu, berkas: rel(this.o.akar, jalur) };
    this.o.log(`demo: ${putusan} → ${this.putusan.berkas}`);
    return this.putusan.berkas;
  }

  potret(): Record<string, unknown> {
    const aktif = this.putaranAktif();
    return {
      jalan: this.id,
      draf_pilihan: this.o.pilihDraf,
      penyetuju: this.berkas.penyetuju,
      berkas_suntingan: rel(this.o.akar, this.o.jalurSuntingan),
      putaran_berkas: this.berkas.putaran.map((p) => ({ ke: p.ke, oleh: p.oleh, alasan: p.alasan, jumlah_ubah: p.ubah.length })),
      putaran_aktif: aktif === null ? null : { ke: aktif.ke, oleh: aktif.oleh, alasan: aktif.alasan },
      draf: this.draf,
      status_omongan: this.statusOmongan(),
      suntingan: this.suntingan,
      uji_ulang: this.ujiUlang,
      perlu_uji_ai: this.perluUjiAi(),
      sibuk: this.sibuk,
      pagu_uji_ulang_usd: this.o.paguUjiUlangUsd,
      ada_simpanan: this.perluUjiAi().map((no) => ({ omongan: no, ada: bacaSimpanan(this.folderSimpan, this.id, sidikOmongan(this.draf[no - 1] as OmonganBebas)) !== null })),
      seluruh_draf: this.seluruhDraf(),
      boleh: this.boleh(),
      putusan: this.putusan,
      kartu: Object.fromEntries(this.paket.fakta.filter((f) => this.draf.some((o) => o.kartu.includes(f.fact_id))).map((f) => [f.fact_id, { klaim: f.klaim, asal: f.asal, jenis: f.jenis, terbit: f.terbit }])),
    };
  }
}

/** Folder jalan rekaman dari argumen (relatif terhadap akar repo). */
export const folderJalanDemo = (akar: string, arg: string): string => resolve(akar, arg);
