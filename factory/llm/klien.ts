/**
 * Klien OpenAI-compatible untuk penyusun LLM (M2d D-1).
 *
 * Kenapa bukan SDK vendor atau kerangka agent: keputusan 20 Sep — orkestrasi
 * harus terbaca di repo, dan berkas ini adalah seluruh jalur jaringannya.
 * `fetch` bawaan Node, nol dependensi.
 *
 * Tiga hal yang dijaga:
 *
 * 1. **Kunci tidak pernah keluar lewat galat atau log.** Setiap pesan galat
 *    dilewatkan `samarkan()` dengan kunci sebagai rahasia, dan tidak ada header
 *    yang pernah disalin ke pesan. Tesnya memakai kunci palsu `sk-UJI-…` dan
 *    server palsu yang dengan sengaja memantulkan header ke badan responsnya.
 * 2. **Setiap percobaan HTTP melewati kait `sebelumKirim`** — termasuk coba
 *    ulang. Di situlah `pagu.ts` menolak panggilan sebelum ia terkirim; klien
 *    ini tidak tahu apa-apa tentang dolar.
 * 3. **Coba ulang hanya untuk 429 dan 5xx**, dua kali, dengan jeda. Batas waktu
 *    dan galat jaringan tidak diulang: permintaan yang sudah sampai mungkin
 *    sudah ditagih, dan mengulangnya diam-diam melipatgandakan biaya.
 */

export interface PesanChat {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpsiChat {
  model: string;
  pesan: PesanChat[];
  /** Suhu; uji tanding memakai nilai yang sama untuk semua model. */
  suhu: number;
  /** M2d-17: jangan kirim `temperature` (Opus 5.5 di penyedia Anthropic tidak menerimanya; dengan `require_parameters` permintaan bersuhu hanya dilayani Azure). */
  tanpaSuhu?: boolean;
  maxTokens: number;
  /**
   * Medan tambahan badan permintaan yang dikenal penyedia (mis.
   * `chat_template_kwargs`). Tidak bisa menimpa model, pesan, suhu,
   * `max_tokens`, atau `stream` — medan itu selalu dari opsi di atas, jadi
   * pagu (yang memperkirakan biaya dari `maxTokens`) tidak bisa dikelabui.
   */
  tambahanBadan?: Readonly<Record<string, unknown>>;
  /**
   * M2d-6 D-1: nama penyedia yang dilewati untuk panggilan ini (ulangan
   * sesudah jawaban penalar tidak sah). Diteruskan ke `pagar`, yang
   * mengubahnya menjadi `provider.ignore`; tanpa `pagar` tidak berpengaruh.
   */
  abaikanPenyedia?: readonly string[];
}

/** Catatan satu percobaan HTTP, untuk ledger. Tidak memuat header maupun kunci. */
export interface CatatanPercobaan {
  percobaan: number;
  status: number | null;
  /** `null` kalau respons tidak memuat `usage`. */
  token_masuk: number | null;
  token_keluar: number | null;
  latensi_ms: number;
  /** Ringkasan galat, sudah disamarkan; `null` untuk respons sukses. */
  galat: string | null;
  /** Benar kalau permintaan mungkin sudah diproses penyedia (untuk biaya). */
  mungkin_ditagih: boolean;
  /**
   * Tagihan nyata dari penyedia (`usage.cost`, OpenRouter: kredit = USD);
   * `null`/tidak ada bila respons tidak memuatnya (M2d-5 D-2).
   */
  biaya_penyedia_usd?: number | null;
  /** Nama penyedia yang benar-benar melayani (medan `provider` respons OpenRouter), bila ada. */
  penyedia?: string | null;
  /** Token penalaran (`usage.completion_tokens_details.reasoning_tokens`), bila ada. */
  token_penalaran?: number | null;
}

export interface KaitPanggilan {
  /** Dipanggil tepat sebelum SETIAP `fetch`. Melempar = panggilan dibatalkan. */
  sebelumKirim?: (percobaan: number) => void;
  /** Dipanggil sesudah setiap percobaan, sukses atau gagal. */
  sesudahPercobaan?: (catatan: CatatanPercobaan) => void;
}

export interface KonfigKlien {
  baseUrl: string;
  apiKey: string;
  /** Batas waktu satu percobaan. Bawaan 240 detik: model besar Featherless bisa lambat dimuat. */
  batasWaktuMs?: number;
  /** Berapa kali coba ulang untuk 429/5xx. Bawaan 2 (D-1). */
  cobaUlang?: number;
  /** Jeda sebelum coba ulang ke-n (1, 2, …). Bawaan 2 s lalu 6 s. */
  jedaMs?: (ke: number) => number;
  /**
   * Pagar penyedia (M2d-5 D-1, `openrouter.ts`): objek `provider` untuk
   * model yang dipanggil. Dipasang SESUDAH `tambahanBadan`, jadi setelan peran
   * tidak bisa menimpa atau menghapusnya. Melempar = panggilan tidak dikirim.
   * `abaikan` (M2d-6): nama penyedia dari `OpsiChat.abaikanPenyedia`.
   */
  pagar?: (model: string, abaikan?: readonly string[]) => Readonly<Record<string, unknown>>;
  /** Disuntik tes. */
  fetch?: typeof fetch;
  tidur?: (ms: number) => Promise<void>;
  jam?: () => number;
}

export interface HasilChat {
  model: string;
  teks: string;
  /** Penalaran model bila penyedia mengirimnya terpisah (`reasoning_content`); `null` kalau tidak. */
  penalaran: string | null;
  finish_reason: string | null;
  token_masuk: number;
  token_keluar: number;
  latensi_ms: number;
  percobaan_http: number;
  /** `usage.cost` (tagihan nyata, USD) bila ada; `null` bila tidak. */
  biaya_penyedia_usd?: number | null;
  /** Penyedia yang melayani (medan `provider` respons), bila ada. */
  penyedia?: string | null;
  /** Token penalaran dari `usage.completion_tokens_details`, bila ada. */
  token_penalaran?: number | null;
}

/**
 * Galat klien. `pesan` sudah disamarkan; `status` `null` untuk batas waktu atau
 * galat jaringan. `ditolakPagu` dipakai `pagu.ts` supaya pemanggil bisa
 * membedakan "pagu tercapai" dari "server gagal".
 */
export class GalatLlm extends Error {
  readonly status: number | null;
  constructor(pesan: string, status: number | null) {
    super(pesan);
    this.name = 'GalatLlm';
    this.status = status;
  }
}

/**
 * Ganti setiap kemunculan rahasia di teks dengan `[disamarkan]`. Juga menyapu
 * pola kunci umum (`sk-…`, `Bearer …`) sebagai jaring kedua: kalau suatu hari
 * penyedia memantulkan kunci dalam bentuk yang sedikit berbeda, ia tetap tidak
 * lolos.
 */
export function samarkan(teks: string, rahasia: readonly string[]): string {
  let hasil = teks;
  for (const r of rahasia) {
    if (r.length === 0) continue;
    hasil = hasil.split(r).join('[disamarkan]');
  }
  return hasil
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/g, 'Bearer [disamarkan]')
    .replace(/\b(sk|rc|fl)-[A-Za-z0-9_\-]{6,}/g, '[disamarkan]');
}

const bawaanTidur = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const bawaanJeda = (ke: number): number => (ke === 1 ? 2000 : 6000);

function dapatDiulang(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

interface ResponsChat {
  model?: string;
  /** OpenRouter: nama penyedia yang melayani. */
  provider?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
      /** OpenRouter: rincian penalaran terstruktur (`reasoning.summary` / `reasoning.text` / `reasoning.encrypted`). */
      reasoning_details?: Array<{ type?: string; summary?: string | null; text?: string | null }> | null;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    /** OpenRouter: tagihan nyata dalam kredit (= USD). */
    cost?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

/**
 * M2d-16 D-4 (b): teks berpikir dari `reasoning_details` bila `reasoning` /
 * `reasoning_content` tidak ada — bagian `summary` dan `text` digabung;
 * bagian terenkripsi tidak punya teks dan dilewati. `null` bila kosong.
 */
export function teksRincianPenalaran(rincian: unknown): string | null {
  if (!Array.isArray(rincian)) return null;
  const bagian: string[] = [];
  for (const r of rincian as Array<Record<string, unknown> | null>) {
    if (typeof r !== 'object' || r === null) continue;
    const t = typeof r['summary'] === 'string' ? r['summary'] : typeof r['text'] === 'string' ? r['text'] : '';
    if (t.trim() !== '') bagian.push(t);
  }
  return bagian.length === 0 ? null : bagian.join('\n\n');
}

function angka(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/** Kirim satu permintaan chat. Melempar `GalatLlm` (tersamar) bila gagal. */
export async function chat(
  konfig: KonfigKlien,
  opsi: OpsiChat,
  kait: KaitPanggilan = {},
): Promise<HasilChat> {
  const ambil = konfig.fetch ?? fetch;
  const tidur = konfig.tidur ?? bawaanTidur;
  const jeda = konfig.jedaMs ?? bawaanJeda;
  const jam = konfig.jam ?? Date.now;
  const batasUlang = konfig.cobaUlang ?? 2;
  const batasWaktu = konfig.batasWaktuMs ?? 240_000;
  const rahasia = [konfig.apiKey];
  const url = `${konfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const pagar =
    konfig.pagar === undefined
      ? undefined
      : opsi.abaikanPenyedia === undefined || opsi.abaikanPenyedia.length === 0
        ? konfig.pagar(opsi.model)
        : konfig.pagar(opsi.model, opsi.abaikanPenyedia);
  const badan = JSON.stringify({
    ...(opsi.tambahanBadan ?? {}),
    model: opsi.model,
    messages: opsi.pesan,
    ...(opsi.tanpaSuhu === true ? {} : { temperature: opsi.suhu }),
    max_tokens: opsi.maxTokens,
    stream: false,
    ...(pagar === undefined ? {} : { provider: pagar }),
  });

  for (let percobaan = 1; ; percobaan++) {
    kait.sebelumKirim?.(percobaan);
    const mulai = jam();
    let respons: Response;
    try {
      respons = await ambil(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${konfig.apiKey}`,
        },
        body: badan,
        signal: AbortSignal.timeout(batasWaktu),
      });
    } catch (galat) {
      const latensi = jam() - mulai;
      const nama = galat instanceof Error ? galat.name : 'galat';
      const sebab =
        nama === 'TimeoutError' || nama === 'AbortError'
          ? `batas waktu ${String(Math.round(batasWaktu / 1000))} detik terlampaui`
          : `galat jaringan (${nama})`;
      const pesan = samarkan(`Panggilan ${opsi.model} gagal: ${sebab}.`, rahasia);
      kait.sesudahPercobaan?.({
        percobaan,
        status: null,
        token_masuk: null,
        token_keluar: null,
        latensi_ms: latensi,
        galat: pesan,
        mungkin_ditagih: true,
      });
      throw new GalatLlm(pesan, null);
    }

    /*
     * Batas waktu juga bisa jatuh SAAT MEMBACA BADAN, sesudah header tiba
     * (terukur putaran 2: GLM-5.3 × TIRT, 900 detik). Versi pertama klien ini
     * hanya membungkus `fetch`, sehingga galat itu lolos tanpa dicatat ke
     * ledger — panggilan yang mungkin ditagih tidak masuk akumulasi pagu.
     */
    let teksRespons: string;
    try {
      teksRespons = await respons.text();
    } catch (galat) {
      const nama = galat instanceof Error ? galat.name : 'galat';
      const pesan = samarkan(
        `Panggilan ${opsi.model} gagal saat membaca respons: ${
          nama === 'TimeoutError' || nama === 'AbortError'
            ? `batas waktu ${String(Math.round(batasWaktu / 1000))} detik terlampaui`
            : `galat jaringan (${nama})`
        }.`,
        rahasia,
      );
      kait.sesudahPercobaan?.({
        percobaan,
        status: respons.status,
        token_masuk: null,
        token_keluar: null,
        latensi_ms: jam() - mulai,
        galat: pesan,
        mungkin_ditagih: true,
      });
      throw new GalatLlm(pesan, null);
    }
    const latensi = jam() - mulai;

    if (!respons.ok) {
      const potongan = teksRespons.slice(0, 300).replace(/\s+/g, ' ');
      const pesan = samarkan(
        `Panggilan ${opsi.model} gagal: HTTP ${String(respons.status)} — ${potongan}`,
        rahasia,
      );
      kait.sesudahPercobaan?.({
        percobaan,
        status: respons.status,
        token_masuk: null,
        token_keluar: null,
        latensi_ms: latensi,
        galat: pesan,
        // 429 ditolak sebelum diproses; 5xx mungkin sudah diproses sebagian.
        mungkin_ditagih: respons.status !== 429 && respons.status >= 500,
      });
      if (dapatDiulang(respons.status) && percobaan <= batasUlang) {
        await tidur(jeda(percobaan));
        continue;
      }
      throw new GalatLlm(pesan, respons.status);
    }

    let data: ResponsChat;
    try {
      data = JSON.parse(teksRespons) as ResponsChat;
    } catch {
      const pesan = samarkan(`Panggilan ${opsi.model}: respons bukan JSON.`, rahasia);
      kait.sesudahPercobaan?.({
        percobaan,
        status: respons.status,
        token_masuk: null,
        token_keluar: null,
        latensi_ms: latensi,
        galat: pesan,
        mungkin_ditagih: true,
      });
      throw new GalatLlm(pesan, respons.status);
    }

    const masuk = data.usage?.prompt_tokens;
    const keluar = data.usage?.completion_tokens;
    const biayaPenyedia = angka(data.usage?.cost);
    const penyedia = typeof data.provider === 'string' && data.provider !== '' ? data.provider : null;
    const tokenPenalaran = angka(data.usage?.completion_tokens_details?.reasoning_tokens);
    const pilihan = data.choices?.[0];
    /*
     * HTTP 200 tanpa `choices` (terukur sekali di putaran 1, GLM-5.3: 200, tanpa
     * usage, isi kosong, 10 detik). Badannya dulu tidak tersimpan; kini ia
     * menjadi galat bertanda dengan potongan badan yang disamarkan.
     */
    if (pilihan === undefined) {
      const pesan = samarkan(
        `Panggilan ${opsi.model}: HTTP 200 tanpa choices — ${teksRespons.slice(0, 300).replace(/\s+/g, ' ')}`,
        rahasia,
      );
      kait.sesudahPercobaan?.({
        percobaan,
        status: respons.status,
        token_masuk: typeof masuk === 'number' ? masuk : null,
        token_keluar: typeof keluar === 'number' ? keluar : null,
        latensi_ms: latensi,
        galat: pesan,
        mungkin_ditagih: true,
        biaya_penyedia_usd: biayaPenyedia,
        penyedia,
        token_penalaran: tokenPenalaran,
      });
      throw new GalatLlm(pesan, respons.status);
    }
    kait.sesudahPercobaan?.({
      percobaan,
      status: respons.status,
      token_masuk: typeof masuk === 'number' ? masuk : null,
      token_keluar: typeof keluar === 'number' ? keluar : null,
      latensi_ms: latensi,
      galat: null,
      mungkin_ditagih: true,
      biaya_penyedia_usd: biayaPenyedia,
      penyedia,
      token_penalaran: tokenPenalaran,
    });
    return {
      model: data.model ?? opsi.model,
      teks: pilihan?.message?.content ?? '',
      penalaran: pilihan?.message?.reasoning_content ?? pilihan?.message?.reasoning ?? teksRincianPenalaran(pilihan?.message?.reasoning_details),
      finish_reason: pilihan?.finish_reason ?? null,
      token_masuk: typeof masuk === 'number' ? masuk : 0,
      token_keluar: typeof keluar === 'number' ? keluar : 0,
      latensi_ms: latensi,
      percobaan_http: percobaan,
      biaya_penyedia_usd: biayaPenyedia,
      penyedia,
      token_penalaran: tokenPenalaran,
    };
  }
}

/** Satu entri `GET /models`, hanya medan yang dipakai. */
export interface EntriModel {
  id: string;
  [medan: string]: unknown;
}

/** `GET ${baseUrl}/models` — tanpa biaya. Melempar `GalatLlm` tersamar bila gagal. */
export async function daftarModel(konfig: KonfigKlien): Promise<EntriModel[]> {
  const ambil = konfig.fetch ?? fetch;
  const rahasia = [konfig.apiKey];
  let respons: Response;
  try {
    respons = await ambil(`${konfig.baseUrl.replace(/\/+$/, '')}/models`, {
      method: 'GET',
      headers: { authorization: `Bearer ${konfig.apiKey}` },
      signal: AbortSignal.timeout(konfig.batasWaktuMs ?? 60_000),
    });
  } catch (galat) {
    const nama = galat instanceof Error ? galat.name : 'galat';
    throw new GalatLlm(samarkan(`GET /models gagal: galat jaringan (${nama}).`, rahasia), null);
  }
  const teks = await respons.text();
  if (!respons.ok) {
    throw new GalatLlm(
      samarkan(`GET /models gagal: HTTP ${String(respons.status)} — ${teks.slice(0, 300)}`, rahasia),
      respons.status,
    );
  }
  const data = JSON.parse(teks) as { data?: EntriModel[] };
  return Array.isArray(data.data) ? data.data : [];
}
