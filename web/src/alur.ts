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
  'kembali_ke_kartu',
  'pilih',
  'kunci_jawaban',
  'lihat_balik',
  'pembukaan_masuk',
  /*
   * A4-T5. Layar pembukaan panjang, dan pemilik harus menggulir jauh sebelum
   * sampai ke ringkasan "apa yang bisa dan tidak bisa dibaca" — bagian yang
   * justru menjawab pertanyaan permainannya. Jalan pintasnya dicatat karena
   * seberapa sering ia dipakai adalah ukuran apakah garis waktunya terlalu
   * panjang; menyembunyikan garis waktunya sendiri akan menghapus pertanyaan
   * itu, bukan menjawabnya.
   */
  'loncat_ke_ringkasan',
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
  /** Jumlah panel sumber kartu yang dibuka di soal ini. */
  kartuDibuka: number;
  /**
   * Sejak kapan tumpukan kartu ≥ 50 % terlihat; `null` kalau sedang tidak
   * terlihat. Diisi pengamat di komponen lewat dispatch, dijumlahkan di sini.
   */
  kartuTerlihatSejak: number | null;
  /** Milidetik tumpukan kartu terlihat, dari kunjungan yang sudah selesai. */
  msKartuTerlihat: number;
  /** Nilai `msKartuTerlihat` yang dibekukan saat soal ini dikunci. */
  msKartuTerlihatSaatKunci: number;
  /** Kartu pernah keluar layar; dipakai membedakan gulir balik dari kemunculan pertama. */
  pernahKeluar: boolean;
  /** Berapa kali kartu masuk layar lagi sesudah pernah keluar. */
  gulirBalik: number;
  /** Nilai `gulirBalik` yang dibekukan saat soal ini dikunci. */
  gulirBalikSaatKunci: number;
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
  | { jenis: 'kartu_masuk_layar'; soal_id: string }
  | { jenis: 'kartu_keluar_layar'; soal_id: string }
  | { jenis: 'kembali_ke_kartu'; soal_id: string }
  | { jenis: 'buka_sumber'; fact_id: string; soal_id: string | null }
  | { jenis: 'tutup_sumber' }
  | { jenis: 'pilih'; soal_id: string; kunci: string }
  | { jenis: 'kunci_jawaban'; soal_id: string }
  | { jenis: 'lanjut' }
  | { jenis: 'lihat_balik'; nomor: number }
  | { jenis: 'loncat_ke_ringkasan' }
  | { jenis: 'mundur' }
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
    kartuTerlihatSejak: null,
    msKartuTerlihat: 0,
    msKartuTerlihatSaatKunci: 0,
    pernahKeluar: false,
    gulirBalik: 0,
    gulirBalikSaatKunci: 0,
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

/**
 * Tanda yang didapat satu baris opsi (A1-T4, diperbaiki A4-T4).
 *
 * Fungsi murni, bukan rangkaian tanda tanya di dalam JSX: "opsi mana mendapat
 * tanda apa" adalah aturan, dan aturan harus bisa dites. Sesudah dikunci,
 * penekanan visual terkuat wajib berada di jawaban yang cocok dengan kartu.
 *
 * **Yang salah di A1-T4:** pilihan pemain yang keliru diturunkan menjadi abu-abu
 * **tanpa label apa pun**. Penekanan memang pindah ke jawaban yang cocok, tetapi
 * pemain kehilangan satu-satunya hal yang ia butuhkan untuk belajar dari
 * kesalahannya: *yang mana tadi jawabanku*. Uji ponsel pemilik menemukan persis
 * itu — sesudah salah, ia tidak tahu lagi mana pilihannya.
 *
 * Jadi keempat keadaan tetap, tetapi selektornya sekarang juga menyebut
 * **kata** yang tampil di baris itu. Pilihan pemain selalu berlabel
 * "Pilihanmu"; jawaban yang cocok selalu berlabel "✓ yang cocok dengan kartu".
 * Kalau pemain menjawab benar, satu baris membawa keduanya. Tidak pernah warna
 * saja: selalu ada kata, dan garis 2 px yang bisa dilihat tanpa membedakan warna.
 */
export type KeadaanOpsi = 'polos' | 'dipilih' | 'cocok' | 'keliru';

/** Label kata di dalam baris opsi. Keduanya tampil bersama kalau pemain benar. */
export const LABEL_PILIHAN_PEMAIN = 'Pilihanmu';
export const LABEL_COCOK = '✓ yang cocok dengan kartu';

export interface TandaOpsi {
  /** Menentukan kelas `.opsi-*`, yaitu bentuk dan garisnya. */
  keadaan: KeadaanOpsi;
  /** Kata yang tampil di dalam baris, urut dari atas. Boleh kosong, satu, atau dua. */
  label: readonly string[];
}

export function tandaOpsi(
  soal: KeadaanSoal | undefined,
  kunciOpsi: string,
  jawaban: string,
): TandaOpsi {
  if (soal === undefined) return { keadaan: 'polos', label: [] };

  const dipilihPemain = soal.kunci === kunciOpsi;

  if (!soal.dikunci) {
    return dipilihPemain
      ? { keadaan: 'dipilih', label: [LABEL_PILIHAN_PEMAIN] }
      : { keadaan: 'polos', label: [] };
  }

  if (kunciOpsi === jawaban) {
    // Pemain menjawab benar: satu baris membawa kedua tanda.
    return {
      keadaan: 'cocok',
      label: dipilihPemain ? [LABEL_PILIHAN_PEMAIN, LABEL_COCOK] : [LABEL_COCOK],
    };
  }

  return dipilihPemain
    ? { keadaan: 'keliru', label: [LABEL_PILIHAN_PEMAIN] }
    : { keadaan: 'polos', label: [] };
}

export function semuaTerkunci(keadaan: Keadaan): boolean {
  return keadaan.urutanSoal.every((id) => keadaan.soal[id]?.dikunci === true);
}

/** Pengumpul peristiwa untuk satu pemanggilan reducer: menomori dan memberi cap waktu. */
class Catatan {
  private readonly keluar: Peristiwa[] = [];
  private readonly keadaan: Keadaan;
  private readonly waktu: number;
  private urut: number;

  // Ditulis panjang, bukan sebagai parameter property: `node
  // --experimental-strip-types` — yang dipakai seluruh skrip repo ini —
  // menolak parameter property, dan berkas ini harus bisa diimpor dari sana.
  constructor(keadaan: Keadaan, waktu: number, urut: number) {
    this.keadaan = keadaan;
    this.waktu = waktu;
    this.urut = urut;
  }

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

/**
 * Layar sebelum layar sekarang, atau `null` kalau sudah di layar pertama.
 * Urutannya sama dengan urutan maju: pembuka → soal → pembukaan → akhir.
 */
export function layarSebelumnya(keadaan: Keadaan): Layar | null {
  const layar = keadaan.layar;
  if (layar.jenis === 'pembuka') return null;
  if (layar.jenis === 'soal') {
    return layar.nomor === 0 ? { jenis: 'pembuka' } : { jenis: 'soal', nomor: layar.nomor - 1 };
  }
  if (layar.jenis === 'pembukaan') {
    const terakhir = keadaan.urutanSoal.length - 1;
    return terakhir < 0 ? { jenis: 'pembuka' } : { jenis: 'soal', nomor: terakhir };
  }
  return { jenis: 'pembukaan' };
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

    /*
     * Pengamat di komponen hanya melaporkan "kartu masuk layar" dan "kartu
     * keluar layar" beserta waktunya. Seluruh penjumlahan terjadi di sini
     * (A1-T2) — komponen tidak boleh menghitung apa pun, karena yang bisa
     * dibuktikan tes hanyalah yang ada di reducer.
     */
    case 'kartu_masuk_layar': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      if (s.kartuTerlihatSejak !== null) return abaikan(keadaan);
      return {
        keadaan: ubahSoal(keadaan, aksi.soal_id, (lama) => ({
          ...lama,
          kartuTerlihatSejak: waktu,
          // Masuk lagi sesudah pernah keluar = pemain menggulir balik ke kartu.
          gulirBalik: lama.pernahKeluar ? lama.gulirBalik + 1 : lama.gulirBalik,
        })),
        peristiwa: [],
      };
    }

    case 'kartu_keluar_layar': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      if (s.kartuTerlihatSejak === null) return abaikan(keadaan);
      const sejak = s.kartuTerlihatSejak;
      return {
        keadaan: ubahSoal(keadaan, aksi.soal_id, (lama) => ({
          ...lama,
          msKartuTerlihat: lama.msKartuTerlihat + Math.max(0, waktu - sejak),
          kartuTerlihatSejak: null,
          pernahKeluar: true,
        })),
        peristiwa: [],
      };
    }

    case 'kembali_ke_kartu': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('kembali_ke_kartu', { soal_id: aksi.soal_id });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, urut }, peristiwa };
    }

    case 'buka_sumber': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      let berikut: Keadaan = { ...keadaan, sumberTerbuka: aksi.fact_id };
      if (aksi.soal_id !== null && keadaan.soal[aksi.soal_id] !== undefined) {
        catat.tambah('kartu_buka', { soal_id: aksi.soal_id, fact_id: aksi.fact_id });
        berikut = ubahSoal(berikut, aksi.soal_id, (lama) => ({
          ...lama,
          kartuDibuka: lama.kartuDibuka + 1,
        }));
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
      /*
       * Lama kartu benar-benar berada di layar sebelum jawaban dikunci — bukan
       * berapa kali kartu "dibuka". Kartu tampil terbuka sejak awal, jadi
       * hitungan buka-ulang tidak pernah mengukur apakah pemain membacanya
       * (F-1, kesalahan D-6 versi pertama).
       */
      const msKartu =
        s.msKartuTerlihat +
        (s.kartuTerlihatSejak === null ? 0 : Math.max(0, waktu - s.kartuTerlihatSejak));
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('kunci_jawaban', {
        soal_id: aksi.soal_id,
        kunci: s.kunci,
        benar,
        ms_di_soal: msDiSoal,
        ms_kartu_terlihat_sebelum: msKartu,
        gulir_balik_ke_kartu: s.gulirBalik,
      });
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) => ({
        ...lama,
        dikunci: true,
        benar,
        // Dibekukan: apa pun yang terjadi sesudah penguncian tidak boleh
        // mengubah angka yang sudah dilaporkan.
        msKartuTerlihatSaatKunci: msKartu,
        gulirBalikSaatKunci: lama.gulirBalik,
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

    /*
     * Jalan pintas ke ringkasan di layar pembukaan (A4-T5). Guliran itu sendiri
     * dikerjakan komponen — reducer tidak menyentuh DOM — tetapi peristiwanya
     * lahir di sini, seperti semua peristiwa lain. Layarnya tidak berubah:
     * pemain masih di layar yang sama, hanya di bagian lain halamannya.
     */
    case 'loncat_ke_ringkasan': {
      if (keadaan.layar.jenis !== 'pembukaan') return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('loncat_ke_ringkasan', {
        ms_di_pembukaan:
          keadaan.masukPembukaanPada === null ? 0 : waktu - keadaan.masukPembukaanPada,
        gulir_maks_persen: keadaan.gulirMaksPersen,
      });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, urut }, peristiwa };
    }

    /*
     * Tombol kembali peramban/Android (A1-T7). Satu entri riwayat per layar,
     * dan `popstate` mundur satu layar **lewat reducer** — bukan dengan
     * mengubah layar di komponen — supaya peristiwanya tetap lahir.
     * Dari layar pembuka ia ditolak, sehingga peramban keluar dari situs
     * seperti yang diharapkan pemain.
     */
    case 'mundur': {
      const tujuan = layarSebelumnya(keadaan);
      if (tujuan === null) return abaikan(keadaan);
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

