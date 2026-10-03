/**
 * Pemanggil OpenRouter v3 (M2d-16 D-4) untuk mesin v3 — BERDAMPINGAN dengan
 * `panggilSungguhan` (`mesin.ts`), yang tidak diubah.
 *
 * Bedanya dengan pemanggil lama:
 * - tiap panggilan memakai pagar penyedia PERAN-nya (`pagarPeranV2`: satu
 *   slug, `allow_fallbacks: false`); jenis × model di luar tabel ditolak
 *   sebelum kirim; respons dari penyedia lain menghentikan jalan;
 * - tiap jawaban (isi + teks berpikir) ditulis ke `mentah-panggilan.jsonl` di
 *   folder jalan SEBELUM diperiksa apa pun;
 * - pagu memakai perkiraan pra-kirim wajar untuk Opus (`perkiraanWajarV2`);
 *   biaya = `usage.cost` setiap kali ada respons.
 *
 * Kunci dibaca dari `.env` oleh kode ini (`bacaKonfigLlm`) saat pemanggil
 * dibuat, hanya berpindah ke header klien, dan disamarkan di berkas mentah.
 */
import { bacaKonfigLlm } from '../../factory/llm/env.ts';
import type { KonfigKlien, PesanChat } from '../../factory/llm/klien.ts';
import { MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';
import { chatBerpagu, PencatatBiaya } from '../../factory/llm/pagu.ts';
import { pagarPeranV2, PencatatMentah, peranV2, periksaPenyedia, perkiraanWajarV2, tagV2 } from '../../factory/llm/pemanggil-v2.ts';
import { ubahGalatSaldo } from '../../factory/llm/peran-susun.ts';
import type { JawabanModel, SetelanPanggil } from '../../factory/llm/susun.ts';
import type { InfoTemplat, PanggilTemplat } from '../../factory/llm/templat/penulis.ts';
import { kritikusTerkunci } from '../../factory/llm/templat/penyedia.ts';
import { jalurLedger } from './biaya.ts';

/** Batas waktu satu percobaan HTTP. Opus dengan jendela 128.000 token bisa lama; model lain 15 menit seperti pintu lama. */
export const BATAS_WAKTU_V3_MS = { opus: 1_800_000, lain: 900_000 } as const;

export interface OpsiPanggilV3 {
  akar: string;
  /** Pagu atas semua entri bertag `awalanMilestone`. */
  paguMilestoneUsd: number;
  awalanMilestone: string;
  log?: (baris: string) => void;
  /** Disuntik tes (tanpa jaringan). */
  fetch?: typeof fetch;
  jam?: () => Date;
  /** Jeda ulangan kritikus (tes). */
  tidur?: (ms: number) => Promise<void>;
}

/**
 * Pembuat pemanggil untuk satu jalan: `awalanTag` (mis. `penyusun/<id>/`),
 * pagu jalan (pagu bagian atas tag itu), dan jalur `mentah-panggilan.jsonl`.
 */
export function panggilV3(o: OpsiPanggilV3): (awalanTag: string, paguJalanUsd: number, jalurMentah: string) => PanggilTemplat {
  return (awalanTag, paguJalanUsd, jalurMentah) => {
    const konfig = bacaKonfigLlm(o.akar);
    if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); pemanggil v3 hanya memanggil OpenRouter.');
    const biaya = new PencatatBiaya({
      paguUsd: konfig.paguUsd,
      jalurLedger: jalurLedger(o.akar),
      biayaNyata: true,
      paguMilestone: { usd: o.paguMilestoneUsd, awalanTag: o.awalanMilestone },
      paguBagian: [{ usd: paguJalanUsd, awalanTag }],
      perkiraanWajar: perkiraanWajarV2,
      ...(o.jam === undefined ? {} : { jam: o.jam }),
    });
    const mentah = new PencatatMentah(jalurMentah, [konfig.apiKey], o.jam);
    const dasar = async (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoTemplat): Promise<JawabanModel> => {
      const peran = peranV2(info); // melempar sebelum kirim bila jenis × model tidak terkunci
      const tag = tagV2(awalanTag, info);
      const klien: KonfigKlien = {
        baseUrl: konfig.baseUrl,
        apiKey: konfig.apiKey,
        batasWaktuMs: info.model === MODEL_OR_OPUS ? BATAS_WAKTU_V3_MS.opus : BATAS_WAKTU_V3_MS.lain,
        pagar: () => pagarPeranV2(peran),
        ...(o.fetch === undefined ? {} : { fetch: o.fetch }),
      };
      let j: JawabanModel;
      try {
        j = await chatBerpagu(
          klien,
          biaya,
          { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, ...(setelan.tambahanBadan === undefined ? {} : { tambahanBadan: setelan.tambahanBadan }) },
          tag,
          setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
        );
      } catch (galat) {
        throw ubahGalatSaldo(galat, info.model);
      }
      mentah.catat(tag, peran, info, setelan, j);
      o.log?.(`  ${tag}: masuk ${String(j.token_masuk)} keluar ${String(j.token_keluar)} penalaran ${String(j.token_penalaran ?? '-')} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)} ${String(j.penyedia)}`);
      periksaPenyedia(peran, j.penyedia);
      return j;
    };
    // Kritikus: ulang terbatas bila galat, lalu berhenti (A-1 M2d-10); penyedianya sudah dikunci tabel.
    const kritikus = kritikusTerkunci(dasar, o.tidur === undefined ? {} : { tidur: o.tidur });
    return (pesan, setelan, info) => (info.jenis === 'kritikus' ? kritikus(pesan, setelan, info) : dasar(pesan, setelan, info));
  };
}
