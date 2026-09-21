/**
 * Ringkasan data alpha (D-10): `npm run alpha:ringkas -- <berkas.jsonl…>`.
 *
 * Deterministik: keluaran yang sama untuk berkas yang sama, tanpa membaca jam
 * maupun urutan berkas di direktori. Semua hitungan berasal dari peristiwa
 * D-6; tidak ada angka yang ditebak.
 *
 * Yang dijawab tabel ini adalah pertanyaan pemilik, bukan metrik umum:
 * apakah orang sampai ke pembukaan, di soal mana mereka berhenti, dan —
 * yang paling penting — **apakah mereka membuka kartu sebelum menjawab**.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface Peristiwa {
  nama: string;
  sesi: string;
  kasus_id: string;
  t_ms: number;
  urut: number;
  isi: Record<string, unknown>;
  diterima_pada?: string;
}

export interface RingkasSoal {
  soal_id: string;
  benar: boolean | null;
  kunci: string | null;
  ms_di_soal: number | null;
  /** Lama tumpukan kartu terlihat sebelum jawaban dikunci (A1-T2). */
  ms_kartu_terlihat: number | null;
  /** Berapa kali pemain menggulir balik ke kartu sebelum mengunci. */
  gulir_balik: number | null;
  /** Ketukan tombol "Kembali ke kartu" di soal ini. */
  kembali_ke_kartu: number;
  /** Panel sumber kartu yang dibuka di soal ini. */
  panel_sumber: number;
  ganti_pilihan: number;
}

/** Satu ketukan seperti yang dicatat pelacak (D-8). */
export interface KetukSesi {
  layar: string;
  /** `null` berarti ketukan mendarat di luar semua blok bernama. */
  uid: string | null;
  mati: boolean;
}

export interface RingkasSesi {
  sesi: string;
  kasus_id: string;
  /** Kode dari `?k=` (D-9); `null` kalau tautannya polos. */
  penanda: string | null;
  /** Nomor pengunjung (D-13); `null` kalau penyimpanan tidak bisa dipakai. */
  pengunjung: string | null;
  kunjungan_ke: number | null;
  /** Ketukan sesi ini, urut. */
  ketuk: KetukSesi[];
  /** Sesi ini menabrak batas 300 ketukan. */
  ketuk_dibatasi: boolean;
  /** Kedalaman gulir terjauh per layar, 0–1. Kunjungan ulang diambil yang terjauh. */
  gulir: Array<[string, number]>;
  /**
   * Sesi tanpa peristiwa `mulai` — misalnya tab lama yang baru ditutup, atau
   * kiriman yang kepalanya hilang. Ia dilaporkan terpisah dan tidak masuk
   * penyebut mana pun, supaya tidak menyamar sebagai orang yang berhenti.
   */
  lengkap: boolean;
  lebar_layar: number | null;
  sampai_pembukaan: boolean;
  /**
   * A4-T5: pemain menekan "Langsung ke ringkasan". Seberapa sering ini dipakai
   * adalah ukuran apakah garis waktu pembukaan terlalu panjang — pertanyaan
   * yang hanya bisa dijawab kalau jalan pintasnya dicatat, bukan disembunyikan.
   */
  loncat_ke_ringkasan: boolean;
  /** Sudah sejauh mana pemain menggulir saat melompat; null kalau tidak melompat. */
  gulir_saat_loncat: number | null;
  durasi_total_ms: number;
  ms_per_layar: Array<[string, number]>;
  soal_terlama: string | null;
  soal: RingkasSoal[];
  layar_terakhir: string;
  minat_kasus_lain: boolean;
  akhir: Record<string, unknown> | null;
}

function angka(nilai: unknown): number | null {
  return typeof nilai === 'number' ? nilai : null;
}

function teks(nilai: unknown): string | null {
  return typeof nilai === 'string' ? nilai : null;
}

/** Baca berkas JSONL; baris kosong dilewati, baris rusak dilaporkan (INV-6). */
export function bacaJsonl(isi: string, namaBerkas = '<stdin>'): Peristiwa[] {
  const keluar: Peristiwa[] = [];
  for (const [nomor, baris] of isi.split('\n').entries()) {
    if (baris.trim() === '') continue;
    try {
      keluar.push(JSON.parse(baris) as Peristiwa);
    } catch {
      throw new Error(`${namaBerkas} baris ${String(nomor + 1)} bukan JSON yang sah.`);
    }
  }
  return keluar;
}

/**
 * Lama tiap layar, dihitung dari jarak antar `layar_masuk`. Layar terakhir
 * dihitung sampai peristiwa terakhir sesi itu. Kunjungan berulang ke layar yang
 * sama dijumlahkan, karena pemain boleh melihat balik soal yang sudah dikunci.
 */
function msPerLayar(peristiwa: Peristiwa[]): Array<[string, number]> {
  const masuk = peristiwa.filter((p) => p.nama === 'layar_masuk');
  const akhir = peristiwa[peristiwa.length - 1]?.t_ms ?? 0;
  const jumlah = new Map<string, number>();
  for (const [nomor, p] of masuk.entries()) {
    const layar = teks(p.isi['layar']) ?? '(tidak diketahui)';
    const berikut = masuk[nomor + 1]?.t_ms ?? akhir;
    jumlah.set(layar, (jumlah.get(layar) ?? 0) + Math.max(0, berikut - p.t_ms));
  }
  return [...jumlah.entries()];
}

export function ringkasSesi(peristiwa: Peristiwa[]): RingkasSesi {
  const urut = [...peristiwa].sort((a, b) => a.urut - b.urut);
  const pertama = urut[0];
  const terakhir = urut[urut.length - 1];

  const mulai = urut.find((p) => p.nama === 'mulai');
  const tutup = urut.find((p) => p.nama === 'tutup');
  const layarMasuk = urut.filter((p) => p.nama === 'layar_masuk');

  const soal = new Map<string, RingkasSoal>();
  const pastikan = (soal_id: string): RingkasSoal => {
    const ada = soal.get(soal_id);
    if (ada !== undefined) return ada;
    const baru: RingkasSoal = {
      soal_id,
      benar: null,
      kunci: null,
      ms_di_soal: null,
      ms_kartu_terlihat: null,
      gulir_balik: null,
      kembali_ke_kartu: 0,
      panel_sumber: 0,
      ganti_pilihan: 0,
    };
    soal.set(soal_id, baru);
    return baru;
  };

  for (const p of urut) {
    if (p.nama === 'pilih') {
      const id = teks(p.isi['soal_id']);
      if (id === null) continue;
      const s = pastikan(id);
      s.ganti_pilihan = Math.max(s.ganti_pilihan, angka(p.isi['ganti_ke']) ?? 0);
    }
    if (p.nama === 'kunci_jawaban') {
      const id = teks(p.isi['soal_id']);
      if (id === null) continue;
      const s = pastikan(id);
      s.benar = typeof p.isi['benar'] === 'boolean' ? p.isi['benar'] : null;
      s.kunci = teks(p.isi['kunci']);
      s.ms_di_soal = angka(p.isi['ms_di_soal']);
      s.ms_kartu_terlihat = angka(p.isi['ms_kartu_terlihat_sebelum']);
      s.gulir_balik = angka(p.isi['gulir_balik_ke_kartu']);
    }
    if (p.nama === 'kembali_ke_kartu') {
      const id = teks(p.isi['soal_id']);
      if (id !== null) pastikan(id).kembali_ke_kartu += 1;
    }
    if (p.nama === 'kartu_buka') {
      const id = teks(p.isi['soal_id']);
      if (id !== null) pastikan(id).panel_sumber += 1;
    }
  }

  const daftarSoal = [...soal.values()].sort((a, b) => a.soal_id.localeCompare(b.soal_id));
  const terlama = daftarSoal
    .filter((s) => s.ms_di_soal !== null)
    .sort((a, b) => (b.ms_di_soal ?? 0) - (a.ms_di_soal ?? 0))[0];

  const layarTerakhir =
    teks(tutup?.isi['layar_terakhir']) ??
    teks(layarMasuk[layarMasuk.length - 1]?.isi['layar']) ??
    '(tidak diketahui)';

  const kirimAkhir = urut.find((p) => p.nama === 'akhir_kirim');
  const loncat = urut.find((p) => p.nama === 'loncat_ke_ringkasan');

  const ketuk: KetukSesi[] = [];
  for (const p of urut) {
    if (p.nama !== 'ketuk') continue;
    ketuk.push({
      layar: teks(p.isi['layar']) ?? '(tidak diketahui)',
      uid: teks(p.isi['uid']),
      mati: p.isi['mati'] === true,
    });
  }

  // Satu layar bisa dikunjungi lebih dari sekali (melihat balik soal yang sudah
  // dikunci). Yang disimpan adalah yang TERJAUH, bukan yang terakhir: pertanyaan
  // D-10 adalah "sampai mana mereka menggulir", bukan "di mana mereka berhenti".
  const gulir = new Map<string, number>();
  for (const p of urut) {
    if (p.nama !== 'gulir') continue;
    const layar = teks(p.isi['layar']);
    const maks = angka(p.isi['maks']);
    if (layar === null || maks === null) continue;
    gulir.set(layar, Math.max(gulir.get(layar) ?? 0, maks));
  }

  return {
    sesi: pertama?.sesi ?? '(tanpa sesi)',
    kasus_id: pertama?.kasus_id ?? '(tanpa kasus)',
    penanda: teks(mulai?.isi['penanda']),
    pengunjung: teks(mulai?.isi['pengunjung']),
    kunjungan_ke: angka(mulai?.isi['kunjungan_ke']),
    ketuk,
    ketuk_dibatasi: urut.some((p) => p.nama === 'ketuk_dibatasi'),
    gulir: [...gulir.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    lengkap: mulai !== undefined,
    lebar_layar: angka(mulai?.isi['lebar_layar']),
    sampai_pembukaan: urut.some((p) => p.nama === 'pembukaan_masuk'),
    loncat_ke_ringkasan: loncat !== undefined,
    gulir_saat_loncat: loncat === undefined ? null : angka(loncat.isi['gulir_maks_persen']),
    durasi_total_ms: terakhir?.t_ms ?? 0,
    ms_per_layar: msPerLayar(urut),
    soal_terlama: terlama?.soal_id ?? null,
    soal: daftarSoal,
    layar_terakhir: layarTerakhir,
    minat_kasus_lain: urut.some((p) => p.nama === 'minat_kasus_lain'),
    akhir: kirimAkhir === undefined ? null : kirimAkhir.isi,
  };
}

/**
 * Buang peristiwa kembar `(sesi, urut)`.
 *
 * Ini **jaring pengaman**, bukan perbaikan: penyebabnya sudah ditambal di
 * pengirim (A1-T2). Ia tetap ada karena berkas alpha yang sudah telanjur
 * terkumpul memuat kembaran, dan karena pengumpul sengaja tidak menyimpan
 * keadaan antar-permintaan.
 */
export function buangKembar(peristiwa: Peristiwa[]): Peristiwa[] {
  const terlihat = new Set<string>();
  const keluar: Peristiwa[] = [];
  for (const p of peristiwa) {
    const kunci = `${p.sesi}#${String(p.urut)}`;
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    keluar.push(p);
  }
  return keluar;
}

export function kelompokkanSesi(peristiwa: Peristiwa[]): RingkasSesi[] {
  const per = new Map<string, Peristiwa[]>();
  for (const p of buangKembar(peristiwa)) {
    const daftar = per.get(p.sesi);
    if (daftar === undefined) per.set(p.sesi, [p]);
    else daftar.push(p);
  }
  return [...per.values()]
    .map(ringkasSesi)
    // Urutan tetap supaya keluarannya bisa dibandingkan antar jalankan.
    .sort((a, b) => a.sesi.localeCompare(b.sesi));
}

/* ------------------------------------------------------------------ */
/* Orang, bukan sesi (D-13)                                            */
/* ------------------------------------------------------------------ */

export interface HitungOrang {
  sesi: number;
  pengunjung_unik: number;
  /** Pengunjung yang datang lebih dari sekali. */
  kembali: number;
  /** Sesi yang tidak bisa menyimpan nomor; dihitung terpisah, tidak ditebak. */
  sesi_tanpa_nomor: number;
}

/**
 * Berapa **orang**, bukan berapa sesi (D-13).
 *
 * Pemilik akan menyebar satu tautan per saluran ke banyak orang, dan satu orang
 * bisa membuka tautan itu tiga kali. Menghitung sesi akan melebih-lebihkan
 * jumlah peserta di depan juri, jadi angka yang dipakai adalah nomor pengunjung
 * yang berbeda.
 *
 * "Kembali" berarti salah satu dari dua hal, dan keduanya cukup: nomor itu
 * muncul di lebih dari satu sesi di berkas ini, atau ia sendiri melaporkan
 * `kunjungan_ke > 1` — kunjungan sebelumnya bisa saja ada di berkas hari lain.
 *
 * Sesi ber-`pengunjung: null` **tidak ditebak** dan tidak ikut penyebut mana
 * pun; ia dilaporkan sebagai angkanya sendiri.
 */
export function hitungOrang(semua: RingkasSesi[]): HitungOrang {
  const kunjunganTertinggi = new Map<string, number>();
  const jumlahSesi = new Map<string, number>();
  let tanpaNomor = 0;

  for (const s of semua) {
    if (s.pengunjung === null) {
      tanpaNomor += 1;
      continue;
    }
    jumlahSesi.set(s.pengunjung, (jumlahSesi.get(s.pengunjung) ?? 0) + 1);
    kunjunganTertinggi.set(
      s.pengunjung,
      Math.max(kunjunganTertinggi.get(s.pengunjung) ?? 0, s.kunjungan_ke ?? 1),
    );
  }

  let kembali = 0;
  for (const [nomor, kunjungan] of kunjunganTertinggi.entries()) {
    if (kunjungan > 1 || (jumlahSesi.get(nomor) ?? 0) > 1) kembali += 1;
  }

  return {
    sesi: semua.length,
    pengunjung_unik: kunjunganTertinggi.size,
    kembali,
    sesi_tanpa_nomor: tanpaNomor,
  };
}

/** Nama yang dipakai di tabel untuk sesi tanpa kode penanda. */
export const TANPA_PENANDA = '(tanpa penanda)';

/** Hitungan orang per kode penanda, urut abjad. */
export function perPenanda(semua: RingkasSesi[]): Array<[string, HitungOrang]> {
  const per = new Map<string, RingkasSesi[]>();
  for (const s of semua) {
    const kunci = s.penanda ?? TANPA_PENANDA;
    const ada = per.get(kunci);
    if (ada === undefined) per.set(kunci, [s]);
    else ada.push(s);
  }
  return [...per.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([kode, daftar]) => [kode, hitungOrang(daftar)]);
}

/* ------------------------------------------------------------------ */
/* Penanda yang dikecualikan (D-9)                                     */
/* ------------------------------------------------------------------ */

/**
 * Dikecualikan tanpa diminta: pemilik menguji dengan `?k=afriza`, reviewer
 * dengan `?k=uji`. Sesi mereka bukan pemain, dan membiarkannya masuk akan
 * membuat setiap angka alpha memuji pekerjaan kami sendiri.
 *
 * Jumlah yang dikecualikan **selalu dicetak**, supaya tidak ada sesi yang
 * hilang diam-diam.
 */
export const PENANDA_DIKECUALIKAN_BAWAAN: readonly string[] = ['afriza', 'uji'];

export interface Argumen {
  berkas: string[];
  kecuali: string[];
  /**
   * Berkas daftar nomor pengunjung yang dikecualikan (D-B4), bila disebut di
   * baris perintah. `null` berarti "pakai bawaannya kalau ada".
   */
  berkasPengunjung: string | null;
}

/* ------------------------------------------------------------------ */
/* Pengunjung yang dikecualikan (D-B4, amandemen A-2)                  */
/* ------------------------------------------------------------------ */

/**
 * Nama berkas bawaan, dicari **di direktori berkas peristiwa pertama**.
 *
 * Kenapa per nomor pengunjung dan bukan per penanda: pemilik pernah membuka
 * situsnya tanpa `?k=afriza`, dan sesi itu lolos ke angka alpha. Nomor
 * pengunjungnya acak tetapi **tetap sama tiap kunjungan** (D-13), jadi itulah
 * kunci yang benar untuk "ini saya, bukan pemain".
 */
export const BERKAS_PENGUNJUNG_BAWAAN = 'pengunjung-dikecualikan.txt';

/** Bentuk UUID v4; sama dengan yang dipakai pengumpul dan `web/src/sesi.ts`. */
const POLA_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Baca daftar nomor pengunjung dari isi berkas.
 *
 * Satu UUID per baris; baris kosong dan baris berawalan `#` diabaikan. Baris
 * yang **bukan** UUID v4 melempar galat yang menyebut nomor barisnya — bukan
 * diabaikan diam-diam. Alasannya sama dengan alasan berkas ini ada: daftar
 * pengecualian yang salah ketik dan diam akan membuang sesi orang sungguhan,
 * atau gagal membuang sesi pemilik, tanpa ada yang tahu.
 */
export function bacaPengunjungDikecualikan(isi: string, namaBerkas: string): string[] {
  const keluar: string[] = [];
  const baris = isi.split(/\r?\n/);
  for (const [nomor, satu] of baris.entries()) {
    const bersih = satu.trim();
    if (bersih === '' || bersih.startsWith('#')) continue;
    if (!POLA_UUID_V4.test(bersih)) {
      throw new Error(
        `${namaBerkas}:${String(nomor + 1)}: "${bersih}" bukan UUID v4. ` +
          'Satu nomor pengunjung per baris; baris kosong dan #komentar diabaikan.',
      );
    }
    keluar.push(bersih);
  }
  return keluar;
}

/**
 * Baca argumen baris perintah: `--kecuali k1,k2` menggantikan daftar bawaan.
 *
 * `--kecuali ''` (atau `--kecuali=`) berarti **tidak ada** yang dikecualikan —
 * itulah cara melihat sesi uji sendiri kalau memang diinginkan.
 */
export function bacaArgumen(argumen: string[]): Argumen {
  const berkas: string[] = [];
  let kecuali: string[] | null = null;
  let berkasPengunjung: string | null = null;
  for (let i = 0; i < argumen.length; i += 1) {
    const arg = argumen[i] ?? '';
    if (arg === '--kecuali-pengunjung') {
      berkasPengunjung = argumen[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg.startsWith('--kecuali-pengunjung=')) {
      berkasPengunjung = arg.slice('--kecuali-pengunjung='.length);
      continue;
    }
    if (arg === '--kecuali') {
      kecuali = pecahKode(argumen[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (arg.startsWith('--kecuali=')) {
      kecuali = pecahKode(arg.slice('--kecuali='.length));
      continue;
    }
    berkas.push(arg);
  }
  return {
    berkas,
    kecuali: kecuali ?? [...PENANDA_DIKECUALIKAN_BAWAAN],
    berkasPengunjung,
  };
}

function pecahKode(nilai: string): string[] {
  return nilai
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k !== '');
}

export interface Pisahan {
  dipakai: RingkasSesi[];
  /** Dikecualikan karena penandanya (D-9). */
  dikecualikan: RingkasSesi[];
  /** Dikecualikan karena nomor pengunjungnya (D-B4). */
  dikecualikanPengunjung: RingkasSesi[];
}

/**
 * Pisahkan sesi yang dipakai dari yang dikecualikan.
 *
 * Dua jalur pengecualian, dan **urutannya ditetapkan**: penanda lebih dulu,
 * nomor pengunjung atas sisanya. Tanpa urutan yang tetap, sesi yang cocok
 * keduanya akan terhitung dua kali dan jumlah yang dicetak tidak lagi
 * menjumlah — persis hal yang dijaga D-B4 supaya tidak ada yang hilang diam-diam.
 */
export function pisahkanKecuali(
  semua: RingkasSesi[],
  kecuali: readonly string[],
  pengunjungKecuali: readonly string[] = [],
): Pisahan {
  const setPenanda = new Set(kecuali);
  const setPengunjung = new Set(pengunjungKecuali);
  const lewatPenanda = (s: RingkasSesi): boolean =>
    s.penanda !== null && setPenanda.has(s.penanda);
  const sisa = semua.filter((s) => !lewatPenanda(s));
  const lewatPengunjung = (s: RingkasSesi): boolean =>
    s.pengunjung !== null && setPengunjung.has(s.pengunjung);
  return {
    dipakai: sisa.filter((s) => !lewatPengunjung(s)),
    dikecualikan: semua.filter(lewatPenanda),
    dikecualikanPengunjung: sisa.filter(lewatPengunjung),
  };
}

/* ------------------------------------------------------------------ */
/* Per layar: uid teratas, ketukan mati, kedalaman gulir (D-10)        */
/* ------------------------------------------------------------------ */

/** Median; `null` untuk daftar kosong. Genap → rata-rata dua nilai tengah. */
export function median(nilai: number[]): number | null {
  if (nilai.length === 0) return null;
  const urut = [...nilai].sort((a, b) => a - b);
  const tengah = Math.floor(urut.length / 2);
  if (urut.length % 2 === 1) return urut[tengah] ?? null;
  return ((urut[tengah - 1] ?? 0) + (urut[tengah] ?? 0)) / 2;
}

export interface BarisUid {
  uid: string;
  ketuk: number;
  /** Ketukan pada uid ini yang mendarat di sesuatu yang tidak bisa diketuk. */
  mati: number;
}

export interface RingkasLayar {
  layar: string;
  /** Sepuluh uid yang paling sering diketuk di layar ini. */
  uid: BarisUid[];
  ketuk: number;
  ketuk_mati: number;
  /** Kedalaman gulir median di layar ini, 0–1; `null` kalau tidak ada datanya. */
  gulir_median: number | null;
  /** Berapa sesi yang pernah membuka layar ini (menurut peristiwa gulir). */
  sesi: number;
}

/** Nama yang dipakai untuk ketukan yang tidak mendarat di blok bernama mana pun. */
export const UID_KOSONG = '(di luar blok bernama)';

export function perLayar(semua: RingkasSesi[]): RingkasLayar[] {
  const layar = new Map<
    string,
    { uid: Map<string, BarisUid>; ketuk: number; mati: number; gulir: number[]; sesi: Set<string> }
  >();

  const pastikan = (nama: string): NonNullable<ReturnType<typeof layar.get>> => {
    const ada = layar.get(nama);
    if (ada !== undefined) return ada;
    const baru = { uid: new Map<string, BarisUid>(), ketuk: 0, mati: 0, gulir: [], sesi: new Set<string>() };
    layar.set(nama, baru);
    return baru;
  };

  for (const s of semua) {
    for (const k of s.ketuk) {
      const l = pastikan(k.layar);
      l.ketuk += 1;
      if (k.mati) l.mati += 1;
      const nama = k.uid ?? UID_KOSONG;
      const baris = l.uid.get(nama) ?? { uid: nama, ketuk: 0, mati: 0 };
      baris.ketuk += 1;
      if (k.mati) baris.mati += 1;
      l.uid.set(nama, baris);
    }
    for (const [nama, maks] of s.gulir) {
      const l = pastikan(nama);
      l.gulir.push(maks);
      l.sesi.add(s.sesi);
    }
  }

  return [...layar.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([nama, isi]) => ({
      layar: nama,
      uid: [...isi.uid.values()]
        // Urutan tetap walau jumlahnya sama, supaya keluarannya bisa dibandingkan.
        .sort((a, b) => b.ketuk - a.ketuk || a.uid.localeCompare(b.uid))
        .slice(0, 10),
      ketuk: isi.ketuk,
      ketuk_mati: isi.mati,
      gulir_median: median(isi.gulir),
      sesi: isi.sesi.size,
    }));
}

/* ------------------------------------------------------------------ */
/* Per layar soal: tiga pertanyaan D-10                                */
/* ------------------------------------------------------------------ */

export interface RingkasLayarSoal {
  layar: string;
  /** Sesi yang mengetuk bilah "↓ Jawab di bawah" — opsi pertama tidak terlihat. */
  jawab_di_bawah: number;
  /** Sesi yang membuka kaki lembar ("Lihat sumbernya" / "cara menghitungnya"). */
  buka_sumber: number;
  /** Sesi yang mengetuk baris "Arti istilah". */
  buka_istilah: number;
  sesi: number;
}

export function perLayarSoal(semua: RingkasSesi[]): RingkasLayarSoal[] {
  const layar = new Map<
    string,
    { turun: Set<string>; sumber: Set<string>; istilah: Set<string>; sesi: Set<string> }
  >();

  const pastikan = (nama: string): NonNullable<ReturnType<typeof layar.get>> => {
    const ada = layar.get(nama);
    if (ada !== undefined) return ada;
    const baru = {
      turun: new Set<string>(),
      sumber: new Set<string>(),
      istilah: new Set<string>(),
      sesi: new Set<string>(),
    };
    layar.set(nama, baru);
    return baru;
  };

  for (const s of semua) {
    for (const nama of [...s.gulir.map(([l]) => l), ...s.ketuk.map((k) => k.layar)]) {
      if (nama.startsWith('soal-')) pastikan(nama).sesi.add(s.sesi);
    }
    for (const k of s.ketuk) {
      if (!k.layar.startsWith('soal-')) continue;
      const l = pastikan(k.layar);
      if (k.uid === 'bilah:turun') l.turun.add(s.sesi);
      if (k.uid !== null && k.uid.startsWith('kaki:')) l.sumber.add(s.sesi);
      if (k.uid === 'istilah') l.istilah.add(s.sesi);
    }
  }

  return [...layar.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([nama, isi]) => ({
      layar: nama,
      jawab_di_bawah: isi.turun.size,
      buka_sumber: isi.sumber.size,
      buka_istilah: isi.istilah.size,
      sesi: isi.sesi.size,
    }));
}

function detik(ms: number): string {
  return `${(ms / 1000).toFixed(1)} d`;
}

/** Kedalaman gulir dibaca orang sebagai persen, bukan sebagai 0,62. */
function persen(rasio: number | null): string {
  return rasio === null ? '—' : `${String(Math.round(rasio * 100))}%`;
}

function ya(nilai: boolean): string {
  return nilai ? 'ya' : 'tidak';
}

function nilaiAkhir(akhir: Record<string, unknown> | null, medan: string): string {
  if (akhir === null) return '—';
  const nilai = akhir[medan];
  if (nilai === null || nilai === undefined || nilai === '') return '—';
  return String(nilai);
}

/** Seluruh laporan Markdown untuk sekumpulan sesi. */
export function laporan(
  masukan: RingkasSesi[],
  kecuali: readonly string[] = PENANDA_DIKECUALIKAN_BAWAAN,
  pengunjungKecuali: readonly string[] = [],
): string {
  const baris: string[] = [];
  const {
    dipakai: semua,
    dikecualikan,
    dikecualikanPengunjung,
  } = pisahkanKecuali(masukan, kecuali, pengunjungKecuali);
  const sesi = semua.filter((s) => s.lengkap);
  const sebagian = semua.filter((s) => !s.lengkap);

  baris.push('# Ringkasan alpha');
  baris.push('');
  baris.push(`Sesi: **${String(sesi.length)}**`);

  /*
   * Dicetak SEBELUM angka apa pun, dan dicetak walau nol: sesi yang hilang
   * diam-diam adalah cara termudah membuat data alpha terlihat lebih baik
   * daripada kenyataannya.
   */
  baris.push('');
  baris.push(
    `Sesi yang dikecualikan (penanda ${
      kecuali.length === 0 ? '—' : kecuali.map((k) => `\`${k}\``).join(', ')
    }): **${String(dikecualikan.length)}**`,
  );

  /*
   * Dicetak TERPISAH dari pengecualian penanda, dan dicetak walau nol (D-B4).
   * Dua jalur yang dijumlahkan menjadi satu angka akan menyembunyikan mana yang
   * bekerja — dan yang ingin diketahui pemilik justru itu: berapa sesinya
   * sendiri yang lolos karena ia lupa memakai ?k=.
   */
  const orangDikecualikan = new Set(
    dikecualikanPengunjung.map((x) => x.pengunjung).filter((x): x is string => x !== null),
  );
  baris.push('');
  baris.push(
    `Sesi yang dikecualikan (nomor pengunjung, ${String(pengunjungKecuali.length)} nomor terdaftar): ` +
      `**${String(dikecualikanPengunjung.length)}** dari **${String(orangDikecualikan.size)}** pengunjung`,
  );

  if (sesi.length === 0) {
    baris.push('');
    baris.push('Tidak ada satu pun sesi lengkap di berkas yang diberikan.');
    if (sebagian.length > 0) {
      baris.push('');
      baris.push(`Sesi tak lengkap (tanpa peristiwa \`mulai\`): ${String(sebagian.length)}.`);
    }
    return baris.join('\n') + '\n';
  }

  const orang = hitungOrang(sesi);
  baris.push('');
  baris.push('## Berapa orang, bukan berapa sesi');
  baris.push('');
  baris.push(
    'Satu orang bisa membuka tautannya tiga kali. **Pengunjung unik** adalah nomor acak',
  );
  baris.push(
    'pihak pertama di browser masing-masing (D-13). Sesi yang tidak bisa menyimpan nomor itu',
  );
  baris.push('dihitung terpisah dan **tidak ditebak**.');
  baris.push('');
  baris.push('| | sesi | pengunjung unik | yang kembali | sesi tanpa nomor |');
  baris.push('|---|---|---|---|---|');
  baris.push(
    `| **semua** | ${String(orang.sesi)} | ${String(orang.pengunjung_unik)} | ` +
      `${String(orang.kembali)} | ${String(orang.sesi_tanpa_nomor)} |`,
  );
  for (const [kode, hitung] of perPenanda(sesi)) {
    baris.push(
      `| ${kode} | ${String(hitung.sesi)} | ${String(hitung.pengunjung_unik)} | ` +
        `${String(hitung.kembali)} | ${String(hitung.sesi_tanpa_nomor)} |`,
    );
  }
  baris.push('');

  const sampai = sesi.filter((s) => s.sampai_pembukaan).length;
  const minat = sesi.filter((s) => s.minat_kasus_lain).length;
  baris.push(`Sampai layar pembukaan: **${String(sampai)}** dari ${String(sesi.length)}`);
  baris.push(`Menekan "Mau coba kasus lain": **${String(minat)}**`);
  const loncat = sesi.filter((s) => s.loncat_ke_ringkasan);
  baris.push(
    `Menekan "Langsung ke ringkasan": **${String(loncat.length)}** dari ${String(sampai)} ` +
      `yang sampai layar pembukaan`,
  );
  baris.push('');

  baris.push('## Per sesi');
  baris.push('');
  baris.push(
    '| sesi | lebar | sampai pembukaan | loncat ke ringkasan | durasi | berhenti di | soal terlama |',
  );
  baris.push('|---|---|---|---|---|---|---|');
  for (const s of sesi) {
    const loncatSel = s.loncat_ke_ringkasan
      ? `ya (gulir ${s.gulir_saat_loncat === null ? '?' : String(s.gulir_saat_loncat)}%)`
      : ya(false);
    baris.push(
      `| ${s.sesi} | ${s.lebar_layar === null ? '—' : String(s.lebar_layar)} | ` +
        `${ya(s.sampai_pembukaan)} | ${loncatSel} | ${detik(s.durasi_total_ms)} | ` +
        `${s.layar_terakhir} | ${s.soal_terlama ?? '—'} |`,
    );
  }
  baris.push('');

  const semuaSoal = [...new Set(sesi.flatMap((s) => s.soal.map((x) => x.soal_id)))].sort();

  baris.push('## Apakah kartu dibaca sebelum menjawab');
  baris.push('');
  baris.push(
    'Ukuran utama alpha. **Detik** = lama tumpukan kartu berada di layar sebelum jawaban',
  );
  baris.push(
    'dikunci; **balik** = berapa kali pemain menggulir kembali ke kartu sesudah meninggalkannya.',
  );
  baris.push('');
  baris.push(`| sesi | ${semuaSoal.map((id) => `${id} (detik / balik)`).join(' | ')} |`);
  baris.push(`|---|${semuaSoal.map(() => '---').join('|')}|`);
  for (const s of sesi) {
    const sel = semuaSoal.map((id) => {
      const soal = s.soal.find((x) => x.soal_id === id);
      if (soal === undefined || soal.ms_kartu_terlihat === null) return '—';
      return `${detik(soal.ms_kartu_terlihat)} / ${String(soal.gulir_balik ?? 0)}`;
    });
    baris.push(`| ${s.sesi} | ${sel.join(' | ')} |`);
  }
  baris.push('');

  baris.push('## Per soal');
  baris.push('');
  baris.push(
    '| soal | dijawab | benar | rata kartu terlihat | rata gulir balik | ketuk "Kembali ke kartu" | panel sumber | rata ganti pilihan | rata lama |',
  );
  baris.push('|---|---|---|---|---|---|---|---|---|');
  for (const id of semuaSoal) {
    const jawab = sesi
      .map((s) => s.soal.find((x) => x.soal_id === id))
      .filter((s): s is RingkasSoal => s !== undefined && s.benar !== null);
    const benar = jawab.filter((s) => s.benar === true).length;
    const rata = (ambil: (s: RingkasSoal) => number): string =>
      jawab.length === 0 ? '—' : (jawab.reduce((j, s) => j + ambil(s), 0) / jawab.length).toFixed(1);
    const rataDetik = (ambil: (s: RingkasSoal) => number): string =>
      jawab.length === 0
        ? '—'
        : detik(jawab.reduce((j, s) => j + ambil(s), 0) / jawab.length);
    const jumlah = (ambil: (s: RingkasSoal) => number): string =>
      String(
        sesi
          .flatMap((s) => s.soal.filter((x) => x.soal_id === id))
          .reduce((j, s) => j + ambil(s), 0),
      );
    baris.push(
      `| ${id} | ${String(jawab.length)} | ${String(benar)} | ` +
        `${rataDetik((s) => s.ms_kartu_terlihat ?? 0)} | ${rata((s) => s.gulir_balik ?? 0)} | ` +
        `${jumlah((s) => s.kembali_ke_kartu)} | ${jumlah((s) => s.panel_sumber)} | ` +
        `${rata((s) => s.ganti_pilihan)} | ${rataDetik((s) => s.ms_di_soal ?? 0)} |`,
    );
  }
  baris.push('');

  baris.push('## Lama per layar');
  baris.push('');
  const semuaLayar = [...new Set(sesi.flatMap((s) => s.ms_per_layar.map(([l]) => l)))].sort();
  baris.push(`| sesi | ${semuaLayar.join(' | ')} |`);
  baris.push(`|---|${semuaLayar.map(() => '---').join('|')}|`);
  for (const s of sesi) {
    const sel = semuaLayar.map((layar) => {
      const cocok = s.ms_per_layar.find(([l]) => l === layar);
      return cocok === undefined ? '—' : detik(cocok[1]);
    });
    baris.push(`| ${s.sesi} | ${sel.join(' | ')} |`);
  }
  baris.push('');

  baris.push('## Apa yang diketuk, dan apa yang dikira bisa diketuk');
  baris.push('');
  baris.push(
    '**mati** = ketukan yang mendarat di sesuatu yang bukan elemen interaktif. Angka mati',
  );
  baris.push(
    'yang tinggi pada satu `uid` berarti orang mengira benda itu pintu — itulah alasan',
  );
  baris.push('terukur untuk menjadikannya pintu sungguhan di milestone berikutnya.');
  baris.push('');
  for (const l of perLayar(sesi)) {
    baris.push(
      `**${l.layar}** — ${String(l.ketuk)} ketukan, ${String(l.ketuk_mati)} mati · ` +
        `gulir median ${persen(l.gulir_median)} (${String(l.sesi)} sesi)`,
    );
    baris.push('');
    if (l.uid.length === 0) {
      baris.push('Tidak ada ketukan tercatat di layar ini.');
      baris.push('');
      continue;
    }
    baris.push('| uid | ketuk | mati |');
    baris.push('|---|---|---|');
    for (const u of l.uid) {
      baris.push(`| ${u.uid} | ${String(u.ketuk)} | ${String(u.mati)} |`);
    }
    baris.push('');
  }

  const dibatasi = sesi.filter((s) => s.ketuk_dibatasi).length;
  if (dibatasi > 0) {
    baris.push(
      `Sesi yang menabrak batas 300 ketukan: **${String(dibatasi)}** — ketukan sesudahnya` +
        ' tidak tercatat.',
    );
    baris.push('');
  }

  const perSoal = perLayarSoal(sesi);
  if (perSoal.length > 0) {
    baris.push('## Tiga pertanyaan per layar soal');
    baris.push('');
    baris.push(
      '"Jawab di bawah" dihitung per **sesi**, bukan per ketukan: yang ditanyakan adalah',
    );
    baris.push('berapa orang tidak melihat opsi pertamanya, bukan berapa kali tombolnya ditekan.');
    baris.push('');
    baris.push('| layar | sesi | ketuk "↓ Jawab di bawah" | membuka sumber | membuka istilah |');
    baris.push('|---|---|---|---|---|');
    for (const l of perSoal) {
      baris.push(
        `| ${l.layar} | ${String(l.sesi)} | ${String(l.jawab_di_bawah)} | ` +
          `${String(l.buka_sumber)} | ${String(l.buka_istilah)} |`,
      );
    }
    baris.push('');
  }

  baris.push('## Titik berhenti');
  baris.push('');
  const berhenti = new Map<string, number>();
  for (const s of sesi) berhenti.set(s.layar_terakhir, (berhenti.get(s.layar_terakhir) ?? 0) + 1);
  baris.push('| layar terakhir | sesi |');
  baris.push('|---|---|');
  for (const [layar, jumlah] of [...berhenti.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    baris.push(`| ${layar} | ${String(jumlah)} |`);
  }
  baris.push('');

  baris.push('## Layar akhir');
  baris.push('');
  baris.push('| sesi | layak dibagikan | terasa seperti | menjawab dari | tulisan bebas |');
  baris.push('|---|---|---|---|---|');
  for (const s of sesi) {
    const tulisan = nilaiAkhir(s.akhir, 'teks');
    baris.push(
      `| ${s.sesi} | ${nilaiAkhir(s.akhir, 'rating')} | ${nilaiAkhir(s.akhir, 'terasa')} | ` +
        `${nilaiAkhir(s.akhir, 'sumber_jawaban')} | ${tulisan.replace(/\|/g, '\\|')} |`,
    );
  }

  if (sebagian.length > 0) {
    baris.push('');
    baris.push('## Sesi tak lengkap');
    baris.push('');
    baris.push(
      'Tanpa peristiwa `mulai` — biasanya tab lama yang baru ditutup. **Tidak** dihitung di',
    );
    baris.push('penyebut mana pun di atas.');
    baris.push('');
    baris.push('| sesi | peristiwa terakhir | layar terakhir |');
    baris.push('|---|---|---|');
    for (const s of sebagian) {
      baris.push(`| ${s.sesi} | ${String(s.soal.length)} soal tersentuh | ${s.layar_terakhir} |`);
    }
  }

  return baris.join('\n') + '\n';
}

export function utama(argumen: string[]): number {
  const { berkas: daftar, kecuali, berkasPengunjung } = bacaArgumen(argumen);
  if (daftar.length === 0) {
    console.error(
      'Sebutkan berkas JSONL yang mau diringkas, misalnya:\n' +
        '  npm run alpha:ringkas -- alat/contoh/peristiwa-contoh.jsonl\n' +
        '\n' +
        `Penanda yang dikecualikan tanpa diminta: ${PENANDA_DIKECUALIKAN_BAWAAN.join(', ')}.\n` +
        '  --kecuali k1,k2   ganti daftarnya\n' +
        '  --kecuali ""      jangan kecualikan apa pun\n' +
        '\n' +
        'Nomor pengunjung yang dikecualikan dibaca dari berkas (D-B4):\n' +
        '  --kecuali-pengunjung <berkas>   sebutkan berkasnya\n' +
        `  bawaan: ${BERKAS_PENGUNJUNG_BAWAAN} di direktori berkas peristiwa pertama, bila ada`,
    );
    return 1;
  }
  const peristiwa: Peristiwa[] = [];
  for (const berkas of daftar) {
    peristiwa.push(...bacaJsonl(readFileSync(berkas, 'utf8'), berkas));
  }
  /*
   * Berkas daftar pengunjung dicari di samping berkas peristiwa pertama, dan
   * ketiadaannya **bukan galat**: kebanyakan pemakaian tidak punya daftar itu.
   * Tetapi berkas yang disebut sendiri di baris perintah dan ternyata tidak ada
   * **adalah** galat — kalau tidak, salah ketik nama berkas akan diam-diam
   * berarti "tidak ada yang dikecualikan".
   */
  let pengunjungKecuali: string[] = [];
  const disebut = berkasPengunjung !== null && berkasPengunjung !== '';
  const jalur = disebut
    ? berkasPengunjung
    : join(dirname(daftar[0] ?? '.'), BERKAS_PENGUNJUNG_BAWAAN);
  if (disebut || existsSync(jalur)) {
    pengunjungKecuali = bacaPengunjungDikecualikan(readFileSync(jalur, 'utf8'), jalur);
  }

  process.stdout.write(laporan(kelompokkanSesi(peristiwa), kecuali, pengunjungKecuali));
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^[A-Za-z]:/, ''));

if (dijalankanLangsung) {
  try {
    process.exitCode = utama(process.argv.slice(2));
  } catch (galat) {
    console.error(galat instanceof Error ? galat.message : String(galat));
    process.exitCode = 1;
  }
}
