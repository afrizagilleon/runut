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
  maxTokens: number;
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
  /** Disuntik tes. */
  fetch?: typeof fetch;
  tidur?: (ms: number) => Promise<void>;
  jam?: () => number;
}

export interface HasilChat {
  model: string;
  teks: string;
  finish_reason: string | null;
  token_masuk: number;
  token_keluar: number;
  latensi_ms: number;
  percobaan_http: number;
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
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
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
  const badan = JSON.stringify({
    model: opsi.model,
    messages: opsi.pesan,
    temperature: opsi.suhu,
    max_tokens: opsi.maxTokens,
    stream: false,
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

    const teksRespons = await respons.text();
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
    const pilihan = data.choices?.[0];
    kait.sesudahPercobaan?.({
      percobaan,
      status: respons.status,
      token_masuk: typeof masuk === 'number' ? masuk : null,
      token_keluar: typeof keluar === 'number' ? keluar : null,
      latensi_ms: latensi,
      galat: null,
      mungkin_ditagih: true,
    });
    return {
      model: data.model ?? opsi.model,
      teks: pilihan?.message?.content ?? '',
      finish_reason: pilihan?.finish_reason ?? null,
      token_masuk: typeof masuk === 'number' ? masuk : 0,
      token_keluar: typeof keluar === 'number' ? keluar : 0,
      latensi_ms: latensi,
      percobaan_http: percobaan,
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
