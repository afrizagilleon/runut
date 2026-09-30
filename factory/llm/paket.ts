/**
 * Paket fakta untuk penyusun LLM (M2d D-3).
 *
 * LLM tidak pernah menerima JSON mentah Sectors. Yang ia terima adalah daftar
 * fakta ringkas yang dibangun dengan mesin yang sama dengan kasus yang hidup:
 *
 *   muatGudang() → dataSampai(T) → pustakaGudang() → verifikasiV2() atas data ≤ T
 *
 * lalu disaring: hanya fakta berstatus TERVERIFIKASI, terbit ≤ T, dan yang
 * kalimatnya tidak menyebut tanggal sesudah T. Yang tersingkir dicatat beserta
 * alasannya (`disingkirkan`), tidak dibuang diam-diam.
 *
 * Bedanya dengan `bangunKasusUmum()`: di sana temuan V2 dikaitkan ke fakta
 * lewat `sumber.berkas`, yang untuk fakta gudang selalu `null` — sehingga
 * temuan berkeparahan konflik tidak menandai fakta mana pun, dan penulis kasus
 * manusialah yang menghindarinya. Di sini tidak ada penulis manusia yang
 * menghindari apa pun, jadi kaitannya dibuat eksplisit dari `rujukan` temuan:
 *
 * - `"<waktu terbit> · <berkas>"` → laporan kepemilikan itu;
 * - `"harga harian <tanggal>"` (satu, atau dua sebagai rentang) → fakta harga
 *   tanggal itu.
 *
 * Keparahan `konflik` → fakta terkait KONFLIK. R18a/R19a ("harga di hari tanpa
 * transaksi bukan harga yang disepakati siapa pun") → fakta harga di hari
 * bervolume nol dalam rentangnya TIDAK_LENGKAP. R19b (harga satu angka per
 * hari) → fakta harga tetap TERVERIFIKASI tetapi membawa catatan pemeriksaan.
 * Fakta turunan mewarisi status terburuk asalnya.
 */
import { angkaId, rupiah, tanggalId } from '../format.ts';
import { dataSampai } from '../kasus/bangun.ts';
import { muatGudang } from '../muat/gudang.ts';
import { ambilFakta } from '../muat/fakta.ts';
import { pustakaGudang, sumberTurunan, type SumberGudang } from '../muat/pustaka-gudang.ts';
import {
  faktaHitung,
  faktaJumlah,
  faktaPemegangJendela,
  faktaSelisih,
} from '../muat/turunan-gudang.ts';
import { keparahanTemuan, type Fakta, type StatusFakta, type Temuan } from '../skema/tipe.ts';
import { konteksEmiten } from '../verifikasi/konteks.ts';
import type { DataEmiten } from '../verifikasi/tipe.ts';
import { verifikasiV2 } from '../verifikasi/v2.ts';
import { sesudahT, tanggalDalam } from './angka.ts';

export type IdPaket = 'dada' | 'ultj' | 'tirt';
/** M2d-9: paket yang dibangun pintu penyusun untuk emiten/tanggal pilihan penyusun (`alat/penyusun/paket-otomatis.ts`). */
export type IdPaketPenyusun = `penyusun-${string}`;

export interface FaktaPaket {
  fact_id: string;
  /** `dokumen` = isi medan sumber; `hitungan` = dihitung dari fakta lain di paket. */
  jenis: 'dokumen' | 'hitungan';
  /** Dari dokumen apa, dalam bahasa orang. */
  asal: string;
  /** Tanggal fakta bisa diketahui publik (ISO), ≤ T. */
  terbit: string;
  /** Kalimat fakta, emiten sudah disamarkan dan nama orang sudah diganti peran. */
  klaim: string;
  nilai: number | string | null;
  satuan: string | null;
  turunan_dari: string[];
  /** Catatan pemeriksaan V2 yang tetap berlaku untuk fakta ini (peringatan, bukan penolakan). */
  catatan: string[];
}

export interface PaketFakta {
  paket_id: IdPaket | IdPaketPenyusun;
  simbol: string;
  nama_emiten: string;
  nama_samaran: string;
  tanggal_t: string;
  /** Label peristiwa, bukan penilaian. */
  peristiwa: string;
  fakta: FaktaPaket[];
  /** Kode saham, nama emiten, dan nama orang yang tidak boleh muncul di draf. */
  kata_terlarang: string[];
  disingkirkan: Array<{ fact_id: string; alasan: string }>;
  pemeriksaan: {
    aturan_dijalankan: number;
    aturan_dilewati: number;
    temuan: Array<{ aturan: string; keparahan: string; ringkasan: string }>;
  };
}

type Status = { status: StatusFakta; alasan: string };

export interface DefinisiPaket {
  paket_id: IdPaket | IdPaketPenyusun;
  simbol: string;
  nama_emiten: string;
  nama_samaran: string;
  tanggal_t: string;
  peristiwa: string;
  /** Nama pemegang di data → peran yang dipakai kalimat fakta. */
  peran: Record<string, string>;
  /** Kata lain yang tidak boleh muncul (penggalan nama emiten). */
  kata_terlarang: string[];
  /** fact_id dari pustaka dasar yang diajukan masuk paket. */
  calon: string[];
  /** Fakta turunan; `status` menjawab status fakta dasar sesudah verifikasi. */
  turunan: (pustaka: Fakta[], data: DataEmiten, status: (id: string) => StatusFakta) => Fakta[];
}

/* ---------------------------------------------------------------------- */
/* turunan yang tidak ada di turunan-gudang.ts                             */
/* ---------------------------------------------------------------------- */

function angkaDari(f: Fakta): number {
  if (typeof f.nilai !== 'number') throw new Error(`Fakta "${f.fact_id}" tidak berangka.`);
  return f.nilai;
}

function terbitTerakhir(asal: Fakta[]): string | null {
  const t = asal.map((f) => f.tersedia_sejak).filter((x): x is string => x !== null).sort();
  return t[t.length - 1] ?? null;
}

/** Berapa kali lipat harga penutupan `sampai` terhadap `dari`. */
export function faktaKelipatan(pustaka: Fakta[], fact_id: string, dari: string, sampai: string): Fakta {
  const a = ambilFakta(pustaka, dari);
  const b = ambilFakta(pustaka, sampai);
  const nilai = Math.round((angkaDari(b) / angkaDari(a)) * 100) / 100;
  const tA = a.tersedia_sejak ?? '';
  const tB = b.tersedia_sejak ?? '';
  return {
    fact_id,
    klaim:
      `Harga penutupan ${tanggalId(tB)} (${rupiah(angkaDari(b))}) adalah ${angkaId(nilai)} kali ` +
      `harga penutupan ${tanggalId(tA)} (${rupiah(angkaDari(a))}), dibulatkan dua angka di belakang koma.`,
    nilai,
    satuan: 'kali',
    sumber: sumberTurunan('pembagian dua harga penutupan yang masing-masing punya sumbernya sendiri'),
    turunan_dari: [dari, sampai],
    tersedia_sejak: terbitTerakhir([a, b]),
    status: 'TERVERIFIKASI',
    awam: null,
  };
}

/** Pengandaian pemegang sejumlah lot menerima dividen per lembar. */
export function faktaAndaiLot(pustaka: Fakta[], fact_id: string, dividen: string, lot: number): Fakta {
  const d = ambilFakta(pustaka, dividen);
  const lembar = lot * 100;
  const nilai = Math.round(lembar * angkaDari(d) * 100) / 100;
  return {
    fact_id,
    klaim:
      `Pengandaian: pemilik ${angkaId(lot)} lot (${angkaId(lembar)} lembar) menerima ` +
      `${angkaId(lembar)} × ${rupiah(angkaDari(d))} = ${rupiah(nilai)} dividen tunai sebelum pajak.`,
    nilai,
    satuan: 'rupiah',
    sumber: sumberTurunan('perkalian jumlah lembar pengandaian dengan dividen per lembar'),
    turunan_dari: [dividen],
    tersedia_sejak: d.tersedia_sejak,
    status: 'TERVERIFIKASI',
    awam: null,
  };
}

/**
 * Berapa hari bursa berturut-turut harga penutupan lebih tinggi dari hari bursa
 * sebelumnya, dalam daftar harga yang diberikan (urut tanggal). Melempar kalau
 * ada satu hari yang tidak naik — kalimat "naik tiap hari" harus benar.
 */
export function faktaHariNaik(pustaka: Fakta[], fact_id: string, harga: string[]): Fakta {
  const asal = harga.map((id) => ambilFakta(pustaka, id));
  for (let i = 1; i < asal.length; i++) {
    const kemarin = asal[i - 1];
    const kini = asal[i];
    if (kemarin === undefined || kini === undefined) continue;
    if (!(angkaDari(kini) > angkaDari(kemarin))) {
      throw new Error(`"${kini.fact_id}" tidak lebih tinggi dari "${kemarin.fact_id}".`);
    }
  }
  const pertama = asal[0];
  const terakhir = asal[asal.length - 1];
  if (pertama === undefined || terakhir === undefined) throw new Error('daftar harga kosong');
  const naik = asal.length - 1;
  return {
    fact_id,
    klaim:
      `Dari ${tanggalId(pertama.tersedia_sejak ?? '')} (${rupiah(angkaDari(pertama))}) sampai ` +
      `${tanggalId(terakhir.tersedia_sejak ?? '')} (${rupiah(angkaDari(terakhir))}), harga penutupan ` +
      `naik ${angkaId(naik)} hari bursa berturut-turut, tiap hari lebih tinggi dari hari bursa sebelumnya.`,
    nilai: naik,
    satuan: 'hari bursa',
    sumber: sumberTurunan('perbandingan harga penutupan tiap hari bursa dengan hari bursa sebelumnya'),
    turunan_dari: [...harga],
    tersedia_sejak: terbitTerakhir(asal),
    status: 'TERVERIFIKASI',
    awam: null,
  };
}

/* ---------------------------------------------------------------------- */
/* kaitan temuan V2 → fakta                                                */
/* ---------------------------------------------------------------------- */

/** fact_id laporan menurut kunci "<dilaporkan_pada> · <berkas>", penomoran sama dengan pustaka. */
function idLaporan(data: DataEmiten): Map<string, string> {
  const hasil = new Map<string, string>();
  const nomor = new Map<string, number>();
  for (const l of data.laporan) {
    const t = l.dilaporkan_pada.slice(0, 10);
    const n = (nomor.get(t) ?? 0) + 1;
    nomor.set(t, n);
    hasil.set(`${l.dilaporkan_pada} · ${l.berkas}`, `fil-${t}-${String(n).padStart(2, '0')}`);
  }
  return hasil;
}

function tanggalHargaDi(rujukan: string[]): string[] {
  const t = rujukan
    .map((r) => /^harga harian (\d{4}-\d{2}-\d{2})$/.exec(r)?.[1])
    .filter((x): x is string => x !== undefined)
    .sort();
  return t;
}

const ID_HARGA = (tanggal: string): string[] => [
  `harga-${tanggal}`,
  `harga-${tanggal}-buka`,
  `harga-${tanggal}-tertinggi`,
  `harga-${tanggal}-terendah`,
];

/** Status dan catatan per fact_id dari temuan V2. */
export function kaitkanTemuanV2(
  temuan: Temuan[],
  data: DataEmiten,
): { status: Map<string, Status>; catatan: Map<string, string[]> } {
  const status = new Map<string, Status>();
  const catatan = new Map<string, string[]>();
  const laporan = idLaporan(data);
  const volume = new Map(data.harga.map((h) => [h.tanggal, h.volume]));
  const tandai = (id: string, s: Status): void => {
    const lama = status.get(id);
    if (lama === undefined || lama.status === 'TIDAK_LENGKAP') status.set(id, s);
  };

  for (const t of temuan) {
    const keparahan = keparahanTemuan(t);
    const tanggal = tanggalHargaDi(t.rujukan);
    const dari = tanggal[0];
    const sampai = tanggal[tanggal.length - 1];
    const dalamRentang = (x: string): boolean => dari !== undefined && sampai !== undefined && x >= dari && x <= sampai;

    if (keparahan === 'konflik') {
      const alasan = `temuan ${t.aturan} berkeparahan konflik: ${t.ringkasan.slice(0, 160)}`;
      for (const r of t.rujukan) {
        const id = laporan.get(r);
        if (id !== undefined) tandai(id, { status: 'KONFLIK', alasan });
      }
      for (const x of tanggal) for (const id of ID_HARGA(x)) tandai(id, { status: 'KONFLIK', alasan });
      continue;
    }
    if (t.aturan === 'R18a' || t.aturan === 'R19a') {
      const alasan =
        `temuan ${t.aturan}: harga di hari tanpa transaksi (volume nol) bukan harga yang disepakati siapa pun`;
      for (const [x, v] of volume) {
        if (v !== 0 || !dalamRentang(x)) continue;
        for (const id of ID_HARGA(x)) tandai(id, { status: 'TIDAK_LENGKAP', alasan });
      }
      continue;
    }
    if (t.aturan === 'R19b') {
      for (const [x] of volume) {
        if (!dalamRentang(x)) continue;
        for (const id of ID_HARGA(x)) {
          const daftar = catatan.get(id) ?? [];
          const isi = 'pada hari ini harga pembukaan, tertinggi, terendah, dan penutupan tercatat sama (R19b)';
          if (!daftar.includes(isi)) daftar.push(isi);
          catatan.set(id, daftar);
        }
      }
    }
  }
  return { status, catatan };
}

/* ---------------------------------------------------------------------- */
/* pembangun                                                               */
/* ---------------------------------------------------------------------- */

function asalFakta(f: Fakta): string {
  if (f.sumber.jenis === 'turunan') return 'dihitung dari fakta lain di paket ini';
  const id = f.fact_id;
  if (id.startsWith('harga-') || id.startsWith('volume-')) return 'data harga harian bursa';
  if (id.startsWith('susp-')) return 'pengumuman penghentian sementara perdagangan oleh bursa';
  if (id.startsWith('div') ) return 'daftar aksi korporasi (dividen)';
  if (id.startsWith('rups-')) return 'daftar aksi korporasi (rapat umum pemegang saham)';
  if (id.startsWith('fil-')) return 'laporan kepemilikan saham yang diumumkan ke publik';
  return 'data penyedia';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Ganti kode saham, nama emiten, dan nama orang dengan samaran/peran. */
export function samarkanEmiten(teks: string, def: Pick<DefinisiPaket, 'simbol' | 'nama_emiten' | 'nama_samaran' | 'peran' | 'kata_terlarang'>): string {
  let hasil = teks;
  for (const [nama, peran] of Object.entries(def.peran)) {
    hasil = hasil.replace(new RegExp(escapeRegex(nama), 'gi'), peran);
  }
  hasil = hasil.replace(new RegExp(`\\b${escapeRegex(def.simbol)}(\\.JK)?\\b`, 'gi'), def.nama_samaran);
  for (const k of [def.nama_emiten, ...def.kata_terlarang]) {
    hasil = hasil.replace(new RegExp(escapeRegex(k), 'gi'), def.nama_samaran);
  }
  return hasil;
}

function statusTerburuk(daftar: StatusFakta[]): StatusFakta {
  if (daftar.includes('KONFLIK')) return 'KONFLIK';
  if (daftar.includes('TIDAK_LENGKAP')) return 'TIDAK_LENGKAP';
  if (daftar.includes('BELUM')) return 'BELUM';
  return 'TERVERIFIKASI';
}

export interface Gudang {
  emiten: Map<string, DataEmiten>;
  asal: SumberGudang['asal'];
  kosong: string[];
}

let gudangTerbaca: Gudang | null = null;

export function bacaGudang(): Gudang {
  if (gudangTerbaca !== null) return gudangTerbaca;
  const g = muatGudang();
  gudangTerbaca = {
    emiten: g.emiten,
    asal: g.asal,
    kosong: g.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas),
  };
  return gudangTerbaca;
}

export function bangunPaket(def: DefinisiPaket, gudang: Gudang = bacaGudang()): PaketFakta {
  const penuh = gudang.emiten.get(def.simbol);
  if (penuh === undefined) throw new Error(`Emiten ${def.simbol} tidak ada di gudang.`);
  const data = dataSampai(penuh, def.tanggal_t);

  const sumber: SumberGudang = {
    endpoint: {
      harga: `/v2/daily/${def.simbol}/`,
      laporan: '/v2/filings/',
      aksi: `/v2/company/corporate-actions/${def.simbol}/`,
      suspensi: '/v2/suspensions/',
    },
    asal: gudang.asal,
    peran: def.peran,
  };
  const dasar = pustakaGudang(data, sumber).fakta;

  const hasil = verifikasiV2(konteksEmiten(data, gudang.kosong));
  const semuaTemuan = hasil.pemeriksaan.flatMap((p) => p.temuan);
  const { status, catatan } = kaitkanTemuanV2(semuaTemuan, data);

  const statusDasar = (id: string): StatusFakta => status.get(id)?.status ?? 'TERVERIFIKASI';
  const pustaka: Fakta[] = dasar.map((f) => ({ ...f, status: statusDasar(f.fact_id) }));
  const turunan = def.turunan(pustaka, data, statusDasar);
  const semua = [...pustaka];
  for (const f of turunan) {
    const asal = f.turunan_dari.map((id) => ambilFakta(semua, id).status);
    semua.push({ ...f, status: statusTerburuk([f.status, ...asal]) });
  }

  const disingkirkan: PaketFakta['disingkirkan'] = [];
  const fakta: FaktaPaket[] = [];
  const diajukan = [...def.calon, ...turunan.map((f) => f.fact_id)];
  for (const id of diajukan) {
    const f = ambilFakta(semua, id);
    if (f.status !== 'TERVERIFIKASI') {
      const alasan = status.get(id)?.alasan ?? 'fakta asalnya tidak TERVERIFIKASI';
      disingkirkan.push({ fact_id: id, alasan: `${f.status}: ${alasan}` });
      continue;
    }
    if (f.tersedia_sejak === null || f.tersedia_sejak > def.tanggal_t) {
      disingkirkan.push({ fact_id: id, alasan: `terbit ${f.tersedia_sejak ?? 'tak diketahui'}, sesudah T` });
      continue;
    }
    const tanggalLewat = tanggalDalam(f.klaim).filter((t) => sesudahT(t, def.tanggal_t));
    if (tanggalLewat.length > 0) {
      disingkirkan.push({
        fact_id: id,
        alasan: `kalimatnya menyebut tanggal sesudah T: ${tanggalLewat.map((t) => t.teks).join(', ')}`,
      });
      continue;
    }
    fakta.push({
      fact_id: id,
      jenis: f.sumber.jenis === 'turunan' ? 'hitungan' : 'dokumen',
      asal: asalFakta(f),
      terbit: f.tersedia_sejak,
      klaim: perjelasKlaim(samarkanEmiten(f.klaim, def)),
      nilai: f.nilai,
      satuan: f.satuan,
      turunan_dari: [...f.turunan_dari],
      catatan: [...(catatan.get(id) ?? [])],
    });
  }

  const namaOrang = new Set<string>([
    ...penuh.laporan.map((l) => l.pemegang),
    ...penuh.pemegang.map((p) => p.nama),
  ]);
  const kata_terlarang = [
    def.simbol,
    `${def.simbol}.JK`,
    def.nama_emiten,
    ...def.kata_terlarang,
    ...[...namaOrang].filter((n) => !/^public$/i.test(n)),
  ];

  return {
    paket_id: def.paket_id,
    simbol: def.simbol,
    nama_emiten: def.nama_emiten,
    nama_samaran: def.nama_samaran,
    tanggal_t: def.tanggal_t,
    peristiwa: def.peristiwa,
    fakta,
    kata_terlarang: [...new Set(kata_terlarang)],
    disingkirkan,
    pemeriksaan: {
      aturan_dijalankan: hasil.pemeriksaan.filter((p) => p.dijalankan).length,
      aturan_dilewati: hasil.pemeriksaan.filter((p) => !p.dijalankan).length,
      temuan: semuaTemuan.map((t) => ({
        aturan: t.aturan,
        keparahan: keparahanTemuan(t),
        ringkasan: samarkanEmiten(t.ringkasan, def),
      })),
    },
  };
}

/* ---------------------------------------------------------------------- */
/* teks kartu yang diperjelas (M2d-5 D-8)                                   */
/* ---------------------------------------------------------------------- */

/**
 * Frasa kalimat fakta (teks KARTU yang dibaca pemain) yang ditandai
 * membingungkan oleh penguji luar M2d-3/M2d-4 (`eval/keluaran-m2d3/penguji/`,
 * `eval/keluaran-m2d4/penguji/`) atau yang berbau istilah sistem ("di data",
 * "kasus ini"), diganti bahasa awam yang SAMA maknanya. Kalimat asalnya ditulis
 * `factory/muat/pustaka-gudang.ts` (di luar batas M2d-5), jadi penggantiannya
 * dilakukan di sini, saat paket dibangun — hanya untuk teks yang dikirim ke
 * lingkar LLM. `cases/*.json` (kasus tayang) TIDAK diubah; frasa yang juga ada
 * di sana dicatat di laporan M2d-5 untuk milestone produk terpisah.
 *
 * Frasa turunan paket (`sebutan` di definisi paket di bawah) diganti langsung
 * di definisinya: "lolos seluruh pemeriksaan" (DADA 2, 3/3 penguji M2d-4) dan
 * "Jarak antara …" (ULTJ, penguji M2d-3).
 */
export const PERJELAS_KLAIM: ReadonlyArray<{ lama: string; baru: string; alasan: string }> = [
  {
    lama: 'Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi.',
    baru: 'Daftar ini belum tentu lengkap: bisa saja ada pembagian yang terjadi tetapi tidak tercatat di sini.',
    alasan: 'ditandai membingungkan oleh ketiga penguji kartu M2d-4 (ULTJ omongan 1)',
  },
  {
    lama: 'Tanggal pencabutan penghentian ini tidak ada di data, jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.',
    baru: 'Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.',
    alasan: 'penguji kartu M2d-3 (DADA omongan 2) bingung "tanggal pencabutannya tidak ada di data"; "di data" dan "kasus ini" istilah sistem',
  },
  {
    lama: 'Teks keputusannya tidak ada di data, jadi isinya tidak bisa dikutip.',
    baru: 'Isi keputusan rapatnya tidak tercatat di sini.',
    alasan: '"di data" dan "dikutip" istilah sistem, sejenis dengan frasa yang ditandai penguji M2d-3',
  },
];

/** Ganti frasa kartu yang membingungkan dengan bahasa awam yang sama maknanya. */
export function perjelasKlaim(klaim: string): string {
  let hasil = klaim;
  for (const p of PERJELAS_KLAIM) hasil = hasil.split(p.lama).join(p.baru);
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* tiga definisi paket                                                     */
/* ---------------------------------------------------------------------- */

/** Laporan pemegang tertentu yang terbit ≤ T, dengan fact_id pustaka. */
function laporanPemegang(data: DataEmiten, pemegang: string): string[] {
  const peta = idLaporan(data);
  return data.laporan
    .filter((l) => l.pemegang === pemegang)
    .map((l) => peta.get(`${l.dilaporkan_pada} · ${l.berkas}`))
    .filter((x): x is string => x !== undefined);
}

const PENGENDALI_DADA = 'Karya Permata Inovasi Indonesia';

/**
 * DADA, 8 Oktober 2025 — T kasus yang hidup. Peristiwa: harga naik berlipat
 * dalam dua bulan sementara pemilik terbesar melaporkan penjualan; bursa pernah
 * menghentikan perdagangannya karena laporan keuangan auditan terlambat; ada
 * dividen tunai yang sangat kecil.
 */
export const PAKET_DADA: DefinisiPaket = {
  paket_id: 'dada',
  simbol: 'DADA',
  nama_emiten: 'PT Diamond Citra Propertindo Tbk',
  nama_samaran: 'Perusahaan D',
  tanggal_t: '2025-10-08',
  peristiwa:
    'Harga saham naik berlipat dalam dua bulan, sementara pemilik terbesarnya melaporkan penjualan. ' +
    'Sebelumnya bursa menghentikan sementara perdagangannya karena laporan keuangan auditan tahunan belum ' +
    'disampaikan, dan perusahaan membagi dividen tunai.',
  peran: { [PENGENDALI_DADA]: 'Pemilik terbesar' },
  kata_terlarang: ['Diamond Citra', 'Karya Permata'],
  calon: [
    'harga-2025-08-01',
    'harga-2025-10-07',
    'harga-2025-10-08',
    'volume-2025-10-08',
    'susp-2025-06-30',
    'div-2025-09-16',
    'div-2025-09-16-bayar',
    'rups-2025-09-04',
    'fil-2025-08-25-01',
    'fil-2025-08-25-02',
    'fil-2025-08-25-03',
    'fil-2025-08-25-04',
    'fil-2025-09-01-01',
    'fil-2025-09-29-01',
  ],
  turunan: (pustaka, data, status) => {
    const lolos = laporanPemegang(data, PENGENDALI_DADA).filter((id) => status(id) === 'TERVERIFIKASI');
    const sejauh = [...pustaka];
    const kelipatan = faktaKelipatan(sejauh, 'kelipatan-2025-08-01-2025-10-08', 'harga-2025-08-01', 'harga-2025-10-08');
    const andai = faktaAndaiLot(sejauh, 'andai-10-lot-dividen', 'div-2025-09-16', 10);
    const jumlah = faktaJumlah(sejauh, {
      fact_id: 'jumlah-jual-terverifikasi',
      dari: lolos,
      satuan: 'lembar',
      sebutan: 'Penjualan pemilik terbesar, tidak termasuk laporan yang angkanya bertentangan dengan data lain',
    });
    const hitung = faktaHitung(sejauh, {
      fact_id: 'laporan-jual-terverifikasi',
      dari: lolos,
      satuan: 'laporan',
      sebutan: 'Laporan penjualan pemilik terbesar, tidak termasuk laporan yang angkanya bertentangan dengan data lain',
    });
    return [kelipatan, andai, jumlah, hitung];
  },
};

const DIVIDEN_ULTJ = [
  'div-2020-09-03',
  'div-2021-09-01',
  'div-2022-08-04',
  'div-2023-07-03',
  'div-2024-06-28',
  'div-2025-05-15',
  'div-2026-05-04',
];

/**
 * ULTJ, 4 Mei 2026 — T kasus yang hidup. Peristiwa: tanggal ex dividen tunai
 * hari ini, riwayat dividen tahunan, dan laporan pembelian orang dalam di
 * bulan Januari.
 */
export const PAKET_ULTJ: DefinisiPaket = {
  paket_id: 'ultj',
  simbol: 'ULTJ',
  nama_emiten: 'PT Ultrajaya Milk Industry & Trading Company Tbk',
  nama_samaran: 'Perusahaan U',
  tanggal_t: '2026-05-04',
  peristiwa:
    'Hari ini tanggal ex dividen tunai perusahaan; dividen tunai tercatat dibagikan tiap tahun sejak 2020; ' +
    'dan pada Januari orang dalam perusahaan melaporkan pembelian saham.',
  peran: {
    'Sabana Prawira Widjaja': 'Pemilik terbesar',
    'Suhendra Prawira Widjaja': 'Orang dalam lain',
    'Sabana Prawirawidjaja': 'Pemilik terbesar',
    'Suhendra Prawirawidjaja': 'Orang dalam lain',
  },
  kata_terlarang: ['Ultrajaya', 'Prawira'],
  calon: [
    ...DIVIDEN_ULTJ,
    'div-2026-05-04-bayar',
    'dividen-tercatat',
    'harga-2026-04-30',
    'harga-2026-05-04-buka',
    'harga-2026-05-04',
    'rups-2026-04-22',
    'fil-2026-01-06-01',
    'fil-2026-01-06-02',
    'fil-2026-01-07-01',
    'fil-2026-01-22-01',
  ],
  turunan: (pustaka, data) => {
    const turun = faktaSelisih(pustaka, {
      fact_id: 'turun-2026-05-04',
      dari: 'harga-2026-04-30',
      kurangi: 'harga-2026-05-04-buka',
      satuan: 'rupiah per lembar',
      sebutan: 'Turunnya harga dari penutupan terakhir sebelum tanggal ex ke pembukaan hari ini',
    });
    const beda = faktaSelisih([...pustaka, turun], {
      fact_id: 'beda-turun-dividen',
      dari: 'turun-2026-05-04',
      kurangi: 'div-2026-05-04',
      satuan: 'rupiah per lembar',
      sebutan: 'Selisih turunnya harga dengan dividen per lembar',
    });
    const tahun = faktaHitung(pustaka, {
      fact_id: 'tahun-berdividen',
      dari: DIVIDEN_ULTJ,
      satuan: 'tahun',
      sebutan: 'Tahun yang tercatat punya pembagian dividen tunai, beruntun tanpa lompatan',
    });
    const besar = faktaPemegangJendela(data, pustaka, {
      fact_id: 'fil-jan-pemilik-terbesar',
      pemegang: 'Sabana Prawira Widjaja',
      dari: '2026-01-01',
      sampai: '2026-01-31',
      peran: 'Pemilik terbesar',
    });
    const lain = faktaPemegangJendela(data, pustaka, {
      fact_id: 'fil-jan-orang-dalam-lain',
      pemegang: 'Suhendra Prawira Widjaja',
      dari: '2026-01-01',
      sampai: '2026-01-31',
      peran: 'Orang dalam lain',
    });
    const sejauh = [...pustaka, ...besar.fakta, ...lain.fakta];
    const jumlahLaporan = faktaHitung(pustaka, {
      fact_id: 'laporan-jan-2026',
      dari: [...besar.laporan, ...lain.laporan],
      satuan: 'laporan',
      sebutan: 'Laporan kepemilikan orang dalam yang terbit Januari, seluruhnya pembelian',
    });
    const tambahan = faktaJumlah(sejauh, {
      fact_id: 'tambahan-jan-2026',
      dari: ['fil-jan-pemilik-terbesar', 'fil-jan-orang-dalam-lain'],
      satuan: 'lembar',
      sebutan: 'Lembar yang ditambahkan kedua orang dalam sepanjang Januari',
    });
    return [turun, beda, tahun, ...besar.fakta, ...lain.fakta, jumlahLaporan, tambahan];
  },
};

const NAIK_TIRT = [
  'harga-2025-11-26',
  'harga-2025-11-27',
  'harga-2025-11-28',
  'harga-2025-12-01',
  'harga-2025-12-02',
  'harga-2025-12-03',
  'harga-2025-12-04',
  'harga-2025-12-05',
  'harga-2025-12-08',
  'harga-2025-12-09',
];

/**
 * TIRT, 10 Desember 2025 — emiten baru (bukan kasus yang hidup). Peristiwa:
 * bursa menghentikan sementara perdagangan (cooling down) sesudah kenaikan
 * harga kumulatif yang signifikan; awal tahun yang sama bursa pernah
 * menghentikan perdagangannya karena keraguan atas kelangsungan usaha.
 *
 * Alasan pilihannya ada di laporan (`docs/bukti/uji-tanding-model.md`):
 * satu-satunya emiten di gudang dengan jenis peristiwa yang tidak dipakai DADA
 * maupun ULTJ, nol temuan berkeparahan konflik dari V2 pada data ≤ T, deret
 * harga di kedua sisi peristiwa, dan alasan resmi bursa tertulis di data.
 */
export const PAKET_TIRT: DefinisiPaket = {
  paket_id: 'tirt',
  simbol: 'TIRT',
  nama_emiten: 'Tirta Mahakam Resources Tbk',
  nama_samaran: 'Perusahaan T',
  tanggal_t: '2025-12-10',
  peristiwa:
    'Hari ini bursa menghentikan sementara perdagangan saham perusahaan (cooling down) sesudah harganya ' +
    'naik berturut-turut; awal tahun yang sama bursa juga pernah menghentikan perdagangannya dengan alasan lain.',
  peran: { 'Harita Jayaraya': 'Pemegang saham besar' },
  kata_terlarang: ['Tirta Mahakam', 'Harita'],
  calon: [
    'susp-2025-01-21',
    'susp-2025-12-10',
    'harga-2025-11-25',
    ...NAIK_TIRT,
    'harga-2025-12-10',
    'volume-2025-11-25',
    'volume-2025-11-26',
    'volume-2025-12-09',
    'volume-2025-12-10',
    'rups-2025-09-25',
  ],
  turunan: (pustaka) => {
    const naik = faktaSelisih(pustaka, {
      fact_id: 'naik-2025-11-26-2025-12-09',
      dari: 'harga-2025-12-09',
      kurangi: 'harga-2025-11-26',
      satuan: 'rupiah per lembar',
      sebutan: 'Kenaikan harga penutupan dari 26 November sampai 9 Desember 2025',
    });
    const kali = faktaKelipatan(pustaka, 'kelipatan-2025-11-26-2025-12-09', 'harga-2025-11-26', 'harga-2025-12-09');
    const hari = faktaHariNaik(pustaka, 'hari-naik-beruntun', NAIK_TIRT);
    return [naik, kali, hari];
  },
};

export const DEFINISI_PAKET: Readonly<Record<IdPaket, DefinisiPaket>> = {
  dada: PAKET_DADA,
  ultj: PAKET_ULTJ,
  tirt: PAKET_TIRT,
};
