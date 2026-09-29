/**
 * Harga per model, USD per SATU JUTA token.
 *
 * **M2d-5 (OpenRouter): angka ini BATAS, bukan tebakan.** Setiap permintaan
 * membawa `provider.max_price` dengan angka yang sama (`openrouter.ts`), jadi
 * OpenRouter tidak akan memilih penyedia yang lebih mahal dari ini. Karena
 * itu perkiraan sebelum-kirim = harga ini × (token masuk + `max_tokens`) adalah
 * batas atas yang sungguh-sungguh. Biaya yang DICATAT ledger bukan hitungan
 * dari tabel ini, melainkan `usage.cost` dari respons (tagihan nyata); tabel
 * hanya dipakai untuk perkiraan sebelum kirim, dan sebagai perkiraan maksimum
 * bila respons tidak membawa `usage.cost`.
 *
 * Angkanya = harga daftar standar penyedia termahal yang wajar (DeepSeek resmi
 * 0,30/1,20; Z.AI resmi 1,40/4,40), dari
 * `.contracts/lampiran/M-02d5/openrouter-endpoints-29sep.txt` (GET
 * `/models/<id>/endpoints`, 29 Sep 2026). Penyedia yang lebih mahal dari itu
 * (mis. `fireworks/us`, `baseten/fast`, `alibaba/fast`) tersaring `max_price`.
 *
 * **Kenapa tabel lama diganti.** Di M2d-2…M2d-4 (Featherless) tabel berisi
 * tebakan "konservatif" (2× harga OpenRouter yang dikutip, dan angka penjaga
 * GLM 1,00/3,00). Temuan reviewer M2d-5: kredit Featherless turun ±US$14,5
 * sementara ledger mencatat US$7,72 — tebakan itu ±separuh tagihan nyata, jadi
 * pagu kode tidak konservatif seperti klaimnya. Tabel lama disimpan sebagai
 * `HARGA_FEATHERLESS_USANG` hanya untuk laporan lama yang mengutipnya; pagu
 * tidak memakainya, sehingga model Featherless tidak bisa dipanggil lagi.
 */
import type { ModelOpenRouter, ModelTanding } from './model.ts';

export interface HargaModel {
  /** USD per juta token masuk. */
  masuk: number;
  /** USD per juta token keluar. */
  keluar: number;
  /** Dari mana angkanya dan kapan ditetapkan. */
  sumber: string;
}

const SUMBER_LAMPIRAN =
  'batas max_price = harga daftar standar, .contracts/lampiran/M-02d5/openrouter-endpoints-29sep.txt (GET /models/<id>/endpoints, 29 Sep 2026)';

/** Batas harga OpenRouter M2d-5 — dipakai pagu (perkiraan sebelum kirim) DAN dikirim sebagai `provider.max_price`. */
export const HARGA: Readonly<Record<ModelOpenRouter, HargaModel>> = {
  'deepseek/deepseek-v4.1-flash': { masuk: 0.3, keluar: 1.2, sumber: `DeepSeek resmi 0,30/1,20; ${SUMBER_LAMPIRAN}` },
  'z-ai/glm-5.3': { masuk: 1.4, keluar: 4.4, sumber: `Z.AI resmi 1,40/4,40; ${SUMBER_LAMPIRAN}` },
};

/**
 * Tabel tebakan M2d-1…M2d-4 (Featherless), USANG. Hanya untuk laporan lama
 * (`laporan.ts` mengutipnya apa adanya); pagu tidak membacanya.
 */
export const HARGA_FEATHERLESS_USANG: Readonly<Record<ModelTanding, HargaModel>> = {
  'deepseek-ai/DeepSeek-V4.1-Flash': {
    masuk: 0.196,
    keluar: 0.392,
    sumber: '2x harga OpenRouter DeepSeek V4 Flash (0,098/0,196), dikutip kontrak M2d D-2, 27 Sep 2026',
  },
  'zai-org/GLM-5.3-Flash': {
    masuk: 0.15,
    keluar: 0.5,
    sumber: '2x harga OpenRouter GLM 5.3 Flash (0,075/0,25), dikutip kontrak M2d D-2, 27 Sep 2026',
  },
  'zai-org/GLM-5.3': {
    masuk: 1.0,
    keluar: 3.0,
    sumber: 'angka penjaga kontrak M2d D-2 (1,00/3,00) sampai ada harga resmi, 27 Sep 2026',
  },
};

/** Biaya dalam USD untuk sejumlah token masuk dan keluar. */
export function biayaUsd(harga: HargaModel, tokenMasuk: number, tokenKeluar: number): number {
  return (tokenMasuk * harga.masuk + tokenKeluar * harga.keluar) / 1_000_000;
}
