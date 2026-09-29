/**
 * Pencatat biaya berpagu (M2d D-2): pagu dolar ditegakkan KODE, sebelum kirim.
 *
 * Urutannya, untuk SETIAP percobaan HTTP (termasuk coba ulang):
 *
 * 1. Perkirakan biaya maksimum panggilan ini: batas atas token masuk × harga
 *    masuk + `max_tokens` × harga keluar.
 * 2. Kalau akumulasi ledger + perkiraan itu > pagu → **tolak tanpa memanggil**
 *    (`PaguTercapai`). `fetch` tidak pernah terjadi.
 * 3. Sesudah percobaan, catat biaya nyata dari `usage` ke ledger JSONL.
 *
 * Batas atas token masuk: panjang UTF-8 (byte) seluruh isi pesan + 16 per
 * pesan. Tokenizer BPE menghasilkan paling banyak kira-kira satu token per
 * byte, jadi ini melampaui jumlah sebenarnya (terukur di T-05: lihat rasio di
 * laporan). Tidak ada tokenizer yang dipasang — nol dependensi.
 *
 * Percobaan yang gagal: 429 dan 4xx lain dicatat nol (ditolak sebelum diproses). 5xx, batas
 * waktu, dan galat jaringan dicatat dengan **perkiraan maksimum**, karena
 * penyedia mungkin sudah memprosesnya dan respons tanpa `usage` tidak bisa
 * membuktikan sebaliknya.
 *
 * Ledger (`.cache/llm/ledger.jsonl`, di-gitignore lewat `.cache/`) hanya memuat
 * nama model, token, biaya, waktu, dan ringkasan galat yang sudah disamarkan.
 * Akumulasinya dibaca ulang dari berkas tiap kali pencatat dibuat, jadi pagu
 * berlaku untuk seluruh milestone, bukan per proses.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { HARGA, biayaUsd, type HargaModel } from './harga.ts';
import {
  chat,
  type CatatanPercobaan,
  type HasilChat,
  type KonfigKlien,
  type OpsiChat,
  type PesanChat,
} from './klien.ts';
import { AKAR } from './env.ts';

export const JALUR_LEDGER = `${AKAR}.cache/llm/ledger.jsonl`;
/** Ledger lama yang diarsipkan (M2d-4 D-0): riwayat biaya tidak pernah dihapus. */
export const FOLDER_ARSIP_LEDGER = `${AKAR}.cache/llm/arsip`;

/**
 * `usage-cost` = tagihan nyata dari respons (`usage.cost`, OpenRouter, M2d-5
 * D-2); `usage` = token × tabel harga (Featherless, M2d-1…M2d-4 — terbukti
 * ±separuh tagihan); `perkiraan-maksimum` = batas atas sebelum kirim;
 * `nol-ditolak` = ditolak sebelum diproses.
 */
export type DasarBiaya = 'usage-cost' | 'usage' | 'perkiraan-maksimum' | 'nol-ditolak';

export interface EntriLedger {
  waktu: string;
  model: string;
  /** Penanda panggilan, misalnya `tanding/dada/zai-org/GLM-5.3/p1`. */
  tag: string;
  percobaan_http: number;
  status: number | null;
  token_masuk: number | null;
  token_keluar: number | null;
  biaya_usd: number;
  dasar_biaya: DasarBiaya;
  perkiraan_maks_usd: number;
  latensi_ms: number;
  galat: string | null;
  /** M2d-5: penyedia yang benar-benar melayani (dari respons), bila disebut. */
  penyedia?: string | null;
  /** M2d-5: token penalaran, bila disebut respons. */
  token_penalaran?: number | null;
  /**
   * M2d-5: respons yang mungkin ditagih TANPA `usage.cost` — biayanya dicatat
   * perkiraan maksimum (bukan nol) dan ditandai di sini.
   */
  tanpa_cost?: boolean;
  /**
   * M2d-6 D-1/D-2: medan `reasoning` yang DIMINTA (mis. `{effort: "high"}`
   * atau `{max_tokens: 3000}`) — supaya pelanggaran penyedia bisa dibuktikan
   * dari ledger sendiri, bukan dari ingatan setelan.
   */
  penalaran_diminta?: Readonly<Record<string, unknown>> | null;
  /** M2d-6 D-1: ambang token penalaran peran penalar dan apakah percobaan ini sah. */
  ambang_penalaran?: number;
  penalaran_sah?: boolean;
  /** M2d-6 D-1: penyedia yang dilewati untuk ulangan ini (nama). */
  penyedia_diabaikan?: string[];
}

export class PaguTercapai extends Error {
  readonly akumulasi: number;
  readonly perkiraan: number;
  readonly pagu: number;
  constructor(akumulasi: number, perkiraan: number, pagu: number, model: string) {
    super(
      `Pagu tercapai: akumulasi US$${akumulasi.toFixed(6)} + perkiraan maksimum ` +
        `US$${perkiraan.toFixed(6)} untuk ${model} > pagu US$${pagu.toFixed(2)}. ` +
        'Panggilan tidak dikirim.',
    );
    this.name = 'PaguTercapai';
    this.akumulasi = akumulasi;
    this.perkiraan = perkiraan;
    this.pagu = pagu;
  }
}

/** Batas atas token masuk tanpa tokenizer: byte UTF-8 + 16 per pesan. */
export function batasAtasTokenMasuk(pesan: readonly PesanChat[]): number {
  let total = 0;
  for (const p of pesan) total += Buffer.byteLength(p.content, 'utf8') + Buffer.byteLength(p.role, 'utf8') + 16;
  return total;
}

export function hargaModel(model: string, tabel: Readonly<Record<string, HargaModel>> = HARGA): HargaModel {
  const harga = tabel[model];
  if (harga === undefined) {
    throw new Error(
      `Model "${model}" tidak punya baris harga di factory/llm/harga.ts; ` +
        'milestone ini hanya boleh memanggil tiga model yang disebut kontrak.',
    );
  }
  return harga;
}

/**
 * Pagu milestone (M2d-3 D-0): selain pagu kumulatif `LLM_PAGU_USD`, satu
 * milestone berhenti sendiri bila biayanya — jumlah entri ledger yang tagnya
 * berawalan `awalanTag` — ditambah perkiraan maksimum panggilan berikutnya
 * melebihi `usd`. Setiap panggilan milestone WAJIB bertag awalan itu; tag lain
 * ditolak sebelum kirim, supaya tidak ada panggilan yang lolos dari hitungan.
 */
export interface PaguMilestone {
  usd: number;
  awalanTag: string;
}

/**
 * Penyedia menolak karena saldo/kredit habis (HTTP 402/403 atau pesan saldo).
 * Turunan `PaguTercapai` supaya lingkar BERHENTI seketika (bukan dianggap
 * galat penyedia yang dicoba lagi). Kontrak M2d-4 §0: berhenti dan laporkan;
 * tidak mencoba penyedia atau kunci lain.
 */
export class SaldoPenyediaHabis extends PaguTercapai {
  readonly status: number | null;
  constructor(pesan: string, status: number | null, model: string) {
    super(0, 0, 0, model);
    this.name = 'SaldoPenyediaHabis';
    this.status = status;
    this.message = `Saldo penyedia habis (HTTP ${String(status)}): ${pesan.slice(0, 300)}. Berhenti; tidak mencoba penyedia atau kunci lain.`;
  }
}

/** Apakah galat penyedia berarti saldo/kredit habis. */
export function galatSaldo(status: number | null, pesan: string): boolean {
  return status === 402 || status === 403 || /insufficient|balance|credit|saldo|quota|payment/i.test(pesan);
}

export class PaguMilestoneTercapai extends PaguTercapai {
  constructor(biayaMilestone: number, perkiraan: number, m: PaguMilestone, model: string) {
    super(biayaMilestone, perkiraan, m.usd, model);
    this.name = 'PaguMilestoneTercapai';
    this.message =
      `Pagu milestone tercapai: biaya milestone (tag ${m.awalanTag}*) US$${biayaMilestone.toFixed(6)} + perkiraan maksimum ` +
      `US$${perkiraan.toFixed(6)} untuk ${model} > pagu milestone US$${m.usd.toFixed(2)}. Panggilan tidak dikirim.`;
  }
}

export interface OpsiPencatat {
  paguUsd: number;
  /** `null` = hanya di memori (tes). */
  jalurLedger: string | null;
  harga?: Readonly<Record<string, HargaModel>>;
  jam?: () => Date;
  paguMilestone?: PaguMilestone;
  /**
   * M2d-6: pagu BAGIAN di dalam pagu milestone (mis. kalibrasi ≤ US$0,80 bertag
   * `m2d6/kalibrasi/`). Setiap bagian yang awalannya cocok dengan tag panggilan
   * diperiksa sebelum kirim: biaya entri bertag awalan itu + perkiraan ≤ pagu bagian.
   */
  paguBagian?: readonly PaguMilestone[];
  /**
   * M2d-5 D-2: biaya WAJIB dari tagihan nyata (`usage.cost`). Respons yang
   * mungkin ditagih tanpa `usage.cost` dicatat perkiraan maksimum dan
   * ditandai `tanpa_cost` — tabel harga tidak pernah dipakai untuk menaksir
   * biaya yang sudah terjadi.
   */
  biayaNyata?: boolean;
}

/** Medan ledger M2d-6 yang diketahui pemanggil (bukan klien). */
export interface TambahanLedger {
  penalaran_diminta?: Readonly<Record<string, unknown>> | null;
  ambang_penalaran?: number;
  penyedia_diabaikan?: readonly string[];
}

export class PencatatBiaya {
  readonly paguUsd: number;
  readonly paguMilestone: PaguMilestone | null;
  readonly biayaNyata: boolean;
  readonly paguBagian: readonly PaguMilestone[];
  private readonly jalur: string | null;
  private readonly harga: Readonly<Record<string, HargaModel>>;
  private readonly jam: () => Date;
  private readonly entri: EntriLedger[] = [];
  /**
   * Perkiraan maksimum panggilan yang SEDANG berjalan (M2d-6: kalibrasi
   * menjalankan beberapa soal serentak). Ikut dihitung di setiap pemeriksaan
   * pagu sampai panggilan itu dicatat — pagu tetap ditegakkan saat serentak.
   */
  private readonly pesanan: Array<{ tag: string; usd: number }> = [];

  constructor(opsi: OpsiPencatat) {
    if (!Number.isFinite(opsi.paguUsd) || opsi.paguUsd <= 0) {
      throw new Error('Pagu harus angka positif; tanpa pagu tidak ada panggilan berbayar.');
    }
    this.paguUsd = opsi.paguUsd;
    if (opsi.paguMilestone !== undefined) {
      const m = opsi.paguMilestone;
      if (!Number.isFinite(m.usd) || m.usd <= 0 || m.awalanTag.trim() === '') {
        throw new Error('Pagu milestone harus angka positif dengan awalan tag yang tidak kosong.');
      }
    }
    this.paguMilestone = opsi.paguMilestone ?? null;
    for (const b of opsi.paguBagian ?? []) {
      if (!Number.isFinite(b.usd) || b.usd <= 0 || b.awalanTag.trim() === '') throw new Error('Pagu bagian harus angka positif dengan awalan tag yang tidak kosong.');
    }
    this.paguBagian = opsi.paguBagian ?? [];
    this.biayaNyata = opsi.biayaNyata ?? false;
    this.jalur = opsi.jalurLedger;
    this.harga = opsi.harga ?? HARGA;
    this.jam = opsi.jam ?? (() => new Date());
    if (this.jalur !== null && existsSync(this.jalur)) {
      for (const baris of readFileSync(this.jalur, 'utf8').split(/\r?\n/)) {
        if (baris.trim() === '') continue;
        this.entri.push(JSON.parse(baris) as EntriLedger);
      }
    }
  }

  /** Akumulasi biaya seluruh entri ledger (termasuk proses sebelumnya). */
  total(): number {
    return this.entri.reduce((a, e) => a + e.biaya_usd, 0);
  }

  semua(): readonly EntriLedger[] {
    return this.entri;
  }

  /** Biaya milestone: entri ledger bertag awalan milestone; 0 bila tanpa pagu milestone. */
  totalMilestone(): number {
    const m = this.paguMilestone;
    if (m === null) return 0;
    return this.entri.filter((e) => e.tag.startsWith(m.awalanTag)).reduce((a, e) => a + e.biaya_usd, 0);
  }

  /** Biaya entri ledger yang tagnya berawalan `awalan`. */
  totalAwalan(awalan: string): number {
    return this.entri.filter((e) => e.tag.startsWith(awalan)).reduce((a, e) => a + e.biaya_usd, 0);
  }

  /** Perkiraan biaya maksimum satu panggilan. */
  perkiraan(model: string, pesan: readonly PesanChat[], maxTokens: number): number {
    return biayaUsd(hargaModel(model, this.harga), batasAtasTokenMasuk(pesan), maxTokens);
  }

  /**
   * Lempar `PaguTercapai` kalau akumulasi + perkiraan > pagu. Dipanggil SEBELUM
   * kirim. Mengembalikan perkiraannya untuk dicatat.
   */
  periksa(model: string, pesan: readonly PesanChat[], maxTokens: number, tag?: string, pesanTempat = false): number {
    const perkiraan = this.perkiraan(model, pesan, maxTokens);
    const dipesan = (awalan: string): number => this.pesanan.filter((x) => x.tag.startsWith(awalan)).reduce((a, x) => a + x.usd, 0);
    const akumulasi = this.total() + dipesan('');
    if (akumulasi + perkiraan > this.paguUsd) {
      throw new PaguTercapai(akumulasi, perkiraan, this.paguUsd, model);
    }
    const m = this.paguMilestone;
    if (m !== null) {
      if (tag === undefined || !tag.startsWith(m.awalanTag)) {
        throw new Error(`Panggilan bertag "${String(tag)}" di luar awalan milestone "${m.awalanTag}"; tidak dikirim.`);
      }
      const milestone = this.totalMilestone() + dipesan(m.awalanTag);
      if (milestone + perkiraan > m.usd) throw new PaguMilestoneTercapai(milestone, perkiraan, m, model);
    }
    for (const b of this.paguBagian) {
      if (tag === undefined || !tag.startsWith(b.awalanTag)) continue;
      const bagian = this.totalAwalan(b.awalanTag) + dipesan(b.awalanTag);
      if (bagian + perkiraan > b.usd) throw new PaguMilestoneTercapai(bagian, perkiraan, b, model);
    }
    if (pesanTempat && tag !== undefined) this.pesanan.push({ tag, usd: perkiraan });
    return perkiraan;
  }

  /** Catat satu percobaan sesudah terjadi. */
  catat(model: string, tag: string, c: CatatanPercobaan, perkiraan: number, tambahan: TambahanLedger = {}): EntriLedger {
    const i = this.pesanan.findIndex((x) => x.tag === tag && x.usd === perkiraan);
    if (i >= 0) this.pesanan.splice(i, 1);
    const harga = hargaModel(model, this.harga);
    let biaya: number;
    let dasar: DasarBiaya;
    let tanpaCost = false;
    const cost = c.biaya_penyedia_usd;
    if (typeof cost === 'number' && Number.isFinite(cost) && cost >= 0) {
      // Tagihan nyata dari penyedia selalu menang (M2d-5 D-2).
      biaya = cost;
      dasar = 'usage-cost';
    } else if (!this.biayaNyata && c.token_masuk !== null && c.token_keluar !== null) {
      biaya = biayaUsd(harga, c.token_masuk, c.token_keluar);
      dasar = 'usage';
    } else if (c.status === 429 || !c.mungkin_ditagih) {
      biaya = 0;
      dasar = 'nol-ditolak';
    } else {
      biaya = perkiraan;
      dasar = 'perkiraan-maksimum';
      tanpaCost = this.biayaNyata;
    }
    const entri: EntriLedger = {
      waktu: this.jam().toISOString(),
      model,
      tag,
      percobaan_http: c.percobaan,
      status: c.status,
      token_masuk: c.token_masuk,
      token_keluar: c.token_keluar,
      biaya_usd: biaya,
      dasar_biaya: dasar,
      perkiraan_maks_usd: perkiraan,
      latensi_ms: c.latensi_ms,
      galat: c.galat,
      ...(this.biayaNyata || (c.penyedia ?? null) !== null
        ? { penyedia: c.penyedia ?? null, token_penalaran: c.token_penalaran ?? null, tanpa_cost: tanpaCost }
        : {}),
      ...(tambahan.penalaran_diminta === undefined ? {} : { penalaran_diminta: tambahan.penalaran_diminta }),
      ...(tambahan.ambang_penalaran === undefined
        ? {}
        : {
            ambang_penalaran: tambahan.ambang_penalaran,
            penalaran_sah: c.status !== null && c.status >= 200 && c.status < 300 && c.galat === null
              ? typeof c.token_penalaran === 'number' && c.token_penalaran >= tambahan.ambang_penalaran
              : false,
          }),
      ...(tambahan.penyedia_diabaikan === undefined || tambahan.penyedia_diabaikan.length === 0 ? {} : { penyedia_diabaikan: [...tambahan.penyedia_diabaikan] }),
    };
    this.entri.push(entri);
    if (this.jalur !== null) {
      mkdirSync(dirname(this.jalur), { recursive: true });
      appendFileSync(this.jalur, JSON.stringify(entri) + '\n', 'utf8');
    }
    return entri;
  }
}

export interface HasilArsip {
  jalur: string;
  entri: number;
  total_usd: number;
  sha256: string;
  pertama: string;
  terakhir: string;
}

function bacaEntri(jalur: string): EntriLedger[] {
  return readFileSync(jalur, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => JSON.parse(b) as EntriLedger);
}

/**
 * Arsipkan ledger (M2d-4 D-0, keputusan pemilik 29 Sep: pagu "reset lagi
 * menjadi $5"): ledger dipindah UTUH ke `arsip/ledger-sampai-<tanggal entri
 * terakhir>.jsonl` — tidak dihapus, tidak ditimpa, isinya dicek byte-sama
 * (sha256) sesudah dipindah. Ledger baru dibuat oleh panggilan berbayar
 * berikutnya dan mulai dari nol di bawah `LLM_PAGU_USD`.
 */
export function arsipkanLedger(
  jalurLedger: string = JALUR_LEDGER,
  folderArsip: string = FOLDER_ARSIP_LEDGER,
  /** Awalan nama berkas arsip; M2d-5 D-0: `ledger-featherless-sampai-`. */
  awalanNama: string = 'ledger-sampai-',
): HasilArsip {
  if (!/^ledger-([a-z]+-)?sampai-$/.test(awalanNama)) throw new Error(`Awalan nama arsip "${awalanNama}" tidak dikenal.`);
  if (!existsSync(jalurLedger)) throw new Error(`Tidak ada ledger di ${jalurLedger}; tidak ada yang diarsipkan.`);
  const isi = readFileSync(jalurLedger);
  const entri = bacaEntri(jalurLedger);
  if (entri.length === 0) throw new Error('Ledger kosong; tidak ada yang diarsipkan.');
  const sha = createHash('sha256').update(isi).digest('hex');
  const pertama = entri[0]?.waktu ?? '';
  const terakhir = entri.at(-1)?.waktu ?? '';
  const tujuan = `${folderArsip}/${awalanNama}${terakhir.slice(0, 10)}.jsonl`;
  if (existsSync(tujuan)) throw new Error(`${tujuan} sudah ada; arsip tidak pernah ditimpa.`);
  mkdirSync(folderArsip, { recursive: true });
  renameSync(jalurLedger, tujuan);
  const shaTujuan = createHash('sha256').update(readFileSync(tujuan)).digest('hex');
  if (shaTujuan !== sha) throw new Error(`Arsip ${tujuan} tidak byte-sama dengan ledger asal.`);
  return { jalur: tujuan, entri: entri.length, total_usd: entri.reduce((a, e) => a + e.biaya_usd, 0), sha256: sha, pertama, terakhir };
}

/** Pola nama berkas arsip: `ledger-sampai-<tanggal>.jsonl` (M2d-4) dan `ledger-<penyedia>-sampai-<tanggal>.jsonl` (M2d-5). */
export const POLA_BERKAS_ARSIP = /^ledger-(?:[a-z]+-)?sampai-(\d{4}-\d{2}-\d{2})\.jsonl$/;

/** Berkas arsip, urut tanggal akhirnya (= urut waktu), lalu nama. */
export function berkasArsip(folderArsip: string = FOLDER_ARSIP_LEDGER): string[] {
  if (!existsSync(folderArsip)) return [];
  const tanggal = (f: string): string => POLA_BERKAS_ARSIP.exec(f)?.[1] ?? '';
  return readdirSync(folderArsip)
    .filter((f) => POLA_BERKAS_ARSIP.test(f))
    .sort((a, b) => tanggal(a).localeCompare(tanggal(b)) || a.localeCompare(b));
}

/**
 * Arsip ledger Featherless (M2d-5 D-0): ledger yang memuat M2d-4 dipindah ke
 * sini sebelum panggilan OpenRouter pertama.
 */
export const JALUR_ARSIP_FEATHERLESS = `${FOLDER_ARSIP_LEDGER}/ledger-featherless-sampai-2026-09-29.jsonl`;

/**
 * Seluruh riwayat biaya untuk LAPORAN: arsip (urut tanggal akhir = urut waktu)
 * lalu ledger kini. Pagu (`PencatatBiaya`) hanya membaca ledger kini.
 */
export function bacaLedgerSemua(jalurLedger: string = JALUR_LEDGER, folderArsip: string = FOLDER_ARSIP_LEDGER): EntriLedger[] {
  const arsip = berkasArsip(folderArsip).flatMap((f) => bacaEntri(`${folderArsip}/${f}`));
  return [...arsip, ...(existsSync(jalurLedger) ? bacaEntri(jalurLedger) : [])];
}

/**
 * Satu panggilan chat di bawah pagu: pemeriksaan pagu di kait `sebelumKirim`
 * (sebelum SETIAP `fetch`, termasuk coba ulang), pencatatan di
 * `sesudahPercobaan`.
 */
export async function chatBerpagu(
  klien: KonfigKlien,
  pencatat: PencatatBiaya,
  opsi: OpsiChat,
  tag: string,
  /** M2d-6: ambang penalaran peran ini (dicatat bersama bukti penalaran di ledger). */
  jaga: { ambangPenalaran?: number } = {},
): Promise<HasilChat & { biaya_usd: number }> {
  let perkiraan = 0;
  let biaya = 0;
  const r = opsi.tambahanBadan?.['reasoning'];
  const tambahan: TambahanLedger = {
    // Hanya bila medan `reasoning` dikirim (tidak ada = tidak diminta); entri M2d-5 tetap berbentuk sama.
    ...(typeof r === 'object' && r !== null ? { penalaran_diminta: r as Record<string, unknown> } : {}),
    ...(jaga.ambangPenalaran === undefined ? {} : { ambang_penalaran: jaga.ambangPenalaran }),
    ...(opsi.abaikanPenyedia === undefined ? {} : { penyedia_diabaikan: opsi.abaikanPenyedia }),
  };
  const hasil = await chat(klien, opsi, {
    sebelumKirim: () => {
      perkiraan = pencatat.periksa(opsi.model, opsi.pesan, opsi.maxTokens, tag, true);
    },
    sesudahPercobaan: (c) => {
      biaya += pencatat.catat(opsi.model, tag, c, perkiraan, tambahan).biaya_usd;
    },
  });
  return { ...hasil, biaya_usd: biaya };
}
