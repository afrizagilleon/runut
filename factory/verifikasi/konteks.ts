/**
 * Ubah data satu emiten dari gudang menjadi konteks verifikasi.
 *
 * Satu-satunya tempat keputusan "angka mana yang jadi penyebut" diambil, supaya
 * aturan tidak masing-masing memilih sendiri.
 */
import type { DataEmiten, KonteksVerifikasi } from './tipe.ts';
import { bangunSahamBeredarPada, titikPenyebut } from './penyebut.ts';

/**
 * Jumlah saham beredar **tanpa tanggal**, seperti yang dipakai jalur generasi
 * pertama: titik yang tanggalnya paling akhir.
 *
 * Dihitung di sini supaya bisa diadu langsung dengan `sahamBeredarPada` —
 * inilah angka yang membuat R7 menolak laporan lama.
 */
export function sahamBeredarTerbaru(data: DataEmiten): number | null {
  const titik = titikPenyebut(data);
  const terakhir = titik[titik.length - 1];
  return terakhir === undefined ? null : terakhir.lembar;
}

export function konteksEmiten(data: DataEmiten): KonteksVerifikasi {
  return {
    simbol: data.simbol,
    laporan: data.laporan,
    harga: data.harga,
    suspensi: data.suspensi,
    saham_beredar: sahamBeredarTerbaru(data),
    sahamBeredarPada: bangunSahamBeredarPada(titikPenyebut(data)),
    potret: null,
    tanda_repo: {},
  };
}
