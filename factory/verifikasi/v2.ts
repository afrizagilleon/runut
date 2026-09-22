/**
 * Himpunan aturan generasi kedua (M2a D-5).
 *
 * `ATURAN_V1` (di `aturan.ts`) membangun berkas kasus dan **tidak berubah**.
 * `ATURAN_V2` adalah yang dijalankan `npm run verifikasi:gudang`: aturan lama
 * yang masih berlaku, ditambah aturan M2a, dengan urutan jalan dan
 * ketergantungan yang tertulis.
 *
 * Aturan yang **digantikan** aturan M2a tidak dihapus dari daftar — ia tetap
 * muncul sebagai dilewati beserta alasannya, supaya tidak ada aturan yang
 * hilang diam-diam dan pembaca bisa melihat apa yang diganti oleh apa.
 */
import type { KodeAturan } from '../skema/tipe.ts';
import type { HasilAturan, KonteksGudang } from './tipe.ts';
import { lewat } from './dasar.ts';
import {
  r3LaporanGanda,
  r4TanggalKetersediaan,
  r5Rekonsiliasi,
  r8TandaRepo,
  r9TeksVersusField,
} from './aturan.ts';
import {
  r7PersenPerTanggal,
  r11aPenyebutDuaSisi,
  r12TanggalNamaBerkas,
  r13LembarLebihBesarDariModal,
  r14RantaiPutus,
  r15Aritmetika,
  r16JamTerbit,
  r17bHargaHariTransaksi,
  r18aVolumeNolTanpaSuspensi,
  r19aDatarTanpaVolume,
  r19bRuntunDatar,
  r22NamaPemegang,
  r25KelengkapanHalaman,
  r28LabelDeretHarga,
  r33SahamTersiratGoyah,
  r35AllTimePrice,
} from './aturan-v2.ts';
import {
  r11bPenyebutRantai,
  r20BasisLabaPerLembar,
  r21SahamBedaSumber,
  r23LabaBedaEndpoint,
  r26PembagianLaba,
  r27RasioSiapPakai,
  r29HargaDiTanggalEx,
  r34AksiTanpaHarga,
  r31DividenRupsVersusMedan,
  r32PerubahanSahamVsAksi,
} from './aturan-keuangan.ts';

export interface EntriAturan {
  kode: KodeAturan;
  /** Nomor urut jalan; kecil lebih dulu. */
  urutan: number;
  /** Kode aturan yang hasilnya dipakai aturan ini. Hanya keterangan, bukan pemicu. */
  bergantung: KodeAturan[];
  jalankan: (konteks: KonteksGudang) => HasilAturan;
}

/** Aturan lama yang sengaja tidak dijalankan di V2, beserta alasannya. */
function digantikan(
  kode: KodeAturan,
  judul: string,
  satuan: string,
  alasan: string,
): (konteks: KonteksGudang) => HasilAturan {
  return (konteks) => lewat(kode, judul, alasan, satuan, konteks.laporan.length);
}

/**
 * Urutan jalan, mengikuti uji lawan §6.1: gerbang lebih dulu, lalu penyebut,
 * lalu rantai, lalu harga, lalu label, lalu kelompok keuangan dan peristiwa
 * korporasi. Aturan lama yang digantikan ditaruh tepat sesudah penggantinya,
 * supaya pembaca melihat apa yang diganti oleh apa.
 */
export const ATURAN_V2: readonly EntriAturan[] = [
  { kode: 'R25', urutan: 1, bergantung: [], jalankan: r25KelengkapanHalaman },
  { kode: 'R12', urutan: 2, bergantung: [], jalankan: r12TanggalNamaBerkas },
  { kode: 'R22', urutan: 3, bergantung: ['R12'], jalankan: r22NamaPemegang },
  { kode: 'R20', urutan: 4, bergantung: [], jalankan: r20BasisLabaPerLembar },
  { kode: 'R32', urutan: 5, bergantung: ['R20'], jalankan: r32PerubahanSahamVsAksi },
  { kode: 'R21', urutan: 6, bergantung: ['R32'], jalankan: r21SahamBedaSumber },
  { kode: 'R33', urutan: 7, bergantung: [], jalankan: r33SahamTersiratGoyah },
  { kode: 'R15', urutan: 8, bergantung: [], jalankan: r15Aritmetika },
  {
    kode: 'R1',
    urutan: 9,
    bergantung: ['R15'],
    jalankan: digantikan(
      'R1',
      'Aritmetika per laporan',
      'laporan',
      'Digantikan R15, yang memeriksa hal yang sama dan juga menangani transaction_type "others". Menjalankan keduanya akan melahirkan dua temuan untuk satu cacat data.',
    ),
  },
  { kode: 'R11a', urutan: 10, bergantung: [], jalankan: r11aPenyebutDuaSisi },
  { kode: 'R11b', urutan: 11, bergantung: ['R11a', 'R12'], jalankan: r11bPenyebutRantai },
  { kode: 'R7', urutan: 12, bergantung: ['R33'], jalankan: r7PersenPerTanggal },
  { kode: 'R14', urutan: 13, bergantung: ['R25', 'R12', 'R22'], jalankan: r14RantaiPutus },
  { kode: 'R16', urutan: 14, bergantung: ['R12', 'R14'], jalankan: r16JamTerbit },
  {
    kode: 'R2',
    urutan: 15,
    bergantung: ['R14'],
    jalankan: digantikan(
      'R2',
      'Kontinuitas rantai',
      'sambungan',
      'Digantikan R14, yang memeriksa hal yang sama tetapi mengurutkan rantai dengan tanggal nama berkas (R12) dan menyatukan ejaan nama pemegang (R22).',
    ),
  },
  { kode: 'R13', urutan: 16, bergantung: ['R33'], jalankan: r13LembarLebihBesarDariModal },
  { kode: 'R3', urutan: 17, bergantung: [], jalankan: r3LaporanGanda },
  { kode: 'R4', urutan: 18, bergantung: ['R12'], jalankan: r4TanggalKetersediaan },
  { kode: 'R5', urutan: 19, bergantung: [], jalankan: r5Rekonsiliasi },
  { kode: 'R8', urutan: 20, bergantung: [], jalankan: r8TandaRepo },
  { kode: 'R9', urutan: 21, bergantung: [], jalankan: r9TeksVersusField },
  { kode: 'R17B', urutan: 22, bergantung: ['R8'], jalankan: r17bHargaHariTransaksi },
  {
    kode: 'R6',
    urutan: 23,
    bergantung: ['R17B'],
    jalankan: digantikan(
      'R6',
      'Subjek laporan dan rentang harga',
      'pemeriksaan',
      'Pemeriksaan rentang harganya digantikan R17B, yang membandingkan tiap butir transaksi dengan rentang harga tanggalnya sendiri. Pemeriksaan simbolnya tidak berarti di gudang ini: pemuat mengelompokkan laporan menurut simbol di dalam barisnya sendiri, jadi ia selalu hijau tanpa memeriksa apa pun.',
    ),
  },
  { kode: 'R18a', urutan: 24, bergantung: [], jalankan: r18aVolumeNolTanpaSuspensi },
  {
    kode: 'R10',
    urutan: 25,
    bergantung: ['R18a'],
    jalankan: digantikan(
      'R10',
      'Hari tanpa volume',
      'baris harga',
      'Digantikan R18a, yang memeriksa hal yang sama tetapi menjawab TIDAK_LENGKAP alih-alih KONFLIK: daftar suspensi hanya mencatat hari mulai berhenti, bukan tiap harinya.',
    ),
  },
  { kode: 'R19a', urutan: 26, bergantung: [], jalankan: r19aDatarTanpaVolume },
  { kode: 'R19b', urutan: 27, bergantung: ['R19a'], jalankan: r19bRuntunDatar },
  { kode: 'R28', urutan: 28, bergantung: ['R33'], jalankan: r28LabelDeretHarga },
  { kode: 'R35', urutan: 29, bergantung: ['R28'], jalankan: r35AllTimePrice },
  { kode: 'R23', urutan: 30, bergantung: [], jalankan: r23LabaBedaEndpoint },
  { kode: 'R31', urutan: 31, bergantung: [], jalankan: r31DividenRupsVersusMedan },
  { kode: 'R26', urutan: 32, bergantung: ['R20', 'R32', 'R31'], jalankan: r26PembagianLaba },
  { kode: 'R27', urutan: 33, bergantung: [], jalankan: r27RasioSiapPakai },
  { kode: 'R29', urutan: 34, bergantung: ['R31'], jalankan: r29HargaDiTanggalEx },
  { kode: 'R34', urutan: 35, bergantung: [], jalankan: r34AksiTanpaHarga },
];

export interface HasilVerifikasiV2 {
  simbol: string;
  pemeriksaan: HasilAturan[];
}

/** Jalankan seluruh himpunan V2 atas satu emiten, dalam urutan yang ditetapkan. */
export function verifikasiV2(konteks: KonteksGudang): HasilVerifikasiV2 {
  const urut = [...ATURAN_V2].sort((a, b) => a.urutan - b.urutan);
  return {
    simbol: konteks.simbol,
    pemeriksaan: urut.map((e) => e.jalankan(konteks)),
  };
}
