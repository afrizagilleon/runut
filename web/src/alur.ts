/**
 * Seluruh keadaan permainan, dalam satu reducer murni (D-5).
 *
 * `(keadaan, aksi, waktu) → { keadaan, peristiwa[] }`. Tidak ada `Date.now()` di
 * dalam berkas ini: waktu selalu disuntikkan pemanggil. Tidak ada `useState`
 * untuk keadaan permainan di komponen mana pun — komponen hanya `dispatch` dan
 * merender apa yang dikembalikan reducer ini.
 *
 * Alasannya praktis: proyek ini tidak punya jsdom, jadi reducer murni adalah
 * satu-satunya cara membuktikan lewat tes bahwa peristiwa benar-benar lahir dari
 * interaksi, bukan ditempel belakangan.
 */

/** Daftar peristiwa tertutup (D-6). Apa pun di luar daftar ini ditolak pengumpul. */
export const NAMA_PERISTIWA = [
  'mulai',
  'layar_masuk',
  'kartu_buka',
  'pilih',
  'kunci_jawaban',
  'lihat_balik',
  'pembukaan_masuk',
  'pembukaan_selesai',
  'minat_kasus_lain',
  'akhir_kirim',
  'tutup',
] as const;

export type NamaPeristiwa = (typeof NAMA_PERISTIWA)[number];

export type NilaiIsi = string | number | boolean | null;

export interface Peristiwa {
  nama: NamaPeristiwa;
  /** Id sesi acak yang hidup di memori tab saja (INV-9). */
  sesi: string;
  kasus_id: string;
  /** Milidetik sejak aksi `mulai`. */
  t_ms: number;
  /** Nomor urut dalam sesi, mulai dari 1. */
  urut: number;
  isi: Record<string, NilaiIsi>;
}

/** Batas panjang teks bebas di layar akhir (D-6). */
export const MAKS_TEKS_AKHIR = 500;

export type Layar =
  | { jenis: 'pembuka' }
  | { jenis: 'soal'; nomor: number }
  | { jenis: 'pembukaan' }
  | { jenis: 'akhir' };

/** Nama layar seperti yang dicatat peristiwa: pembuka, soal-1, soal-2, …, akhir. */
export function namaLayar(layar: Layar): string {
  return layar.jenis === 'soal' ? `soal-${String(layar.nomor + 1)}` : layar.jenis;
}

export interface KeadaanSoal {
  /** Pilihan sekarang; `null` berarti belum memilih. */
  kunci: string | null;
  dikunci: boolean;
  /** `null` selama belum dikunci. */
  benar: boolean | null;
  /** Berapa kali pemain berpindah pilihan; 0 untuk pilihan pertama. */
  ganti: number;
  /** Jumlah peristiwa `kartu_buka` untuk soal ini. */
  kartuDibuka: number;
  /** Jumlah `kartu_buka` yang terjadi **sebelum** soal ini dikunci. */
  kartuDibukaSebelumKunci: number;
  /** Kartu yang sedang terlipat pemain, per fact_id. */
  terlipat: Record<string, boolean>;
  /** Waktu masuk terakhir ke layar soal ini; `null` kalau sedang tidak di sini. */
  masukPada: number | null;
  /** Milidetik yang sudah terkumpul di layar soal ini dari kunjungan sebelumnya. */
  msTerkumpul: number;
}

export interface JawabanAkhir {
  rating: number | null;
  terasa: string | null;
  sumber_jawaban: string | null;
  teks: string | null;
}

export interface Keadaan {
  sesi: string;
  kasus_id: string;
  /** Daftar soal_id berurutan; menentukan jumlah layar soal. */
  urutanSoal: string[];
  /** Kunci jawaban yang benar per soal_id, untuk menilai `benar`. */
  kunciBenar: Record<string, string>;
  /** fact_id kartu per soal_id; dipakai "Lihat kartu lagi". */
  kartuSoal: Record<string, string[]>;
  /** `null` sebelum aksi `mulai`; sesudahnya menjadi titik nol `t_ms`. */
  mulaiPada: number | null;
  layar: Layar;
  soal: Record<string, KeadaanSoal>;
  /** fact_id yang panel sumbernya sedang terbuka; `null` kalau tertutup. */
  sumberTerbuka: string | null;
  akhir: JawabanAkhir;
  /** Sudah menekan Selesai. */
  akhirTerkirim: boolean;
  /** Sudah menekan "Mau coba kasus lain"; pesan alpha-nya lalu tampil. */
  minatDitekan: boolean;
  /** Gulir terjauh di layar pembukaan, dalam persen. */
  gulirMaksPersen: number;
  masukPembukaanPada: number | null;
  /** Nomor urut peristiwa terakhir. */
  urut: number;
  /** Sudah menerima aksi `tutup`; sesudah ini reducer tidak melahirkan apa pun. */
  tertutup: boolean;
}

export type Aksi =
  | { jenis: 'mulai'; lebar_layar: number }
  | { jenis: 'buka_kartu'; soal_id: string; fact_id: string }
  | { jenis: 'lipat_kartu'; soal_id: string; fact_id: string }
  | { jenis: 'lihat_kartu_lagi'; soal_id: string }
  | { jenis: 'buka_sumber'; fact_id: string; soal_id: string | null }
  | { jenis: 'tutup_sumber' }
  | { jenis: 'pilih'; soal_id: string; kunci: string }
  | { jenis: 'kunci_jawaban'; soal_id: string }
  | { jenis: 'lanjut' }
  | { jenis: 'lihat_balik'; nomor: number }
  | { jenis: 'catat_gulir'; persen: number }
  | { jenis: 'minat_kasus_lain' }
  | { jenis: 'isi_akhir'; medan: keyof JawabanAkhir; nilai: string | number | null }
  | { jenis: 'kirim_akhir' }
  | { jenis: 'tutup' };

export interface Hasil {
  keadaan: Keadaan;
  peristiwa: Peristiwa[];
}

export interface AwalKeadaan {
  sesi: string;
  kasus_id: string;
  urutanSoal: string[];
  kunciBenar: Record<string, string>;
  kartuSoal: Record<string, string[]>;
}

function soalKosong(): KeadaanSoal {
  return {
    kunci: null,
    dikunci: false,
    benar: null,
    ganti: 0,
    kartuDibuka: 0,
    kartuDibukaSebelumKunci: 0,
    terlipat: {},
    masukPada: null,
    msTerkumpul: 0,
  };
}

export function keadaanAwal({
  sesi,
  kasus_id,
  urutanSoal,
  kunciBenar,
  kartuSoal,
}: AwalKeadaan): Keadaan {
  const soal: Record<string, KeadaanSoal> = {};
  for (const id of urutanSoal) soal[id] = soalKosong();
  return {
    sesi,
    kasus_id,
    urutanSoal: [...urutanSoal],
    kunciBenar: { ...kunciBenar },
    kartuSoal: { ...kartuSoal },
    mulaiPada: null,
    layar: { jenis: 'pembuka' },
    soal,
    sumberTerbuka: null,
    akhir: { rating: null, terasa: null, sumber_jawaban: null, teks: null },
    akhirTerkirim: false,
    minatDitekan: false,
    gulirMaksPersen: 0,
    masukPembukaanPada: null,
    urut: 0,
    tertutup: false,
  };
}

/** Soal yang sedang dibuka, atau `null` kalau layarnya bukan layar soal. */
export function soalSekarang(keadaan: Keadaan): string | null {
  if (keadaan.layar.jenis !== 'soal') return null;
  return keadaan.urutanSoal[keadaan.layar.nomor] ?? null;
}

export function semuaTerkunci(keadaan: Keadaan): boolean {
  return keadaan.urutanSoal.every((id) => keadaan.soal[id]?.dikunci === true);
}

/** Pengumpul peristiwa untuk satu pemanggilan reducer: menomori dan memberi cap waktu. */
class Catatan {
  private readonly keluar: Peristiwa[] = [];

  constructor(
    private readonly keadaan: Keadaan,
    private readonly waktu: number,
    private urut: number,
  ) {}

  tambah(nama: NamaPeristiwa, isi: Record<string, NilaiIsi> = {}): void {
    this.urut += 1;
    this.keluar.push({
      nama,
      sesi: this.keadaan.sesi,
      kasus_id: this.keadaan.kasus_id,
      t_ms: this.keadaan.mulaiPada === null ? 0 : this.waktu - this.keadaan.mulaiPada,
      urut: this.urut,
      isi,
    });
  }

  get hasil(): { peristiwa: Peristiwa[]; urut: number } {
    return { peristiwa: this.keluar, urut: this.urut };
  }
}

/** Tidak terjadi apa-apa: keadaan utuh, nol peristiwa. */
function abaikan(keadaan: Keadaan): Hasil {
  return { keadaan, peristiwa: [] };
}

function ubahSoal(
  keadaan: Keadaan,
  soal_id: string,
  ubah: (s: KeadaanSoal) => KeadaanSoal,
): Keadaan {
  const lama = keadaan.soal[soal_id];
  if (lama === undefined) return keadaan;
  return { ...keadaan, soal: { ...keadaan.soal, [soal_id]: ubah(lama) } };
}

/** Kumpulkan waktu yang terpakai di layar yang sedang ditinggalkan. */
function tutupWaktuLayar(keadaan: Keadaan, waktu: number): Keadaan {
  const id = soalSekarang(keadaan);
  if (id === null) return keadaan;
  return ubahSoal(keadaan, id, (s) => ({
    ...s,
    msTerkumpul: s.masukPada === null ? s.msTerkumpul : s.msTerkumpul + (waktu - s.masukPada),
    masukPada: null,
  }));
}

/** Catat masuk ke layar baru, termasuk cap waktu masuk kalau itu layar soal. */
function masukLayar(keadaan: Keadaan, layar: Layar, waktu: number, catat: Catatan): Keadaan {
  let berikut: Keadaan = { ...keadaan, layar };
  if (layar.jenis === 'soal') {
    const id = berikut.urutanSoal[layar.nomor];
    if (id !== undefined) {
      berikut = ubahSoal(berikut, id, (s) => ({ ...s, masukPada: waktu }));
    }
  }
  if (layar.jenis === 'pembukaan') {
    berikut = { ...berikut, masukPembukaanPada: waktu };
  }
  catat.tambah('layar_masuk', { layar: namaLayar(layar) });
  return berikut;
}

function potong(teks: string | null): string | null {
  if (teks === null) return null;
  return teks.length > MAKS_TEKS_AKHIR ? teks.slice(0, MAKS_TEKS_AKHIR) : teks;
}

/**
 * Satu langkah permainan.
 *
 * Aksi yang tidak sah **tidak** melahirkan peristiwa dan tidak mengubah keadaan:
 * mengunci tanpa memilih, mengubah pilihan sesudah dikunci, dan masuk layar
 * pembukaan sebelum tiga soal terkunci.
 */
export function langkah(keadaan: Keadaan, aksi: Aksi, waktu: number): Hasil {
  if (keadaan.tertutup) return abaikan(keadaan);
  if (aksi.jenis !== 'mulai' && keadaan.mulaiPada === null) return abaikan(keadaan);

  switch (aksi.jenis) {
    case 'mulai': {
      if (keadaan.mulaiPada !== null) return abaikan(keadaan);
      const dimulai: Keadaan = { ...keadaan, mulaiPada: waktu };
      const catat = new Catatan(dimulai, waktu, dimulai.urut);
      catat.tambah('mulai', { lebar_layar: aksi.lebar_layar });
      const berikut = masukLayar(dimulai, { jenis: 'pembuka' }, waktu, catat);
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'buka_kartu': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('kartu_buka', { soal_id: aksi.soal_id, fact_id: aksi.fact_id });
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) =>
        hitungBuka(lama, [aksi.fact_id]),
      );
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'lipat_kartu': {
      // Melipat bukan "membuka", jadi ia tidak melahirkan peristiwa — tetapi
      // keadaannya tetap di reducer, bukan di komponen.
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      return {
        keadaan: ubahSoal(keadaan, aksi.soal_id, (lama) => ({
          ...lama,
          terlipat: { ...lama.terlipat, [aksi.fact_id]: true },
        })),
        peristiwa: [],
      };
    }

    case 'lihat_kartu_lagi': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      const kartu = daftarKartu(keadaan, aksi.soal_id);
      if (kartu.length === 0) return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      for (const fact_id of kartu) {
        catat.tambah('kartu_buka', { soal_id: aksi.soal_id, fact_id });
      }
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) => hitungBuka(lama, kartu));
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'buka_sumber': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      let berikut: Keadaan = { ...keadaan, sumberTerbuka: aksi.fact_id };
      if (aksi.soal_id !== null && keadaan.soal[aksi.soal_id] !== undefined) {
        catat.tambah('kartu_buka', { soal_id: aksi.soal_id, fact_id: aksi.fact_id });
        berikut = ubahSoal(berikut, aksi.soal_id, (lama) => hitungBuka(lama, [aksi.fact_id]));
      }
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'tutup_sumber':
      return { keadaan: { ...keadaan, sumberTerbuka: null }, peristiwa: [] };

    case 'pilih': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      // Sesudah dikunci, pilihan beku (D-3).
      if (s.dikunci) return abaikan(keadaan);
      if (s.kunci === aksi.kunci) return abaikan(keadaan);
      const ganti = s.kunci === null ? 0 : s.ganti + 1;
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('pilih', { soal_id: aksi.soal_id, kunci: aksi.kunci, ganti_ke: ganti });
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) => ({
        ...lama,
        kunci: aksi.kunci,
        ganti,
      }));
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'kunci_jawaban': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      // Mengunci tanpa memilih ditolak; tombolnya juga nonaktif di UI.
      if (s.kunci === null) return abaikan(keadaan);
      if (s.dikunci) return abaikan(keadaan);
      const benar = keadaan.kunciBenar[aksi.soal_id] === s.kunci;
      const msDiSoal =
        s.msTerkumpul + (s.masukPada === null ? 0 : waktu - s.masukPada);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('kunci_jawaban', {
        soal_id: aksi.soal_id,
        kunci: s.kunci,
        benar,
        ms_di_soal: msDiSoal,
        // Hanya pembukaan kartu **sebelum** penguncian yang dihitung.
        kartu_dibuka_sebelum: s.kartuDibuka,
      });
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) => ({
        ...lama,
        dikunci: true,
        benar,
        kartuDibukaSebelumKunci: lama.kartuDibuka,
      }));
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'lanjut': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      if (keadaan.layar.jenis === 'pembuka') {
        const berikut = masukLayar(keadaan, { jenis: 'soal', nomor: 0 }, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      if (keadaan.layar.jenis === 'soal') {
        const id = soalSekarang(keadaan);
        if (id === null || keadaan.soal[id]?.dikunci !== true) return abaikan(keadaan);
        const nomorBerikut = keadaan.layar.nomor + 1;
        const ditutup = tutupWaktuLayar(keadaan, waktu);
        if (nomorBerikut < keadaan.urutanSoal.length) {
          const berikut = masukLayar(ditutup, { jenis: 'soal', nomor: nomorBerikut }, waktu, catat);
          const { peristiwa, urut } = catat.hasil;
          return { keadaan: { ...berikut, urut }, peristiwa };
        }
        // Layar pembukaan tidak bisa dicapai sebelum semua soal terkunci (D-3).
        if (!semuaTerkunci(ditutup)) return abaikan(keadaan);
        catat.tambah('pembukaan_masuk');
        const berikut = masukLayar(ditutup, { jenis: 'pembukaan' }, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      if (keadaan.layar.jenis === 'pembukaan') {
        catat.tambah('pembukaan_selesai', {
          ms_di_pembukaan:
            keadaan.masukPembukaanPada === null ? 0 : waktu - keadaan.masukPembukaanPada,
          gulir_maks_persen: keadaan.gulirMaksPersen,
        });
        const berikut = masukLayar(keadaan, { jenis: 'akhir' }, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      return abaikan(keadaan);
    }

    case 'lihat_balik': {
      // Hanya soal yang sudah dikunci yang boleh dilihat lagi, dan hanya dari
      // layar yang bukan soal itu sendiri.
      const tujuanId = keadaan.urutanSoal[aksi.nomor];
      if (tujuanId === undefined) return abaikan(keadaan);
      if (keadaan.soal[tujuanId]?.dikunci !== true) return abaikan(keadaan);
      if (keadaan.layar.jenis === 'soal' && keadaan.layar.nomor === aksi.nomor) {
        return abaikan(keadaan);
      }
      const tujuan: Layar = { jenis: 'soal', nomor: aksi.nomor };
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('lihat_balik', {
        dari_layar: namaLayar(keadaan.layar),
        ke_layar: namaLayar(tujuan),
      });
      const berikut = masukLayar(tutupWaktuLayar(keadaan, waktu), tujuan, waktu, catat);
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'catat_gulir': {
      const persen = Math.max(0, Math.min(100, Math.round(aksi.persen)));
      if (persen <= keadaan.gulirMaksPersen) return abaikan(keadaan);
      return { keadaan: { ...keadaan, gulirMaksPersen: persen }, peristiwa: [] };
    }

    case 'minat_kasus_lain': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('minat_kasus_lain');
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, minatDitekan: true, urut }, peristiwa };
    }

    case 'isi_akhir': {
      if (keadaan.akhirTerkirim) return abaikan(keadaan);
      const akhir: JawabanAkhir = { ...keadaan.akhir };
      if (aksi.medan === 'rating') {
        akhir.rating = typeof aksi.nilai === 'number' ? aksi.nilai : null;
      } else if (aksi.medan === 'teks') {
        akhir.teks = potong(typeof aksi.nilai === 'string' ? aksi.nilai : null);
      } else {
        akhir[aksi.medan] = typeof aksi.nilai === 'string' ? aksi.nilai : null;
      }
      return { keadaan: { ...keadaan, akhir }, peristiwa: [] };
    }

    case 'kirim_akhir': {
      if (keadaan.akhirTerkirim) return abaikan(keadaan);
      if (keadaan.layar.jenis !== 'akhir') return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('akhir_kirim', {
        rating: keadaan.akhir.rating,
        terasa: keadaan.akhir.terasa,
        sumber_jawaban: keadaan.akhir.sumber_jawaban,
        teks: potong(keadaan.akhir.teks),
      });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, akhirTerkirim: true, urut }, peristiwa };
    }

    case 'tutup': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('tutup', { layar_terakhir: namaLayar(keadaan.layar) });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, tertutup: true, urut }, peristiwa };
    }

    default:
      return abaikan(keadaan);
  }
}

function hitungBuka(lama: KeadaanSoal, fact_ids: string[]): KeadaanSoal {
  const terlipat = { ...lama.terlipat };
  for (const id of fact_ids) terlipat[id] = false;
  return { ...lama, kartuDibuka: lama.kartuDibuka + fact_ids.length, terlipat };
}

function daftarKartu(keadaan: Keadaan, soal_id: string): string[] {
  return keadaan.kartuSoal[soal_id] ?? [];
}
