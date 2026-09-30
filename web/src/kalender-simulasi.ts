/**
 * Kalender simulasi (M3.14 D-3), sebagai fungsi murni.
 *
 * Satu halaman kalender per bulan yang PUNYA simulasi; di halaman itu hanya
 * hari bursa yang benar-benar dibekukan menjadi simulasi yang ditandai. Tidak
 * ada hari "segera hadir", tidak ada bulan kosong: jumlah tanda di kalender
 * selalu sama dengan jumlah simulasi di `DAFTAR_KASUS` (dites), jadi bentuknya
 * sama masuk akalnya dengan 2 simulasi maupun 100.
 *
 * Yang sudah selesai (ketiga soal dikunci dan layar "Waktu berjalan lagi"
 * tercapai) diberi tanda. Daftarnya disimpan di `localStorage`
 * (`simulasi_selesai`) — isinya nama simulasi, bukan jawaban — dan setiap
 * akses dibungkus: penyimpanan yang mati berarti "belum ada yang selesai",
 * kalendernya tetap benar dan tetap bisa dipakai.
 */
import type { Kasus } from '../../factory/skema/tipe.ts';
import type { Penyimpanan } from './sesi.ts';
import { penanda } from './tanggal.ts';

/** Kunci `localStorage` keempat repo ini (tiga lainnya di README, "Nomor pengunjung"). */
export const KUNCI_SIMULASI_SELESAI = 'simulasi_selesai';

/** Berapa yang diingat; alasan yang sama dengan `MAKS_DIMAINKAN`. */
export const MAKS_SELESAI = 200;

const POLA_KASUS_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Daftar simulasi yang sudah selesai. Tidak pernah melempar. */
export function bacaSelesai(penyimpanan: Penyimpanan | null): string[] {
  if (penyimpanan === null) return [];
  try {
    const mentah = penyimpanan.getItem(KUNCI_SIMULASI_SELESAI);
    if (mentah === null) return [];
    const isi: unknown = JSON.parse(mentah);
    if (!Array.isArray(isi)) return [];
    return isi.filter((x): x is string => typeof x === 'string' && POLA_KASUS_ID.test(x));
  } catch {
    return [];
  }
}

/** Tambah satu simulasi ke daftar selesai; penyimpanan yang mati diabaikan. */
export function catatSelesai(penyimpanan: Penyimpanan | null, kasus_id: string): void {
  if (penyimpanan === null || !POLA_KASUS_ID.test(kasus_id)) return;
  try {
    const lama = bacaSelesai(penyimpanan);
    if (lama.includes(kasus_id)) return;
    const baru = [...lama, kasus_id];
    penyimpanan.setItem(
      KUNCI_SIMULASI_SELESAI,
      JSON.stringify(baru.slice(Math.max(0, baru.length - MAKS_SELESAI))),
    );
  } catch {
    /* Penyimpanan yang tidak bisa dipakai bukan alasan menghentikan permainan. */
  }
}

export interface SelHari {
  /** Tanggal di bulan itu, 1–31. */
  angka: number;
  iso: string;
  /** Sabtu/Minggu: bursa tutup. */
  akhirPekan: boolean;
  /** Simulasi pada hari ini, kalau ada. */
  kasus_id: string | null;
  selesai: boolean;
}

export interface EntriSimulasi {
  kasus_id: string;
  iso: string;
  /** "Rabu, 8 Oktober 2025" */
  tanggal: string;
  /** "Perusahaan D" — nama samaran; nama asli baru dibuka di akhir simulasi. */
  nama_samaran: string;
  jumlah_soal: number;
  selesai: boolean;
  /** Simulasi yang sedang/baru saja dibuka di pemuatan ini. */
  kini: boolean;
}

export interface BulanKalender {
  /** "2025-10" */
  kunci: string;
  /** "OKTOBER 2025" — pita halaman kalender, sama dengan `penanda().bulanTahun`. */
  pita: string;
  /** Baris minggu, Senin dulu; `null` = sel di luar bulan ini. */
  minggu: Array<Array<SelHari | null>>;
  simulasi: EntriSimulasi[];
}

/** Kepala kolom, Senin dulu seperti kalender dinding di Indonesia. */
export const KEPALA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

function dua(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Susun kalender dari daftar simulasi yang NYATA.
 *
 * Satu bulan per bulan yang punya simulasi, urut waktu; satu tanda per
 * simulasi. Simulasi dengan tanggal yang tidak sah dilewati (bukan dilempar):
 * validator kasus sudah menjaganya, dan kalender yang jatuh tidak boleh
 * menjatuhkan layar terima kasih.
 */
export function susunKalender(
  daftar: readonly Kasus[],
  selesai: readonly string[],
  kini: string | null = null,
): BulanKalender[] {
  const perBulan = new Map<string, Kasus[]>();
  for (const kasus of daftar) {
    const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(kasus.tanggal_t);
    if (cocok === null) continue;
    try {
      penanda(kasus.tanggal_t);
    } catch {
      continue;
    }
    const kunci = `${cocok[1] ?? ''}-${cocok[2] ?? ''}`;
    perBulan.set(kunci, [...(perBulan.get(kunci) ?? []), kasus]);
  }
  return [...perBulan.keys()].sort().map((kunci) => {
    const [tahun, bulan] = kunci.split('-').map(Number) as [number, number];
    const kasusBulan = (perBulan.get(kunci) ?? []).slice().sort((a, b) => a.tanggal_t.localeCompare(b.tanggal_t));
    const hariSimulasi = new Map(kasusBulan.map((k) => [k.tanggal_t, k.kasus_id]));
    const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
    // getUTCDay: 0 = Minggu. Kolom 0 = Senin.
    const kolomPertama = (new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay() + 6) % 7;
    const sel: Array<SelHari | null> = Array.from({ length: kolomPertama }, () => null);
    for (let angka = 1; angka <= jumlahHari; angka += 1) {
      const iso = `${String(tahun)}-${dua(bulan)}-${dua(angka)}`;
      const kolom = (kolomPertama + angka - 1) % 7;
      const kasus_id = hariSimulasi.get(iso) ?? null;
      sel.push({
        angka,
        iso,
        akhirPekan: kolom >= 5,
        kasus_id,
        selesai: kasus_id !== null && selesai.includes(kasus_id),
      });
    }
    while (sel.length % 7 !== 0) sel.push(null);
    const minggu: Array<Array<SelHari | null>> = [];
    for (let i = 0; i < sel.length; i += 7) minggu.push(sel.slice(i, i + 7));
    return {
      kunci,
      pita: penanda(`${kunci}-01`).bulanTahun,
      minggu,
      simulasi: kasusBulan.map((k) => {
        const p = penanda(k.tanggal_t);
        return {
          kasus_id: k.kasus_id,
          iso: k.tanggal_t,
          tanggal: `${p.hari}, ${p.panjang}`,
          nama_samaran: k.nama_samaran,
          jumlah_soal: k.soal.length,
          selesai: selesai.includes(k.kasus_id),
          kini: k.kasus_id === kini,
        };
      }),
    };
  });
}

/** Label baris satu simulasi, untuk tombol dan pembaca layar. */
export function labelSimulasi(e: EntriSimulasi): string {
  return `${e.tanggal} · ${e.nama_samaran} · ${String(e.jumlah_soal)} soal`;
}

/** Keterangan status satu simulasi di baris kalender. */
export function statusSimulasi(e: EntriSimulasi): string {
  if (e.kini && e.selesai) return 'Baru saja kamu selesaikan';
  if (e.selesai) return 'Sudah kamu selesaikan';
  if (e.kini) return 'Sedang kamu buka';
  return 'Belum dimainkan';
}
