/**
 * Data emiten buatan untuk uji pintu penyusun: `DataEmiten` lengkap dengan
 * medan kosong, dan deret harga hari kerja.
 */
import type { BarisHarga, DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { tambahHari } from './usulan.ts';

export function dataKosong(simbol = 'UJIX'): DataEmiten {
  return {
    simbol,
    laporan: [],
    harga: [],
    suspensi: [],
    berkas_laporan: [],
    stock_split: [],
    right_issue: [],
    bonus: [],
    dividen: [],
    rups: [],
    all_time_price: [],
    pemegang: [],
    saham_tahunan: [],
    keuangan_tahunan: [],
    eps_tahunan: [],
    rasio: [],
    ringkasan_pasar: null,
    berkas: [],
    nama_perusahaan: 'PT Uji Coba Sejahtera Tbk',
  };
}

/** Deret harga hari kerja (Senin–Jumat) mulai `dari`, `tutup` dari fungsi indeks. */
export function deretHarga(dari: string, jumlah: number, tutup: (i: number) => number = () => 100, volume: (i: number) => number = () => 1000): BarisHarga[] {
  const keluar: BarisHarga[] = [];
  let t = dari;
  while (keluar.length < jumlah) {
    const h = new Date(`${t}T00:00:00Z`).getUTCDay();
    if (h !== 0 && h !== 6) {
      const i = keluar.length;
      const c = tutup(i);
      keluar.push({ tanggal: t, buka: c, tertinggi: c, terendah: c, tutup: c, volume: volume(i), nilai_pasar: c * 1e6 });
    }
    t = tambahHari(t, 1);
  }
  return keluar;
}
