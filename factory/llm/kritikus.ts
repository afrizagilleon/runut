/**
 * Kritikus lingkar agen M2d-3 (`factory/llm/peran.md`): GLM-5.3 membaca SEMUA
 * — pesan, kartu dan kartu penentunya, pilihan, kunci, penjelasan, hasil
 * pemeriksa lain — lalu menyebut keberatan terstruktur + satu arahan.
 *
 * Yang dijaga kode, bukan model:
 *
 * - **Kritikus tidak bisa meloloskan.** Keluarannya hanya dibaca sebagai
 *   `keberatan` + `arahan`; medan lain (mis. `"lolos": true`, versi omongan
 *   baru) dibuang dan dicatat `diabaikan`. Putusan akhir dihitung
 *   `putusanAkhir()` di `agen-peran.ts` dari keempat peran.
 * - **Kritikus tidak menulis ulang.** Tidak ada jalur dari jawabannya ke draf:
 *   yang kembali ke penulis hanyalah butir keberatan (≤ 300 karakter) dan
 *   arahan (≤ 400 karakter) sebagai umpan balik.
 * - **Tidak menjawab = keberatan.** Terpotong batas token (`finish_reason`
 *   `length` — GLM menghabiskan token untuk penalaran, terukur di M2d-1), JSON
 *   tak terbaca, atau galat penyedia → dicoba ulang SEKALI; bila tetap gagal,
 *   keberatan "kritikus tidak menjawab". Jawaban yang terpotong tidak pernah
 *   dibaca sebagai "tidak keberatan", walau potongannya kebetulan JSON sah.
 *
 * **Cek makna (M2d-4 D-6).** Di M2d-3 kritikus dipanggil paling akhir dan
 * melewatkan masalah makna yang dilihat penguji luar (TIRT 1: "gara-gara ada
 * yang ngeborong" tak bisa dicek, tetapi kuncinya "Betul"; ULTJ 1: pilihan d
 * ikut benar). Dengan `cekMakna`, kritikus WAJIB menjawab dua pertanyaan
 * (`prompt-kritikus-makna.md`) dan KODE — bukan model — mengubah jawabannya
 * menjadi keberatan yang menolak:
 *   (1) ada bagian klaim yang tak bisa dicek dari kartu, label kunci "Betul",
 *       dan pilihan kunci tidak menyatakan bagian itu tak bisa dipastikan →
 *       keberatan `makna`;
 *   (2) ada pilihan selain kunci yang juga benar menurut kartu → keberatan
 *       `kunci`.
 * Jawaban tanpa kedua medan itu = tak terbaca (diulang sekali, lalu "tidak
 * menjawab"). Kritikus tetap tidak menulis ulang dan tidak bisa meloloskan.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../skema/rujukan.ts';
import type { PesanChat } from './klien.ts';
import type { OmonganDraf } from './draf.ts';
import { kartuOmongan } from './gerbang-kartu.ts';
import type { InfoPanggil, PanggilanGerbang, PanggilLlm } from './gerbang-tebak.ts';
import { PaguTercapai } from './pagu.ts';
import { alasanTidakSah, penalaranSah, setelanUlang } from './penjaga-penalaran.ts';
import type { PaketFakta } from './paket.ts';
import { uraiKeluaran, type SetelanPanggil } from './susun.ts';
import { tanggalId } from '../format.ts';

export const SUHU_KRITIKUS = 0.2;
/**
 * GLM-5.3 berpikir panjang sebelum menjawab (M2d-1: 8 dari 9 draf terpotong
 * di 12.000 token). Jawaban kritikus kecil, tetapi penalarannya tidak; 16.384
 * memberi ruang, dan perkiraan maksimum yang dicek pagu tetap ±US$0,05.
 */
export const MAX_TOKENS_KRITIKUS = 16_384;
/**
 * `max_tokens` kritikus M2d-4 (cek makna). Terukur 29 Sep di jalan TIRT ke-2
 * (dibuang, `eval/keluaran-m2d4/dibuang/tirt-jalan2/`): dengan dua pertanyaan
 * wajib, 3 dari 5 panggilan kritikus habis di 16.384 token (keluaran yang
 * selesai: 6.797 dan 11.109). Dua kali terpotong = "tidak menjawab" seharga
 * US$0,10 tanpa hasil. 24.576 memberi ruang; perkiraan maksimum per
 * panggilan ±US$0,08.
 */
export const MAX_TOKENS_KRITIKUS_MAKNA = 24_576;
export const MAKS_KEBERATAN = 6;
export const MAKS_ALASAN = 300;
export const MAKS_ARAHAN = 400;

export const JENIS_KEBERATAN = ['kunci', 'makna', 'ambigu', 'tertebak', 'bahasa', 'aturan', 'lain', 'tidak-menjawab'] as const;
export type JenisKeberatan = (typeof JENIS_KEBERATAN)[number];

export interface Keberatan {
  jenis: JenisKeberatan;
  bagian: string;
  alasan: string;
}

const JALUR_PROMPT = fileURLToPath(new URL('./prompt-kritikus.md', import.meta.url));
const JALUR_PROMPT_MAKNA = fileURLToPath(new URL('./prompt-kritikus-makna.md', import.meta.url));
const JALUR_PROMPT_V3 = fileURLToPath(new URL('./prompt-kritikus-v3.md', import.meta.url));

export function promptKritikus(): string {
  return readFileSync(JALUR_PROMPT, 'utf8').replace(/\r\n/g, '\n').trim();
}

/** Prompt kritikus M2d-4: dipanggil sebelum penebak; dua pertanyaan makna wajib. */
export function promptKritikusMakna(): string {
  return readFileSync(JALUR_PROMPT_MAKNA, 'utf8').replace(/\r\n/g, '\n').trim();
}

/**
 * Prompt kritikus urutan v3 (M2d-20): penebak SUDAH dijalankan sebelum kritikus;
 * ucapan orang lain yang dikutip/dibantah teman bukan klaim teman. Prompt
 * makna (M2d-4) tidak berubah.
 */
export function promptKritikusV3(): string {
  return readFileSync(JALUR_PROMPT_V3, 'utf8').replace(/\r\n/g, '\n').trim();
}

/** Hasil peran lain yang boleh (dan perlu) dilihat kritikus. */
export interface KonteksKritik {
  no: number;
  kartu: { pilihan: string | null; kartu_ditunjuk_no: number[]; alasan: string } | null;
  tebakan: Array<{ pilihan: string; yakin: number }>;
  /** M2d-4: penebak dijalankan SESUDAH kritikus (hasilnya belum ada). */
  penebakSesudah?: boolean;
  /** M2d-20: urutan v3 — penebak sudah dijalankan dan tidak menolak; omongan dinilai sendiri (tanpa "N dari 3"). */
  urutanV3?: boolean;
}

/** Pesan pengguna untuk kritikus: seluruh soal, kunci, kartu penentu, penjelasan, hasil peran lain. */
export function tulisSoalKritik(o: OmonganDraf, paket: PaketFakta, k: KonteksKritik): string {
  const kartu = kartuOmongan(o, paket);
  const baris = [
    k.urutanV3 === true
      ? `SOAL YANG DIPERIKSA: satu omongan untuk simulasi "${paket.nama_samaran}" pada ${tanggalId(paket.tanggal_t)}.`
      : `SOAL YANG DIPERIKSA: omongan ${String(k.no)} dari 3, simulasi "${paket.nama_samaran}" pada ${tanggalId(paket.tanggal_t)}.`,
    `Peristiwa hari itu: ${paket.peristiwa}`,
    '',
    `Pesan dari ${o.nama} (${o.jam}): "${teksPolos(o.pesan)}"`,
    '',
    'Kartu yang dilihat pemain:',
    ...kartu.map(
      (x) => `Kartu ${String(x.no)} — ${x.kepala}: ${x.isi}${o.kartu_penentu.includes(x.fact_id) ? '  [KARTU PENENTU]' : ''}`,
    ),
    '',
    `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`,
    `a) ${teksPolos(o.pilihan.a)}`,
    `b) ${teksPolos(o.pilihan.b)}`,
    `c) ${teksPolos(o.pilihan.c)}`,
    `d) ${teksPolos(o.pilihan.d)}`,
    `KUNCI: ${o.kunci}`,
    '',
    `Penjelasan (dibaca pemain sesudah menjawab): ${teksPolos(o.penjelasan)}`,
    '',
    'HASIL PEMERIKSA LAIN:',
    '- pemeriksa otomatis (validator + gerbang G): tidak keberatan.',
    k.kartu === null
      ? '- pembaca kartu: belum dijalankan.'
      : `- pembaca yang memegang kartu (tanpa tahu kunci) memilih "${String(k.kartu.pilihan)}"` +
        `${k.kartu.kartu_ditunjuk_no.length > 0 ? `, menunjuk kartu ${k.kartu.kartu_ditunjuk_no.join(' dan ')}` : ''}; ` +
        `alasannya: "${k.kartu.alasan}"`,
    k.urutanV3 === true
      ? '- penebak tanpa kartu: SUDAH dijalankan sebelum kritikus dan tidak menolak soal ini.'
      : k.penebakSesudah === true
      ? '- tiga penebak tanpa kartu: dijalankan SESUDAH kritikus (hasilnya belum ada).'
      : k.tebakan.length === 0
      ? '- tiga penebak tanpa kartu: belum dijalankan.'
      : `- tiga penebak TANPA kartu memilih: ${k.tebakan.map((t) => `${t.pilihan} (yakin ${String(t.yakin)})`).join(', ')}`,
  ];
  return baris.join('\n');
}

export function pesanKritikus(o: OmonganDraf, paket: PaketFakta, k: KonteksKritik, cekMakna = false): PesanChat[] {
  return [
    { role: 'system', content: k.urutanV3 === true ? promptKritikusV3() : cekMakna ? promptKritikusMakna() : promptKritikus() },
    { role: 'user', content: tulisSoalKritik(o, paket, k) },
  ];
}

export interface KritikTerurai {
  keberatan: Keberatan[];
  arahan: string;
  /** Medan keluaran yang bukan `keberatan`/`arahan` — dibuang, tidak pernah dibaca. */
  diabaikan: string[];
}

function potong(teks: string, n: number): string {
  const t = teks.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Urai jawaban kritikus; `null` kalau bentuknya tidak sah (dihitung "tidak menjawab"). */
export function uraiKritik(teks: string): KritikTerurai | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null || Array.isArray(u.nilai)) return null;
  const n = u.nilai as Record<string, unknown>;
  if (!Array.isArray(n['keberatan'])) return null;
  const keberatan: Keberatan[] = [];
  for (const x of n['keberatan'] as unknown[]) {
    if (typeof x === 'string' && x.trim() !== '') {
      keberatan.push({ jenis: 'lain', bagian: '-', alasan: potong(x, MAKS_ALASAN) });
      continue;
    }
    if (typeof x !== 'object' || x === null) continue;
    const b = x as Record<string, unknown>;
    const alasan = typeof b['alasan'] === 'string' ? b['alasan'] : '';
    if (alasan.trim() === '') continue;
    const jenis = typeof b['jenis'] === 'string' ? b['jenis'].trim().toLowerCase() : '';
    keberatan.push({
      jenis: (JENIS_KEBERATAN as readonly string[]).includes(jenis) && jenis !== 'tidak-menjawab' ? (jenis as JenisKeberatan) : 'lain',
      bagian: typeof b['bagian'] === 'string' ? potong(b['bagian'], 40) : '-',
      alasan: potong(alasan, MAKS_ALASAN),
    });
  }
  return {
    keberatan: keberatan.slice(0, MAKS_KEBERATAN),
    arahan: typeof n['arahan'] === 'string' ? potong(n['arahan'], MAKS_ARAHAN) : '',
    diabaikan: Object.keys(n).filter((x) => x !== 'keberatan' && x !== 'arahan'),
  };
}

/** Jawaban kritikus atas dua pertanyaan makna wajib (M2d-4 D-6). */
export interface CekMakna {
  /** (1) Bagian klaim teman yang tidak bisa dicek dari kartu. */
  bagian_tak_tercek: string[];
  /** Pilihan kunci sendiri menyatakan bagian itu tak bisa dipastikan. */
  kunci_menyatakan_tak_pasti: boolean;
  /** (2) Huruf pilihan SELAIN kunci yang juga benar menurut kartu. */
  juga_benar: string[];
  alasan_juga_benar: string;
}

const MEDAN_CEK = ['cek_klaim', 'cek_pilihan'];

/** Urai dua jawaban wajib; `null` bila salah satunya tidak ada atau bentuknya salah. */
export function uraiCekMakna(n: Record<string, unknown>): CekMakna | null {
  const klaim = n['cek_klaim'];
  const pilihan = n['cek_pilihan'];
  if (typeof klaim !== 'object' || klaim === null || Array.isArray(klaim)) return null;
  if (typeof pilihan !== 'object' || pilihan === null || Array.isArray(pilihan)) return null;
  const k = klaim as Record<string, unknown>;
  const p = pilihan as Record<string, unknown>;
  const bagian = k['bagian_tak_tercek'];
  const juga = p['juga_benar'];
  if (!Array.isArray(bagian) || !Array.isArray(juga)) return null;
  if (typeof k['kunci_menyatakan_tak_pasti'] !== 'boolean') return null;
  return {
    bagian_tak_tercek: bagian.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => potong(x, 120)).slice(0, 6),
    kunci_menyatakan_tak_pasti: k['kunci_menyatakan_tak_pasti'],
    juga_benar: [...new Set(juga.filter((x): x is string => typeof x === 'string').map((x) => x.trim().toLowerCase().replace(/[^a-d]/g, '')).filter((x) => /^[a-d]$/.test(x)))],
    alasan_juga_benar: typeof p['alasan'] === 'string' ? potong(p['alasan'], MAKS_ALASAN) : '',
  };
}

/**
 * Keberatan yang diturunkan KODE dari dua jawaban wajib (D-6): keduanya
 * menolak. `labelKunci` dibaca dari pilihan kunci, bukan dari kritikus.
 */
export function keberatanMakna(c: CekMakna, o: OmonganDraf): Keberatan[] {
  const hasil: Keberatan[] = [];
  const labelKunci = teksPolos(o.pilihan[o.kunci] ?? '').trimStart().startsWith('Betul,') ? 'Betul' : 'Keliru';
  if (c.bagian_tak_tercek.length > 0 && labelKunci === 'Betul' && !c.kunci_menyatakan_tak_pasti) {
    hasil.push({
      jenis: 'makna',
      bagian: 'kunci',
      alasan: potong(
        `Bagian klaim teman yang tidak bisa dicek dari kartu: ${c.bagian_tak_tercek.map((b) => `"${b}"`).join(', ')}; ` +
          'kunci tidak boleh "Betul" kecuali pilihan itu menyatakan bagian tersebut tak bisa dipastikan.',
        MAKS_ALASAN,
      ),
    });
  }
  const lain = c.juga_benar.filter((x) => x !== o.kunci);
  if (lain.length > 0) {
    hasil.push({
      jenis: 'kunci',
      bagian: 'pilihan',
      alasan: potong(
        `Pilihan ${lain.join(' dan ')} juga benar menurut kartu${c.alasan_juga_benar === '' ? '' : ` (${c.alasan_juga_benar})`}; hanya satu pilihan yang boleh benar.`,
        MAKS_ALASAN,
      ),
    });
  }
  return hasil;
}

export interface PutusanKritik {
  /** Benar HANYA bila kritikus menjawab terbaca dan larik keberatannya kosong. */
  tanpa_keberatan: boolean;
  /** `false` = dua percobaan terpotong/tak terbaca/galat → keberatan "tidak menjawab". */
  menjawab: boolean;
  /** Ada percobaan yang berhenti di batas token. */
  terpotong: boolean;
  keberatan: Keberatan[];
  arahan: string;
  diabaikan: string[];
  panggilan: PanggilanGerbang[];
  /** Galat penyedia (bukan pagu) per percobaan, bila ada. */
  galat: string[];
  /** M2d-4: jawaban dua pertanyaan makna wajib; `null` bila tidak diminta atau tidak menjawab. */
  cek_makna?: CekMakna | null;
  /**
   * M2d-6 D-1: alasan tiap percobaan yang ditolak penjaga penalaran (token
   * penalaran < ambang). Hanya ada bila ambang dipasang.
   */
  penalaran_tidak_sah?: string[];
}

export interface OpsiKritik {
  panggil: PanggilLlm;
  putaran: number;
  omongan: number;
  jam?: () => Date;
  /** M2d-4 D-6: prompt dua pertanyaan makna; jawaban tanpa keduanya = tak terbaca. */
  cekMakna?: boolean;
  /** `max_tokens`; bawaan `MAX_TOKENS_KRITIKUS`. */
  maxTokens?: number;
  /** Medan badan tambahan (M2d-5: `reasoning.max_tokens`; M2d-6: `reasoning.effort`). */
  tambahanBadan?: Readonly<Record<string, unknown>>;
  /** M2d-6 D-1: ambang token penalaran; jawaban di bawahnya tidak sah (`penjaga-penalaran.ts`). */
  ambangPenalaran?: number;
}

/**
 * Jawaban terpotong: `finish_reason: length`, atau isi kosong (penalaran
 * menghabiskan anggaran; M2d-5 D-3). Biayanya tetap dicatat; isinya tidak
 * pernah dibaca sebagai jawaban.
 */
export function jawabanTerpotong(j: { finish_reason: string | null; teks: string }): boolean {
  return j.finish_reason === 'length' || j.teks.trim() === '';
}

export const KEBERATAN_TIDAK_MENJAWAB = 'kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali';
/** M2d-6 D-1: kedua percobaan ditolak penjaga penalaran — diperlakukan seperti tidak menjawab. */
export const KEBERATAN_TIDAK_BERPIKIR = 'kritikus tidak terbukti berpikir (token penalaran di bawah ambang) — diperlakukan seperti tidak menjawab';

/**
 * Jalankan kritikus untuk satu omongan: paling banyak dua panggilan (satu
 * ulang bila yang pertama tidak menjawab). `PaguTercapai` diteruskan ke
 * pemanggil — pagu menghentikan lingkar, bukan menjadi keberatan.
 */
export async function kritik(o: OmonganDraf, paket: PaketFakta, k: KonteksKritik, opsi: OpsiKritik): Promise<PutusanKritik> {
  const jam = opsi.jam ?? (() => new Date());
  const panggilan: PanggilanGerbang[] = [];
  const galat: string[] = [];
  let terpotong = false;
  const ambang = opsi.ambangPenalaran;
  const tidakSah: string[] = [];
  let setelan: SetelanPanggil = {
    suhu: SUHU_KRITIKUS,
    maxTokens: opsi.maxTokens ?? MAX_TOKENS_KRITIKUS,
    ...(opsi.tambahanBadan === undefined ? {} : { tambahanBadan: opsi.tambahanBadan }),
    ...(ambang === undefined ? {} : { ambangPenalaran: ambang }),
  };
  for (let ulang = 0; ulang < 2; ulang++) {
    const info: InfoPanggil = { jenis: 'kritikus', putaran: opsi.putaran, omongan: opsi.omongan, ke: 1, ulang };
    const mulai = jam().toISOString();
    let j;
    try {
      j = await opsi.panggil(pesanKritikus(o, paket, k, opsi.cekMakna === true), { ...setelan }, info);
    } catch (e) {
      if (e instanceof PaguTercapai) throw e;
      galat.push(e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : 'galat tak dikenal');
      continue;
    }
    // Terpotong batas token, ATAU jawaban kosong karena penalaran menghabiskan
    // anggaran (M2d-5 D-3): keduanya dibayar dan keduanya "tidak menjawab".
    const kena = jawabanTerpotong(j);
    terpotong ||= kena;
    // M2d-6 D-1: jawaban tanpa bukti berpikir tidak dibaca; ulangan melewati penyedia itu.
    const sah = ambang === undefined || penalaranSah(j, ambang);
    if (!sah && ambang !== undefined) {
      tidakSah.push(alasanTidakSah(j, ambang));
      setelan = setelanUlang(setelan, j);
    }
    let hasil = kena || !sah ? null : uraiKritik(j.teks);
    let cek: CekMakna | null = null;
    if (hasil !== null && opsi.cekMakna === true) {
      const u = uraiKeluaran(j.teks);
      cek = u.ok ? uraiCekMakna(u.nilai as Record<string, unknown>) : null;
      if (cek === null) {
        hasil = null;
      } else {
        const turunan = keberatanMakna(cek, o);
        hasil = {
          keberatan: [...turunan, ...hasil.keberatan].slice(0, MAKS_KEBERATAN),
          arahan: hasil.arahan,
          diabaikan: hasil.diabaikan.filter((x) => !MEDAN_CEK.includes(x)),
        };
      }
    }
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
      ...(j.penyedia === undefined ? {} : { penyedia: j.penyedia, token_penalaran: j.token_penalaran ?? null }),
      ...(ambang === undefined ? {} : { ambang_penalaran: ambang, penalaran_sah: sah }),
    });
    if (hasil !== null) {
      return {
        tanpa_keberatan: hasil.keberatan.length === 0,
        menjawab: true,
        terpotong,
        keberatan: hasil.keberatan,
        arahan: hasil.arahan,
        diabaikan: hasil.diabaikan,
        panggilan,
        galat,
        ...(opsi.cekMakna === true ? { cek_makna: cek } : {}),
        ...(ambang === undefined ? {} : { penalaran_tidak_sah: tidakSah }),
      };
    }
  }
  const tidakBerpikir = ambang !== undefined && tidakSah.length === 2;
  return {
    tanpa_keberatan: false,
    menjawab: false,
    terpotong,
    keberatan: [{ jenis: 'tidak-menjawab', bagian: '-', alasan: tidakBerpikir ? KEBERATAN_TIDAK_BERPIKIR : KEBERATAN_TIDAK_MENJAWAB }],
    arahan: '',
    diabaikan: [],
    panggilan,
    galat,
    ...(opsi.cekMakna === true ? { cek_makna: null } : {}),
    ...(ambang === undefined ? {} : { penalaran_tidak_sah: tidakSah }),
  };
}

/** Butir umpan balik untuk penulis dari putusan kritikus (kosong bila tanpa keberatan). */
export function umpanKritik(p: PutusanKritik): string[] {
  if (p.tanpa_keberatan) return [];
  if (!p.menjawab) {
    return [`[kritikus] ${p.keberatan[0]?.alasan ?? KEBERATAN_TIDAK_MENJAWAB}; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.`];
  }
  return [
    ...p.keberatan.map((x) => `[kritikus: ${x.jenis}, ${x.bagian}] ${x.alasan}`),
    ...(p.arahan === '' ? [] : [`[kritikus: arahan] ${p.arahan}`]),
  ];
}
