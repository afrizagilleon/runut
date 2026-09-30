/**
 * Validasi tanggal yang diketik penyusun (M2d-9 D-3) — murni.
 *
 * Tanggal ditolak dengan kalimat awam bila: bentuknya salah; di masa depan;
 * hari ini atau terlalu dekat dengan hari ini (belum ada "sesudahnya");
 * bukan hari bursa (akhir pekan atau libur — ditawarkan hari bursa terdekat
 * sebelum/sesudahnya); atau data emiten tidak cukup (tidak ada harga pada hari
 * itu, atau "sesudahnya" kurang dari jendela).
 *
 * "Hari bursa" = tanggal yang punya baris harga: di deret emiten itu sendiri,
 * atau (untuk tanggal di luar deretnya) di kalender gabungan seluruh gudang.
 * Bursa mencatat baris harga juga di hari penghentian, jadi hari suspensi tetap
 * hari bursa.
 */
import { tanggalId } from '../../factory/format.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { hariBursaEmiten, hariKerjaAntara, NAMA_JENIS, peristiwaKandidat, statusData, tambahHari, type StatusData } from './usulan.ts';

export type KodeTolak =
  | 'FORMAT'
  | 'MASA_DEPAN'
  | 'HARI_INI'
  | 'TERLALU_DEKAT'
  | 'BUKAN_HARI_BURSA'
  | 'TANPA_HARGA'
  | 'DATA_SESUDAH';

export interface Tawaran {
  tanggal: string;
  arah: 'sebelum' | 'sesudah';
  /** Tawaran itu sendiri lolos validasi. */
  sah: boolean;
}

export interface HasilPeriksaTanggal {
  sah: boolean;
  tanggal: string | null;
  kode: KodeTolak | null;
  /** Satu–dua kalimat awam. */
  alasan: string;
  tawaran: Tawaran[];
  status: StatusData | null;
  /** Peristiwa yang biasa disalahpahami pada hari itu (informasi, bukan syarat). */
  peristiwa: string[];
}

export interface OpsiTanggal {
  jendela: number;
  hariIni: string;
}

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hariPekan(t: string): number {
  return new Date(`${t}T00:00:00Z`).getUTCDay();
}

export function formatSah(teks: string): string | null {
  const t = teks.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t ? null : t;
}

/** Tanggal terakhir T sehingga masih ada ≥ `jendela` hari kerja antara T dan hari ini. */
export function batasDekat(hariIni: string, jendela: number): string {
  let t = tambahHari(hariIni, -1);
  while (hariKerjaAntara(t, hariIni) < jendela) t = tambahHari(t, -1);
  return t;
}

/** Tolak tanpa tawaran (dipakai juga untuk menilai tawaran itu sendiri). */
function periksaInti(t: string, data: DataEmiten, kalender: readonly string[], o: OpsiTanggal): { kode: KodeTolak | null; alasan: string } {
  const { hariIni, jendela } = o;
  if (t > hariIni) {
    return { kode: 'MASA_DEPAN', alasan: `${tanggalId(t)} ada di masa depan (hari ini ${tanggalId(hariIni)}). Simulasi membekukan hari yang sudah lewat, supaya ada "sesudahnya" yang bisa ditunjukkan.` };
  }
  if (t === hariIni) {
    return { kode: 'HARI_INI', alasan: 'Itu hari ini: perdagangannya belum selesai dan belum ada "sesudahnya" yang bisa ditunjukkan.' };
  }
  const kerja = hariKerjaAntara(t, hariIni);
  if (kerja < jendela) {
    return {
      kode: 'TERLALU_DEKAT',
      alasan:
        `Terlalu dekat dengan hari ini: sesudah ${tanggalId(t)} baru ada paling banyak ${String(kerja)} hari bursa, sedangkan "sesudahnya" ` +
        `perlu ≥ ${String(jendela)}. Pilih tanggal paling lambat ${tanggalId(batasDekat(hariIni, jendela))}, atau perkecil jendelanya.`,
    };
  }
  const hp = hariPekan(t);
  if (hp === 0 || hp === 6) {
    return { kode: 'BUKAN_HARI_BURSA', alasan: `${tanggalId(t)} hari ${NAMA_HARI[hp] ?? ''}: bursa tutup di akhir pekan.` };
  }
  const hari = hariBursaEmiten(data);
  const dalamKalender = kalender.length > 0 && t >= (kalender[0] ?? '') && t <= (kalender.at(-1) ?? '');
  if (!hari.includes(t) && dalamKalender && !kalender.includes(t)) {
    return { kode: 'BUKAN_HARI_BURSA', alasan: `${tanggalId(t)} bukan hari bursa: tidak ada satu pun emiten di data yang punya harga hari itu (hari libur bursa).` };
  }
  if (!hari.includes(t)) {
    const dari = hari[0];
    const sampai = hari.at(-1);
    return {
      kode: 'TANPA_HARGA',
      alasan:
        dari === undefined || sampai === undefined
          ? 'Emiten ini belum punya data harga harian di cache.'
          : `Tidak ada harga emiten ini pada ${tanggalId(t)}; data hariannya ada di ${tanggalId(dari)}–${tanggalId(sampai)} (dengan celah).`,
    };
  }
  const st = statusData(data, t, jendela);
  if (!st.sesudah_cukup) {
    const cukup = hari.filter((h) => statusData(data, h, jendela).sesudah_cukup).at(-1);
    return {
      kode: 'DATA_SESUDAH',
      alasan:
        `Data harga sesudah ${tanggalId(t)} hanya ${String(st.sesudah)} hari bursa; "sesudahnya" perlu ≥ ${String(jendela)}.` +
        (cukup === undefined ? '' : ` Pilih tanggal paling lambat ${tanggalId(cukup)}, atau perkecil jendelanya.`),
    };
  }
  return { kode: null, alasan: '' };
}

function tawarkan(t: string, data: DataEmiten, kalender: readonly string[], o: OpsiTanggal): Tawaran[] {
  const hari = hariBursaEmiten(data);
  const sumber = hari.length > 0 ? hari : [...kalender];
  const sebelum = [...sumber].reverse().find((h) => h < t);
  const sesudah = sumber.find((h) => h > t);
  const keluar: Tawaran[] = [];
  if (sebelum !== undefined) keluar.push({ tanggal: sebelum, arah: 'sebelum', sah: periksaInti(sebelum, data, kalender, o).kode === null });
  if (sesudah !== undefined) keluar.push({ tanggal: sesudah, arah: 'sesudah', sah: periksaInti(sesudah, data, kalender, o).kode === null });
  return keluar;
}

export function periksaTanggal(masukan: string, data: DataEmiten, kalender: readonly string[], o: OpsiTanggal): HasilPeriksaTanggal {
  const t = formatSah(masukan);
  if (t === null) {
    return { sah: false, tanggal: null, kode: 'FORMAT', alasan: 'Tulis tanggal sebagai TTTT-BB-HH, misalnya 2025-12-10.', tawaran: [], status: null, peristiwa: [] };
  }
  const inti = periksaInti(t, data, kalender, o);
  if (inti.kode !== null) {
    const tawaran = inti.kode === 'BUKAN_HARI_BURSA' || inti.kode === 'TANPA_HARGA' ? tawarkan(t, data, kalender, o) : [];
    return { sah: false, tanggal: t, kode: inti.kode, alasan: inti.alasan, tawaran, status: null, peristiwa: [] };
  }
  const st = statusData(data, t, o.jendela);
  const peristiwa = peristiwaKandidat(data).peristiwa.filter((p) => p.t === t).map((p) => `${NAMA_JENIS[p.jenis]}: ${p.alasan}`);
  return {
    sah: true,
    tanggal: t,
    kode: null,
    alasan:
      `${tanggalId(t)} sah: hari bursa dengan ${String(st.sesudah)} hari bursa "sesudahnya" di data.` +
      (peristiwa.length === 0 ? ' Tidak ada peristiwa yang biasa disalahpahami pada hari itu; bahan soalnya mungkin tipis.' : ''),
    tawaran: [],
    status: st,
    peristiwa,
  };
}
