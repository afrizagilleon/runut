/**
 * Gerbang tebak buta di dalam lingkar agen (M2d-2 D-1).
 *
 * Pertanyaannya: bisakah omongan ini dijawab benar TANPA membaca kartu? Kalau
 * bisa, soalnya tidak melatih apa pun — pemain cukup menebak dari nada pesan
 * dan bentuk pilihan. M2d-1 mengukurnya sesudah jadi (hanya 3 dari 24 omongan
 * draf lolos); di sini ia menjadi gerbang yang menolak draf sebelum selesai.
 *
 * Yang dijaga, dan kenapa:
 *
 * - **Penebak tidak pernah menerima kartu, fakta, kunci, atau penjelasan.**
 *   `soalTebak()` menyalin EMPAT medan satu per satu (nama, jam, pesan,
 *   pilihan) — tidak ada spread dari omongan draf, jadi medan baru di draf
 *   tidak bisa ikut terbawa diam-diam. Tesnya memeriksa isi pesan yang
 *   benar-benar dikirim.
 * - **Tiga tebakan independen**: tiap tebakan percakapan baru (pesan sistem +
 *   satu pesan pengguna), bukan kelanjutan percakapan penyusun maupun tebakan
 *   sebelumnya. Suhu 1,0 supaya ketiganya memang sampel yang berbeda.
 * - **Kriteria K-05 persis sama dengan laporan M2d-1** (`lolosTebak` di
 *   `laporan.ts`): tolak bila ≥ 2 dari 3 benar ATAU rata-rata keyakinan
 *   penebak yang benar ≥ 40.
 * - **Tebakan yang tidak terbaca tidak boleh meloloskan soal.** Diulang sekali
 *   dengan panggilan baru; kalau tetap tak terbaca, dihitung BENAR dengan
 *   keyakinan 100 — kegagalan penebak menolak soal, tidak pernah
 *   meloloskannya.
 */
import { teksPolos } from '../skema/rujukan.ts';
import type { PesanChat } from './klien.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { lolosTebak } from './laporan.ts';
import { uraiKeluaran, type JawabanModel, type SetelanPanggil } from './susun.ts';

export const SUHU_TEBAK = 1.0;
export const JUMLAH_PENEBAK = 3;
/**
 * Batas token satu panggilan gerbang. Model penalar menghabiskan token untuk
 * berpikir sebelum menjawab JSON kecil; 8.000 memberi ruang tanpa membuat
 * perkiraan biaya maksimum (yang dicek pagu sebelum kirim) membengkak.
 */
export const MAX_TOKENS_GERBANG = 8_000;

const KUNCI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** Keterangan satu panggilan untuk pemanggil (tag ledger, jenis langkah jejak). */
export interface InfoPanggil {
  jenis: 'susun' | 'tulis-ulang' | 'gerbang-kartu' | 'gerbang-tebak';
  putaran: number;
  /** Nomor omongan 1–3, atau `null` untuk panggilan penyusun. */
  omongan: number | null;
  /** Tebakan ke berapa (1–3); 1 untuk panggilan yang hanya sekali. */
  ke: number;
  /** 0 = panggilan pertama; 1 = diulang karena jawaban sebelumnya tak terbaca. */
  ulang?: number;
}

/** Satu panggilan model. Di lingkar sungguhan ini `chatBerpagu`; di tes, palsu. */
export type PanggilLlm = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPanggil) => Promise<JawabanModel>;

/** Apa yang boleh dilihat penebak: hanya yang dilihat pemain sebelum membuka kartu. */
export interface SoalTebak {
  nama: string;
  jam: string;
  pesan: string;
  pilihan: Record<KunciOpsi, string>;
}

/**
 * Salin medan yang boleh dilihat penebak, satu per satu. Rujukan `[[id|teks]]`
 * dilepas menjadi teksnya: `fact_id` sendiri sudah membocorkan isi kartu
 * ("susp-2025-12-10").
 */
export function soalTebak(o: OmonganDraf): SoalTebak {
  return {
    nama: o.nama,
    jam: o.jam,
    pesan: teksPolos(o.pesan),
    pilihan: {
      a: teksPolos(o.pilihan.a),
      b: teksPolos(o.pilihan.b),
      c: teksPolos(o.pilihan.c),
      d: teksPolos(o.pilihan.d),
    },
  };
}

/** Pesan, judul pertanyaan, dan empat pilihan — bentuk yang sama dengan uji buta M2d-1. */
export function tulisSoal(s: SoalTebak): string {
  return [
    `Pesan dari ${s.nama} (${s.jam}): "${s.pesan}"`,
    `Pertanyaan: Omongan ${s.nama} cocok dengan dokumennya?`,
    `a) ${s.pilihan.a}`,
    `b) ${s.pilihan.b}`,
    `c) ${s.pilihan.c}`,
    `d) ${s.pilihan.d}`,
  ].join('\n');
}

export const PETUNJUK_PENEBAK = [
  'Kamu ikut menguji soal latihan. Seorang teman mengirim pesan di grup obrolan tentang sebuah saham,',
  'lalu ada pertanyaan dan empat pilihan. Kamu TIDAK diberi dokumen apa pun. Jawab dengan tebakan',
  'terbaikmu dari pesan dan pilihannya saja. Beri huruf pilihanmu (a/b/c/d), seberapa yakin kamu bahwa',
  'pilihanmu benar (0-100), dan satu kalimat alasan.',
  'Balas HANYA dengan JSON berbentuk: {"pilihan": "a", "yakin": 50, "alasan": "..."}',
].join('\n');

/** Pesan untuk SATU penebak: percakapan baru, dua pesan, tanpa apa pun dari penyusun. */
export function pesanPenebak(s: SoalTebak): PesanChat[] {
  return [
    { role: 'system', content: PETUNJUK_PENEBAK },
    { role: 'user', content: tulisSoal(s) },
  ];
}

export interface JawabanTerurai {
  pilihan: KunciOpsi;
  yakin: number;
  alasan: string;
}

/** Urai jawaban penebak; `null` kalau bentuknya tidak sah. */
export function uraiTebakan(teks: string): JawabanTerurai | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null) return null;
  const n = u.nilai as Record<string, unknown>;
  const pilihan = typeof n['pilihan'] === 'string' ? n['pilihan'].trim().toLowerCase().replace(/[^a-d]/g, '') : '';
  const yakin = typeof n['yakin'] === 'number' ? n['yakin'] : Number(n['yakin']);
  if (!KUNCI.includes(pilihan as KunciOpsi) || !Number.isFinite(yakin) || yakin < 0 || yakin > 100) return null;
  return { pilihan: pilihan as KunciOpsi, yakin, alasan: typeof n['alasan'] === 'string' ? n['alasan'] : '' };
}

/** Satu panggilan gerbang, untuk jejak. Tidak memuat isi prompt. */
export interface PanggilanGerbang {
  waktu_mulai: string;
  waktu_selesai: string;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number;
  latensi_ms: number;
  finish_reason: string | null;
  teks_mentah: string;
  terbaca: boolean;
}

export interface Tebakan {
  ke: number;
  pilihan: KunciOpsi;
  yakin: number;
  alasan: string;
  benar: boolean;
  /** `false` = dua panggilan tidak memberi JSON sah; dihitung benar/100 (konservatif). */
  terbaca: boolean;
  panggilan: PanggilanGerbang[];
}

export interface PutusanTebak {
  lolos: boolean;
  benar: number;
  /** Rata-rata keyakinan penebak yang benar; `null` kalau tidak ada yang benar. */
  yakin_benar: number | null;
  tebakan: Tebakan[];
  /** Kalimat umpan balik untuk penyusun; kosong kalau lolos. */
  alasan: string;
}

export interface OpsiGerbang {
  panggil: PanggilLlm;
  putaran: number;
  omongan: number;
  jam?: () => Date;
}

/** Satu panggilan gerbang yang dicatat, diulang sekali bila jawabannya tak terbaca. */
export async function panggilTerbaca<T>(
  pesan: () => PesanChat[],
  setelan: SetelanPanggil,
  info: InfoPanggil,
  opsi: OpsiGerbang,
  urai: (teks: string) => T | null,
): Promise<{ hasil: T | null; panggilan: PanggilanGerbang[] }> {
  const jam = opsi.jam ?? (() => new Date());
  const panggilan: PanggilanGerbang[] = [];
  for (let ulang = 0; ulang < 2; ulang++) {
    const mulai = jam().toISOString();
    // Pesan dibangun baru untuk SETIAP panggilan: tidak ada larik yang dipakai
    // bersama antar-tebakan, jadi tidak ada riwayat yang bisa menumpuk.
    const j = await opsi.panggil(pesan(), setelan, { ...info, ulang });
    const hasil = urai(j.teks);
    panggilan.push({
      waktu_mulai: mulai,
      waktu_selesai: jam().toISOString(),
      token_masuk: j.token_masuk,
      token_keluar: j.token_keluar,
      biaya_usd: j.biaya_usd,
      latensi_ms: j.latensi_ms,
      finish_reason: j.finish_reason,
      teks_mentah: j.teks,
      terbaca: hasil !== null,
    });
    if (hasil !== null) return { hasil, panggilan };
  }
  return { hasil: null, panggilan };
}

function ringkasTebakan(t: Tebakan[]): string {
  return t.map((x) => `${x.pilihan}/${String(x.yakin)}`).join(', ');
}

/**
 * Jalankan gerbang tebak buta untuk satu omongan. Tiga penebak, berurutan
 * (pagu diperiksa sebelum tiap panggilan dan harus melihat biaya yang
 * sebelumnya), masing-masing percakapan baru.
 */
export async function gerbangTebak(o: OmonganDraf, opsi: OpsiGerbang): Promise<PutusanTebak> {
  const soal = soalTebak(o);
  const tebakan: Tebakan[] = [];
  for (let ke = 1; ke <= JUMLAH_PENEBAK; ke++) {
    const { hasil, panggilan } = await panggilTerbaca(
      () => pesanPenebak(soal),
      { suhu: SUHU_TEBAK, maxTokens: MAX_TOKENS_GERBANG },
      { jenis: 'gerbang-tebak', putaran: opsi.putaran, omongan: opsi.omongan, ke },
      opsi,
      uraiTebakan,
    );
    if (hasil === null) {
      tebakan.push({ ke, pilihan: o.kunci, yakin: 100, alasan: '(tak terbaca)', benar: true, terbaca: false, panggilan });
    } else {
      tebakan.push({ ...hasil, ke, benar: hasil.pilihan === o.kunci, terbaca: true, panggilan });
    }
  }
  const nilai = lolosTebak(
    tebakan.map((t) => ({ pilihan: t.pilihan, yakin: t.yakin })),
    o.kunci,
  );
  let alasan = '';
  if (!nilai.lolos) {
    const yakin = nilai.yakinBenar === null ? '' : `, rata-rata keyakinan ${String(Math.round(nilai.yakinBenar))}`;
    const alasanPenebak = tebakan
      .filter((t) => t.benar && t.alasan !== '')
      .map((t) => `"${t.alasan}"`)
      .join(' ');
    alasan =
      `${String(nilai.benar)}/${String(JUMLAH_PENEBAK)} penebak TANPA kartu memilih kunci "${o.kunci}"${yakin} ` +
      `(tebakan: ${ringkasTebakan(tebakan)}). Alasan mereka: ${alasanPenebak || '(tidak ada)'} ` +
      '— jawaban benar harus melawan dugaan pertama orang yang belum membaca kartu.';
  }
  return { lolos: nilai.lolos, benar: nilai.benar, yakin_benar: nilai.yakinBenar, tebakan, alasan };
}
