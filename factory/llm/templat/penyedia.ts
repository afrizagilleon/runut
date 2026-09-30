/**
 * Amandemen A-1 M2d-10 (pra-registrasi `docs/bukti/m2d10-praregistrasi-a1.md` §2):
 * kritikus GLM DIKUNCI ke penyedia yang terbukti berpikir menurut ledger
 * (Wafer: 57/57 panggilan kritikus "high" berpikir ≥ 1.000 token, median
 * 12.983). Pagar kritikus = pagar M2d-7 + `order: ["wafer"]` +
 * `allow_fallbacks: false`, tanpa `ignore` ulangan (ulangan tetap ke Wafer).
 *
 * Bila Wafer tidak tersedia: diulang terbatas (3 percobaan, jeda 60 detik),
 * lalu jalan BERHENTI dengan `PenyediaTidakTersedia` — tidak pernah dialihkan
 * ke penyedia lain. Respons dari penyedia selain Wafer juga menghentikan jalan.
 * `PenyediaTidakTersedia` turunan `PaguTercapai` supaya menembus penangkap galat
 * gerbang (kritikus, penebak) seperti galat pagu, dan mesin berhenti.
 */
import { MODEL_OR_GLM } from '../model.ts';
import { PaguTercapai } from '../pagu.ts';
import { pagarM2d7 } from '../penyedia-urutan.ts';

export const SLUG_PENYEDIA_KRITIKUS = 'wafer';
export const NAMA_PENYEDIA_KRITIKUS = 'Wafer';
export const ULANG_KRITIKUS = { kali: 3, jedaMs: 60_000 } as const;

export class PenyediaTidakTersedia extends PaguTercapai {
  constructor(pesan: string, model: string) {
    super(0, 0, 0, model);
    this.name = 'PenyediaTidakTersedia';
    this.message = pesan.slice(0, 500);
  }
}

/** Pagar provider kritikus A-1: hanya Wafer, tanpa fallback, tanpa `ignore`. */
export function pagarKritikusTerkunci(model: string, _abaikan: readonly string[] = []): Readonly<Record<string, unknown>> {
  if (model !== MODEL_OR_GLM) throw new Error(`Pagar kritikus hanya untuk ${MODEL_OR_GLM}.`);
  const { ignore: _i, ...dasar } = pagarM2d7(model) as Record<string, unknown>;
  void _i;
  return { ...dasar, order: [SLUG_PENYEDIA_KRITIKUS], allow_fallbacks: false };
}

/**
 * Bungkus satu pemanggil kritikus: ulang terbatas bila galat (bukan pagu),
 * berhenti bila tetap gagal atau bila penyedia yang melayani bukan Wafer.
 */
export function kritikusTerkunci<A extends unknown[], J extends { penyedia?: string | null }>(
  panggil: (...a: A) => Promise<J>,
  opsi: { kali?: number; jedaMs?: number; tidur?: (ms: number) => Promise<void>; model?: string } = {},
): (...a: A) => Promise<J> {
  const kali = opsi.kali ?? ULANG_KRITIKUS.kali;
  const jeda = opsi.jedaMs ?? ULANG_KRITIKUS.jedaMs;
  const tidur = opsi.tidur ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const model = opsi.model ?? MODEL_OR_GLM;
  return async (...a: A) => {
    let terakhir = '';
    for (let i = 0; i < kali; i++) {
      try {
        const j = await panggil(...a);
        if (j.penyedia !== undefined && j.penyedia !== null && j.penyedia !== NAMA_PENYEDIA_KRITIKUS) {
          throw new PenyediaTidakTersedia(`kritikus dilayani "${j.penyedia}", bukan ${NAMA_PENYEDIA_KRITIKUS}, walau fallback dimatikan; jalan berhenti (A-1).`, model);
        }
        return j;
      } catch (galat) {
        if (galat instanceof PaguTercapai) throw galat;
        terakhir = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
        if (i < kali - 1) await tidur(jeda);
      }
    }
    throw new PenyediaTidakTersedia(`kritikus: penyedia ${NAMA_PENYEDIA_KRITIKUS} tidak tersedia sesudah ${String(kali)} percobaan (${terakhir.slice(0, 200)}); jalan berhenti, tidak dialihkan (A-1).`, model);
  };
}
