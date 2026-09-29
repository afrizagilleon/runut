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

export type DasarBiaya = 'usage' | 'perkiraan-maksimum' | 'nol-ditolak';

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
}

export class PencatatBiaya {
  readonly paguUsd: number;
  readonly paguMilestone: PaguMilestone | null;
  private readonly jalur: string | null;
  private readonly harga: Readonly<Record<string, HargaModel>>;
  private readonly jam: () => Date;
  private readonly entri: EntriLedger[] = [];

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

  /** Perkiraan biaya maksimum satu panggilan. */
  perkiraan(model: string, pesan: readonly PesanChat[], maxTokens: number): number {
    return biayaUsd(hargaModel(model, this.harga), batasAtasTokenMasuk(pesan), maxTokens);
  }

  /**
   * Lempar `PaguTercapai` kalau akumulasi + perkiraan > pagu. Dipanggil SEBELUM
   * kirim. Mengembalikan perkiraannya untuk dicatat.
   */
  periksa(model: string, pesan: readonly PesanChat[], maxTokens: number, tag?: string): number {
    const perkiraan = this.perkiraan(model, pesan, maxTokens);
    const akumulasi = this.total();
    if (akumulasi + perkiraan > this.paguUsd) {
      throw new PaguTercapai(akumulasi, perkiraan, this.paguUsd, model);
    }
    const m = this.paguMilestone;
    if (m !== null) {
      if (tag === undefined || !tag.startsWith(m.awalanTag)) {
        throw new Error(`Panggilan bertag "${String(tag)}" di luar awalan milestone "${m.awalanTag}"; tidak dikirim.`);
      }
      const milestone = this.totalMilestone();
      if (milestone + perkiraan > m.usd) throw new PaguMilestoneTercapai(milestone, perkiraan, m, model);
    }
    return perkiraan;
  }

  /** Catat satu percobaan sesudah terjadi. */
  catat(model: string, tag: string, c: CatatanPercobaan, perkiraan: number): EntriLedger {
    const harga = hargaModel(model, this.harga);
    let biaya: number;
    let dasar: DasarBiaya;
    if (c.token_masuk !== null && c.token_keluar !== null) {
      biaya = biayaUsd(harga, c.token_masuk, c.token_keluar);
      dasar = 'usage';
    } else if (c.status === 429 || !c.mungkin_ditagih) {
      biaya = 0;
      dasar = 'nol-ditolak';
    } else {
      biaya = perkiraan;
      dasar = 'perkiraan-maksimum';
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
export function arsipkanLedger(jalurLedger: string = JALUR_LEDGER, folderArsip: string = FOLDER_ARSIP_LEDGER): HasilArsip {
  if (!existsSync(jalurLedger)) throw new Error(`Tidak ada ledger di ${jalurLedger}; tidak ada yang diarsipkan.`);
  const isi = readFileSync(jalurLedger);
  const entri = bacaEntri(jalurLedger);
  if (entri.length === 0) throw new Error('Ledger kosong; tidak ada yang diarsipkan.');
  const sha = createHash('sha256').update(isi).digest('hex');
  const pertama = entri[0]?.waktu ?? '';
  const terakhir = entri.at(-1)?.waktu ?? '';
  const tujuan = `${folderArsip}/ledger-sampai-${terakhir.slice(0, 10)}.jsonl`;
  if (existsSync(tujuan)) throw new Error(`${tujuan} sudah ada; arsip tidak pernah ditimpa.`);
  mkdirSync(folderArsip, { recursive: true });
  renameSync(jalurLedger, tujuan);
  const shaTujuan = createHash('sha256').update(readFileSync(tujuan)).digest('hex');
  if (shaTujuan !== sha) throw new Error(`Arsip ${tujuan} tidak byte-sama dengan ledger asal.`);
  return { jalur: tujuan, entri: entri.length, total_usd: entri.reduce((a, e) => a + e.biaya_usd, 0), sha256: sha, pertama, terakhir };
}

/**
 * Seluruh riwayat biaya untuk LAPORAN: arsip (urut nama berkas = urut waktu)
 * lalu ledger kini. Pagu (`PencatatBiaya`) hanya membaca ledger kini.
 */
export function bacaLedgerSemua(jalurLedger: string = JALUR_LEDGER, folderArsip: string = FOLDER_ARSIP_LEDGER): EntriLedger[] {
  const arsip = existsSync(folderArsip)
    ? readdirSync(folderArsip).filter((f) => /^ledger-sampai-.*\.jsonl$/.test(f)).sort().flatMap((f) => bacaEntri(`${folderArsip}/${f}`))
    : [];
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
): Promise<HasilChat & { biaya_usd: number }> {
  let perkiraan = 0;
  let biaya = 0;
  const hasil = await chat(klien, opsi, {
    sebelumKirim: () => {
      perkiraan = pencatat.periksa(opsi.model, opsi.pesan, opsi.maxTokens, tag);
    },
    sesudahPercobaan: (c) => {
      biaya += pencatat.catat(opsi.model, tag, c, perkiraan).biaya_usd;
    },
  });
  return { ...hasil, biaya_usd: biaya };
}
