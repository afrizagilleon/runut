/**
 * Tabel harga per model, USD per SATU JUTA token (M2d D-2).
 *
 * Satu-satunya tempat angka harga ditulis. Semuanya **konservatif**: harga
 * Featherless untuk pemakaian kredit tidak diketahui pasti (paketnya
 * langganan, dan `GET /models` — tempat metadata model biasanya dibaca —
 * menjawab 404 "Gone." pada 27 Sep 2026), jadi yang dipakai adalah angka yang
 * lebih tinggi dari harga pasar yang diketahui. Biaya yang terlalu tinggi
 * membuat pagu terpicu lebih awal; biaya yang terlalu rendah membuat pagu tidak
 * pernah terpicu — dan itu kegagalan yang disebut kontrak dengan namanya.
 *
 * Tafsiran kontrak yang dipakai (ditulis supaya reviewer bisa menolaknya):
 * "pakai 2× harga OpenRouter yang diketahui (DeepSeek V4 Flash 0,098/0,196;
 * GLM 5.3 Flash 0,075/0,25)" dibaca sebagai: angka di dalam kurung adalah
 * harga OpenRouter, lalu DIKALIKAN DUA. Tafsiran lain (angka itu sudah 2×)
 * memberi harga setengahnya — lebih murah, jadi kurang konservatif.
 */
import type { ModelTanding } from './model.ts';

export interface HargaModel {
  /** USD per juta token masuk. */
  masuk: number;
  /** USD per juta token keluar. */
  keluar: number;
  /** Dari mana angkanya dan kapan ditetapkan. */
  sumber: string;
}

export const HARGA: Readonly<Record<ModelTanding, HargaModel>> = {
  'deepseek-ai/DeepSeek-V4.1-Flash': {
    // 2 × 0,098 / 2 × 0,196 — harga OpenRouter DeepSeek V4 Flash yang dikutip
    // kontrak M2d D-2 (ditulis pemilik/penulis kontrak 27 Sep 2026).
    masuk: 0.196,
    keluar: 0.392,
    sumber: '2x harga OpenRouter DeepSeek V4 Flash (0,098/0,196), dikutip kontrak M2d D-2, 27 Sep 2026',
  },
  'zai-org/GLM-5.3-Flash': {
    // 2 × 0,075 / 2 × 0,25 — harga OpenRouter GLM 5.3 Flash yang dikutip
    // kontrak M2d D-2 (27 Sep 2026).
    masuk: 0.15,
    keluar: 0.5,
    sumber: '2x harga OpenRouter GLM 5.3 Flash (0,075/0,25), dikutip kontrak M2d D-2, 27 Sep 2026',
  },
  'zai-org/GLM-5.3': {
    // Angka penjaga dari kontrak M2d D-2 "sampai ada angka resmi" (27 Sep 2026).
    masuk: 1.0,
    keluar: 3.0,
    sumber: 'angka penjaga kontrak M2d D-2 (1,00/3,00) sampai ada harga resmi, 27 Sep 2026',
  },
};

/** Biaya dalam USD untuk sejumlah token masuk dan keluar. */
export function biayaUsd(harga: HargaModel, tokenMasuk: number, tokenKeluar: number): number {
  return (tokenMasuk * harga.masuk + tokenKeluar * harga.keluar) / 1_000_000;
}
